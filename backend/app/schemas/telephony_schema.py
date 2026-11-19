from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class SipTrunkBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    provider: str = Field("TWILIO", description="TWILIO, LIVEKIT, TELNYX, ASTERISK, GENERIC_SIP")
    sip_server: str = Field(..., min_length=3, max_length=255)
    transport: str = Field("UDP", description="UDP, TCP, TLS")
    username: Optional[str] = None
    auth_method: str = Field("CREDENTIALS", description="CREDENTIALS or IP_WHITELIST")
    concurrency_limit: int = Field(10, ge=1, le=500)
    codecs: List[str] = Field(default=["OPUS", "PCMA", "PCMU"])
    is_default: bool = False


class SipTrunkCreate(SipTrunkBase):
    password: Optional[str] = None


class SipTrunkUpdate(BaseModel):
    name: Optional[str] = None
    provider: Optional[str] = None
    sip_server: Optional[str] = None
    transport: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    auth_method: Optional[str] = None
    concurrency_limit: Optional[int] = None
    codecs: Optional[List[str]] = None
    is_default: Optional[bool] = None
    status: Optional[str] = None


class SipTrunkOut(SipTrunkBase):
    id: int
    status: str
    latency_ms: int
    last_health_check_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    password_masked: str = "••••••••"

    class Config:
        from_attributes = True


class PhoneNumberBase(BaseModel):
    number: str = Field(..., min_length=5, max_length=50)
    label: str = Field(..., min_length=2, max_length=100)
    country_code: str = Field("IN", max_length=10)
    sip_trunk_id: Optional[int] = None
    type: str = Field("BIDIRECTIONAL", description="BIDIRECTIONAL, INBOUND, OUTBOUND")
    assigned_agent_persona: str = Field("RACHEL_ENTERPRISE")
    status: str = Field("ACTIVE", description="ACTIVE, INACTIVE, BUSY")
    business_hours_start: str = Field("09:00")
    business_hours_end: str = Field("19:00")
    fallback_action: str = Field("HUMAN_TRANSFER", description="HUMAN_TRANSFER, VOICEMAIL, HANGUP")
    fallback_forward_number: Optional[str] = "+919800000000"
    is_default_outbound: bool = False
    monthly_cost: float = Field(5.00, ge=0)


class PhoneNumberCreate(PhoneNumberBase):
    pass


class PhoneNumberUpdate(BaseModel):
    number: Optional[str] = None
    label: Optional[str] = None
    country_code: Optional[str] = None
    sip_trunk_id: Optional[int] = None
    type: Optional[str] = None
    assigned_agent_persona: Optional[str] = None
    status: Optional[str] = None
    business_hours_start: Optional[str] = None
    business_hours_end: Optional[str] = None
    fallback_action: Optional[str] = None
    fallback_forward_number: Optional[str] = None
    is_default_outbound: Optional[bool] = None
    monthly_cost: Optional[float] = None


class PhoneNumberOut(PhoneNumberBase):
    id: int
    sip_trunk_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TelephonySummaryOut(BaseModel):
    total_trunks: int
    active_trunks: int
    total_numbers: int
    active_channels: int
    max_concurrency: int
    avg_latency_ms: int


class TrunkTestResultOut(BaseModel):
    trunk_id: int
    status: str
    latency_ms: int
    message: str
    tested_at: datetime


class TestCallRequest(BaseModel):
    target_phone: str = Field(..., min_length=5)
    trunk_id: Optional[int] = None
    persona: Optional[str] = "RACHEL_ENTERPRISE"


class TestCallResultOut(BaseModel):
    call_id: int
    target_phone: str
    trunk_name: str
    status: str
    latency_ms: int
    negotiated_codec: str
    message: str


# -------------------------------------------------------------
# INBOUND ROUTING CONFIG & CALL LOG SCHEMAS
# -------------------------------------------------------------

class InboundRoutingConfigBase(BaseModel):
    business_hours_start: str = Field("09:00", description="HH:MM format 24h")
    business_hours_end: str = Field("19:00", description="HH:MM format 24h")
    timezone: str = Field("Asia/Kolkata", description="Timezone name")
    fallback_action: str = Field("HUMAN_TRANSFER", description="HUMAN_TRANSFER, VOICEMAIL, HANGUP")
    fallback_forward_number: str = Field("+91 98111 22233", description="Target human number")
    ai_handshake_target_ms: int = Field(380, description="Max acceptable AI answer latency")
    off_hours_voicemail_greeting: str = Field(
        "Thank you for calling. Our team is currently away. Please leave a voicemail after the tone or call back during business hours.",
        description="Greeting spoken during off-hours"
    )
    auto_create_lead: bool = Field(True, description="Auto-create lead from unknown callers")


class InboundRoutingConfigUpdate(BaseModel):
    business_hours_start: Optional[str] = None
    business_hours_end: Optional[str] = None
    timezone: Optional[str] = None
    fallback_action: Optional[str] = None
    fallback_forward_number: Optional[str] = None
    ai_handshake_target_ms: Optional[int] = None
    off_hours_voicemail_greeting: Optional[str] = None
    auto_create_lead: Optional[bool] = None


class InboundRoutingConfigOut(InboundRoutingConfigBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class InboundCallLogItem(BaseModel):
    id: int
    caller_name: str
    caller_phone: str
    called_did: str
    status: str
    duration_seconds: int
    sentiment: str
    route_stage: str
    summary: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

