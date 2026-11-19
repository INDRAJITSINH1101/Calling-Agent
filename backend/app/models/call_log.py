from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimeStampedModel


class CallLog(Base, TimeStampedModel):
    __tablename__ = "call_logs"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    contact_id = Column(Integer, ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="SET NULL"), nullable=True, index=True)
    
    status = Column(String(50), default="COMPLETED", nullable=False, index=True)
    direction = Column(String(20), default="OUTBOUND", nullable=False)
    duration_seconds = Column(Integer, default=0, nullable=False)
    provider_used = Column(String(50), default="groq", nullable=False)
    
    sentiment = Column(String(20), default="NEUTRAL", nullable=False)
    summary = Column(Text, nullable=True)
    key_takeaways = Column(JSON, default=list, nullable=False)
    recording_url = Column(String(255), nullable=True)

    contact = relationship("Contact", backref="call_logs")
    lead = relationship("Lead", backref="call_logs")
    transcripts = relationship("CallTranscript", back_populates="call_log", cascade="all, delete-orphan", order_by="CallTranscript.id")


class CallTranscript(Base, TimeStampedModel):
    __tablename__ = "call_transcripts"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    call_log_id = Column(Integer, ForeignKey("call_logs.id", ondelete="CASCADE"), nullable=False, index=True)
    
    speaker = Column(String(20), nullable=False)
    message = Column(Text, nullable=False)
    timestamp_offset_ms = Column(Integer, default=0, nullable=False)
    tool_calls = Column(JSON, default=list, nullable=True)

    call_log = relationship("CallLog", back_populates="transcripts")
