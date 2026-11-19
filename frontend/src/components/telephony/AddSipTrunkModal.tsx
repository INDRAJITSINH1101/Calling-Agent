import React, { useState, useEffect } from 'react';
import { X, Server, Eye, EyeOff } from 'lucide-react';
import { SipTrunk } from '../../services/telephonyApi';
import { useSystemConstants } from '../../hooks/useSystemConstants';
import { Button } from '../ui/Button';
import { FormSelect } from '../ui/FormSelect';

interface AddSipTrunkModalProps {
  isOpen: boolean;
  trunkToEdit?: SipTrunk | null;
  onClose: () => void;
  onSubmit: (data: Partial<SipTrunk> & { password?: string }) => void;
  isSubmitting: boolean;
}

export const AddSipTrunkModal: React.FC<AddSipTrunkModalProps> = ({
  isOpen,
  trunkToEdit,
  onClose,
  onSubmit,
  isSubmitting
}) => {
  const { sipProviders, sipTransports } = useSystemConstants();

  const [name, setName] = useState('');
  const [provider, setProvider] = useState('TWILIO');
  const [sipServer, setSipServer] = useState('');
  const [transport, setTransport] = useState('UDP');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [concurrencyLimit, setConcurrencyLimit] = useState(10);
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    if (trunkToEdit) {
      setName(trunkToEdit.name);
      setProvider(trunkToEdit.provider);
      setSipServer(trunkToEdit.sip_server);
      setTransport(trunkToEdit.transport || 'UDP');
      setUsername(trunkToEdit.username || '');
      setPassword('');
      setShowPassword(false);
      setConcurrencyLimit(trunkToEdit.concurrency_limit || 10);
      setIsDefault(trunkToEdit.is_default);
    } else {
      setName('');
      setProvider('TWILIO');
      setSipServer('devdutt.pstn.twilio.com');
      setTransport('UDP');
      setUsername('');
      setPassword('');
      setShowPassword(false);
      setConcurrencyLimit(10);
      setIsDefault(false);
    }
  }, [trunkToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Partial<SipTrunk> & { password?: string } = {
      name,
      provider,
      sip_server: sipServer,
      transport,
      username: username || undefined,
      concurrency_limit: concurrencyLimit,
      is_default: isDefault
    };
    if (password) {
      payload.password = password;
    }
    onSubmit(payload);
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
        padding: '20px',
        overflowY: 'auto'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(180deg, #0d1527 0%, #070c17 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '580px',
          boxShadow: '0 30px 70px -15px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 0 30px -5px rgba(56, 189, 248, 0.1)',
          overflow: 'visible',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: '20px 20px 0 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(16, 24, 44, 0.96) 0%, rgba(12, 18, 34, 0.92) 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '11px',
                background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(37, 99, 235, 0.1) 100%)',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                boxShadow: '0 0 16px rgba(56, 189, 248, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8'
              }}
            >
              <Server size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.2px' }}>
                {trunkToEdit ? 'Configure SIP Trunk Gateway' : 'Add New SIP Trunk Gateway'}
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>
                Connect carrier trunks (Twilio, Telnyx, LiveKit, Asterisk)
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

        {/* Form Body - Balanced 2-Column Grid (1fr 1fr across all rows) */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Row 1: Trunk Name & SIP Provider (50% - 50%) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '5px', userSelect: 'none' }}>
                <span>Trunk Name</span> <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Twilio Primary Carrier"
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

            <div style={{ position: 'relative', zIndex: 40 }}>
              <FormSelect
                label="SIP Provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                options={sipProviders.map((p) => ({ value: p.value, label: p.label }))}
              />
            </div>
          </div>

          {/* Row 2: SIP Server / Domain & Transport (50% - 50%) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '5px', userSelect: 'none' }}>
                <span>SIP Server / Domain</span> <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={sipServer}
                onChange={(e) => setSipServer(e.target.value)}
                placeholder="e.g. devdutt.pstn.twilio.com"
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

            <div style={{ position: 'relative', zIndex: 30 }}>
              <FormSelect
                label="Transport"
                value={transport}
                onChange={(e) => setTransport(e.target.value)}
                options={sipTransports.map((t) => ({ value: t.value, label: t.label }))}
              />
            </div>
          </div>

          {/* Row 3: Auth Username & Auth Password (50% - 50%) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '5px', userSelect: 'none' }}>
                <span>Auth Username (Optional)</span>
              </label>
              <input
                type="text"
                autoComplete="off"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="SIP username"
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
                <span>Auth Password</span> <span style={{ fontSize: '10px', color: '#64748b' }}>{trunkToEdit ? '(Leave blank to keep)' : ''}</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    height: '38px',
                    boxSizing: 'border-box',
                    padding: '0 36px 0 12px',
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
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'View entered password'}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: showPassword ? '#38bdf8' : '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2px'
                  }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          </div>

          {/* Row 4: Concurrency Limit & Set as Default Checkbox (50% - 50%) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '5px', userSelect: 'none' }}>
                <span>Concurrency Limit</span>
              </label>
              <input
                type="number"
                min={1}
                max={500}
                value={concurrencyLimit}
                onChange={(e) => setConcurrencyLimit(parseInt(e.target.value) || 10)}
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

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                height: '38px',
                marginTop: '19px',
                padding: '0 12px',
                boxSizing: 'border-box',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <input
                type="checkbox"
                id="isDefaultTrunk"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                style={{ accentColor: '#38bdf8', cursor: 'pointer', width: '15px', height: '15px' }}
              />
              <label htmlFor="isDefaultTrunk" style={{ fontSize: '11px', color: '#e2e8f0', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title="Set as Default Outbound Carrier Gateway">
                Default Carrier Gateway
              </label>
            </div>
          </div>

          {/* Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              marginTop: '4px',
              paddingTop: '14px',
              borderTop: '1px solid rgba(255, 255, 255, 0.07)'
            }}
          >
            <Button variant="secondary" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : trunkToEdit ? 'Save Trunk Config' : 'Connect SIP Trunk'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
