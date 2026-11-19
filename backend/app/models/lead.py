from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.core.constants import VALID_STAGES, VALID_SOURCES, VALID_BUCKETS
from app.models.base import TimeStampedModel


class Lead(Base, TimeStampedModel):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    contact_id = Column(Integer, ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False, index=True)
    
    stage = Column(String, default="NEW", nullable=False, index=True)
    
    score = Column(Integer, default=50, nullable=False, index=True)
    bucket = Column(String, default="WARM", nullable=False, index=True)
    
    score_explanation = Column(JSON, default=list, nullable=False)
    
    source = Column(String, default="MANUAL", nullable=False)
    deal_value = Column(Float, default=0.0, nullable=False)
    owner_name = Column(String, default="Devdutt Sales Team", nullable=True)
    notes = Column(Text, nullable=True)

    contact = relationship("Contact", backref="leads")
