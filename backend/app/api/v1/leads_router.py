from typing import Optional, List, Dict
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_

from app.core.database import get_db
from app.models.lead import Lead
from app.models.contact import Contact, Company
from app.schemas.lead_schema import (
    LeadCreate,
    LeadUpdate,
    LeadResponse,
    LeadListResponse,
    PipelineStageUpdate,
    PipelineSummaryResponse,
    StageStats
)
from app.services.scoring_engine import calculate_lead_score
from app.core.constants import VALID_STAGES, VALID_BUCKETS, VALID_SOURCES

router = APIRouter(prefix="/leads", tags=["Leads & Sales Pipeline"])


@router.get("", response_model=LeadListResponse)
def list_leads(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    stage: Optional[str] = Query(None, description="Filter by pipeline stage (NEW, CONTACTED, etc.)"),
    bucket: Optional[str] = Query(None, description="Filter by HOT, WARM, COLD"),
    source: Optional[str] = Query(None, description="Filter by source"),
    search: Optional[str] = Query(None, description="Search by contact name, phone, or company"),
    db: Session = Depends(get_db)
):
    """Lists leads with stage, bucket, search filters, and eager-loaded contact details (excludes soft-deleted)."""
    query = (
        db.query(Lead)
        .filter(Lead.is_deleted == False)
        .join(Contact, (Lead.contact_id == Contact.id) & (Contact.is_deleted == False))
        .options(joinedload(Lead.contact).joinedload(Contact.company))
    )

    if stage:
        query = query.filter(Lead.stage == stage.upper())
    if bucket:
        query = query.filter(Lead.bucket == bucket.upper())
    if source:
        query = query.filter(Lead.source == source.upper())

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Contact.first_name.ilike(search_term),
                Contact.last_name.ilike(search_term),
                Contact.phone.ilike(search_term),
                Contact.email.ilike(search_term),
                Contact.company.has(Company.name.ilike(search_term))
            )
        )

    total = query.count()
    leads = (
        query.options(joinedload(Lead.contact).joinedload(Contact.company))
        .order_by(Lead.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "leads": leads
    }


@router.get("/pipeline/summary", response_model=PipelineSummaryResponse)
def get_pipeline_summary(db: Session = Depends(get_db)):
    """Provides stage counts, total values, and Hot/Warm/Cold counts for Kanban pipeline views (excluding soft-deleted)."""
    all_leads = db.query(Lead).filter(Lead.is_deleted == False).all()
    
    total_leads = len(all_leads)
    total_pipeline_value = sum(lead.deal_value for lead in all_leads if lead.stage not in ["LOST"])
    
    hot_count = sum(1 for l in all_leads if l.bucket == "HOT")
    warm_count = sum(1 for l in all_leads if l.bucket == "WARM")
    cold_count = sum(1 for l in all_leads if l.bucket == "COLD")
    suppressed_count = sum(1 for l in all_leads if l.bucket == "SUPPRESSED")

    stages_dict: Dict[str, StageStats] = {}
    for st in VALID_STAGES:
        st_leads = [l for l in all_leads if l.stage == st]
        stages_dict[st] = StageStats(
            count=len(st_leads),
            total_value=sum(l.deal_value for l in st_leads)
        )

    return {
        "total_leads": total_leads,
        "total_pipeline_value": total_pipeline_value,
        "hot_count": hot_count,
        "warm_count": warm_count,
        "cold_count": cold_count,
        "suppressed_count": suppressed_count,
        "stages": stages_dict
    }


@router.post("", response_model=LeadResponse, status_code=201)
def create_lead(lead_in: LeadCreate, db: Session = Depends(get_db)):
    """Creates a new lead, allowing either an existing contact_id or direct contact info."""
    contact = None
    raw_phone = (lead_in.phone or lead_in.contact_phone or "").strip()

    if lead_in.contact_id:
        contact = db.query(Contact).filter(Contact.id == lead_in.contact_id).first()
        if not contact:
            raise HTTPException(status_code=404, detail="Contact not found")
    elif raw_phone:
        from app.services.csv_importer import normalize_phone_number
        norm_phone = normalize_phone_number(raw_phone) or raw_phone
        contact = db.query(Contact).filter(Contact.phone == norm_phone).first()
        if not contact:
            company_id = None
            if lead_in.company_name and lead_in.company_name.strip():
                comp = db.query(Company).filter(Company.name.ilike(lead_in.company_name.strip())).first()
                if not comp:
                    comp = Company(name=lead_in.company_name.strip())
                    db.add(comp)
                    db.flush()
                company_id = comp.id

            f_name = lead_in.first_name
            l_name = lead_in.last_name
            if not f_name and lead_in.contact_name:
                parts = lead_in.contact_name.strip().split(" ", 1)
                f_name = parts[0]
                l_name = parts[1] if len(parts) > 1 else None

            contact_email = (lead_in.email or lead_in.contact_email or "").strip().lower() or None

            contact = Contact(
                first_name=f_name.strip() if f_name else "Lead",
                last_name=l_name.strip() if l_name else None,
                phone=norm_phone,
                email=contact_email,
                company_id=company_id,
                consent_status="OPTED_IN"
            )
            db.add(contact)
            db.commit()
            db.refresh(contact)
    else:
        raise HTTPException(status_code=400, detail="Phone number is required to create a new lead")

    stage = lead_in.stage.upper()
    if stage not in VALID_STAGES:
        raise HTTPException(status_code=400, detail=f"Invalid stage. Must be one of: {VALID_STAGES}")

    score, bucket, explanation = calculate_lead_score(contact, lead_in.dict(), db=db)

    lead = Lead(
        contact_id=contact.id,
        stage=stage,
        score=score,
        bucket=bucket,
        score_explanation=explanation,
        source=lead_in.source.upper() if lead_in.source else "MANUAL",
        deal_value=lead_in.deal_value,
        owner_name=lead_in.owner_name or "Devdutt Sales Team",
        notes=lead_in.notes
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)

    fresh_lead = db.query(Lead).options(joinedload(Lead.contact).joinedload(Contact.company)).filter(Lead.id == lead.id).first()
    return fresh_lead or lead


@router.get("/{lead_id}", response_model=LeadResponse)
def get_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).options(joinedload(Lead.contact).joinedload(Contact.company)).filter(Lead.id == lead_id, Lead.is_deleted == False).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.patch("/{lead_id}", response_model=LeadResponse)
def update_lead(lead_id: int, lead_in: LeadUpdate, db: Session = Depends(get_db)):
    lead = db.query(Lead).options(joinedload(Lead.contact)).filter(Lead.id == lead_id, Lead.is_deleted == False).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    update_data = lead_in.dict(exclude_unset=True)
    if "stage" in update_data and update_data["stage"]:
        update_data["stage"] = update_data["stage"].upper()
        if update_data["stage"] not in VALID_STAGES:
            raise HTTPException(status_code=400, detail=f"Invalid stage. Must be one of: {VALID_STAGES}")

    for field, val in update_data.items():
        setattr(lead, field, val)

    if "deal_value" in update_data or "source" in update_data:
        score, bucket, explanation = calculate_lead_score(lead.contact, {
            "source": lead.source,
            "deal_value": lead.deal_value
        }, db=db)
        lead.score = score
        lead.bucket = bucket
        lead.score_explanation = explanation

    db.commit()
    db.refresh(lead)
    return lead


@router.patch("/{lead_id}/stage", response_model=LeadResponse)
def update_lead_stage(lead_id: int, payload: PipelineStageUpdate, db: Session = Depends(get_db)):
    """Fast drag-and-drop stage change endpoint for Kanban cards."""
    lead = db.query(Lead).options(joinedload(Lead.contact)).filter(Lead.id == lead_id, Lead.is_deleted == False).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    new_stage = payload.stage.upper()
    if new_stage not in VALID_STAGES:
        raise HTTPException(status_code=400, detail=f"Invalid stage. Must be one of: {VALID_STAGES}")

    lead.stage = new_stage
    db.commit()
    db.refresh(lead)
    return lead


@router.post("/{lead_id}/re-score", response_model=LeadResponse)
def recalculate_lead_score_endpoint(lead_id: int, db: Session = Depends(get_db)):
    """Manually triggers transparent score recalculation with latest contact & activity signals."""
    lead = db.query(Lead).options(joinedload(Lead.contact)).filter(Lead.id == lead_id, Lead.is_deleted == False).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    score, bucket, explanation = calculate_lead_score(lead.contact, {
        "source": lead.source,
        "deal_value": lead.deal_value
    }, db=db)
    lead.score = score
    lead.bucket = bucket
    lead.score_explanation = explanation

    db.commit()
    db.refresh(lead)
    return lead


@router.delete("/{lead_id}")
def delete_lead(lead_id: int, db: Session = Depends(get_db)):
    """Soft deletes a lead record while preserving historical database logs."""
    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.is_deleted == False).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    lead.soft_delete()
    db.commit()
    return {"message": "Lead deleted successfully", "id": lead_id}
