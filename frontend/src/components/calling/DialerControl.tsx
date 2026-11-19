import React from 'react';
import {
  PhoneCall,
  PhoneOff,
  Building,
  RefreshCw,
  ListOrdered,
  Phone,
  Play,
  Square,
  FastForward,
  CheckCircle2,
  Clock,
  Smartphone,
  Radio,
  ShieldCheck
} from 'lucide-react';
import { FormSelect } from '../ui/FormSelect';
import { Badge } from '../ui/Badge';
import { Lead } from '../../types/crm';

interface DialerControlProps {
  leads: Lead[];
  selectedLeadId: string;
  onLeadChange: (leadId: string) => void;
  selectedPersona: string;
  onPersonaChange: (persona: string) => void;
  personaOptions: { value: string; label: string }[];
  dialPhoneNumber: string;
  onPhoneChange: (phone: string) => void;
  isCallActive: boolean;
  onStartCall: () => void;
  onEndCall: () => void;
  onSyncLeads: () => void;

  callChannel?: 'browser' | 'pstn';
  onCallChannelChange?: (channel: 'browser' | 'pstn') => void;
  twilioConfig?: {
    is_configured: boolean;
    twilio_phone_number: string;
    account_name: string;
    webhook_base_url: string;
    verified_caller_ids: string[];
  } | null;
  webhookUrl?: string;
  onWebhookUrlChange?: (val: string) => void;
  onSaveWebhookUrl?: () => void;
  isPstnRinging?: boolean;

  isQueueMode: boolean;
  onToggleQueueMode: (enabled: boolean) => void;
  isQueueRunning: boolean;
  queueCompletedIds: number[];
  selectedQueueLeadIds: number[];
  onToggleSelectLead: (leadId: number) => void;
  onToggleSelectAll: () => void;
  nextCallCountdown: number | null;
  onStartQueue: () => void;
  onStopQueue: () => void;
  onSkipCountdown: () => void;
}

export const DialerControl: React.FC<DialerControlProps> = ({
  leads,
  selectedLeadId,
  onLeadChange,
  selectedPersona,
  onPersonaChange,
  personaOptions,
  dialPhoneNumber,
  onPhoneChange,
  isCallActive,
  onStartCall,
  onEndCall,
  onSyncLeads,
  callChannel = 'pstn',
  onCallChannelChange,
  twilioConfig,
  webhookUrl = '',
  onWebhookUrlChange,
  onSaveWebhookUrl,
  isPstnRinging = false,
  isQueueMode,
  onToggleQueueMode,
  isQueueRunning,
  queueCompletedIds,
  selectedQueueLeadIds,
  onToggleSelectLead,
  onToggleSelectAll,
  nextCallCountdown,
  onStartQueue,
  onStopQueue,
  onSkipCountdown
}) => {
  const selectedLead = leads.find(l => String(l.id) === selectedLeadId);

  const handleDialpadClick = (digit: string) => {
    if (!isCallActive && !isQueueRunning) {
      onPhoneChange(dialPhoneNumber + digit);
    }
  };

  const totalLeads = leads.length;
  const targetLeadsCount = selectedQueueLeadIds.length;
  const completedCount = queueCompletedIds.filter(id => selectedQueueLeadIds.includes(id)).length;
  const progressPercent = targetLeadsCount > 0 ? Math.min(100, Math.round((completedCount / targetLeadsCount) * 100)) : 0;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '16px',
      padding: '18px',
      boxSizing: 'border-box',
      minWidth: 0
    }}>
      {/* Top Header with Mode Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '14px', fontWeight: '700', color: '#f8fafc' }}>
          Calling Channel & Mode
        </span>
        <button
          type="button"
          onClick={onSyncLeads}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px'
          }}
        >
          <RefreshCw size={12} /> Sync Leads
        </button>
      </div>

      {/* Telephony Channel Switcher (Phase 8: Real PSTN vs Browser) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '6px',
        background: 'rgba(15, 23, 42, 0.6)',
        padding: '3px',
        borderRadius: '10px',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <button
          type="button"
          onClick={() => onCallChannelChange && onCallChannelChange('pstn')}
          disabled={isCallActive || isQueueRunning}
          style={{
            padding: '7px 4px',
            border: 'none',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: isCallActive || isQueueRunning ? 'not-allowed' : 'pointer',
            background: callChannel === 'pstn'
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(5, 150, 105, 0.45))'
              : 'transparent',
            color: callChannel === 'pstn' ? '#34d399' : '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.2s',
            boxShadow: callChannel === 'pstn' ? '0 2px 8px rgba(16, 185, 129, 0.25)' : 'none'
          }}
        >
          <Smartphone size={13} />
          <span>Real Phone (Twilio)</span>
        </button>

        <button
          type="button"
          onClick={() => onCallChannelChange && onCallChannelChange('browser')}
          disabled={isCallActive || isQueueRunning}
          style={{
            padding: '7px 4px',
            border: 'none',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: isCallActive || isQueueRunning ? 'not-allowed' : 'pointer',
            background: callChannel === 'browser'
              ? 'rgba(56, 189, 248, 0.2)'
              : 'transparent',
            color: callChannel === 'browser' ? '#38bdf8' : '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.2s'
          }}
        >
          <Radio size={13} />
          <span>Browser Audio</span>
        </button>
      </div>

      {/* Twilio Live Status Card (Visible when in PSTN mode) */}
      {callChannel === 'pstn' && (
        <div style={{
          background: 'rgba(6, 78, 59, 0.2)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '10px',
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          fontSize: '11px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
              <ShieldCheck size={13} /> Twilio Live PSTN Carrier
            </span>
            <span style={{
              background: twilioConfig?.is_configured ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
              color: twilioConfig?.is_configured ? '#6ee7b7' : '#fca5a5',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 700
            }}>
              {twilioConfig?.is_configured ? 'ACTIVE' : 'SETUP REQUIRED'}
            </span>
          </div>

          <div style={{ color: '#cbd5e1', fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Caller ID (From):</span>
            <strong style={{ color: '#f8fafc', letterSpacing: '0.5px' }}>
              {twilioConfig?.twilio_phone_number || '+17372508034'}
            </strong>
          </div>

          {/* Webhook Tunnel Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
            <label style={{ color: '#94a3b8', fontSize: '10px' }}>
              Public Webhook URL (ngrok):
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                value={webhookUrl}
                onChange={(e) => onWebhookUrlChange && onWebhookUrlChange(e.target.value)}
                placeholder="https://xyz.ngrok-free.app"
                disabled={isCallActive}
                style={{
                  flex: 1,
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '6px',
                  color: '#f8fafc',
                  fontSize: '10px',
                  padding: '5px 8px'
                }}
              />
              {onSaveWebhookUrl && (
                <button
                  type="button"
                  onClick={onSaveWebhookUrl}
                  disabled={isCallActive}
                  style={{
                    background: 'rgba(16, 185, 129, 0.3)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    color: '#6ee7b7',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '10px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Save
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mode Selector Tabs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '6px',
        background: 'rgba(30, 41, 59, 0.5)',
        padding: '4px',
        borderRadius: '10px',
        border: '1px solid rgba(255, 255, 255, 0.06)'
      }}>
        <button
          type="button"
          onClick={() => {
            if (!isQueueRunning) onToggleQueueMode(false);
          }}
          disabled={isCallActive || isQueueRunning}
          style={{
            padding: '7px 0',
            border: 'none',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: isCallActive || isQueueRunning ? 'not-allowed' : 'pointer',
            background: !isQueueMode ? 'rgba(56, 189, 248, 0.18)' : 'transparent',
            color: !isQueueMode ? '#38bdf8' : '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.2s'
          }}
        >
          <Phone size={13} />
          <span>Single Call</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (!isCallActive) onToggleQueueMode(true);
          }}
          disabled={isCallActive}
          style={{
            padding: '7px 0',
            border: 'none',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: isCallActive ? 'not-allowed' : 'pointer',
            background: isQueueMode ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(5, 150, 105, 0.35))' : 'transparent',
            color: isQueueMode ? '#34d399' : '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.2s'
          }}
        >
          <ListOrdered size={14} />
          <span>Auto-Queue ({totalLeads})</span>
        </button>
      </div>

      {/* AUTO-DIALER QUEUE SECTION */}
      {isQueueMode ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          background: 'rgba(16, 185, 129, 0.04)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: '12px',
          padding: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Play size={12} /> Auto-Dialer Campaign
            </span>
            <Badge variant={isQueueRunning ? 'success' : 'info'}>
              {isQueueRunning ? 'Queue Active' : 'Ready'}
            </Badge>
          </div>

          {/* Progress Bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
              <span>Progress: {completedCount} / {targetLeadsCount} Called</span>
              <span style={{ color: '#34d399', fontWeight: 600 }}>{progressPercent}%</span>
            </div>
            <div style={{
              width: '100%',
              height: '6px',
              borderRadius: '3px',
              background: 'rgba(255, 255, 255, 0.08)',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #10b981, #38bdf8)',
                transition: 'width 0.4s ease'
              }} />
            </div>
          </div>

          {/* Next Call Countdown Card (Active between calls) */}
          {nextCallCountdown !== null && (
            <div style={{
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '10px',
              padding: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} color="#38bdf8" className="animate-spin" />
                <span style={{ fontSize: '12px', color: '#f8fafc', fontWeight: 600 }}>
                  Next lead in <strong style={{ color: '#38bdf8', fontSize: '14px' }}>{nextCallCountdown}s</strong>...
                </span>
              </div>
              <button
                type="button"
                onClick={onSkipCountdown}
                style={{
                  background: 'rgba(56, 189, 248, 0.2)',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  borderRadius: '6px',
                  color: '#38bdf8',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <FastForward size={12} /> Call Now
              </button>
            </div>
          )}

          {/* Select All & Multi-select Toolbar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 10px',
            background: 'rgba(30, 41, 59, 0.6)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            fontSize: '11px'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: isQueueRunning || isCallActive || leads.length === 0 ? 'not-allowed' : 'pointer',
              color: '#f8fafc',
              fontWeight: 600,
              userSelect: 'none'
            }}>
              <input
                type="checkbox"
                checked={leads.length > 0 && selectedQueueLeadIds.length === leads.length}
                onChange={onToggleSelectAll}
                disabled={isQueueRunning || isCallActive || leads.length === 0}
                style={{
                  cursor: isQueueRunning || isCallActive || leads.length === 0 ? 'not-allowed' : 'pointer',
                  accentColor: '#38bdf8',
                  width: '14px',
                  height: '14px'
                }}
              />
              <span>Select All</span>
            </label>

            <span style={{
              color: selectedQueueLeadIds.length > 0 ? '#38bdf8' : '#64748b',
              fontWeight: 600,
              fontSize: '10px',
              background: selectedQueueLeadIds.length > 0 ? 'rgba(56, 189, 248, 0.15)' : 'rgba(100, 116, 139, 0.15)',
              padding: '2px 8px',
              borderRadius: '12px',
              border: `1px solid ${selectedQueueLeadIds.length > 0 ? 'rgba(56, 189, 248, 0.3)' : 'rgba(100, 116, 139, 0.3)'}`
            }}>
              {selectedQueueLeadIds.length} / {leads.length} Selected
            </span>
          </div>

          {/* Queue Leads Mini-List */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            maxHeight: '170px',
            overflowY: 'auto'
          }}>
            {leads.map((l, idx) => {
              const isSelected = selectedQueueLeadIds.includes(l.id);
              const isCurrent = isCallActive && String(l.id) === selectedLeadId;
              const isDone = queueCompletedIds.includes(l.id);
              return (
                <div
                  key={l.id}
                  onClick={() => {
                    if (!isQueueRunning && !isCallActive) {
                      onToggleSelectLead(l.id);
                    }
                  }}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: isCurrent
                      ? 'rgba(56, 189, 248, 0.15)'
                      : isDone
                      ? 'rgba(16, 185, 129, 0.1)'
                      : isSelected
                      ? 'rgba(30, 41, 59, 0.5)'
                      : 'rgba(15, 23, 42, 0.3)',
                    border: `1px solid ${
                      isCurrent
                        ? '#38bdf8'
                        : isDone
                        ? 'rgba(16, 185, 129, 0.25)'
                        : isSelected
                        ? 'rgba(56, 189, 248, 0.25)'
                        : 'rgba(255, 255, 255, 0.04)'
                    }`,
                    opacity: !isSelected && !isCurrent && !isDone ? 0.55 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '11px',
                    cursor: isQueueRunning || isCallActive ? 'default' : 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (!isQueueRunning && !isCallActive) {
                          onToggleSelectLead(l.id);
                        }
                      }}
                      disabled={isQueueRunning || isCallActive}
                      style={{
                        cursor: isQueueRunning || isCallActive ? 'not-allowed' : 'pointer',
                        accentColor: '#38bdf8',
                        width: '13px',
                        height: '13px'
                      }}
                    />
                    <span style={{ color: '#94a3b8', fontSize: '10px' }}>#{idx + 1}</span>
                    <span style={{
                      color: isSelected ? '#f8fafc' : '#94a3b8',
                      fontWeight: isSelected ? 600 : 400
                    }}>
                      {l.contact?.first_name} {l.contact?.last_name || ''}
                    </span>
                  </div>

                  <div>
                    {isCurrent ? (
                      <span style={{ color: '#38bdf8', fontWeight: 700 }}>● In Call</span>
                    ) : isDone ? (
                      <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <CheckCircle2 size={11} /> Done
                      </span>
                    ) : isSelected ? (
                      <span style={{ color: '#64748b' }}>Queued</span>
                    ) : (
                      <span style={{ color: '#475569', fontStyle: 'italic' }}>Excluded</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Auto-Queue Action Button */}
          {!isQueueRunning ? (
            <button
              type="button"
              onClick={onStartQueue}
              disabled={isCallActive || selectedQueueLeadIds.length === 0}
              style={{
                width: '100%',
                padding: '12px',
                background: selectedQueueLeadIds.length === 0
                  ? 'rgba(51, 65, 85, 0.4)'
                  : 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none',
                borderRadius: '10px',
                color: selectedQueueLeadIds.length === 0 ? '#94a3b8' : '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: selectedQueueLeadIds.length === 0 || isCallActive ? 'not-allowed' : 'pointer',
                boxShadow: selectedQueueLeadIds.length > 0 ? '0 4px 14px rgba(16, 185, 129, 0.35)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              <Play size={16} />
              <span>
                {selectedQueueLeadIds.length === 0
                  ? 'Select Leads to Start'
                  : `Start Auto-Dial Campaign (${selectedQueueLeadIds.length} Leads)`}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onStopQueue}
              style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                border: 'none',
                borderRadius: '10px',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)'
              }}
            >
              <Square size={16} />
              <span>Stop Auto-Dial Campaign</span>
            </button>
          )}
        </div>
      ) : (
        /* SINGLE CALL MODE CONTROLS */
        <>
          {/* Lead & Persona Selectors in 1 Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
            gap: '12px',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            {/* Lead Dropdown */}
            <div style={{ minWidth: 0 }}>
              <label
                title="Select Existing CRM Lead:"
                style={{
                  fontSize: '11px',
                  color: '#94a3b8',
                  display: 'block',
                  marginBottom: '6px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                Select Existing CRM Lead:
              </label>
              <FormSelect
                value={selectedLeadId}
                onChange={(e) => onLeadChange(e.target.value)}
                disabled={isCallActive}
                options={leads.map(l => ({
                  value: String(l.id),
                  label: `${l.contact?.first_name} ${l.contact?.last_name || ''} (${l.contact?.company?.name || 'Individual'}) - ${l.stage}`
                }))}
              />
            </div>

            {/* Persona Dropdown */}
            <div style={{ minWidth: 0 }}>
              <label
                title="AI Calling Persona & Script:"
                style={{
                  fontSize: '11px',
                  color: '#94a3b8',
                  display: 'block',
                  marginBottom: '6px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                AI Calling Persona & Script:
              </label>
              <FormSelect
                value={selectedPersona}
                onChange={(e) => onPersonaChange(e.target.value)}
                disabled={isCallActive}
                options={personaOptions}
              />
            </div>
          </div>

          {/* Lead Card Preview */}
          {selectedLead && (
            <div style={{
              background: 'rgba(30, 41, 59, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                  {selectedLead.contact?.first_name} {selectedLead.contact?.last_name || ''}
                </span>
                <Badge variant={selectedLead.bucket === 'HOT' ? 'danger' : selectedLead.bucket === 'WARM' ? 'warning' : 'info'}>
                  Score: {selectedLead.score} ({selectedLead.bucket})
                </Badge>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94a3b8' }}>
                <Building size={12} />
                <span>{selectedLead.contact?.company?.name || 'Individual Prospect'}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#cbd5e1', marginTop: '4px' }}>
                <span>Stage: <strong style={{ color: '#38bdf8' }}>{selectedLead.stage}</strong></span>
                <span>Value: <strong style={{ color: '#10b981' }}>₹{selectedLead.deal_value?.toLocaleString() || '0'}</strong></span>
              </div>
            </div>
          )}

          {/* Phone Dial Number Input */}
          <div style={{ marginTop: 'auto' }}>
            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
              Phone Number to Dial:
            </label>
            <input
              type="text"
              value={dialPhoneNumber}
              onChange={(e) => onPhoneChange(e.target.value)}
              disabled={isCallActive}
              placeholder="+91 98765 43210"
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '10px',
                color: '#f8fafc',
                fontSize: '15px',
                fontWeight: 600,
                letterSpacing: '1px',
                textAlign: 'center',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Dialpad Matrix */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px'
          }}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDialpadClick(digit)}
                disabled={isCallActive}
                style={{
                  padding: '10px 0',
                  background: 'rgba(30, 41, 59, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '10px',
                  color: '#e2e8f0',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: isCallActive ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {digit}
              </button>
            ))}
          </div>

          {/* Call / End Action Button */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            {!isCallActive ? (
              <button
                type="button"
                onClick={onStartCall}
                disabled={isPstnRinging}
                style={{
                  width: '100%',
                  padding: '12px 18px',
                  background: isPstnRinging
                    ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                    : callChannel === 'pstn'
                    ? 'linear-gradient(135deg, #10b981, #047857)'
                    : 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: isPstnRinging ? 'wait' : 'pointer',
                  boxShadow: callChannel === 'pstn'
                    ? '0 4px 14px rgba(16, 185, 129, 0.35)'
                    : '0 4px 14px rgba(14, 165, 233, 0.35)'
                }}
              >
                <PhoneCall size={18} />
                <span>
                  {isPstnRinging
                    ? 'Ringing Physical Phone...'
                    : callChannel === 'pstn'
                    ? 'Dial Physical Phone'
                    : 'Start AI Call'}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onEndCall}
                style={{
                  width: '100%',
                  padding: '12px 18px',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)'
                }}
              >
                <PhoneOff size={18} />
                <span>{callChannel === 'pstn' ? 'Hangup Real Phone' : 'End Call Session'}</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};
