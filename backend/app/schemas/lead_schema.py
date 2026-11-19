from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from app.schemas.contact_schema import ContactResponse

class ScoreExplanationItem(BaseModel):
    rule: str
    points: int
    reason: str

class LeadBase(BaseModel):
    stage: str = "NEW" # NEW, CONTACTED, QUALIFIED, PROPOSAL, WON, LOST
    source: str = "MANUAL" # META_ADS, GOOGLE_ADS, LINKEDIN, INBOUND, MANUAL
    deal_value: float = 0.0
    owner_name: Optional[str] = "Devdutt Sales Team"
    notes: Optional[str] = None

class LeadCreate(LeadBase):
    contact_id: Optional[int] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    company_name: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None

class LeadUpdate(BaseModel):
    stage: Optional[str] = None
    source: Optional[str] = None
    deal_value: Optional[float] = None
    owner_name: Optional[str] = None
    notes: Optional[str] = None

class PipelineStageUpdate(BaseModel):
    stage: str # NEW, CONTACTED, QUALIFIED, PROPOSAL, WON, LOST

class LeadResponse(LeadBase):
    id: int
    contact_id: int
    contact: Optional[ContactResponse] = None
    score: int
    bucket: str # HOT, WARM, COLD, SUPPRESSED
    score_explanation: List[ScoreExplanationItem] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None
    is_deleted: bool = False

    class Config:
        from_attributes = True

class LeadListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    leads: List[LeadResponse]

class StageStats(BaseModel):
    count: int
    total_value: float

class PipelineSummaryResponse(BaseModel):
    total_leads: int
    total_pipeline_value: float
    hot_count: int
    warm_count: int
    cold_count: int
    suppressed_count: int
    stages: Dict[str, StageStats]
