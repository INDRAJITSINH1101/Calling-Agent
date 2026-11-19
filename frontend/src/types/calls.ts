export interface ToolAction {
  tool?: string;
  tool_name?: string;
  action?: string;
  parameters?: Record<string, any>;
  result?: any;
  status?: string;
  execution_status?: string;
  message?: string;
  updated_lead?: any;
  timestamp?: string;
}

export interface TranscriptItem {
  id?: string | number;
  speaker: 'AGENT' | 'USER' | 'SYSTEM' | string;
  text?: string;
  message?: string;
  provider_used?: string;
  latency_ms?: number;
  timestamp?: string | number;
  offset_ms?: number;
  sentiment?: string;
  tool_actions?: any[];
}

export interface CallEndResponse {
  call_id: number;
  duration_seconds: number;
  sentiment: string;
  disposition: string;
  summary: string;
  extracted_key_points?: string[];
  key_takeaways?: string[];
  follow_up_action?: string;
  crm_updates_applied?: Record<string, any>;
  updated_lead?: any;
}

export interface CallLog {
  id: number;
  contact_id?: number;
  contact_name?: string;
  contact_phone?: string;
  company_name?: string;
  direction?: 'INBOUND' | 'OUTBOUND' | string;
  agent_persona?: string;
  sentiment?: string;
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
  speaker: 'AGENT' | 'USER' | 'SYSTEM' | string;
  text: string;
  timestamp_offset_ms: number;
  sentiment?: string;
  created_at: string;
}
