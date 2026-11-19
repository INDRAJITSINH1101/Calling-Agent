from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Boolean, Float, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimeStampedModel


class SipTrunk(Base, TimeStampedModel):
    __tablename__ = "sip_trunks"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    name = Column(String(100), nullable=False)
    provider = Column(String(50), default="TWILIO", nullable=False)
    sip_server = Column(String(255), nullable=False)
    transport = Column(String(20), default="UDP", nullable=False)
    username = Column(String(100), nullable=True)
    password_hash = Column(String(255), nullable=True)
    auth_method = Column(String(50), default="CREDENTIALS", nullable=False)
    
    status = Column(String(50), default="ACTIVE", nullable=False, index=True)
    concurrency_limit = Column(Integer, default=10, nullable=False)
    codecs = Column(JSON, default=lambda: ["OPUS", "PCMA", "PCMU"], nullable=False)
    is_default = Column(Boolean, default=False, nullable=False)
    latency_ms = Column(Integer, default=42, nullable=False)
    last_health_check_at = Column(DateTime, default=datetime.utcnow, nullable=True)

    numbers = relationship("PhoneNumber", back_populates="sip_trunk", cascade="all, delete-orphan")


class PhoneNumber(Base, TimeStampedModel):
    __tablename__ = "phone_numbers"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    number = Column(String(50), nullable=False, index=True)
    label = Column(String(100), nullable=False)
    country_code = Column(String(10), default="IN", nullable=False)
    sip_trunk_id = Column(Integer, ForeignKey("sip_trunks.id", ondelete="SET NULL"), nullable=True, index=True)
    
    type = Column(String(50), default="BIDIRECTIONAL", nullable=False)
    assigned_agent_persona = Column(String(100), default="enterprise_sales", nullable=False)
    status = Column(String(50), default="ACTIVE", nullable=False, index=True)
    
    business_hours_start = Column(String(10), default="09:00", nullable=False)
    business_hours_end = Column(String(10), default="19:00", nullable=False)
    fallback_action = Column(String(50), default="HUMAN_TRANSFER", nullable=False)
    fallback_forward_number = Column(String(50), default="+919800000000", nullable=True)
    
    is_default_outbound = Column(Boolean, default=False, nullable=False)
    monthly_cost = Column(Float, default=5.00, nullable=False)

    sip_trunk = relationship("SipTrunk", back_populates="numbers")


class InboundRoutingConfig(Base, TimeStampedModel):
    __tablename__ = "inbound_routing_configs"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    business_hours_start = Column(String(10), default="09:00", nullable=False)
    business_hours_end = Column(String(10), default="19:00", nullable=False)
    timezone = Column(String(50), default="Asia/Kolkata", nullable=False)
    fallback_action = Column(String(50), default="HUMAN_TRANSFER", nullable=False)
    fallback_forward_number = Column(String(50), default="+91 98111 22233", nullable=False)
    ai_handshake_target_ms = Column(Integer, default=380, nullable=False)
    off_hours_voicemail_greeting = Column(
        String(500),
        default="Thank you for calling. Our team is currently away. Please leave a voicemail after the tone or call back during business hours.",
        nullable=False
    )
    auto_create_lead = Column(Boolean, default=True, nullable=False)

