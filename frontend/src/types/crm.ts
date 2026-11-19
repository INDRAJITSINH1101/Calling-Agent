export type ConsentStatus = 'OPTED_IN' | 'DND' | 'SUPPRESSED';
export type ScoreBucket = 'HOT' | 'WARM' | 'COLD' | 'SUPPRESSED';
export type LeadStage = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'WON' | 'LOST';

export interface Company {
  id?: number;
  name: string;
  domain?: string;
  industry?: string;
  size?: number;
  created_at?: string;
}

export interface Contact {
  id: number;
  first_name: string;
  last_name: string;
  title?: string;
  email?: string;
  phone: string;
  consent_state: string;
  consent_status?: string;
  tags: string[];
  notes?: string;
  company_id?: number;
  company_name?: string;
  company?: Company;
  created_at: string;
  updated_at: string;
}

export interface ContactsResponse {
  total: number;
  page: number;
  page_size: number;
  items?: Contact[];
  contacts?: Contact[];
}

export interface Lead {
  id: number;
  contact_id?: number;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  contact?: {
    first_name: string;
    last_name: string;
    phone: string;
    email?: string;
    title?: string;
    company?: {
      name: string;
      domain?: string;
    };
  };
  stage: string;
  score: number;
  score_bucket: ScoreBucket;
  bucket: ScoreBucket;
  source: string;
  deal_value?: number;
  notes?: string;
  company_name?: string;
  created_at: string;
  updated_at: string;
}

export interface LeadsResponse {
  total: number;
  page: number;
  page_size: number;
  items?: Lead[];
  leads?: Lead[];
}

export interface PipelineSummary {
  stage_counts: Record<string, any>;
  stages?: Record<string, any>;
  total_leads: number;
  high_intent_leads: number;
  total_pipeline_value?: number;
  hot_count?: number;
  warm_count?: number;
}

export interface ScoringRule {
  id: number;
  name: string;
  field_target: string;
  operator: string;
  threshold_value: string;
  score_delta: number;
  is_active: boolean;
  description?: string;
  created_at?: string;
}
