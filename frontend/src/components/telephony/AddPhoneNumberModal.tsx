import React, { useState, useEffect } from 'react';
import { X, Phone, Clock } from 'lucide-react';
import { PhoneNumber, SipTrunk } from '../../services/telephonyApi';
import { useSystemConstants } from '../../hooks/useSystemConstants';
import { Button } from '../ui/Button';
import { FormSelect } from '../ui/FormSelect';
import { TimePicker } from '../ui/TimePicker';

interface AddPhoneNumberModalProps {
  isOpen: boolean;
  numberToEdit?: PhoneNumber | null;
  trunks: SipTrunk[];
  onClose: () => void;
  onSubmit: (data: Partial<PhoneNumber>) => void;
  isSubmitting: boolean;
}

export const AddPhoneNumberModal: React.FC<AddPhoneNumberModalProps> = ({
  isOpen,
  numberToEdit,
  trunks,
  onClose,
  onSubmit,
  isSubmitting
}) => {
  const {
    phoneNumberTypes,
    callingPersonas,
    routingFallbackActions
  } = useSystemConstants();

  const [number, setNumber] = useState('');
  const [label, setLabel] = useState('');
  const [sipTrunkId, setSipTrunkId] = useState<number | undefined>(undefined);
  const [type, setType] = useState('BIDIRECTIONAL');
  const [persona, setPersona] = useState('Rachel (Lead Qualifier)');
  const [status, setStatus] = useState('ACTIVE');
  const [businessStart, setBusinessStart] = useState('09:00');
  const [businessEnd, setBusinessEnd] = useState('19:00');
  const [fallbackAction, setFallbackAction] = useState('HUMAN_TRANSFER');
  const [fallbackNumber, setFallbackNumber] = useState('');
  const [isDefaultOutbound, setIsDefaultOutbound] = useState(false);

  useEffect(() => {
    if (numberToEdit) {
      setNumber(numberToEdit.number);
      setLabel(numberToEdit.label);
      setSipTrunkId(numberToEdit.sip_trunk_id);
      setType(numberToEdit.type);
      setPersona(numberToEdit.assigned_agent_persona || numberToEdit.assigned_persona || 'Rachel (Lead Qualifier)');
      setStatus(numberToEdit.status);
      setBusinessStart(numberToEdit.business_hours_start || '09:00');
      setBusinessEnd(numberToEdit.business_hours_end || '19:00');
      setFallbackAction(numberToEdit.fallback_action || 'HUMAN_TRANSFER');
      setFallbackNumber(numberToEdit.fallback_forward_number || numberToEdit.fallback_target || '');
      setIsDefaultOutbound(Boolean(numberToEdit.is_default_outbound || numberToEdit.is_primary_outbound));
    } else {
      setNumber('');
      setLabel('');
      setSipTrunkId(trunks.find(t => t.is_default)?.id || trunks[0]?.id);
      setType('BIDIRECTIONAL');
      setPersona('Rachel (Lead Qualifier)');
      setStatus('ACTIVE');
      setBusinessStart('09:00');
      setBusinessEnd('19:00');
      setFallbackAction('HUMAN_TRANSFER');
      setFallbackNumber('+91 98111 22233');
      setIsDefaultOutbound(false);
    }
  }, [numberToEdit, isOpen, trunks]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      number,
      label,
      sip_trunk_id: sipTrunkId,
      type,
      assigned_agent_persona: persona,
      status,
      business_hours_start: businessStart,
      business_hours_end: businessEnd,
      fallback_action: fallbackAction,
      fallback_forward_number: fallbackNumber || undefined,
      is_default_outbound: isDefaultOutbound
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(3, 7, 18, 0.75)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
    >
      <div
        style={{
          background: 'linear-gradient(180deg, #0d1527 0%, #070c17 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '580px',
          maxHeight: '92vh',
          boxShadow: '0 30px 70px -15px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 0 30px -5px rgba(56, 189, 248, 0.1)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Modern Header with Ambient Glow & Badged Icon */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            background: 'linear-gradient(180deg, rgba(16, 24, 44, 0.96) 0%, rgba(12, 18, 34, 0.92) 100%)',
            backdropFilter: 'blur(16px)',
            zIndex: 10
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '11px',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.1) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                boxShadow: '0 0 16px rgba(16, 185, 129, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981'
              }}
            >
              <Phone size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.2px' }}>
                {numberToEdit ? 'Configure Phone Number Routing' : 'Provision Virtual Phone Number (DID)'}
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>
                Connect telecom carriers, assign AI personas, and set schedule rules
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
          {/* Number & Label */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '5px', userSelect: 'none' }}>
                <span>Phone Number (E.164)</span> <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="+91 98765 43210"
                style={{
                  width: '100%',
                  height: '38px',
                  boxSizing: 'border-box',
                  padding: '0 12px',
                  backgroundColor: '#1e293b',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 500,
                  outline: 'none',
                  transition: 'border-color 0.15s ease'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '5px', userSelect: 'none' }}>
                <span>Line Label / Purpose</span> <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Sales Inbound Hotline"
                style={{
                  width: '100%',
                  height: '38px',
                  boxSizing: 'border-box',
                  padding: '0 12px',
                  backgroundColor: '#1e293b',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 500,
                  outline: 'none',
                  transition: 'border-color 0.15s ease'
                }}
              />
            </div>
          </div>

          {/* Attached Trunk & Direction Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <FormSelect
              label="Attached SIP Trunk"
              value={sipTrunkId || ''}
              onChange={(e) => setSipTrunkId(e.target.value ? parseInt(e.target.value) : undefined)}
              options={[
                { value: '', label: 'No Trunk (Standby)' },
                ...trunks.map((t) => ({ value: t.id, label: `${t.name} (${t.provider})` }))
              ]}
            />

            <FormSelect
              label="Direction Usage"
              value={type}
              onChange={(e) => setType(e.target.value)}
              options={phoneNumberTypes.map((t) => ({ value: t.value, label: t.label }))}
            />
          </div>

          {/* Assigned Agent Persona & Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <FormSelect
              label="Assigned AI Agent Persona"
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              options={callingPersonas.map((p) => ({ value: p.value, label: p.label }))}
            />

            <FormSelect
              label="Line Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: 'ACTIVE', label: 'Active (Ready to Route)' },
                { value: 'INACTIVE', label: 'Inactive (Disabled)' },
                { value: 'BUSY', label: 'Maintenance / Busy' }
              ]}
            />
          </div>

          {/* Business Hours Schedule Card with Polished Aesthetics */}
          <div
            style={{
              background: 'linear-gradient(180deg, rgba(22, 33, 58, 0.45) 0%, rgba(13, 20, 36, 0.65) 100%)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              borderRadius: '12px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 4px 16px rgba(0, 0, 0, 0.25)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={13} color="#38bdf8" />
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                  Inbound Business Hours Schedule
                </span>
              </div>
              <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 500 }}>
                Automatic AI Pickup Window
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <TimePicker
                label="Start Time"
                value={businessStart}
                onChange={(val) => setBusinessStart(val)}
              />
              <TimePicker
                label="End Time"
                value={businessEnd}
                align="right"
                onChange={(val) => setBusinessEnd(val)}
              />
            </div>
          </div>

          {/* Fallback Strategy */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <FormSelect
              label="Fallback Strategy"
              value={fallbackAction}
              onChange={(e) => setFallbackAction(e.target.value)}
              options={routingFallbackActions.map((f) => ({ value: f.value, label: f.label }))}
            />

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '5px', userSelect: 'none' }}>
                Human Escalation Number
              </label>
              <input
                type="text"
                value={fallbackNumber}
                onChange={(e) => setFallbackNumber(e.target.value)}
                placeholder="+91 98111 22233"
                style={{
                  width: '100%',
                  height: '38px',
                  boxSizing: 'border-box',
                  padding: '0 12px',
                  backgroundColor: '#1e293b',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 500,
                  outline: 'none',
                  transition: 'border-color 0.15s ease'
                }}
              />
            </div>
          </div>

          {/* Primary Outbound Caller ID checkbox */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}
          >
            <input
              type="checkbox"
              id="isDefaultOutbound"
              checked={isDefaultOutbound}
              onChange={(e) => setIsDefaultOutbound(e.target.checked)}
              style={{ accentColor: '#10b981', cursor: 'pointer', width: '15px', height: '15px' }}
            />
            <label htmlFor="isDefaultOutbound" style={{ fontSize: '12px', color: '#e2e8f0', cursor: 'pointer', fontWeight: 500 }}>
              Set as Primary Outbound Caller ID (CLI for Outreach Campaigns)
            </label>
          </div>

          {/* Actions Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              marginTop: '6px',
              paddingTop: '12px',
              borderTop: '1px solid rgba(255, 255, 255, 0.07)'
            }}
          >
            <Button variant="secondary" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : numberToEdit ? 'Save Routing Rules' : 'Provision Line'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
