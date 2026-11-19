from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc

from app.core.database import get_db
from app.models.campaign import Campaign, CampaignRecipient
from app.models.telephony import PhoneNumber
from app.models.training import AgentPersonaConfig
from app.schemas.campaign_schema import (
    AudiencePreviewRequest,
    AudiencePreviewResponse,
    CampaignCreate,
    CampaignUpdate,
    CampaignOut,
    CampaignRecipientOut,
    CampaignStatsOut
)
from app.services.campaign_service import CampaignService

router = APIRouter(prefix="/campaigns", tags=["Unified Outreach Campaigns"])


def _format_campaign(c: Campaign) -> dict:
    total = c.total_contacts or 0
    completed = c.completed_count or 0
    pct = round((completed / total * 100), 1) if total > 0 else 0.0

    return {
        "id": c.id,
        "name": c.name,
        "description": c.description,
        "status": c.status,
        "persona_id": c.persona_id,
        "persona_name": c.persona.name if c.persona else "Rachel Enterprise",
        "caller_phone_id": c.caller_phone_id,
        "caller_phone_number": c.caller_phone.number if c.caller_phone else None,
        "target_filters": c.target_filters or {},
        "total_contacts": total,
        "completed_count": completed,
        "connected_count": c.connected_count or 0,
        "qualified_count": c.qualified_count or 0,
        "failed_count": c.failed_count or 0,
        "progress_percentage": pct,
        "concurrency_limit": c.concurrency_limit or 3,
        "calls_per_minute": c.calls_per_minute or 10,
        "max_retry_attempts": c.max_retry_attempts or 2,
        "retry_cooldown_mins": c.retry_cooldown_mins or 60,
        "active_hours_start": c.active_hours_start or "09:00",
        "active_hours_end": c.active_hours_end or "19:00",
        "created_at": c.created_at,
        "updated_at": c.updated_at
    }


@router.get("/stats", response_model=CampaignStatsOut)
def get_campaign_stats(db: Session = Depends(get_db)):
    """Returns aggregated high-level metrics across all campaigns."""
    return CampaignService.get_campaign_stats(db)


@router.post("/audience-preview", response_model=AudiencePreviewResponse)
def get_audience_preview(payload: AudiencePreviewRequest, db: Session = Depends(get_db)):
    """Computes matching contact count and returns sample records based on filter criteria."""
    return CampaignService.get_audience_preview(db, payload.filters)


@router.get("", response_model=List[CampaignOut])
def list_campaigns(
    status: Optional[str] = Query(None, description="Filter by status (RUNNING, PAUSED, COMPLETED, DRAFT)"),
    search: Optional[str] = Query(None, description="Search by name"),
    db: Session = Depends(get_db)
):
    """Lists all campaigns with computed progress statistics."""
    query = db.query(Campaign).filter(Campaign.is_deleted == False)
    if status and status != "ALL":
        query = query.filter(Campaign.status == status)
    if search:
        query = query.filter(Campaign.name.ilike(f"%{search}%"))

    campaigns = (
        query.options(joinedload(Campaign.persona), joinedload(Campaign.caller_phone))
        .order_by(desc(Campaign.created_at))
        .all()
    )
    return [_format_campaign(c) for c in campaigns]


@router.get("/{id}", response_model=CampaignOut)
def get_campaign(id: int, db: Session = Depends(get_db)):
    """Returns single campaign detail."""
    campaign = (
        db.query(Campaign)
        .options(joinedload(Campaign.persona), joinedload(Campaign.caller_phone))
        .filter(Campaign.id == id, Campaign.is_deleted == False)
        .first()
    )
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return _format_campaign(campaign)


@router.post("", response_model=CampaignOut)
def create_campaign(payload: CampaignCreate, db: Session = Depends(get_db)):
    """Creates a new automated campaign and queues matching contacts."""
    campaign = CampaignService.create_campaign(db, payload)
    return _format_campaign(campaign)


@router.put("/{id}", response_model=CampaignOut)
def update_campaign(id: int, payload: CampaignUpdate, db: Session = Depends(get_db)):
    """Updates campaign parameters and cadence rules."""
    campaign = db.query(Campaign).filter(Campaign.id == id, Campaign.is_deleted == False).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    update_data = payload.dict(exclude_unset=True)
    for field, val in update_data.items():
        setattr(campaign, field, val)

    db.commit()
    db.refresh(campaign)
    return _format_campaign(campaign)


@router.delete("/{id}")
def delete_campaign(id: int, db: Session = Depends(get_db)):
    """Soft deletes a campaign."""
    campaign = db.query(Campaign).filter(Campaign.id == id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    CampaignService.stop_campaign(db, id)
    campaign.soft_delete()
    db.commit()
    return {"message": "Campaign successfully deleted"}


@router.post("/{id}/start", response_model=CampaignOut)
def start_campaign(id: int, db: Session = Depends(get_db)):
    """Starts the campaign background dialing worker."""
    try:
        campaign = CampaignService.start_campaign(db, id)
        return _format_campaign(campaign)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{id}/pause", response_model=CampaignOut)
def pause_campaign(id: int, db: Session = Depends(get_db)):
    """Pauses the campaign dispatcher."""
    try:
        campaign = CampaignService.pause_campaign(db, id)
        return _format_campaign(campaign)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{id}/resume", response_model=CampaignOut)
def resume_campaign(id: int, db: Session = Depends(get_db)):
    """Resumes a paused campaign."""
    try:
        campaign = CampaignService.resume_campaign(db, id)
        return _format_campaign(campaign)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{id}/stop", response_model=CampaignOut)
def stop_campaign(id: int, db: Session = Depends(get_db)):
    """Stops/cancels the campaign execution."""
    try:
        campaign = CampaignService.stop_campaign(db, id)
        return _format_campaign(campaign)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{id}/recipients", response_model=List[CampaignRecipientOut])
def get_campaign_recipients(
    id: int,
    status: Optional[str] = Query(None, description="Filter by recipient status"),
    db: Session = Depends(get_db)
):
    """Returns recipients list for a specific campaign."""
    query = db.query(CampaignRecipient).filter(CampaignRecipient.campaign_id == id)
    if status and status != "ALL":
        query = query.filter(CampaignRecipient.status == status)

    recipients = (
        query.options(
            joinedload(CampaignRecipient.contact).joinedload(Contact.company),
            joinedload(CampaignRecipient.lead)
        )
        .order_by(CampaignRecipient.id.asc())
        .all()
    )

    results = []
    for r in recipients:
        contact = r.contact
        lead = r.lead
        results.append({
            "id": r.id,
            "campaign_id": r.campaign_id,
            "contact_id": r.contact_id,
            "contact_name": f"{contact.first_name} {contact.last_name or ''}".strip() if contact else "Contact",
            "contact_phone": contact.phone if contact else "",
            "company_name": contact.company.name if contact and contact.company else None,
            "lead_id": r.lead_id,
            "lead_stage": lead.stage if lead else None,
            "status": r.status,
            "attempt_count": r.attempt_count or 0,
            "last_attempt_at": r.last_attempt_at,
            "next_retry_at": r.next_retry_at,
            "last_call_log_id": r.last_call_log_id,
            "call_outcome": r.call_outcome,
            "qualification_score": r.qualification_score,
            "created_at": r.created_at
        })

    return results
