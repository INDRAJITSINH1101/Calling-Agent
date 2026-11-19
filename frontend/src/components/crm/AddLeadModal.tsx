import React, { useState, useEffect } from 'react';
import { X, Target, Save } from 'lucide-react';
import { Lead, LeadStage } from '../../types/crm';
import { leadsApi } from '../../services/leadsApi';
import { Button } from '../ui/Button';
import { FormSelect } from '../ui/FormSelect';
import { useSystemConstants } from '../../hooks/useSystemConstants';

interface AddLeadModalProps {
  isOpen: boolean;
  leadToEdit?: Lead | null;
  defaultStage?: LeadStage;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddLeadModal: React.FC<AddLeadModalProps> = ({
  isOpen,
  leadToEdit,
  defaultStage = 'NEW',
  onClose,
  onSuccess
}) => {
  const { leadStages, leadSources } = useSystemConstants();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [stage, setStage] = useState<string>(defaultStage);
  const [source, setSource] = useState('INBOUND');
  const [dealValue, setDealValue] = useState<number | string>(5000);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  useEffect(() => {
    if (leadToEdit) {
      setName(leadToEdit.contact_name || '');
      setEmail(leadToEdit.contact_email || '');
      setPhone(leadToEdit.contact_phone || '');
      setCompanyName(leadToEdit.company_name || '');
      setStage(leadToEdit.stage || defaultStage);
      setSource(leadToEdit.source || 'INBOUND');
      setDealValue(leadToEdit.deal_value || 5000);
      setNotes(leadToEdit.notes || '');
    } else {
      setName('');
      setEmail('');
      setPhone('');
      setCompanyName('');
      setStage(defaultStage);
      setSource('INBOUND');
      setDealValue(5000);
      setNotes('');
    }
    setError(null);
  }, [leadToEdit, isOpen, defaultStage]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);

    if (!name.trim() || !phone.trim()) {
      setError('Please fill all required compulsory fields marked in red.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const fullName = name.trim();
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0] || fullName;
    const lastName = nameParts.slice(1).join(' ') || undefined;

    const payload = {
      first_name: firstName,
      last_name: lastName,
      phone: phone.trim(),
      email: email.trim() || undefined,
      contact_name: fullName,
      contact_phone: phone.trim(),
      contact_email: email.trim() || undefined,
      company_name: companyName.trim() || undefined,
      stage: stage.toUpperCase(),
      source: source.toUpperCase(),
      deal_value: Number(dealValue) || 0,
      notes: notes.trim() || undefined
    };

    try {
      if (leadToEdit) {
        await leadsApi.updateLead(leadToEdit.id, payload as any);
      } else {
        await leadsApi.createLead(payload as any);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save lead opportunity.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#0d1527',
          border: '1px solid #1e293b',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '560px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 20px rgba(56, 189, 248, 0.1)',
          overflow: 'visible',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTopLeftRadius: '15px',
          borderTopRightRadius: '15px',
          backgroundColor: '#0f172a'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target size={18} color="#38bdf8" />
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
              {leadToEdit ? 'Edit Lead Opportunity' : 'Add New Lead'}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', fontSize: '12px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: (attemptedSubmit && !name.trim()) ? '#f87171' : '#94a3b8' }}>
                CONTACT NAME <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="e.g. Alex Morgan"
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 12px',
                  marginTop: '4px',
                  backgroundColor: '#1e293b',
                  border: (attemptedSubmit && !name.trim()) ? '1.5px solid #ef4444' : '1px solid rgba(255,255,255,0.12)',
                  boxShadow: (attemptedSubmit && !name.trim()) ? '0 0 0 2px rgba(239, 68, 68, 0.25)' : 'none',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
                required
              />
              {attemptedSubmit && !name.trim() && (
                <span style={{ color: '#ef4444', fontSize: '11px', marginTop: '3px', display: 'block' }}>
                  Contact name is required
                </span>
              )}
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>COMPANY NAME</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Nexus Global"
                style={{ width: '100%', height: '38px', padding: '0 12px', marginTop: '4px', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#f8fafc', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: (attemptedSubmit && !phone.trim()) ? '#f87171' : '#94a3b8' }}>
                PHONE NUMBER <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="+91 98765 43210"
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 12px',
                  marginTop: '4px',
                  backgroundColor: '#1e293b',
                  border: (attemptedSubmit && !phone.trim()) ? '1.5px solid #ef4444' : '1px solid rgba(255,255,255,0.12)',
                  boxShadow: (attemptedSubmit && !phone.trim()) ? '0 0 0 2px rgba(239, 68, 68, 0.25)' : 'none',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
                required
              />
              {attemptedSubmit && !phone.trim() && (
                <span style={{ color: '#ef4444', fontSize: '11px', marginTop: '3px', display: 'block' }}>
                  Phone number is required
                </span>
              )}
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>EMAIL ADDRESS</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@nexus.com"
                style={{ width: '100%', height: '38px', padding: '0 12px', marginTop: '4px', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#f8fafc', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <FormSelect
                label="PIPELINE STAGE"
                value={stage}
                options={leadStages}
                onSelect={(val) => setStage(String(val))}
              />
            </div>
            <div>
              <FormSelect
                label="LEAD SOURCE"
                value={source}
                options={leadSources}
                onSelect={(val) => setSource(String(val))}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>ESTIMATED DEAL VALUE ($)</label>
            <input
              type="number"
              value={dealValue}
              onChange={(e) => setDealValue(e.target.value)}
              placeholder="5000"
              style={{ width: '100%', height: '38px', padding: '0 12px', marginTop: '4px', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#f8fafc', fontSize: '13px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={isSubmitting} icon={<Save size={14} />}>
              {leadToEdit ? 'Save Changes' : 'Create Opportunity'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
