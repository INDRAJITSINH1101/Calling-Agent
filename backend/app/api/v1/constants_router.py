from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.constants import (
    get_all_system_constants,
    CONSENT_STATUSES,
    LEAD_STAGES,
    LEAD_SOURCES,
    SCORE_BUCKETS,
    RULE_FIELD_TARGETS,
    RULE_OPERATORS,
    SIP_PROVIDERS,
    SIP_TRANSPORTS,
    PHONE_NUMBER_TYPES,
    ROUTING_FALLBACK_ACTIONS,
    SIP_AUDIO_CODECS
)

router = APIRouter(prefix="/constants", tags=["System Constants & Metadata"])

@router.get("")
def get_all_constants(db: Session = Depends(get_db)):
    """Returns all system dropdown choices and metadata dynamically for the frontend."""
    return get_all_system_constants(db=db)

@router.get("/consent-statuses")
def get_consent_statuses():
    """Returns TCPA & Calling consent status options."""
    return CONSENT_STATUSES

@router.get("/lead-stages")
def get_lead_stages():
    """Returns pipeline stage options with colors."""
    return LEAD_STAGES

@router.get("/lead-sources")
def get_lead_sources():
    """Returns lead acquisition channel options."""
    return LEAD_SOURCES

@router.get("/score-buckets")
def get_score_buckets():
    """Returns scoring bucket categories."""
    return SCORE_BUCKETS

@router.get("/sip-providers")
def get_sip_providers():
    """Returns SIP provider and gateway options."""
    return SIP_PROVIDERS

@router.get("/phone-number-types")
def get_phone_number_types():
    """Returns virtual phone number assignment types."""
    return PHONE_NUMBER_TYPES

@router.get("/routing-fallback-actions")
def get_routing_fallback_actions():
    """Returns inbound routing fallback strategy choices."""
    return ROUTING_FALLBACK_ACTIONS

