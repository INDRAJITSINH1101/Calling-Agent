import os
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_

from app.core.database import get_db
from app.core.config import settings
from app.models.contact import Contact, Company, ImportJob
from app.schemas.contact_schema import (
    ContactCreate,
    ContactUpdate,
    ContactResponse,
    ContactListResponse,
    FileUploadResponse,
    ImportPreviewRequest,
    ImportPreviewResponse,
    ImportCommitRequest,
    ImportCommitResponse
)
from app.services.csv_importer import CsvImportService, normalize_phone_number

router = APIRouter(prefix="/contacts", tags=["Contacts & Bulk Operations"])

TEMP_UPLOADS: dict = {}


@router.get("", response_model=ContactListResponse)
def list_contacts(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    search: Optional[str] = Query(None, description="Search by name, phone, or email"),
    consent: Optional[str] = Query(None, description="Filter by OPTED_IN, DND, SUPPRESSED"),
    tag: Optional[str] = Query(None, description="Filter by tag"),
    db: Session = Depends(get_db)
):
    """Lists contacts with search, tag filters, consent filters, and pagination (excludes soft-deleted)."""
    query = db.query(Contact).filter(Contact.is_deleted == False)

    if search:
        search_filter = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Contact.first_name.ilike(search_filter),
                Contact.last_name.ilike(search_filter),
                Contact.phone.ilike(search_filter),
                Contact.email.ilike(search_filter)
            )
        )

    if consent:
        query = query.filter(Contact.consent_status == consent)

    if tag:
        query = query.filter(Contact.tags.cast(str).ilike(f"%{tag}%"))

    total = query.count()
    contacts = (
        query.options(joinedload(Contact.company))
        .order_by(Contact.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    response_contacts = []
    for c in contacts:
        contact_dict = {
            "id": c.id,
            "company_id": c.company_id,
            "company": c.company,
            "first_name": c.first_name,
            "last_name": c.last_name,
            "email": c.email,
            "phone": c.phone,
            "title": c.title,
            "consent_status": c.consent_status,
            "tags": c.tags or [],
            "custom_fields": c.custom_fields or {},
            "notes": c.notes,
            "company_name": c.company.name if c.company else None,
            "consent_updated_at": c.consent_updated_at,
            "created_at": c.created_at,
            "updated_at": c.updated_at,
            "deleted_at": c.deleted_at,
            "is_deleted": c.is_deleted
        }
        response_contacts.append(contact_dict)

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "contacts": response_contacts
    }


@router.post("", response_model=ContactResponse, status_code=201)
def create_contact(contact_in: ContactCreate, db: Session = Depends(get_db)):
    """Creates an individual contact, automatically linking or creating their company."""
    normalized_phone = normalize_phone_number(contact_in.phone)
    if not normalized_phone:
        raise HTTPException(status_code=400, detail="Invalid phone number provided")

    # Check for duplicate phone among active contacts
    existing = db.query(Contact).filter(Contact.phone == normalized_phone, Contact.is_deleted == False).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"A contact with phone {normalized_phone} already exists")

    company_id = contact_in.company_id
    if contact_in.company_name and not company_id:
        comp = db.query(Company).filter(Company.name.ilike(contact_in.company_name.strip()), Company.is_deleted == False).first()
        if comp:
            company_id = comp.id
        else:
            comp = Company(name=contact_in.company_name.strip())
            db.add(comp)
            db.flush()
            company_id = comp.id

    contact = Contact(
        first_name=contact_in.first_name.strip(),
        last_name=contact_in.last_name.strip() if contact_in.last_name else None,
        phone=normalized_phone,
        email=contact_in.email.strip().lower() if contact_in.email else None,
        title=contact_in.title,
        company_id=company_id,
        consent_status=contact_in.consent_status,
        tags=contact_in.tags or [],
        custom_fields=contact_in.custom_fields or {},
        notes=contact_in.notes
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


@router.get("/stats/summary")
def get_contacts_summary(db: Session = Depends(get_db)):
    """Returns real-time aggregate statistics for dashboard KPI cards (excluding soft-deleted)."""
    total = db.query(Contact).filter(Contact.is_deleted == False).count()
    opted_in = db.query(Contact).filter(Contact.is_deleted == False, Contact.consent_status == "OPTED_IN").count()
    dnd = db.query(Contact).filter(Contact.is_deleted == False, Contact.consent_status == "DND").count()
    suppressed = db.query(Contact).filter(Contact.is_deleted == False, Contact.consent_status == "SUPPRESSED").count()
    companies = db.query(Company).filter(Company.is_deleted == False).count()
    return {
        "total_contacts": total,
        "opted_in": opted_in,
        "dnd": dnd,
        "suppressed": suppressed,
        "total_companies": companies
    }


@router.get("/{contact_id}", response_model=ContactResponse)
def get_contact(contact_id: int, db: Session = Depends(get_db)):
    contact = db.query(Contact).filter(Contact.id == contact_id, Contact.is_deleted == False).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact


@router.put("/{contact_id}", response_model=ContactResponse)
def update_contact(contact_id: int, contact_in: ContactUpdate, db: Session = Depends(get_db)):
    contact = db.query(Contact).filter(Contact.id == contact_id, Contact.is_deleted == False).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    update_data = contact_in.dict(exclude_unset=True)
    if "phone" in update_data and update_data["phone"]:
        normalized = normalize_phone_number(update_data["phone"])
        if not normalized:
            raise HTTPException(status_code=400, detail="Invalid phone number")
        update_data["phone"] = normalized

    if "company_name" in update_data:
        comp_name = update_data.pop("company_name")
        if comp_name and comp_name.strip():
            comp = db.query(Company).filter(Company.name.ilike(comp_name.strip()), Company.is_deleted == False).first()
            if not comp:
                comp = Company(name=comp_name.strip())
                db.add(comp)
                db.flush()
            contact.company_id = comp.id

    for field, val in update_data.items():
        setattr(contact, field, val)

    db.commit()
    db.refresh(contact)
    return contact


@router.delete("/{contact_id}")
def delete_contact(contact_id: int, db: Session = Depends(get_db)):
    """Soft deletes a contact and cascades soft delete to associated leads."""
    contact = db.query(Contact).filter(Contact.id == contact_id, Contact.is_deleted == False).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    contact.soft_delete()

    for lead in contact.leads:
        if not lead.is_deleted:
            lead.soft_delete()

    db.commit()
    return {"message": "Contact deleted successfully", "id": contact_id}


@router.post("/upload-file", response_model=FileUploadResponse)
async def upload_import_file(file: UploadFile = File(...)):
    """
    Step 1 of Bulk Import:
    Accepts CSV or Excel spreadsheet, stores it temporarily,
    and returns column headers along with 5 sample rows for mapping.
    """
    if not file.filename.endswith((".csv", ".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Only .csv and .xlsx spreadsheets are supported")

    temp_id = str(uuid.uuid4())
    temp_dir = os.path.join(settings.STORAGE_DIR, "temp_uploads")
    os.makedirs(temp_dir, exist_ok=True)
    
    file_ext = os.path.splitext(file.filename)[1]
    saved_path = os.path.join(temp_dir, f"{temp_id}{file_ext}")

    content = await file.read()
    with open(saved_path, "wb") as f:
        f.write(content)

    TEMP_UPLOADS[temp_id] = saved_path

    try:
        headers, total_rows, sample_rows = CsvImportService.extract_headers_and_samples(saved_path)
        return {
            "temp_file_id": temp_id,
            "filename": file.filename,
            "total_rows": total_rows,
            "headers": headers,
            "sample_rows": sample_rows
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")


@router.post("/import-preview", response_model=ImportPreviewResponse)
def preview_import_data(payload: ImportPreviewRequest, db: Session = Depends(get_db)):
    """
    Step 2 of Bulk Import:
    Performs a dry-run against the mapped columns to validate phone numbers,
    detect duplicate contacts in DB, and provide row counts before commit.
    """
    file_path = TEMP_UPLOADS.get(payload.temp_file_id)
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Uploaded file session expired or not found. Please upload again.")

    try:
        preview_result = CsvImportService.preview_import(
            file_path=file_path,
            mapping=payload.mapping,
            duplicate_strategy=payload.duplicate_strategy,
            db=db
        )
        return preview_result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Preview generation failed: {str(e)}")


@router.post("/import-commit", response_model=ImportCommitResponse)
def commit_import_data(payload: ImportCommitRequest, db: Session = Depends(get_db)):
    """
    Step 3 of Bulk Import:
    Executes the import into PostgreSQL 18 with duplicate strategy (SKIP/UPDATE/CREATE_NEW),
    creates companies dynamically, and saves an audit job log.
    """
    file_path = TEMP_UPLOADS.get(payload.temp_file_id)
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Uploaded file session expired. Please re-upload.")

    try:
        job = CsvImportService.commit_import(
            file_path=file_path,
            mapping=payload.mapping,
            duplicate_strategy=payload.duplicate_strategy,
            default_tags=payload.default_tags,
            db=db
        )

        # Cleanup temp file
        try:
            os.remove(file_path)
            TEMP_UPLOADS.pop(payload.temp_file_id, None)
        except Exception:
            pass

        return {
            "job_id": job.id,
            "status": job.status,
            "total_rows": job.total_rows,
            "imported_count": job.imported_rows,
            "updated_count": job.updated_rows,
            "skipped_duplicates": job.duplicate_rows,
            "failed_count": job.failed_rows,
            "errors": job.error_summary or []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import commit failed: {str(e)}")


@router.get("/export/csv")
def export_contacts_csv(
    consent: Optional[str] = None,
    tag: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Exports contacts to a downloadable CSV file."""
    import pandas as pd
    query = db.query(Contact).filter(Contact.is_deleted == False)
    if consent:
        query = query.filter(Contact.consent_status == consent)
    if tag:
        query = query.filter(Contact.tags.cast(str).ilike(f"%{tag}%"))

    contacts = query.options(joinedload(Contact.company)).all()
    rows = []
    for c in contacts:
        rows.append({
            "First Name": c.first_name,
            "Last Name": c.last_name or "",
            "Phone": c.phone,
            "Email": c.email or "",
            "Company": c.company.name if c.company else "",
            "Title": c.title or "",
            "Consent Status": c.consent_status,
            "Tags": ", ".join(c.tags) if c.tags else "",
            "Created At": c.created_at.strftime("%Y-%m-%d %H:%M:%S")
        })

    df = pd.DataFrame(rows)
    export_path = os.path.join(settings.EXPORTS_DIR, f"contacts_export_{uuid.uuid4().hex[:8]}.csv")
    df.to_csv(export_path, index=False, encoding="utf-8")

    return FileResponse(
        path=export_path,
        filename="devdutt_crm_contacts.csv",
        media_type="text/csv"
    )
