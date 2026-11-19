from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

class ScoringRuleBase(BaseModel):
    rule_name: str = Field(..., max_length=100, description="Display name of the rule")
    description: Optional[str] = Field(None, max_length=255, description="Explanation shown in score breakdown")
    field_target: str = Field(..., description="Target property: source, deal_value, phone_and_email, company_linked, company_size, tags, consent_status")
    operator: str = Field(default="equals", description="equals, in_list, greater_than_or_equal, less_than_or_equal, contains_any, is_true")
    target_value: str = Field(..., description="Value or comma-separated list of values to match against")
    points: int = Field(..., ge=-100, le=100, description="Points to award or deduct (-100 to +100)")
    is_active: bool = Field(default=True, description="Whether this rule is evaluated during scoring")

class ScoringRuleCreate(ScoringRuleBase):
    pass

class ScoringRuleUpdate(BaseModel):
    rule_name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=255)
    field_target: Optional[str] = None
    operator: Optional[str] = None
    target_value: Optional[str] = None
    points: Optional[int] = Field(None, ge=-100, le=100)
    is_active: Optional[bool] = None

class ScoringRuleResponse(ScoringRuleBase):
    id: int
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None
    is_deleted: bool = False

    class Config:
        from_attributes = True
