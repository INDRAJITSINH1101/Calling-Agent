const API_BASE = 'http://localhost:8000/api/v1/calls';

export interface CallLog {
  id: number;
  contact_id?: number;
  contact_name?: string;
  contact_phone?: string;
  company_name?: string;
  direction?: 'INBOUND' | 'OUTBOUND' | string;
  agent_persona?: string;
  sentiment?: string;
  status?: string;
  disposition?: string;
  duration_seconds: number;
  has_recording: boolean;
  recording_url?: string;
  summary?: string;
  follow_up_action?: string;
  created_at: string;
}

export interface CallTranscriptItem {
  id: number;
  call_log_id: number;
  speaker: 'AGENT' | 'USER' | 'SYSTEM';
  text: string;
  timestamp_offset_ms: number;
  sentiment?: string;
  created_at: string;
}

export interface CallHistoryResponse {
  total: number;
  page: number;
  page_size: number;
  items: CallLog[];
}

export interface StartCallPayload {
  contact_id?: number;
  lead_id?: number;
  phone_number?: string;
  phone?: string;
  agent_persona?: string;
  persona?: string;
  direction?: string;
}

export interface ConversePayload {
  user_text?: string;
  user_message?: string;
  persona?: string;
  timestamp_offset_ms?: number;
  conversation_history?: any[];
}

export interface ConverseResponse {
  agent_response?: string;
  ai_response?: string;
  action?: string;
  provider_used?: string;
  latency_ms?: number;
  tool_actions?: any[];
  audio_base64?: string;
  is_call_ended?: boolean;
}

export const callsApi = {
  async startCall(payload: StartCallPayload) {
    const res = await fetch(`${API_BASE}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to start call session');
    }
    return res.json();
  },

  async transcribeAudio(callId: number, audioBlob: Blob): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, `chunk_${callId}.webm`);
      const res = await fetch(`${API_BASE}/${callId}/transcribe`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        return data.transcript || '';
      }
      return '';
    } catch {
      return '';
    }
  },

  async converse(callId: number, payload: ConversePayload): Promise<ConverseResponse> {
    const res = await fetch(`${API_BASE}/${callId}/converse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to converse with voice agent');
    }
    return res.json();
  },

  async endCall(callId: number, durationSeconds: number, reason = 'USER_DISCONNECTED') {
    const res = await fetch(`${API_BASE}/${callId}/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration_seconds: durationSeconds, reason })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to end call session');
    }
    return res.json();
  },

  async uploadRecording(callId: number, audioBlob: Blob) {
    const formData = new FormData();
    formData.append('audio_file', audioBlob, `call_${callId}.webm`);
    const res = await fetch(`${API_BASE}/${callId}/recording`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to upload call recording');
    }
    return res.json();
  },

  async getCallHistory(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    sentiment?: string;
    hasRecording?: boolean;
  }): Promise<CallHistoryResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.pageSize) query.append('page_size', String(params.pageSize));
    if (params?.search) query.append('search', params.search);
    if (params?.sentiment) query.append('sentiment', params.sentiment);
    if (params?.hasRecording !== undefined) query.append('has_recording', String(params.hasRecording));

    const res = await fetch(`${API_BASE}/history?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch call history');
    return res.json();
  },

  async getCallTranscript(callId: number): Promise<CallTranscriptItem[]> {
    const res = await fetch(`${API_BASE}/${callId}/transcript`);
    if (!res.ok) throw new Error('Failed to fetch call transcript');
    return res.json();
  },

  async deleteCallLog(callId: number): Promise<void> {
    const res = await fetch(`${API_BASE}/${callId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete call record');
  }
};
