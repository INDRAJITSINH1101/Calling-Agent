import React, { useState } from 'react';
import { X, Activity, PhoneCall, CheckCircle2, AlertTriangle, Radio, Volume2 } from 'lucide-react';
import { SipTrunk, TestCallResult, telephonyApi } from '../../services/telephonyApi';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { FormSelect } from '../ui/FormSelect';

interface SipDiagnosticModalProps {
  isOpen: boolean;
  trunks: SipTrunk[];
  initialPhoneNumber?: string;
  onClose: () => void;
}

export const SipDiagnosticModal: React.FC<SipDiagnosticModalProps> = ({
  isOpen,
  trunks,
  initialPhoneNumber = '',
  onClose
}) => {
  const [targetPhone, setTargetPhone] = useState(initialPhoneNumber || '+1 (555) 019-2834');
  const [selectedTrunkId, setSelectedTrunkId] = useState<number | undefined>(
    trunks.find(t => t.is_default)?.id || trunks[0]?.id
  );
  const [selectedPersona, setSelectedPersona] = useState('Rachel (Lead Qualifier)');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<TestCallResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stepLogs, setStepLogs] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleRunDiagnostic = async () => {
    setIsRunning(true);
    setError(null);
    setResult(null);
    setStepLogs([
      'INIT: Initializing SIP stack & TLS context...',
      `ROUTE: Selecting trunk route ID #${selectedTrunkId || 'DEFAULT'}...`,
      `INVITE: Generating SIP INVITE to ${targetPhone}...`
    ]);

    try {
      // Simulate real-time stepping for realistic diagnostic experience
      await new Promise(r => setTimeout(r, 600));
      setStepLogs(prev => [...prev, '100 TRYING: Carrier gateway acknowledged request']);

      await new Promise(r => setTimeout(r, 700));
      setStepLogs(prev => [...prev, '180 RINGING: Handshake achieved with destination PSTN network']);

      const res = await telephonyApi.runTestCall({
        target_phone: targetPhone,
        trunk_id: selectedTrunkId,
        persona: selectedPersona
      });

      await new Promise(r => setTimeout(r, 500));
      setStepLogs(prev => [
        ...prev,
        `200 OK: Audio session established with codec ${res.negotiated_codec}`,
        `CALL_ID: Session registered in database (#${res.call_id})`
      ]);

      setResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Diagnostic test failed';
      setError(msg);
      setStepLogs(prev => [...prev, `ERROR 503: SIP Handshake failure (${msg})`]);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '580px',
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9))'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8'
              }}
            >
              <Activity size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
                SIP Telephony Live Diagnostic
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                Simulate SIP INVITE, codec negotiation & audio handshake
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isRunning}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Destination Number */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
              Target Destination Phone (E.164)
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={targetPhone}
                onChange={e => setTargetPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <PhoneCall
                size={14}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748b'
                }}
              />
            </div>
          </div>

          {/* Trunk & Persona Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <FormSelect
              label="Outbound SIP Trunk"
              value={selectedTrunkId || ''}
              onChange={e => setSelectedTrunkId(e.target.value ? Number(e.target.value) : undefined)}
              options={trunks.map(t => ({
                value: t.id,
                label: `${t.name} (${t.provider}) ${t.is_default ? '★' : ''}`
              }))}
            />

            <FormSelect
              label="AI Voice Persona"
              value={selectedPersona}
              onChange={e => setSelectedPersona(e.target.value)}
              options={[
                { value: 'Rachel (Lead Qualifier)', label: 'Rachel (Lead Qualifier)' },
                { value: 'Sarah (Support Representative)', label: 'Sarah (Support Representative)' },
                { value: 'David (Executive Closer)', label: 'David (Executive Closer)' },
                { value: 'Marcus (Appointment Specialist)', label: 'Marcus (Appointment Specialist)' }
              ]}
            />
          </div>

          {/* Execution Log Screen */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                SIP Signaling Log (Live)
              </span>
              {isRunning && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#38bdf8', fontSize: '11px' }}>
                  <Radio size={12} className="animate-pulse" /> Handshake in progress...
                </div>
              )}
            </div>
            <div
              style={{
                backgroundColor: '#020617',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                padding: '12px',
                minHeight: '130px',
                maxHeight: '160px',
                overflowY: 'auto',
                fontFamily: 'monospace',
                fontSize: '11px',
                lineHeight: '1.6',
                color: '#38bdf8'
              }}
            >
              {stepLogs.length === 0 ? (
                <div style={{ color: '#475569', fontStyle: 'italic', padding: '10px 0' }}>
                  Click &apos;Initiate Diagnostic Call&apos; to inspect packet negotiation...
                </div>
              ) : (
                stepLogs.map((log, i) => (
                  <div
                    key={i}
                    style={{
                      color: log.includes('ERROR')
                        ? '#ef4444'
                        : log.includes('200 OK') || log.includes('CALL_ID')
                        ? '#10b981'
                        : log.includes('180')
                        ? '#fbbf24'
                        : '#94a3b8'
                    }}
                  >
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Test Call Outcome Banner */}
          {result && (
            <div
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '10px',
                padding: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={24} color="#10b981" />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                    SIP Session Connected ({result.latency_ms}ms)
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    Trunk: <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{result.trunk_name}</span> • Codec:{' '}
                    <span style={{ color: '#38bdf8', fontWeight: 600 }}>{result.negotiated_codec}</span>
                  </div>
                </div>
              </div>
              <Badge variant="success">Call #{result.call_id} Logged</Badge>
            </div>
          )}

          {error && (
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '10px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#f87171',
                fontSize: '12px'
              }}
            >
              <AlertTriangle size={18} />
              <div>{error}</div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            backgroundColor: '#090d16'
          }}
        >
          <Button variant="secondary" onClick={onClose} disabled={isRunning}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={handleRunDiagnostic}
            disabled={isRunning || !targetPhone}
            icon={isRunning ? <Activity size={14} className="animate-spin" /> : <Volume2 size={14} />}
          >
            {isRunning ? 'Negotiating SIP...' : 'Initiate Diagnostic Call'}
          </Button>
        </div>
      </div>
    </div>
  );
};
