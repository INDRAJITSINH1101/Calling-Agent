const API_BASE = 'http://localhost:8000/api/v1';

export interface CampaignStats {
  total_campaigns: number;
  active_campaigns: number;
  total_contacts_queued: number;
  total_calls_placed: number;
  overall_connect_rate: number;
  total_leads_qualified: number;
}

export interface Campaign {
  id: number;
  name: string;
  description?: string;
  status: 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  persona_id?: number;
  persona_name?: string;
  caller_phone_id?: number;
  caller_phone_number?: string;
  target_filters?: {
    stages?: string[];
    min_score?: number;
    tags?: string[];
    search?: string;
  };
  total_contacts: number;
  completed_count: number;
  connected_count: number;
  qualified_count: number;
  failed_count: number;
  progress_percentage: number;
  concurrency_limit: number;
  calls_per_minute: number;
  max_retry_attempts: number;
  retry_cooldown_mins: number;
  active_hours_start: string;
  active_hours_end: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignRecipient {
  id: number;
  campaign_id: number;
  contact_id: number;
  contact_name: string;
  contact_phone: string;
  company_name?: string;
  lead_id?: number;
  lead_stage?: string;
  status: 'QUEUED' | 'DIALING' | 'IN_CALL' | 'COMPLETED' | 'RETRY_SCHEDULED' | 'FAILED';
  attempt_count: number;
  last_attempt_at?: string;
  next_retry_at?: string;
  last_call_log_id?: number;
  call_outcome?: string;
  qualification_score?: number;
  created_at: string;
}

export interface AudiencePreviewResponse {
  total_eligible: number;
  sample_contacts: Array<{
    id: number;
    name: string;
    phone: string;
    company?: string;
    lead_stage?: string;
    lead_score?: number;
  }>;
}

export interface CampaignCreatePayload {
  name: string;
  description?: string;
  persona_id?: number;
  caller_phone_id?: number;
  target_filters?: {
    stages?: string[];
    min_score?: number;
    tags?: string[];
    search?: string;
  };
  concurrency_limit?: number;
  calls_per_minute?: number;
  max_retry_attempts?: number;
  retry_cooldown_mins?: number;
  active_hours_start?: string;
  active_hours_end?: string;
}

export const campaignsApi = {
  getStats: async (): Promise<CampaignStats> => {
    const res = await fetch(`${API_BASE}/campaigns/stats`);
    if (!res.ok) throw new Error('Failed to fetch campaign stats');
    return res.json();
  },

  getCampaigns: async (status?: string, search?: string): Promise<Campaign[]> => {
    const params = new URLSearchParams();
    if (status && status !== 'ALL') params.append('status', status);
    if (search) params.append('search', search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/campaigns${qs}`);
    if (!res.ok) throw new Error('Failed to fetch campaigns');
    return res.json();
  },

  getCampaign: async (id: number): Promise<Campaign> => {
    const res = await fetch(`${API_BASE}/campaigns/${id}`);
    if (!res.ok) throw new Error('Failed to fetch campaign details');
    return res.json();
  },

  getAudiencePreview: async (filters: { stages?: string[]; min_score?: number; tags?: string[]; search?: string }): Promise<AudiencePreviewResponse> => {
    const res = await fetch(`${API_BASE}/campaigns/audience-preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filters })
    });
    if (!res.ok) throw new Error('Failed to fetch audience preview');
    return res.json();
  },

  createCampaign: async (data: CampaignCreatePayload): Promise<Campaign> => {
    const res = await fetch(`${API_BASE}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to create campaign');
    }
    return res.json();
  },

  deleteCampaign: async (id: number): Promise<{ message: string }> => {
    const res = await fetch(`${API_BASE}/campaigns/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete campaign');
    return res.json();
  },

  startCampaign: async (id: number): Promise<Campaign> => {
    const res = await fetch(`${API_BASE}/campaigns/${id}/start`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to start campaign');
    return res.json();
  },

  pauseCampaign: async (id: number): Promise<Campaign> => {
    const res = await fetch(`${API_BASE}/campaigns/${id}/pause`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to pause campaign');
    return res.json();
  },

  resumeCampaign: async (id: number): Promise<Campaign> => {
    const res = await fetch(`${API_BASE}/campaigns/${id}/resume`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to resume campaign');
    return res.json();
  },

  stopCampaign: async (id: number): Promise<Campaign> => {
    const res = await fetch(`${API_BASE}/campaigns/${id}/stop`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to stop campaign');
    return res.json();
  },

  getRecipients: async (id: number, status?: string): Promise<CampaignRecipient[]> => {
    const params = new URLSearchParams();
    if (status && status !== 'ALL') params.append('status', status);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/campaigns/${id}/recipients${qs}`);
    if (!res.ok) throw new Error('Failed to fetch recipients');
    return res.json();
  }
};
