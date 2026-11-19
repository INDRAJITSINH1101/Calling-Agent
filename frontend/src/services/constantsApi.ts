const API_BASE = 'http://localhost:8000/api/v1/constants';

export interface ConstantOption {
  value: string;
  label: string;
  color?: string;
  description?: string;
}

export interface SystemConstants {
  consent_statuses: ConstantOption[];
  lead_stages: ConstantOption[];
  lead_sources: ConstantOption[];
  score_buckets: ConstantOption[];
  rule_field_targets: ConstantOption[];
  rule_operators: ConstantOption[];
  calling_personas: ConstantOption[];
  sip_providers: ConstantOption[];
  sip_transports: ConstantOption[];
  phone_number_types: ConstantOption[];
  routing_fallback_actions: ConstantOption[];
  sip_audio_codecs: ConstantOption[];
  knowledge_document_types?: ConstantOption[];
  knowledge_ingestion_statuses?: ConstantOption[];
  guardrail_actions?: ConstantOption[];
  agent_tones?: ConstantOption[];
}

export const DEFAULT_SYSTEM_CONSTANTS: SystemConstants = {
  consent_statuses: [
    { value: 'OPTED_IN', label: 'Opted-In (Calling Allowed)' },
    { value: 'DND', label: 'DND (Do Not Call)' },
    { value: 'SUPPRESSED', label: 'Suppressed' }
  ],
  lead_stages: [
    { value: 'NEW', label: 'New Leads', color: '#38bdf8' },
    { value: 'CONTACTED', label: 'Contacted', color: '#818cf8' },
    { value: 'QUALIFIED', label: 'Qualified', color: '#f59e0b' },
    { value: 'PROPOSAL', label: 'Proposal / Meeting', color: '#ec4899' },
    { value: 'WON', label: 'Closed Won', color: '#10b981' },
    { value: 'LOST', label: 'Closed Lost', color: '#64748b' }
  ],
  lead_sources: [
    { value: 'INBOUND', label: 'Inbound Website' },
    { value: 'META_ADS', label: 'Meta Lead Ads' },
    { value: 'GOOGLE_ADS', label: 'Google Ads' },
    { value: 'LINKEDIN', label: 'LinkedIn Ads' },
    { value: 'COLD_OUTREACH', label: 'Cold Outreach' },
    { value: 'MANUAL', label: 'Manual Direct Entry' }
  ],
  score_buckets: [
    { value: 'HOT', label: '🔥 Hot (80–100)' },
    { value: 'WARM', label: '☀️ Warm (50–79)' },
    { value: 'COLD', label: '❄️ Cold (0–49)' },
    { value: 'SUPPRESSED', label: '🚫 Suppressed / DND' }
  ],
  rule_field_targets: [
    { value: 'source', label: 'Lead Source (INBOUND, META_ADS, etc.)' },
    { value: 'deal_value', label: 'Deal Value ($ Opportunity Size)' },
    { value: 'phone_and_email', label: 'Verified Phone & Email (Boolean)' },
    { value: 'company_linked', label: 'Company Account Linked (Boolean)' },
    { value: 'company_size', label: 'Company Employee Count' },
    { value: 'tags', label: 'Contact Engagement Tags' },
    { value: 'consent_status', label: 'Consent Status (DND, OPTED_IN, etc.)' }
  ],
  rule_operators: [
    { value: 'equals', label: 'Equals (Exact Match)' },
    { value: 'in_list', label: 'In List (Comma-separated)' },
    { value: 'greater_than_or_equal', label: 'Greater Than or Equal (>=)' },
    { value: 'less_than_or_equal', label: 'Less Than or Equal (<=)' },
    { value: 'contains_any', label: 'Contains Any Tag (Comma-separated)' },
    { value: 'is_true', label: 'Is True (Verified/Present)' }
  ],
  calling_personas: [
    { value: 'RACHEL_ENTERPRISE', label: 'Rachel - Enterprise Sales' },
    { value: 'DAVID_TECH', label: 'David - Technical Solutions Specialist' },
    { value: 'MARCUS_CLOSER', label: 'Marcus - Executive Closing Advisor' },
    { value: 'SARAH_INBOUND', label: 'Sarah - Inbound Customer Concierge' }
  ],
  sip_providers: [
    { value: 'LIVEKIT', label: 'LiveKit Cloud SIP Gateway' },
    { value: 'TWILIO', label: 'Twilio Elastic SIP Trunk' },
    { value: 'TELNYX', label: 'Telnyx Carrier Cloud' },
    { value: 'ASTERISK', label: 'Asterisk PBX / FreePBX' },
    { value: 'GENERIC_SIP', label: 'Custom SIP Provider' }
  ],
  sip_transports: [
    { value: 'UDP', label: 'UDP (Port 5060 - Standard)' },
    { value: 'TCP', label: 'TCP (Port 5060)' },
    { value: 'TLS', label: 'TLS Encrypted (Port 5061)' }
  ],
  phone_number_types: [
    { value: 'BIDIRECTIONAL', label: 'Bidirectional (Inbound + Outbound)' },
    { value: 'INBOUND', label: 'Inbound Reception Line' },
    { value: 'OUTBOUND', label: 'Outbound Campaign Line' }
  ],
  routing_fallback_actions: [
    { value: 'HUMAN_TRANSFER', label: 'Warm Transfer to Human Agent' },
    { value: 'VOICEMAIL', label: 'Record Voicemail & Transcribe' },
    { value: 'HANGUP', label: 'Polite Automated Hangup' }
  ],
  sip_audio_codecs: [
    { value: 'OPUS', label: 'Opus (HD Voice - 48kHz)' },
    { value: 'PCMU', label: 'G.711 u-law (US/Canada)' },
    { value: 'PCMA', label: 'G.711 a-law (India/Europe)' }
  ],
  knowledge_document_types: [
    { value: 'FAQ', label: 'Frequently Asked Questions (FAQ)' },
    { value: 'PRICING', label: 'Pricing & Packages' },
    { value: 'SCRIPT', label: 'Sales Pitch & Call Scripts' },
    { value: 'PRODUCT_MANUAL', label: 'Technical Product Documentation' },
    { value: 'COMPLIANCE', label: 'Regulatory & Compliance Policy' }
  ],
  knowledge_ingestion_statuses: [
    { value: 'READY', label: 'Indexed & Ready', color: '#10b981' },
    { value: 'PROCESSING', label: 'Processing Chunks...', color: '#f59e0b' },
    { value: 'FAILED', label: 'Ingestion Failed', color: '#ef4444' }
  ],
  guardrail_actions: [
    { value: 'WARN_AND_DEFLECT', label: 'Polite Clarification & Deflect' },
    { value: 'BLOCK_AND_ESCALATE', label: 'Block Response & Escalate to Human' },
    { value: 'BLOCK_AND_TERMINATE', label: 'Block Query & Conclude Call' }
  ],
  agent_tones: [
    { value: 'PROFESSIONAL', label: 'Professional & Polished' },
    { value: 'FRIENDLY', label: 'Warm, Welcoming & Friendly' },
    { value: 'ASSERTIVE', label: 'Assertive, Direct & Outcome-Focused' },
    { value: 'EMPATHETIC', label: 'Empathetic & Supportive' },
    { value: 'ANALYTICAL', label: 'Analytical & Technical' }
  ]
};

export const constantsApi = {
  async getAllConstants(): Promise<SystemConstants> {
    try {
      const res = await fetch(API_BASE);
      if (!res.ok) throw new Error('Failed to fetch system constants');
      return await res.json();
    } catch (err) {
      console.warn('Falling back to local default constants:', err);
      return DEFAULT_SYSTEM_CONSTANTS;
    }
  }
};

