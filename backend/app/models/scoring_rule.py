from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime
from app.core.database import Base
from app.models.base import TimeStampedModel

class ScoringRule(Base, TimeStampedModel):
    __tablename__ = "scoring_rules"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    rule_name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    
    field_target = Column(String(50), nullable=False)
    operator = Column(String(30), nullable=False, default="equals")
    target_value = Column(String(255), nullable=False)
    points = Column(Integer, nullable=False, default=10)
    is_active = Column(Boolean, default=True, nullable=False)
