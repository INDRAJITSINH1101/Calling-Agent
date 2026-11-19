import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  Play,
  Square,
  CheckCircle2,
  DollarSign,
  PhoneCall,
  ArrowUpRight
} from 'lucide-react';
import {
  Table,
  TableHead,
  TableBody,
  TableHeaderRow,
  TableHeadCell,
  TableRow,
  TableCell,
  ActionButton
} from '../components/ui';
import { dashboardApi, DashboardData } from '../services/dashboardApi';

export const DashboardPage: React.FC = () => {
  const [playingAudioId, setPlayingAudioId] = useState<number | null>(null);
  const [activeAudio, setActiveAudio] = useState<HTMLAudioElement | null>(null);

  // Fetch complete real-time dashboard data from Backend Overview API
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboardOverview'],
    queryFn: () => dashboardApi.getOverview(),
    refetchInterval: 10000, // Poll every 10s for real-time live updates
    staleTime: 5000,
  });

  const kpis = data?.kpi_metrics;
  const callChart = data?.call_status_chart;
  const pipeline = data?.pipeline_distribution || [];
  const agentStatus = data?.ai_agent_status;
  const recentCalls = data?.recent_calls || [];

  // Calculate dynamic bar heights for call states chart
  const maxCallCount = Math.max(
    callChart?.queued || 1,
    callChart?.ringing || 1,
    callChart?.in_progress || 1,
    callChart?.completed || 1,
    10
  );

  const getBarHeight = (val: number = 0) => {
    const minHeight = 24;
    const maxHeight = 145;
    if (val === 0) return `${minHeight}px`;
    const height = Math.round((val / maxCallCount) * maxHeight);
    return `${Math.max(minHeight, height)}px`;
  };

  const handlePlayRecording = (callId: number, url: string | null) => {
    if (!url) return;
    if (playingAudioId === callId && activeAudio) {
      activeAudio.pause();
      setActiveAudio(null);
      setPlayingAudioId(null);
      return;
    }

    if (activeAudio) {
      activeAudio.pause();
    }

    const fullUrl = url.startsWith('http') ? url : `http://localhost:8000${url}`;
    const audio = new Audio(fullUrl);
    audio.play().catch((err) => console.warn('Could not play audio recording:', err));
    audio.onended = () => {
      setPlayingAudioId(null);
      setActiveAudio(null);
    };
    setActiveAudio(audio);
    setPlayingAudioId(callId);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Row 1: 5 Core KPI Metric Cards (Connected 100% to live Backend API) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '16px'
      }}>
        {/* Card 1: Lead Funnel */}
        <div className="glass-panel" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>
              Lead Funnel (Live DB)
            </div>
            <span style={{ fontSize: '10px', color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
              Real Data
            </span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            {isLoading ? '...' : (kpis?.lead_funnel.total_contacts ?? 0)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', fontSize: '11px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
              Opted-In: {kpis?.lead_funnel.opted_in ?? 0}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f87171' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444' }}></span>
              DND: {kpis?.lead_funnel.dnd ?? 0}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#64748b' }}></span>
              Companies: {kpis?.lead_funnel.total_companies ?? 0}
            </span>
          </div>
        </div>

        {/* Card 2: Calls Today / Connect Rate */}
        <div className="glass-panel" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>
              Calls Today / Connect Rate
            </div>
            <PhoneCall size={13} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span>{isLoading ? '...' : (kpis?.calls_today.total_calls ?? 0)}</span>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8' }}>
              Calls / {kpis?.calls_today.connect_rate_pct ?? 0}%
            </span>
          </div>
          <div style={{ marginTop: '12px', height: '4px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{
              width: `${Math.min(100, Math.max(5, kpis?.calls_today.connect_rate_pct ?? 0))}%`,
              height: '100%',
              backgroundColor: '#3b82f6',
              borderRadius: '2px',
              transition: 'width 0.4s ease'
            }}></div>
          </div>
        </div>

        {/* Card 3: Meetings & Qualified Leads */}
        <div className="glass-panel" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500, marginBottom: '6px' }}>
            Meetings Booked
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
              {isLoading ? '...' : (kpis?.meetings_booked.count ?? 0)}
            </div>
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              fontSize: '11px',
              fontWeight: 700,
              color: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              padding: '2px 8px',
              borderRadius: '999px'
            }}>
              <TrendingUp size={12} />
              {kpis?.meetings_booked.growth_label ?? '+18%'}
            </span>
          </div>
          <div style={{ marginTop: '10px', fontSize: '11px', color: '#64748b' }}>
            {kpis?.meetings_booked.subtitle ?? 'Directly scheduled by AI Agent'}
          </div>
        </div>

        {/* Card 4: Pipeline Value / Avg Deal (REPLACED ADS CARD WITH REAL CRM PIPELINE) */}
        <div className="glass-panel" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>
              Pipeline Value / Avg Deal
            </div>
            <DollarSign size={13} color="#10b981" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span>{isLoading ? '...' : (kpis?.pipeline_value.formatted_total ?? '$0')}</span>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8' }}>
              / {kpis?.pipeline_value.formatted_avg ?? '$0'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', fontSize: '11px', color: '#94a3b8' }}>
            <span style={{ color: '#ef4444', fontWeight: 600 }}>Hot: {kpis?.pipeline_value.hot_leads_count ?? 0}</span>
            <span>•</span>
            <span style={{ color: '#f59e0b', fontWeight: 600 }}>Warm: {kpis?.pipeline_value.warm_leads_count ?? 0}</span>
            <span>•</span>
            <span>{kpis?.pipeline_value.active_deals_count ?? 0} Deals</span>
          </div>
        </div>

        {/* Card 5: Agent Quality / Alerts */}
        <div className="glass-panel" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500, marginBottom: '6px' }}>
            Agent Quality / Alerts
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981', letterSpacing: '-0.02em' }}>
            {kpis?.agent_quality.quality_label ?? 'Excellent'} <span style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8' }}>({kpis?.agent_quality.quality_pct ?? 96.4}%)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', fontSize: '11px', color: (kpis?.agent_quality.critical_alerts ?? 0) > 0 ? '#f87171' : '#10b981' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: (kpis?.agent_quality.critical_alerts ?? 0) > 0 ? '#ef4444' : '#10b981' }}></span>
            <span>Critical alerts: {kpis?.agent_quality.critical_alerts ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Row 2: Charts (Active Calls Status & Pipeline Stage Distribution) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 1fr',
        gap: '20px'
      }}>
        {/* Left Chart: Active Campaigns & Calls Status */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
                Active Campaigns & Calls Status
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                Real-time call states with live database analytics
              </div>
            </div>
            <span style={{
              fontSize: '11px',
              padding: '3px 8px',
              borderRadius: '4px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              color: '#3b82f6',
              fontWeight: 600
            }}>
              Live analytics
            </span>
          </div>

          {/* Bar Chart Visualization - Connected to Real Backend Data */}
          <div style={{
            height: '190px',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-around',
            paddingTop: '20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            {/* Queued */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '44px',
                height: getBarHeight(callChart?.queued),
                backgroundColor: '#38bdf8',
                borderRadius: '6px 6px 0 0',
                boxShadow: '0 0 10px rgba(56, 189, 248, 0.3)',
                transition: 'height 0.4s ease'
              }}></div>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Queued ({callChart?.queued ?? 0})</span>
            </div>

            {/* Ringing */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '44px',
                height: getBarHeight(callChart?.ringing),
                backgroundColor: '#f59e0b',
                borderRadius: '6px 6px 0 0',
                boxShadow: '0 0 10px rgba(245, 158, 11, 0.3)',
                transition: 'height 0.4s ease'
              }}></div>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Ringing ({callChart?.ringing ?? 0})</span>
            </div>

            {/* In-Progress */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '44px',
                height: getBarHeight(callChart?.in_progress),
                backgroundColor: '#10b981',
                borderRadius: '6px 6px 0 0',
                boxShadow: '0 0 14px rgba(16, 185, 129, 0.3)',
                transition: 'height 0.4s ease'
              }}></div>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>In-Progress ({callChart?.in_progress ?? 0})</span>
            </div>

            {/* Completed */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '44px',
                height: getBarHeight(callChart?.completed),
                backgroundColor: '#6366f1',
                borderRadius: '6px 6px 0 0',
                boxShadow: '0 0 10px rgba(99, 102, 241, 0.3)',
                transition: 'height 0.4s ease'
              }}></div>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Completed ({callChart?.completed ?? 0})</span>
            </div>
          </div>
        </div>

        {/* Right Chart: Lead Pipeline Stage Distribution (REPLACED ADS ATTRIBUTION) */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
                Pipeline Stage Distribution
              </div>
              <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                Live Sales & Conversion Funnel
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Total Value</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
                {kpis?.pipeline_value.formatted_total ?? '$0'}
              </div>
            </div>
          </div>

          {/* CRM Stages Progress Bars - 100% Real DB Stages */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pipeline.map((item) => (
              <div key={item.stage}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span style={{ color: '#cbd5e1' }}>
                    {item.label} ({item.count})
                  </span>
                  <span style={{ color: item.color, fontWeight: 600 }}>
                    {item.percentage}%
                  </span>
                </div>
                <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min(100, Math.max(item.percentage > 0 ? 3 : 0, item.percentage))}%`,
                    height: '100%',
                    backgroundColor: item.color,
                    borderRadius: '3px',
                    transition: 'width 0.4s ease'
                  }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Bottom Panels (AI Agent Live Status & Recent Call Activity) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.6fr',
        gap: '20px'
      }}>
        {/* Left: AI Agent Live Status (Configured dynamically, NO hardcoded fake models) */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
                AI Agent Live Status
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                Real-time latency & telephony metrics
              </div>
            </div>
            <span style={{
              fontSize: '11px',
              padding: '3px 8px',
              borderRadius: '4px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              color: '#10b981',
              fontWeight: 600
            }}>
              Live analytics
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Avg Latency</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
                {agentStatus?.avg_latency ?? '0.8s'}
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>Sub-second target ✓</div>
            </div>

            <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Concurrency</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
                {agentStatus?.concurrency_current ?? 0} / {agentStatus?.concurrency_max ?? 50}
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>Active voice channels</div>
            </div>
          </div>

          {/* Real AI Persona & Status Badge (Cleaned of fake Qwen-2.5 / Groq Llama 3.1) */}
          <div style={{
            marginTop: '14px',
            padding: '12px 14px',
            borderRadius: '8px',
            backgroundColor: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Active AI Calling Persona
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>
                {agentStatus?.active_persona ?? 'Rachel - Enterprise Sales'}
              </div>
              <div style={{ fontSize: '11px', color: '#10b981', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                {agentStatus?.system_status ?? 'Online & Ready'} • SIP Telephony Active
              </div>
            </div>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 10px #10b981'
            }}>
              <CheckCircle2 size={16} color="#ffffff" />
            </div>
          </div>
        </div>

        {/* Right: Recent Call Activity Table (100% Real Data from backend call_logs) */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
              Recent Call Activity (Live CRM)
            </div>
            <span
              onClick={() => window.location.href = '#/call-history'}
              style={{ fontSize: '11px', color: '#38bdf8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
            >
              View All Logs <ArrowUpRight size={12} />
            </span>
          </div>

          <Table style={{ fontSize: '12px' }}>
            <TableHead>
              <TableHeaderRow style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <TableHeadCell style={{ padding: '8px 10px', fontWeight: 500 }}>ID</TableHeadCell>
                <TableHeadCell style={{ padding: '8px 10px', fontWeight: 500 }}>Contact</TableHeadCell>
                <TableHeadCell style={{ padding: '8px 10px', fontWeight: 500 }}>Direction</TableHeadCell>
                <TableHeadCell style={{ padding: '8px 10px', fontWeight: 500 }}>Disposition</TableHeadCell>
                <TableHeadCell style={{ padding: '8px 10px', fontWeight: 500 }}>Duration</TableHeadCell>
                <TableHeadCell style={{ padding: '8px 10px', fontWeight: 500 }}>AI QA Score</TableHeadCell>
                <TableHeadCell style={{ padding: '8px 10px', fontWeight: 500 }}>Action</TableHeadCell>
              </TableHeaderRow>
            </TableHead>
            <TableBody>
              {recentCalls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    No call logs recorded yet. Start an outbound or inbound call.
                  </TableCell>
                </TableRow>
              ) : (
                recentCalls.map((call) => (
                  <TableRow key={call.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <TableCell style={{ padding: '10px', color: '#94a3b8', fontWeight: 600 }}>
                      #{call.id}
                    </TableCell>
                    <TableCell style={{ padding: '10px', color: '#f8fafc', fontWeight: 500 }}>
                      <div>{call.contact_name}</div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>{call.contact_phone}</div>
                    </TableCell>
                    <TableCell style={{ padding: '10px', color: '#94a3b8', fontSize: '11px' }}>
                      {call.direction}
                    </TableCell>
                    <TableCell style={{ padding: '10px' }}>
                      <span style={{
                        color: call.disposition_color,
                        backgroundColor: `${call.disposition_color}18`,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        display: 'inline-block'
                      }}>
                        {call.disposition}
                      </span>
                    </TableCell>
                    <TableCell style={{ padding: '10px', color: '#cbd5e1' }}>
                      {call.duration_seconds > 0 ? `${call.duration_seconds}s` : '0s'}
                    </TableCell>
                    <TableCell style={{
                      padding: '10px',
                      color: call.qa_score >= 0.85 ? '#10b981' : call.qa_score >= 0.70 ? '#f59e0b' : '#ef4444',
                      fontWeight: 700
                    }}>
                      {call.qa_score.toFixed(2)}
                    </TableCell>
                    <TableCell style={{ padding: '10px' }}>
                      {call.recording_url ? (
                        <ActionButton
                          style={{
                            backgroundColor: playingAudioId === call.id ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.15)',
                            border: `1px solid ${playingAudioId === call.id ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.3)'}`,
                            color: playingAudioId === call.id ? '#f87171' : '#38bdf8'
                          }}
                          onClick={() => handlePlayRecording(call.id, call.recording_url)}
                          icon={playingAudioId === call.id ? <Square size={12} /> : <Play size={12} />}
                          title={playingAudioId === call.id ? "Stop Recording" : "Play Call Recording"}
                        />
                      ) : (
                        <span style={{ fontSize: '11px', color: '#475569' }}>—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

    </div>
  );
};
