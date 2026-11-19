from typing import Tuple, List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.contact import Contact
from app.models.scoring_rule import ScoringRule

DEFAULT_RULES = [
    {
        "rule_name": "Paid / Inbound Lead Source",
        "description": "Lead originated from verified active campaign: Meta, Google, LinkedIn, or Inbound",
        "field_target": "source",
        "operator": "in_list",
        "target_value": "INBOUND,META_ADS,LINKEDIN,GOOGLE_ADS",
        "points": 25,
        "is_active": True
    },
    {
        "rule_name": "Verified Contact Data",
        "description": "Both normalized phone number and email address are provided",
        "field_target": "phone_and_email",
        "operator": "is_true",
        "target_value": "true",
        "points": 15,
        "is_active": True
    },
    {
        "rule_name": "Company Account Linked",
        "description": "Contact is linked to an identified business entity",
        "field_target": "company_linked",
        "operator": "is_true",
        "target_value": "true",
        "points": 10,
        "is_active": True
    },
    {
        "rule_name": "Enterprise High-Value Deal",
        "description": "Deal value of $10,000+ qualifies for enterprise priority",
        "field_target": "deal_value",
        "operator": "greater_than_or_equal",
        "target_value": "10000",
        "points": 15,
        "is_active": True
    },
    {
        "rule_name": "Mid-Tier Opportunity",
        "description": "Deal value of $2,500+ indicates serious purchase intent",
        "field_target": "deal_value",
        "operator": "greater_than_or_equal",
        "target_value": "2500",
        "points": 5,
        "is_active": True
    },
    {
        "rule_name": "High-Intent Behavioral Tag",
        "description": "Contact has positive sales or engagement tags (VIP, Ready-To-Buy, Webinar)",
        "field_target": "tags",
        "operator": "contains_any",
        "target_value": "vip,hot-lead,high-intent,webinar-attended,ready-to-buy",
        "points": 15,
        "is_active": True
    },
    {
        "rule_name": "Negative Outcome Signal",
        "description": "Recorded past negative disposition (Unresponsive, Wrong Number, Hangup)",
        "field_target": "tags",
        "operator": "contains_any",
        "target_value": "unresponsive,wrong-number,not-interested,hangup",
        "points": -25,
        "is_active": True
    },
    {
        "rule_name": "DND Regulatory Restriction",
        "description": "Contact requested Do-Not-Call (DND). Outreach blocked.",
        "field_target": "consent_status",
        "operator": "equals",
        "target_value": "DND",
        "points": -50,
        "is_active": True
    },
    {
        "rule_name": "Global Suppression List",
        "description": "Contact is on global suppression / opt-out list",
        "field_target": "consent_status",
        "operator": "equals",
        "target_value": "SUPPRESSED",
        "points": -60,
        "is_active": True
    }
]

def seed_default_scoring_rules(db: Session):
    """Initializes default scoring rules in the database if none exist."""
    existing_count = db.query(ScoringRule).filter(ScoringRule.is_deleted == False).count()
    if existing_count == 0:
        for rule_data in DEFAULT_RULES:
            rule = ScoringRule(**rule_data)
            db.add(rule)
        db.commit()

def evaluate_single_rule(rule: ScoringRule, contact: Contact, lead_data: Dict[str, Any]) -> Tuple[bool, str]:
    """
    Evaluates whether a dynamic rule matches the contact & lead context.
    Returns (matched: bool, explanation_reason: str).
    """
    field = rule.field_target.lower()
    op = rule.operator.lower()
    target_val = rule.target_value.strip()

    # Extract target field value from contact or lead
    if field == "source":
        actual = str(lead_data.get("source", "MANUAL")).upper()
        if op == "equals":
            if actual == target_val.upper():
                return True, rule.description or f"Source matches '{target_val}'"
        elif op == "in_list":
            valid_list = [x.strip().upper() for x in target_val.split(",")]
            if actual in valid_list:
                return True, rule.description or f"Source '{actual}' is in authorized list"

    elif field == "deal_value":
        try:
            actual = float(lead_data.get("deal_value", 0.0))
            threshold = float(target_val)
            if op in ["greater_than_or_equal", "gte"] and actual >= threshold:
                return True, rule.description or f"Deal value (${actual:,.2f}) >= threshold (${threshold:,.2f})"
            elif op in ["less_than_or_equal", "lte"] and actual <= threshold:
                return True, rule.description or f"Deal value (${actual:,.2f}) <= threshold (${threshold:,.2f})"
            elif op == "equals" and actual == threshold:
                return True, rule.description or f"Deal value equals ${threshold:,.2f}"
        except (ValueError, TypeError):
            pass

    elif field == "phone_and_email":
        has_both = bool(contact.phone and contact.email)
        if op == "is_true" and has_both:
            return True, rule.description or "Both phone and email are verified"
        elif op == "is_false" and not has_both:
            return True, rule.description or "Missing verified phone or email"

    elif field == "company_linked":
        is_linked = bool(contact.company_id or getattr(contact, "company", None))
        if op == "is_true" and is_linked:
            return True, rule.description or "Contact is linked to a business entity"
        elif op == "is_false" and not is_linked:
            return True, rule.description or "No business entity account associated"

    elif field == "company_size":
        company = getattr(contact, "company", None)
        size = getattr(company, "employee_count", 0) if company else 0
        try:
            threshold = int(target_val)
            if op in ["greater_than_or_equal", "gte"] and size >= threshold:
                return True, rule.description or f"Company employee count ({size}) >= {threshold}"
            elif op in ["less_than_or_equal", "lte"] and size <= threshold:
                return True, rule.description or f"Company employee count ({size}) <= {threshold}"
        except (ValueError, TypeError):
            pass

    elif field == "tags":
        contact_tags = [t.lower().strip() for t in (contact.tags or [])]
        rule_tags = [t.lower().strip() for t in target_val.split(",") if t.strip()]
        if op == "contains_any":
            matched_tags = [t for t in rule_tags if t in contact_tags]
            if matched_tags:
                return True, rule.description or f"Matched intent tags: {', '.join(matched_tags)}"
        elif op == "equals":
            if any(t == target_val.lower() for t in contact_tags):
                return True, rule.description or f"Tagged with '{target_val}'"

    elif field == "consent_status":
        actual = str(contact.consent_status or "OPTED_IN").upper()
        if op == "equals" and actual == target_val.upper():
            return True, rule.description or f"Consent status is '{actual}'"
        elif op == "in_list":
            valid_list = [x.strip().upper() for x in target_val.split(",")]
            if actual in valid_list:
                return True, rule.description or f"Consent status '{actual}' matches restriction"

    return False, ""

def calculate_lead_score(
    contact: Contact,
    lead_data: Dict[str, Any],
    db: Optional[Session] = None
) -> Tuple[int, str, List[Dict[str, Any]]]:
    """
    Dynamic, 100% Explainable Lead Scoring Engine (0-100).
    Evaluates dynamic rules configured by the Admin in the database.
    If no DB session is provided, evaluates active default rules safely.
    """
    explanation: List[Dict[str, Any]] = []
    current_score = 30  # Baseline initial score

    explanation.append({
        "rule": "Baseline Lead Score",
        "points": 30,
        "reason": "Default starting score for newly created leads"
    })

    # Fetch dynamic rules from database
    rules: List[ScoringRule] = []
    if db is not None:
        try:
            # Auto-seed if database table is empty
            seed_default_scoring_rules(db)
            rules = db.query(ScoringRule).filter(ScoringRule.is_active == True, ScoringRule.is_deleted == False).all()
        except Exception:
            rules = []

    if rules:
        # Dynamically evaluate admin rules
        for rule in rules:
            matched, reason = evaluate_single_rule(rule, contact, lead_data)
            if matched:
                current_score += rule.points
                explanation.append({
                    "rule": rule.rule_name,
                    "points": rule.points,
                    "reason": reason
                })
    else:
        # In-memory fallback if DB not provided or error
        source = str(lead_data.get("source", "MANUAL")).upper()
        deal_value = float(lead_data.get("deal_value", 0.0))
        tags = [t.lower() for t in (contact.tags or [])]
        consent = (contact.consent_status or "OPTED_IN").upper()

        if source in ["INBOUND", "META_ADS", "LINKEDIN", "GOOGLE_ADS"]:
            current_score += 25
            explanation.append({
                "rule": "Paid / Inbound Lead Source",
                "points": 25,
                "reason": f"Lead originated from verified active campaign: {source}"
            })
        if contact.phone and contact.email:
            current_score += 15
            explanation.append({
                "rule": "Verified Contact Data",
                "points": 15,
                "reason": "Both normalized phone number and email address are provided"
            })
        if contact.company_id or getattr(contact, "company", None):
            current_score += 10
            explanation.append({
                "rule": "Company Account Linked",
                "points": 10,
                "reason": "Contact is linked to an identified business entity"
            })
        if deal_value >= 10000:
            current_score += 15
            explanation.append({
                "rule": "High-Value Opportunity",
                "points": 15,
                "reason": f"Deal value of ${deal_value:,.2f} qualifies for enterprise priority"
            })
        elif deal_value >= 2500:
            current_score += 5
            explanation.append({
                "rule": "Mid-Tier Opportunity",
                "points": 5,
                "reason": f"Deal value of ${deal_value:,.2f} indicates serious intent"
            })
        if any(t in tags for t in ["vip", "hot-lead", "high-intent", "webinar-attended"]):
            current_score += 15
            explanation.append({
                "rule": "High-Intent Behavioral Tag",
                "points": 15,
                "reason": "Contact has positive engagement tags (VIP / High-Intent)"
            })
        if consent == "DND":
            current_score -= 50
            explanation.append({
                "rule": "DND Regulatory Restriction",
                "points": -50,
                "reason": "Contact requested Do-Not-Call (DND). Outreach blocked."
            })
        elif consent == "SUPPRESSED":
            current_score -= 60
            explanation.append({
                "rule": "Global Suppression List",
                "points": -60,
                "reason": "Contact is on global suppression / opt-out list"
            })
        if any(t in tags for t in ["unresponsive", "wrong-number", "not-interested"]):
            current_score -= 25
            explanation.append({
                "rule": "Negative Outcome Signal",
                "points": -25,
                "reason": "Recorded past negative disposition (Unresponsive / Not Interested)"
            })

    # Clamp score to 0 - 100 range
    final_score = max(0, min(100, current_score))

    # Bucket classification
    consent = (contact.consent_status or "OPTED_IN").upper()
    if consent in ["DND", "SUPPRESSED"]:
        bucket = "SUPPRESSED"
    elif final_score >= 80:
        bucket = "HOT"
    elif final_score >= 50:
        bucket = "WARM"
    else:
        bucket = "COLD"

    return final_score, bucket, explanation
