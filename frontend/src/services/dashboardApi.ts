export interface DashboardData {
  kpi_metrics: {
    lead_funnel: {
      total_contacts: number;
      opted_in: number;
      dnd: number;
      suppressed: number;
      total_companies: number;
    };
    calls_today: {
      total_calls: number;
      connected_calls: number;
      completed_calls: number;
      connect_rate_pct: number;
    };
    meetings_booked: {
      count: number;
      growth_label: string;
      subtitle: string;
    };
    pipeline_value: {
      total_value: number;
      formatted_total: string;
      avg_deal_value: number;
      formatted_avg: string;
      active_deals_count: number;
      hot_leads_count: number;
      warm_leads_count: number;
    };
    agent_quality: {
      quality_label: string;
      quality_pct: number;
      critical_alerts: number;
    };
  };
  call_status_chart: {
    queued: number;
    ringing: number;
    in_progress: number;
    completed: number;
    total: number;
  };
  pipeline_distribution: Array<{
    stage: string;
    label: string;
    count: number;
    percentage: number;
    total_value: number;
    color: string;
  }>;
  ai_agent_status: {
    avg_latency: string;
    concurrency_current: number;
    concurrency_max: number;
    system_status: string;
    active_persona: string;
    voice_engine: string;
  };
  recent_calls: Array<{
    id: number;
    contact_name: string;
    contact_phone: string;
    direction: string;
    status: string;
    disposition: string;
    disposition_color: string;
    duration_seconds: number;
    qa_score: number;
    sentiment: string;
    recording_url: string | null;
    created_at: string | null;
  }>;
}

const API_BASE = 'http://localhost:8000/api/v1/dashboard';

export const dashboardApi = {
  async getOverview(): Promise<DashboardData> {
    const res = await fetch(`${API_BASE}/overview`);
    if (!res.ok) {
      throw new Error(`Failed to fetch dashboard overview: ${res.statusText}`);
    }
    return res.json();
  }
};

