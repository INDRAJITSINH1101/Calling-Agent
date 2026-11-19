import React, { useState, useEffect } from 'react';
import { X, Users, Megaphone, Bot, Settings2, Sparkles } from 'lucide-react';
import { campaignsApi, CampaignCreatePayload, AudiencePreviewResponse } from '../../services/campaignsApi';
import { trainingApi, AgentPersonaConfig } from '../../services/trainingApi';
import { telephonyApi, PhoneNumber } from '../../services/telephonyApi';
import { FormSelect } from '../ui/FormSelect';
import { Button } from '../ui/Button';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateCampaignModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedStage, setSelectedStage] = useState('NEW');
  const [minScore, setMinScore] = useState<number>(0);
  const [personaId, setPersonaId] = useState<number | undefined>(undefined);
  const [callerPhoneId, setCallerPhoneId] = useState<number | undefined>(undefined);
  const [concurrencyLimit, setConcurrencyLimit] = useState(3);
  const [callsPerMinute, setCallsPerMinute] = useState(10);
  const [maxRetries, setMaxRetries] = useState(2);
  const [cooldownMins, setCooldownMins] = useState(60);
  const [activeStart, setActiveStart] = useState('09:00');
  const [activeEnd, setActiveEnd] = useState('19:00');

  const [personas, setPersonas] = useState<AgentPersonaConfig[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [audiencePreview, setAudiencePreview] = useState<AudiencePreviewResponse | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);

    trainingApi.getPersonas().then(res => {
      setPersonas(res);
      if (res.length > 0 && !personaId) setPersonaId(res[0].id);
    }).catch(console.error);

    telephonyApi.getNumbers().then(res => {
      const items = res?.items || [];
      setPhoneNumbers(items);
      if (items.length > 0 && !callerPhoneId) setCallerPhoneId(items[0].id);
    }).catch(console.error);
  }, [isOpen]);

  // Update audience preview whenever filters change
  useEffect(() => {
    if (!isOpen) return;
    setIsPreviewLoading(true);
    const filterStages = selectedStage === 'ALL' ? undefined : [selectedStage];
    campaignsApi.getAudiencePreview({
      stages: filterStages,
      min_score: minScore > 0 ? minScore : undefined
    }).then(res => {
      setAudiencePreview(res);
    }).catch(console.error).finally(() => {
      setIsPreviewLoading(false);
    });
  }, [isOpen, selectedStage, minScore]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Campaign name is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload: CampaignCreatePayload = {
        name: name.trim(),
        description: description.trim() || undefined,
        persona_id: personaId,
        caller_phone_id: callerPhoneId,
        target_filters: {
          stages: selectedStage === 'ALL' ? undefined : [selectedStage],
          min_score: minScore > 0 ? minScore : undefined
        },
        concurrency_limit: concurrencyLimit,
        calls_per_minute: callsPerMinute,
        max_retry_attempts: maxRetries,
        retry_cooldown_mins: cooldownMins,
        active_hours_start: activeStart,
        active_hours_end: activeEnd
      };

      await campaignsApi.createCampaign(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to create campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(2, 6, 23, 0.82)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        background: '#0b1329',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.5)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(56, 189, 248, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8'
            }}>
              <Megaphone size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#f8fafc' }}>
                Create Automated Calling Campaign
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                Batch AI voice dialing with live lead qualification and auto-retries
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '20px 24px' }}>
          {error && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              color: '#f87171',
              fontSize: '12px',
              marginBottom: '16px'
            }}>
              {error}
            </div>
          )}

          {/* Campaign Name & Description */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#cbd5e1', marginBottom: '6px' }}>
              Campaign Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q4 Inbound Lead Blitz"
              required
              style={{
                width: '100%',
                padding: '9px 12px',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#cbd5e1', marginBottom: '6px' }}>
              Description & Objective (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Outbound demo pitch for enterprise buyers"
              style={{
                width: '100%',
                padding: '9px 12px',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>

          {/* Section: Target Audience */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.45)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '14px',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontSize: '13px', fontWeight: 600 }}>
                <Users size={16} />
                <span>Target Audience Filters</span>
              </div>
              <div style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#38bdf8',
                background: 'rgba(56, 189, 248, 0.15)',
                padding: '3px 10px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Sparkles size={12} />
                <span>
                  {isPreviewLoading ? 'Calculating...' : `${audiencePreview?.total_eligible || 0} Contacts Eligible`}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <FormSelect
                label="Filter by Lead Stage"
                value={selectedStage}
                onSelect={(val) => setSelectedStage(String(val))}
                options={[
                  { value: 'ALL', label: 'All Active Stages' },
                  { value: 'NEW', label: 'NEW Leads' },
                  { value: 'CONTACTED', label: 'CONTACTED Leads' },
                  { value: 'QUALIFIED', label: 'QUALIFIED Leads' },
                  { value: 'PROPOSAL', label: 'PROPOSAL Leads' }
                ]}
              />

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#cbd5e1', marginBottom: '6px' }}>
                  Minimum Lead Score ({minScore}+)
                </label>
                <input
                  type="range"
                  min="0"
                  max="80"
                  step="10"
                  value={minScore}
                  onChange={(e) => setMinScore(parseInt(e.target.value) || 0)}
                  style={{ width: '100%', accentColor: '#38bdf8', marginTop: '10px' }}
                />
              </div>
            </div>
          </div>

          {/* Section: AI Voice Agent & Caller ID */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.45)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '14px',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a855f7', fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>
              <Bot size={16} />
              <span>AI Conversational Voice & Caller ID</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <FormSelect
                label="Assigned AI Persona"
                value={personaId ? String(personaId) : ''}
                onSelect={(val) => setPersonaId(val ? Number(val) : undefined)}
                options={personas.map(p => ({
                  value: String(p.id),
                  label: `${p.name} (${p.tone || 'Sales Closer'})`
                }))}
              />

              <FormSelect
                label="Outbound Caller ID (DID)"
                value={callerPhoneId ? String(callerPhoneId) : ''}
                onSelect={(val) => setCallerPhoneId(val ? Number(val) : undefined)}
                options={phoneNumbers.map(n => ({
                  value: String(n.id),
                  label: `${n.number} - ${n.label}`
                }))}
              />
            </div>
          </div>

          {/* Section: Cadence & Retries */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.45)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '14px',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>
              <Settings2 size={16} />
              <span>Cadence, Concurrency & Retry Policy</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
              <FormSelect
                label="Concurrency Limit (Parallel Calls)"
                value={String(concurrencyLimit)}
                onSelect={(val) => setConcurrencyLimit(Number(val))}
                options={[
                  { value: '1', label: '1 Concurrent Call (Safe / Sequential)' },
                  { value: '3', label: '3 Concurrent Calls (Standard)' },
                  { value: '5', label: '5 Concurrent Calls (Fast)' },
                  { value: '10', label: '10 Concurrent Calls (High Volume)' }
                ]}
              />

              <FormSelect
                label="Auto-Retries on Busy / No-Answer"
                value={String(maxRetries)}
                onSelect={(val) => setMaxRetries(Number(val))}
                options={[
                  { value: '0', label: 'No Retries (1 Attempt Only)' },
                  { value: '1', label: '1 Retry Attempt' },
                  { value: '2', label: '2 Retry Attempts (Recommended)' },
                  { value: '3', label: '3 Retry Attempts' }
                ]}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
              <FormSelect
                label="Pacing (Calls Per Minute)"
                value={String(callsPerMinute)}
                onSelect={(val) => setCallsPerMinute(Number(val))}
                options={[
                  { value: '5', label: '5 Calls / Min (Slow & Gentle)' },
                  { value: '10', label: '10 Calls / Min (Standard)' },
                  { value: '20', label: '20 Calls / Min (Aggressive)' }
                ]}
              />

              <FormSelect
                label="Retry Cooldown Window"
                value={String(cooldownMins)}
                onSelect={(val) => setCooldownMins(Number(val))}
                options={[
                  { value: '15', label: '15 Minutes Cooldown' },
                  { value: '30', label: '30 Minutes Cooldown' },
                  { value: '60', label: '60 Minutes (1 Hour)' },
                  { value: '120', label: '2 Hours Cooldown' }
                ]}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#cbd5e1', marginBottom: '6px' }}>
                  Active Calling Hours (Start)
                </label>
                <input
                  type="time"
                  value={activeStart}
                  onChange={(e) => setActiveStart(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#cbd5e1', marginBottom: '6px' }}>
                  Active Calling Hours (End)
                </label>
                <input
                  type="time"
                  value={activeEnd}
                  onChange={(e) => setActiveEnd(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
            marginTop: '8px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '16px'
          }}>
            <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating Campaign...' : 'Create & Queue Campaign'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
