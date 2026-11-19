"""
Central System Constants & Dropdown Options Repository
Any new options, stages, consent types, or sources added here are automatically
propagated to Backend models, validations, and the Frontend dropdowns via API.
"""

from typing import List, Dict, Any, Optional

# 1. TCPA & Calling Consent Statuses
CONSENT_STATUSES: List[Dict[str, str]] = [
    {"value": "OPTED_IN", "label": "Opted-In (Calling Allowed)"},
    {"value": "DND", "label": "DND (Do Not Call)"},
    {"value": "SUPPRESSED", "label": "Suppressed"}
]

# 2. Pipeline Stages (Order, Display Labels, and Visual Stage Colors)
LEAD_STAGES: List[Dict[str, str]] = [
    {"value": "NEW", "label": "New Leads", "color": "#38bdf8"},
    {"value": "CONTACTED", "label": "Contacted", "color": "#818cf8"},
    {"value": "QUALIFIED", "label": "Qualified", "color": "#f59e0b"},
    {"value": "PROPOSAL", "label": "Proposal / Meeting", "color": "#ec4899"},
    {"value": "WON", "label": "Closed Won", "color": "#10b981"},
    {"value": "LOST", "label": "Closed Lost", "color": "#64748b"}
]

# 3. Lead Attribution Sources
LEAD_SOURCES: List[Dict[str, str]] = [
    {"value": "INBOUND", "label": "Inbound Website"},
    {"value": "META_ADS", "label": "Meta Lead Ads"},
    {"value": "GOOGLE_ADS", "label": "Google Ads"},
    {"value": "LINKEDIN", "label": "LinkedIn Ads"},
    {"value": "COLD_OUTREACH", "label": "Cold Outreach"},
    {"value": "MANUAL", "label": "Manual Direct Entry"}
]

# 4. Transparent Lead Scoring Buckets
SCORE_BUCKETS: List[Dict[str, str]] = [
    {"value": "HOT", "label": "🔥 Hot (80–100)"},
    {"value": "WARM", "label": "☀️ Warm (50–79)"},
    {"value": "COLD", "label": "❄️ Cold (0–49)"},
    {"value": "SUPPRESSED", "label": "🚫 Suppressed / DND"}
]

# 5. Dynamic Lead Scoring Target Properties
RULE_FIELD_TARGETS: List[Dict[str, str]] = [
    {"value": "source", "label": "Lead Source (INBOUND, META_ADS, etc.)"},
    {"value": "deal_value", "label": "Deal Value ($ Opportunity Size)"},
    {"value": "phone_and_email", "label": "Verified Phone & Email (Boolean)"},
    {"value": "company_linked", "label": "Company Account Linked (Boolean)"},
    {"value": "company_size", "label": "Company Employee Count"},
    {"value": "tags", "label": "Contact Engagement Tags"},
    {"value": "consent_status", "label": "Consent Status (DND, OPTED_IN, etc.)"}
]

# 6. Dynamic Matching Operators
RULE_OPERATORS: List[Dict[str, str]] = [
    {"value": "equals", "label": "Equals (Exact Match)"},
    {"value": "in_list", "label": "In List (Comma-separated)"},
    {"value": "greater_than_or_equal", "label": "Greater Than or Equal (>=)"},
    {"value": "less_than_or_equal", "label": "Less Than or Equal (<=)"},
    {"value": "contains_any", "label": "Contains Any Tag (Comma-separated)"},
    {"value": "is_true", "label": "Is True (Verified/Present)"}
]

# 7. AI Calling Personas & Scripts (Dynamic Database Fallback)
CALLING_PERSONAS: List[Dict[str, str]] = [
    {"value": "RACHEL_ENTERPRISE", "label": "Rachel - Enterprise Sales"},
    {"value": "DAVID_TECH", "label": "David - Technical Solutions Specialist"},
    {"value": "MARCUS_CLOSER", "label": "Marcus - Executive Closing Advisor"},
    {"value": "SARAH_INBOUND", "label": "Sarah - Inbound Customer Concierge"}
]

# 8. SIP Telephony Providers & Gateways
SIP_PROVIDERS: List[Dict[str, str]] = [
    {"value": "LIVEKIT", "label": "LiveKit Cloud SIP Gateway"},
    {"value": "TWILIO", "label": "Twilio Elastic SIP Trunk"},
    {"value": "TELNYX", "label": "Telnyx Carrier Cloud"},
    {"value": "ASTERISK", "label": "Asterisk PBX / FreePBX"},
    {"value": "GENERIC_SIP", "label": "Custom SIP Provider"}
]

# 9. SIP Transport Protocols
SIP_TRANSPORTS: List[Dict[str, str]] = [
    {"value": "UDP", "label": "UDP (Port 5060 - Standard)"},
    {"value": "TCP", "label": "TCP (Port 5060)"},
    {"value": "TLS", "label": "TLS Encrypted (Port 5061)"}
]

# 10. Virtual Phone Number (DID) Usage Types
PHONE_NUMBER_TYPES: List[Dict[str, str]] = [
    {"value": "BIDIRECTIONAL", "label": "Bidirectional (Inbound + Outbound)"},
    {"value": "INBOUND", "label": "Inbound Reception Line"},
    {"value": "OUTBOUND", "label": "Outbound Campaign Line"}
]

# 11. Inbound Routing Fallback Strategies
ROUTING_FALLBACK_ACTIONS: List[Dict[str, str]] = [
    {"value": "HUMAN_TRANSFER", "label": "Warm Transfer to Human Agent"},
    {"value": "VOICEMAIL", "label": "Record Voicemail & Transcribe"},
    {"value": "HANGUP", "label": "Polite Automated Hangup"}
]

# 12. Audio Telephony Codecs
SIP_AUDIO_CODECS: List[Dict[str, str]] = [
    {"value": "OPUS", "label": "Opus (HD Voice - 48kHz)"},
    {"value": "PCMU", "label": "G.711 u-law (US/Canada)"},
    {"value": "PCMA", "label": "G.711 a-law (India/Europe)"}
]

# Helper Value-Only Lists for Backend Validation
VALID_CONSENT_STATUSES = [item["value"] for item in CONSENT_STATUSES]
VALID_STAGES = [item["value"] for item in LEAD_STAGES]
VALID_SOURCES = [item["value"] for item in LEAD_SOURCES]
VALID_BUCKETS = [item["value"] for item in SCORE_BUCKETS]
VALID_FIELD_TARGETS = [item["value"] for item in RULE_FIELD_TARGETS]
VALID_OPERATORS = [item["value"] for item in RULE_OPERATORS]
VALID_PERSONAS = [item["value"] for item in CALLING_PERSONAS]
VALID_SIP_PROVIDERS = [item["value"] for item in SIP_PROVIDERS]
VALID_SIP_TRANSPORTS = [item["value"] for item in SIP_TRANSPORTS]
VALID_NUMBER_TYPES = [item["value"] for item in PHONE_NUMBER_TYPES]
VALID_FALLBACK_ACTIONS = [item["value"] for item in ROUTING_FALLBACK_ACTIONS]
VALID_CODECS = [item["value"] for item in SIP_AUDIO_CODECS]

# --- Training Studio & Knowledge Ingestion Constants ---
KNOWLEDGE_DOCUMENT_TYPES = [
    {"value": "FAQ", "label": "FAQ & Q/A Pairs"},
    {"value": "POLICY", "label": "Company Policy & Terms"},
    {"value": "PRODUCT_MANUAL", "label": "Product Specifications"},
    {"value": "SALES_SCRIPT", "label": "Sales Scripts & Objections"},
    {"value": "GENERAL", "label": "General Knowledge"}
]

KNOWLEDGE_INGESTION_STATUSES = [
    {"value": "READY", "label": "Ready for Live Retrieval"},
    {"value": "PROCESSING", "label": "Extracting & Chunking"},
    {"value": "FAILED", "label": "Extraction Failed"}
]

GUARDRAIL_ACTIONS = [
    {"value": "WARN_AND_DEFLECT", "label": "Politely Deflect & Redirect"},
    {"value": "ESCALATE_TO_HUMAN", "label": "Trigger Warm Human Transfer"},
    {"value": "TERMINATE_CALL", "label": "Polite Call Wrap-up"}
]

AGENT_TONES = [
    {"value": "PROFESSIONAL", "label": "Professional & Corporate"},
    {"value": "FRIENDLY", "label": "Warm & Empathetic"},
    {"value": "PERSUASIVE", "label": "Persuasive Closer"},
    {"value": "CONSULTATIVE", "label": "Consultative & Analytical"}
]

VALID_DOCUMENT_TYPES = [item["value"] for item in KNOWLEDGE_DOCUMENT_TYPES]
VALID_INGESTION_STATUSES = [item["value"] for item in KNOWLEDGE_INGESTION_STATUSES]
VALID_GUARDRAIL_ACTIONS = [item["value"] for item in GUARDRAIL_ACTIONS]
VALID_AGENT_TONES = [item["value"] for item in AGENT_TONES]

def get_all_system_constants(db: Optional[Any] = None) -> Dict[str, Any]:
    """Returns a consolidated dictionary of all system options for frontend dropdowns."""
    active_personas = CALLING_PERSONAS
    if db:
        try:
            from app.models.training import AgentPersonaConfig
            db_personas = db.query(AgentPersonaConfig).all()
            if db_personas:
                active_personas = [{"value": p.persona_code, "label": p.name} for p in db_personas]
        except Exception:
            pass

    return {
        "consent_statuses": CONSENT_STATUSES,
        "lead_stages": LEAD_STAGES,
        "lead_sources": LEAD_SOURCES,
        "score_buckets": SCORE_BUCKETS,
        "rule_field_targets": RULE_FIELD_TARGETS,
        "rule_operators": RULE_OPERATORS,
        "calling_personas": active_personas,
        "sip_providers": SIP_PROVIDERS,
        "sip_transports": SIP_TRANSPORTS,
        "phone_number_types": PHONE_NUMBER_TYPES,
        "routing_fallback_actions": ROUTING_FALLBACK_ACTIONS,
        "sip_audio_codecs": SIP_AUDIO_CODECS,
        "knowledge_document_types": KNOWLEDGE_DOCUMENT_TYPES,
        "knowledge_ingestion_statuses": KNOWLEDGE_INGESTION_STATUSES,
        "guardrail_actions": GUARDRAIL_ACTIONS,
        "agent_tones": AGENT_TONES
    }
