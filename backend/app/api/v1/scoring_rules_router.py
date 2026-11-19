from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.models.scoring_rule import ScoringRule
from app.models.lead import Lead
from app.models.contact import Contact
from app.schemas.scoring_rule_schema import (
    ScoringRuleCreate,
    ScoringRuleUpdate,
    ScoringRuleResponse
)
from app.services.scoring_engine import (
    seed_default_scoring_rules,
    calculate_lead_score,
    DEFAULT_RULES
)

router = APIRouter(prefix="/scoring-rules", tags=["Dynamic Lead Scoring Rules"])

@router.get("", response_model=List[ScoringRuleResponse])
def get_all_scoring_rules(db: Session = Depends(get_db)):
    """Fetch all dynamic scoring rules configured by the admin (excluding soft-deleted)."""
    seed_default_scoring_rules(db)
    rules = db.query(ScoringRule).filter(ScoringRule.is_deleted == False).order_by(ScoringRule.points.desc(), ScoringRule.id.asc()).all()
    return rules

@router.post("", response_model=ScoringRuleResponse, status_code=status.HTTP_201_CREATED)
def create_scoring_rule(payload: ScoringRuleCreate, db: Session = Depends(get_db)):
    """Admin creates a new dynamic scoring rule with custom points and conditions."""
    rule = ScoringRule(
        rule_name=payload.rule_name,
        description=payload.description,
        field_target=payload.field_target,
        operator=payload.operator,
        target_value=payload.target_value,
        points=payload.points,
        is_active=payload.is_active
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule

@router.put("/{rule_id}", response_model=ScoringRuleResponse)
def update_scoring_rule(rule_id: int, payload: ScoringRuleUpdate, db: Session = Depends(get_db)):
    """Admin edits an existing rule's points, condition, description, or active status."""
    rule = db.query(ScoringRule).filter(ScoringRule.id == rule_id, ScoringRule.is_deleted == False).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Scoring rule not found")

    update_data = payload.dict(exclude_unset=True)
    for field, val in update_data.items():
        setattr(rule, field, val)

    db.commit()
    db.refresh(rule)
    return rule

@router.delete("/{rule_id}")
def delete_scoring_rule(rule_id: int, db: Session = Depends(get_db)):
    """Admin soft deletes a custom scoring rule with timestamp logging."""
    rule = db.query(ScoringRule).filter(ScoringRule.id == rule_id, ScoringRule.is_deleted == False).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Scoring rule not found")

    rule.soft_delete()
    db.commit()
    return {"message": "Scoring rule deleted successfully", "id": rule_id}

@router.post("/reset-defaults", response_model=List[ScoringRuleResponse])
def reset_to_defaults(db: Session = Depends(get_db)):
    """Soft deletes existing rules and re-seeds the standard baseline rules."""
    active_rules = db.query(ScoringRule).filter(ScoringRule.is_deleted == False).all()
    for r in active_rules:
        r.soft_delete()
    db.flush()

    for rule_data in DEFAULT_RULES:
        rule = ScoringRule(**rule_data)
        db.add(rule)
    db.commit()
    rules = db.query(ScoringRule).filter(ScoringRule.is_deleted == False).order_by(ScoringRule.points.desc()).all()
    return rules

@router.post("/recalculate-all")
def recalculate_all_leads(db: Session = Depends(get_db)):
    """
    Recalculates scores and explanations for all existing leads in the database
    using the active dynamic scoring rules configured by the admin.
    """
    leads = db.query(Lead).options(joinedload(Lead.contact)).all()
    updated_count = 0

    for lead in leads:
        if lead.contact:
            score, bucket, explanation = calculate_lead_score(
                contact=lead.contact,
                lead_data={
                    "source": lead.source,
                    "deal_value": lead.deal_value
                },
                db=db
            )
            lead.score = score
            lead.bucket = bucket
            lead.score_explanation = explanation
            updated_count += 1

    db.commit()
    return {
        "status": "success",
        "message": f"Successfully re-calculated scores for {updated_count} leads.",
        "recalculated_leads": updated_count
    }
