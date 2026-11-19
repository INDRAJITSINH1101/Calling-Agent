from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class AudienceFilter(BaseModel):
    stages: Optional[List[str]] = None
    min_score: Optional[int] = None
    tags: Optional[List[str]] = None
    source: Optional[str] = None
    search: Optional[str] = None

class AudiencePreviewRequest(BaseModel):
    filters: AudienceFilter

class ContactSample(BaseModel):
    id: int
    name: str
    phone: str
    company: Optional[str] = None
    lead_stage: Optional[str] = None
    lead_score: Optional[int] = None

class AudiencePreviewResponse(BaseModel):
    total_eligible: int
    sample_contacts: List[ContactSample]

class CampaignCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    description: Optional[str] = None
    persona_id: Optional[int] = None
    caller_phone_id: Optional[int] = None
    target_filters: Optional[Dict[str, Any]] = None
    concurrency_limit: int = Field(default=3, ge=1, le=20)
    calls_per_minute: int = Field(default=10, ge=1, le=100)
    max_retry_attempts: int = Field(default=2, ge=0, le=5)
    retry_cooldown_mins: int = Field(default=60, ge=5, le=1440)
    active_hours_start: str = "09:00"
    active_hours_end: str = "19:00"

class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    persona_id: Optional[int] = None
    caller_phone_id: Optional[int] = None
    target_filters: Optional[Dict[str, Any]] = None
    concurrency_limit: Optional[int] = None
    calls_per_minute: Optional[int] = None
    max_retry_attempts: Optional[int] = None
    retry_cooldown_mins: Optional[int] = None
    active_hours_start: Optional[str] = None
    active_hours_end: Optional[str] = None

class CampaignRecipientOut(BaseModel):
    id: int
    campaign_id: int
    contact_id: int
    contact_name: str
    contact_phone: str
    company_name: Optional[str] = None
    lead_id: Optional[int] = None
    lead_stage: Optional[str] = None
    status: str
    attempt_count: int
    last_attempt_at: Optional[datetime] = None
    next_retry_at: Optional[datetime] = None
    last_call_log_id: Optional[int] = None
    call_outcome: Optional[str] = None
    qualification_score: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

class CampaignOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    status: str
    persona_id: Optional[int] = None
    persona_name: Optional[str] = None
    caller_phone_id: Optional[int] = None
    caller_phone_number: Optional[str] = None
    target_filters: Optional[Dict[str, Any]] = None
    total_contacts: int
    completed_count: int
    connected_count: int
    qualified_count: int
    failed_count: int
    progress_percentage: float
    concurrency_limit: int
    calls_per_minute: int
    max_retry_attempts: int
    retry_cooldown_mins: int
    active_hours_start: str
    active_hours_end: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CampaignStatsOut(BaseModel):
    total_campaigns: int
    active_campaigns: int
    total_contacts_queued: int
    total_calls_placed: int
    overall_connect_rate: float
    total_leads_qualified: int
