from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict


class CallStartRequest(BaseModel):
    contact_id: Optional[int] = None
    lead_id: Optional[int] = None
    phone: Optional[str] = None
    persona: Optional[str] = "RACHEL_ENTERPRISE"
    direction: Optional[str] = "OUTBOUND"


class CallConverseRequest(BaseModel):
    user_message: str
    conversation_history: List[Dict[str, str]] = []
    persona: Optional[str] = "RACHEL_ENTERPRISE"
    timestamp_offset_ms: Optional[int] = 0


class ToolExecutionResult(BaseModel):
    tool_name: str
    arguments: Dict[str, Any]
    execution_status: str  # "SUCCESS", "FAILED"
    message: str
    updated_lead: Optional[Dict[str, Any]] = None


class CallConverseResponse(BaseModel):
    call_id: int
    ai_response: str
    audio_base64: Optional[str] = None
    provider_used: str  # "groq", "openrouter", "mock"
    latency_ms: int
    tool_actions: List[ToolExecutionResult] = []
    is_call_ended: bool = False


class CallEndRequest(BaseModel):
    duration_seconds: int = 0
    reason: Optional[str] = "USER_DISCONNECTED"


class CallEndResponse(BaseModel):
    call_id: int
    duration_seconds: int
    sentiment: str
    summary: str
    key_takeaways: List[str]
    updated_lead: Optional[Dict[str, Any]] = None


class CallTranscriptOut(BaseModel):
    id: int
    call_log_id: int
    speaker: str
    message: str
    timestamp_offset_ms: int
    tool_calls: Optional[List[Dict[str, Any]]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CallLogOut(BaseModel):
    id: int
    contact_id: Optional[int] = None
    lead_id: Optional[int] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    company_name: Optional[str] = None
    status: str
    direction: str
    duration_seconds: int
    provider_used: str
    sentiment: str
    summary: Optional[str] = None
    key_takeaways: List[str] = []
    recording_url: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaginatedCallLogResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[CallLogOut]
