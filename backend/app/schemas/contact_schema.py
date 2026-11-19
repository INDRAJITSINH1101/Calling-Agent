from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, EmailStr

# --- Company Schemas ---
class CompanyBase(BaseModel):
    name: str
    industry: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class CompanyCreate(CompanyBase):
    pass

class CompanyResponse(CompanyBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Contact Schemas ---
class ContactBase(BaseModel):
    first_name: str
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: str
    title: Optional[str] = None
    consent_status: str = "OPTED_IN" # OPTED_IN, DND, SUPPRESSED
    tags: List[str] = Field(default_factory=list)
    custom_fields: Dict[str, Any] = Field(default_factory=dict)
    notes: Optional[str] = None
    company_name: Optional[str] = None # Helper for UI / imports

class ContactCreate(ContactBase):
    company_id: Optional[int] = None

class ContactUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    title: Optional[str] = None
    consent_status: Optional[str] = None
    tags: Optional[List[str]] = None
    custom_fields: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    company_id: Optional[int] = None
    company_name: Optional[str] = None

class ContactResponse(ContactBase):
    id: int
    company_id: Optional[int] = None
    company: Optional[CompanyResponse] = None
    consent_updated_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None
    is_deleted: bool = False

    class Config:
        from_attributes = True


class ContactListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    contacts: List[ContactResponse]


# --- Bulk Import Schemas ---
class FileUploadResponse(BaseModel):
    temp_file_id: str
    filename: str
    total_rows: int
    headers: List[str]
    sample_rows: List[Dict[str, Any]]

class ColumnMapping(BaseModel):
    # Mapping of CRM Field -> CSV Header Name
    first_name: str
    last_name: Optional[str] = None
    phone: str
    email: Optional[str] = None
    company_name: Optional[str] = None
    title: Optional[str] = None
    tags: Optional[str] = None # CSV column with comma-separated tags
    consent_status: Optional[str] = None

class ImportPreviewRequest(BaseModel):
    temp_file_id: str
    mapping: ColumnMapping
    duplicate_strategy: str = "SKIP" # SKIP, UPDATE, CREATE_NEW

class RowValidationResult(BaseModel):
    row_number: int
    data: Dict[str, Any]
    status: str # VALID, DUPLICATE, INVALID
    reason: Optional[str] = None

class ImportPreviewResponse(BaseModel):
    total_rows: int
    valid_count: int
    duplicate_count: int
    invalid_count: int
    sample_preview: List[RowValidationResult]

class ImportCommitRequest(BaseModel):
    temp_file_id: str
    mapping: ColumnMapping
    duplicate_strategy: str = "SKIP" # SKIP, UPDATE, CREATE_NEW
    default_tags: List[str] = Field(default_factory=list)

class ImportCommitResponse(BaseModel):
    job_id: int
    status: str
    total_rows: int
    imported_count: int
    updated_count: int
    skipped_duplicates: int
    failed_count: int
    errors: List[str] = Field(default_factory=list)
