const API_BASE = 'http://localhost:8000/api/v1/telephony';

export interface SipTrunk {
  id: number;
  name: string;
  provider: string;
  sip_server: string;
  transport: string;
  username?: string;
  auth_method: string;
  status: string;
  concurrency_limit: number;
  codecs: string[];
  is_default: boolean;
  latency_ms: number;
  last_health_check_at?: string;
  created_at: string;
}

export interface PhoneNumber {
  id: number;
  number: string;
  label: string;
  type: string;
  sip_trunk_id?: number;
  sip_trunk_name?: string;
  assigned_persona: string;
  assigned_agent_persona?: string;
  status: string;
  is_primary_outbound: boolean;
  is_default_outbound?: boolean;
  business_hours_start?: string;
  business_hours_end?: string;
  fallback_action?: string;
  fallback_target?: string;
  fallback_forward_number?: string;
  created_at: string;
}

export interface TelephonySummary {
  total_trunks: number;
  active_trunks: number;
  total_numbers: number;
  active_channels: number;
  max_concurrency: number;
  avg_latency_ms: number;
}

export interface TrunkTestResult {
  trunk_id: number;
  trunk_name: string;
  status: 'SUCCESS' | 'FAILED';
  latency_ms: number;
  sip_response_code: number;
  message: string;
}

export interface TestCallResult {
  call_sid: string;
  call_id?: string;
  sip_trunk_name: string;
  trunk_name?: string;
  target_number: string;
  audio_codec: string;
  negotiated_codec?: string;
  round_trip_ms: number;
  latency_ms?: number;
  packet_loss_percent: number;
  jitter_ms: number;
  transcript_preview: string;
}

export interface InboundRoutingConfig {
  default_inbound_persona: string;
  fallback_action: string;
  fallback_target_number?: string;
  fallback_forward_number?: string;
  business_hours_enabled: boolean;
  business_hours_start: string;
  business_hours_end: string;
  business_days: string[];
  after_hours_message: string;
  ai_handshake_target_ms?: number;
  off_hours_voicemail_greeting?: string;
  auto_create_lead?: boolean;
}

export const telephonyApi = {
  async getSummary(): Promise<TelephonySummary> {
    const res = await fetch(`${API_BASE}/summary`);
    if (!res.ok) throw new Error('Failed to fetch telephony summary');
    return res.json();
  },

  async getTrunks(): Promise<SipTrunk[]> {
    const res = await fetch(`${API_BASE}/trunks`);
    if (!res.ok) throw new Error('Failed to fetch SIP trunks');
    return res.json();
  },

  async createTrunk(data: any): Promise<SipTrunk> {
    const res = await fetch(`${API_BASE}/trunks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to create SIP trunk');
    }
    return res.json();
  },

  async updateTrunk(id: number, data: any): Promise<SipTrunk> {
    const res = await fetch(`${API_BASE}/trunks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update SIP trunk');
    return res.json();
  },

  async deleteTrunk(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/trunks/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete SIP trunk');
  },

  async testTrunk(id: number): Promise<TrunkTestResult> {
    const res = await fetch(`${API_BASE}/trunks/${id}/test`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to test SIP trunk');
    return res.json();
  },

  async getNumbers(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    type?: string;
  }): Promise<{ items: PhoneNumber[]; total: number; page: number; pageSize: number }> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.pageSize) query.append('page_size', String(params.pageSize));
    if (params?.search) query.append('search', params.search);
    if (params?.type) query.append('type', params.type);

    const res = await fetch(`${API_BASE}/numbers?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch phone numbers');
    return res.json();
  },

  async createNumber(data: any): Promise<PhoneNumber> {
    const res = await fetch(`${API_BASE}/numbers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to provision number');
    }
    return res.json();
  },

  async updateNumber(id: number, data: any): Promise<PhoneNumber> {
    const res = await fetch(`${API_BASE}/numbers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update number');
    return res.json();
  },

  async deleteNumber(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/numbers/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to release number');
  },

  async getRoutingConfig(): Promise<InboundRoutingConfig> {
    const res = await fetch(`${API_BASE}/routing/config`);
    if (!res.ok) throw new Error('Failed to fetch inbound routing config');
    return res.json();
  },

  async getInboundCalls(_params?: any): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE}/routing/calls`);
      if (res.ok) return await res.json();
      return [];
    } catch {
      return [];
    }
  },

  async updateRoutingConfig(data: Partial<InboundRoutingConfig>): Promise<InboundRoutingConfig> {
    const res = await fetch(`${API_BASE}/routing/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update inbound routing config');
    return res.json();
  },

  async testCall(data: {
    sip_trunk_id?: number;
    phone_number?: string;
    target_number: string;
    agent_persona?: string;
  }): Promise<TestCallResult> {
    const res = await fetch(`${API_BASE}/test-call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to initiate test call');
    }
    return res.json();
  },

  async runTestCall(data: any): Promise<TestCallResult> {
    return this.testCall(data);
  },

  // Phase 8: Live Real PSTN Telecom Methods
  async getLiveStatus(): Promise<{
    is_configured: boolean;
    account_sid: string;
    account_name: string;
    status: string;
    twilio_phone_number: string;
    webhook_base_url: string;
    verified_caller_ids: string[];
    active_twilio_numbers: string[];
  }> {
    const res = await fetch(`${API_BASE}/live/status`);
    if (!res.ok) throw new Error('Failed to fetch live telephony status');
    return res.json();
  },

  async setWebhookUrl(url: string): Promise<{ message: string; url: string }> {
    const res = await fetch(`${API_BASE}/live/set-webhook-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update webhook URL');
    }
    return res.json();
  },

  async dialRealPhone(data: {
    to_number: string;
    persona?: string;
    lead_id?: number;
    contact_id?: number;
    webhook_base_url?: string;
  }): Promise<{
    success: boolean;
    call_sid: string;
    call_id: number;
    status: string;
    to_number: string;
    from_number: string;
  }> {
    const res = await fetch(`${API_BASE}/live/outbound-call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to trigger real phone call');
    }
    return res.json();
  }
};
