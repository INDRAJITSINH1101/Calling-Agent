from sqlalchemy import Column, Integer, String, Text, ForeignKey, JSON, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base
from app.models.base import TimeStampedModel

class Campaign(Base, TimeStampedModel):
    """
    Campaign model for automated batch outreach, audience targeting,
    cadence configuration, and AI calling runs.
    """
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(30), default="DRAFT", index=True)  # DRAFT, SCHEDULED, RUNNING, PAUSED, COMPLETED, CANCELLED
    
    # Associated AI Persona and Caller ID
    persona_id = Column(Integer, ForeignKey("agent_persona_configs.id", ondelete="SET NULL"), nullable=True)
    caller_phone_id = Column(Integer, ForeignKey("phone_numbers.id", ondelete="SET NULL"), nullable=True)
    
    # Audience Targeting Filters JSON: e.g. {"stages": ["NEW"], "min_score": 30, "tags": ["Enterprise"]}
    target_filters = Column(JSON, default=dict)
    
    # Batch Calling Counts & Progress
    total_contacts = Column(Integer, default=0)
    completed_count = Column(Integer, default=0)
    connected_count = Column(Integer, default=0)
    qualified_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    
    # Cadence & Dispatcher Rules
    concurrency_limit = Column(Integer, default=3)
    calls_per_minute = Column(Integer, default=10)
    max_retry_attempts = Column(Integer, default=2)
    retry_cooldown_mins = Column(Integer, default=60)
    active_hours_start = Column(String(10), default="09:00")
    active_hours_end = Column(String(10), default="19:00")

    # Relationships
    persona = relationship("AgentPersonaConfig", foreign_keys=[persona_id], lazy="joined")
    caller_phone = relationship("PhoneNumber", foreign_keys=[caller_phone_id], lazy="joined")
    recipients = relationship("CampaignRecipient", back_populates="campaign", cascade="all, delete-orphan", lazy="select")


class CampaignRecipient(Base, TimeStampedModel):
    """
    Individual contact in a campaign queue tracking dialing attempts,
    retry schedules, and AI call outcomes.
    """
    __tablename__ = "campaign_recipients"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False, index=True)
    contact_id = Column(Integer, ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Status: QUEUED, DIALING, IN_CALL, COMPLETED, RETRY_SCHEDULED, FAILED
    status = Column(String(30), default="QUEUED", index=True)
    attempt_count = Column(Integer, default=0)
    last_attempt_at = Column(DateTime, nullable=True)
    next_retry_at = Column(DateTime, nullable=True, index=True)
    
    last_call_log_id = Column(Integer, ForeignKey("call_logs.id", ondelete="SET NULL"), nullable=True)
    call_outcome = Column(String(40), nullable=True)  # ANSWERED, BUSY, NO_ANSWER, VOICEMAIL, DISQUALIFIED
    qualification_score = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)

    # Relationships
    campaign = relationship("Campaign", back_populates="recipients")
    contact = relationship("Contact", foreign_keys=[contact_id], lazy="joined")
    lead = relationship("Lead", foreign_keys=[lead_id], lazy="joined")
    call_log = relationship("CallLog", foreign_keys=[last_call_log_id], lazy="joined")
