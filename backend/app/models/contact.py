from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, JSON, Integer, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.core.constants import VALID_CONSENT_STATUSES
from app.models.base import TimeStampedModel


class Company(Base, TimeStampedModel):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    name = Column(String, nullable=False, index=True)
    industry = Column(String, nullable=True)
    website = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)

    contacts = relationship("Contact", back_populates="company", cascade="all, delete-orphan")


class Contact(Base, TimeStampedModel):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="SET NULL"), nullable=True, index=True)
    
    first_name = Column(String, nullable=False, index=True)
    last_name = Column(String, nullable=True)
    email = Column(String, nullable=True, index=True)
    phone = Column(String, nullable=False, index=True)
    title = Column(String, nullable=True)
    
    consent_status = Column(String, default="OPTED_IN", nullable=False)
    consent_updated_at = Column(DateTime, default=datetime.utcnow)
    
    tags = Column(JSON, default=list, nullable=False)
    custom_fields = Column(JSON, default=dict, nullable=False)
    
    notes = Column(Text, nullable=True)

    company = relationship("Company", back_populates="contacts")


class ImportJob(Base):
    """Audit log for CSV/Excel bulk imports as required in the PRD"""
    __tablename__ = "import_jobs"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    filename = Column(String, nullable=False)
    total_rows = Column(Integer, default=0)
    imported_rows = Column(Integer, default=0)
    updated_rows = Column(Integer, default=0)
    duplicate_rows = Column(Integer, default=0)
    failed_rows = Column(Integer, default=0)
    status = Column(String, default="COMPLETED")
    error_summary = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
