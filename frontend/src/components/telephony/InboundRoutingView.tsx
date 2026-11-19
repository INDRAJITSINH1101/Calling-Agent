import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  UserCheck,
  Settings,
  Save,
  RefreshCw,
  CheckCircle2,
  PhoneForwarded,
  ShieldCheck
} from 'lucide-react';
import { telephonyApi, InboundRoutingConfig, PhoneNumber } from '../../services/telephonyApi';
import { useSystemConstants } from '../../hooks/useSystemConstants';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { FormSelect } from '../ui/FormSelect';
import { TimePicker } from '../ui/TimePicker';

interface InboundRoutingViewProps {
  onEditNumber?: (number: PhoneNumber) => void;
}

export const InboundRoutingView: React.FC<InboundRoutingViewProps> = ({ onEditNumber }) => {
  const queryClient = useQueryClient();
  const { routingFallbackActions } = useSystemConstants();

  // 1. TanStack Query: Fetch Inbound Routing Config from DB
  const {
    data: config,
    isLoading: isLoadingConfig
  } = useQuery<InboundRoutingConfig>({
    queryKey: ['inboundRoutingConfig'],
    queryFn: telephonyApi.getRoutingConfig,
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false
  });

  // 2. TanStack Query: Fetch Recent Inbound Calls from DB
  const {
    data: inboundCalls = [],
    isLoading: isLoadingCalls,
    refetch: refetchCalls,
    isFetching: isFetchingCalls
  } = useQuery({
    queryKey: ['inboundCalls'],
    queryFn: () => telephonyApi.getInboundCalls(10),
    staleTime: 1000 * 20,
    refetchInterval: 25000,
    refetchOnWindowFocus: false
  });

  // 3. TanStack Query: Fetch Virtual Inbound Numbers from DB
  const { data: numbersData } = useQuery({
    queryKey: ['phoneNumbers', 'inbound-list'],
    queryFn: () => telephonyApi.getNumbers({ pageSize: 50 }),
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false
  });

  // Local Form state synced from DB config
  const [businessStart, setBusinessStart] = useState('09:00');
  const [businessEnd, setBusinessEnd] = useState('19:00');
  const [fallbackAction, setFallbackAction] = useState('HUMAN_TRANSFER');
  const [fallbackNumber, setFallbackNumber] = useState('+91 98111 22233');
  const [aiTargetMs, setAiTargetMs] = useState(380);
  const [voicemailGreeting, setVoicemailGreeting] = useState('');
  const [autoCreateLead, setAutoCreateLead] = useState(true);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  useEffect(() => {
    if (config) {
      setBusinessStart(config.business_hours_start || '09:00');
      setBusinessEnd(config.business_hours_end || '19:00');
      setFallbackAction(config.fallback_action || 'HUMAN_TRANSFER');
      setFallbackNumber(config.fallback_forward_number || '+91 98111 22233');
      setAiTargetMs(config.ai_handshake_target_ms || 380);
      setVoicemailGreeting(config.off_hours_voicemail_greeting || '');
      setAutoCreateLead(config.auto_create_lead ?? true);
    }
  }, [config]);

  // Mutation to persist Global Inbound Config to DB
  const configMutation = useMutation({
    mutationFn: (payload: Partial<InboundRoutingConfig>) => telephonyApi.updateRoutingConfig(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inboundRoutingConfig'] });
      setSaveSuccessMsg(true);
      setTimeout(() => setSaveSuccessMsg(false), 3500);
    }
  });

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    configMutation.mutate({
      business_hours_start: businessStart,
      business_hours_end: businessEnd,
      fallback_action: fallbackAction,
      fallback_forward_number: fallbackNumber,
      ai_handshake_target_ms: Number(aiTargetMs),
      off_hours_voicemail_greeting: voicemailGreeting,
      auto_create_lead: autoCreateLead
    });
  };

  // Filter numbers that receive incoming traffic (INBOUND or BIDIRECTIONAL)
  const inboundNumbers = (numbersData?.items || []).filter(
    n => n.type === 'INBOUND' || n.type === 'BIDIRECTIONAL'
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. DYNAMIC CONTROLS: EDIT INBOUND ROUTING SETTINGS (SAVED DIRECTLY TO DB) */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Settings size={18} color="#818cf8" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                Global Inbound Telephony & Fallback Engine Controls
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                Modify working hours, fallback human destinations, and voicemail responses directly in the database.
              </p>
            </div>
          </div>

          {saveSuccessMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#34d399'
              }}
            >
              <CheckCircle2 size={15} color="#34d399" />
              <span>Routing Settings Saved to Database!</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px',
              alignItems: 'flex-start'
            }}
          >
            {/* Business Hours Start */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ display: 'flex', alignItems: 'center', height: '18px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px', userSelect: 'none' }}>
                Active Window Start Time
              </label>
              <TimePicker
                value={businessStart}
                onChange={setBusinessStart}
                placeholder="09:00"
              />
            </div>

            {/* Business Hours End */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ display: 'flex', alignItems: 'center', height: '18px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px', userSelect: 'none' }}>
                Active Window End Time
              </label>
              <TimePicker
                value={businessEnd}
                onChange={setBusinessEnd}
                placeholder="19:00"
              />
            </div>

            {/* Default Fallback Action (Reusing FormSelect & useSystemConstants) */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ display: 'flex', alignItems: 'center', height: '18px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px', userSelect: 'none' }}>
                Default Fallback Action
              </label>
              <FormSelect
                value={fallbackAction}
                onChange={e => setFallbackAction(e.target.value)}
                options={routingFallbackActions.map(a => ({
                  value: a.value,
                  label: a.label
                }))}
                placeholder="Select Fallback Action"
              />
            </div>

            {/* Fallback Forward Number */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ display: 'flex', alignItems: 'center', height: '18px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px', userSelect: 'none' }}>
                Human Escalation Transfer Phone
              </label>
              <div style={{ position: 'relative', width: '100%' }}>
                <PhoneForwarded
                  size={14}
                  color="#38bdf8"
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    zIndex: 2
                  }}
                />
                <input
                  type="text"
                  value={fallbackNumber}
                  onChange={e => setFallbackNumber(e.target.value)}
                  placeholder="+91 98111 22233"
                  style={{
                    width: '100%',
                    height: '38px',
                    minHeight: '38px',
                    boxSizing: 'border-box',
                    padding: '0 12px 0 34px',
                    backgroundColor: '#1e293b',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 500,
                    outline: 'none',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Off-Hours Greeting Message */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ display: 'flex', alignItems: 'center', height: '18px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px', userSelect: 'none' }}>
              Off-Hours AI Voicemail Audio Greeting
            </label>
            <textarea
              rows={2}
              value={voicemailGreeting}
              onChange={e => setVoicemailGreeting(e.target.value)}
              placeholder="Spoken to callers dialing outside active business window..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: '#1e293b',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                padding: '9px 12px',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 500,
                fontFamily: 'inherit',
                outline: 'none',
                resize: 'vertical',
                lineHeight: '1.5'
              }}
            />
          </div>

          {/* Bottom Bar: Auto Lead Creation Toggle & Save Button */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              paddingTop: '6px',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)'
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#cbd5e1' }}>
              <input
                type="checkbox"
                checked={autoCreateLead}
                onChange={e => setAutoCreateLead(e.target.checked)}
                style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#38bdf8' }}
              />
              <span style={{ fontWeight: 500 }}>
                Automatically create new CRM Lead record from unknown inbound caller numbers
              </span>
            </label>

            <Button
              variant="primary"
              icon={<Save size={14} />}
              disabled={configMutation.isPending || isLoadingConfig}
            >
              {configMutation.isPending ? 'Saving to Database...' : 'Save Routing Settings'}
            </Button>
          </div>
        </form>
      </div>

      {/* 3. ASSIGNED INBOUND PHONE LINES & ROUTE MAPPING */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
              Configured Inbound Virtual Numbers (DIDs)
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Active phone numbers receiving client calls and their designated conversational personas
            </p>
          </div>
          <Badge variant="info">
            {inboundNumbers.length} Inbound Route{inboundNumbers.length === 1 ? '' : 's'} Active
          </Badge>
        </div>

        <div
          style={{
            maxHeight: '270px',
            overflowY: 'auto',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(56, 189, 248, 0.3) rgba(15, 23, 42, 0.6)'
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#0d1527', zIndex: 2 }}>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8' }}>
                <th style={{ padding: '10px 14px', fontWeight: 600 }}>Phone Number & DID</th>
                <th style={{ padding: '10px 14px', fontWeight: 600 }}>Traffic Type</th>
                <th style={{ padding: '10px 14px', fontWeight: 600 }}>Assigned AI Persona</th>
                <th style={{ padding: '10px 14px', fontWeight: 600 }}>Active Hours</th>
                <th style={{ padding: '10px 14px', fontWeight: 600 }}>Fallback Route</th>
                <th style={{ padding: '10px 14px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {inboundNumbers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                    No inbound virtual lines found. Provision an INBOUND or BIDIRECTIONAL phone number to activate routes.
                  </td>
                </tr>
              ) : (
                inboundNumbers.map(num => (
                  <tr
                    key={num.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 700, color: '#f8fafc' }}>{num.number}</div>
                      <div style={{ fontSize: '11px', color: '#38bdf8' }}>{num.label}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <Badge variant={num.type === 'BIDIRECTIONAL' ? 'info' : 'success'}>
                        {num.type}
                      </Badge>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontWeight: 600, color: '#e2e8f0', textTransform: 'capitalize' }}>
                        {(num.assigned_agent_persona || num.assigned_persona || '').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#94a3b8', fontSize: '12px' }}>
                      {num.business_hours_start || '09:00'} – {num.business_hours_end || '19:00'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                        {num.fallback_action === 'HUMAN_TRANSFER'
                          ? `Warm Transfer (${num.fallback_forward_number || config?.fallback_forward_number})`
                          : num.fallback_action}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      {onEditNumber && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onEditNumber(num)}
                        >
                          Edit Route
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. LIVE INBOUND CALL RESOLUTION FEED (FROM DATABASE) */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
              Live Inbound Activity & Route Resolution Feed
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Real-time audit log of incoming caller inquiries, AI qualification steps, and warm transfers
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={13} className={isFetchingCalls ? 'animate-spin' : ''} />}
            onClick={() => refetchCalls()}
          >
            {isFetchingCalls ? 'Refreshing...' : 'Refresh Activity'}
          </Button>
        </div>

        {isLoadingCalls ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
            Loading database call resolution records...
          </div>
        ) : inboundCalls.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
            No inbound calls logged yet. Incoming calls to virtual numbers will display here in real-time.
          </div>
        ) : (
          <div
            style={{
              maxHeight: '340px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              paddingRight: '6px',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(56, 189, 248, 0.3) rgba(15, 23, 42, 0.6)'
            }}
          >
            {inboundCalls.map(call => {
              const formattedTime = new Date(call.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              });
              const formattedDate = new Date(call.created_at).toLocaleDateString([], {
                month: 'short',
                day: 'numeric'
              });

              return (
                <div
                  key={call.id}
                  style={{
                    background: 'rgba(30, 41, 59, 0.45)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '11px',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background:
                          call.route_stage === 'WARM_TRANSFER'
                            ? 'rgba(245, 158, 11, 0.15)'
                            : call.route_stage === 'VOICEMAIL'
                            ? 'rgba(168, 85, 247, 0.15)'
                            : 'rgba(16, 185, 129, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {call.route_stage === 'WARM_TRANSFER' ? (
                        <UserCheck size={16} color="#f59e0b" />
                      ) : call.route_stage === 'VOICEMAIL' ? (
                        <Clock size={16} color="#a855f7" />
                      ) : (
                        <ShieldCheck size={16} color="#10b981" />
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                        {call.caller_name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {call.caller_phone} • {formattedDate} at {formattedTime}
                      </div>
                    </div>
                  </div>

                  {/* Summary Snippet */}
                  <div style={{ flex: 1, minWidth: '260px', fontSize: '12px', color: '#cbd5e1', lineHeight: '1.4' }}>
                    {call.summary || 'Inbound AI conversational session completed.'}
                  </div>

                  {/* Duration & Route Stage Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>
                      {call.duration_seconds}s
                    </span>

                    {call.route_stage === 'WARM_TRANSFER' ? (
                      <Badge variant="warning">Warm Transferred</Badge>
                    ) : call.route_stage === 'VOICEMAIL' ? (
                      <Badge variant="info">Voicemail</Badge>
                    ) : call.route_stage === 'AI_QUALIFIED' ? (
                      <Badge variant="success">AI Qualified</Badge>
                    ) : (
                      <Badge variant="default">AI Answered</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
