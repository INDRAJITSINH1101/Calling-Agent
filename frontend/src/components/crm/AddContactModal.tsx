import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save } from 'lucide-react';
import { Contact } from '../../types/crm';
import { contactsApi } from '../../services/contactsApi';
import { Button } from '../ui/Button';
import { FormSelect } from '../ui/FormSelect';
import { useSystemConstants } from '../../hooks/useSystemConstants';

interface AddContactModalProps {
  isOpen: boolean;
  contactToEdit?: Contact | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddContactModal: React.FC<AddContactModalProps> = ({
  isOpen,
  contactToEdit,
  onClose,
  onSuccess
}) => {
  const { consentStatuses } = useSystemConstants();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [consentState, setConsentState] = useState('OPTED_IN');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (contactToEdit) {
      setFirstName(contactToEdit.first_name || '');
      setLastName(contactToEdit.last_name || '');
      setEmail(contactToEdit.email || '');
      setPhone(contactToEdit.phone || '');
      setCompanyName(contactToEdit.company_name || '');
      setConsentState(contactToEdit.consent_state || contactToEdit.consent_status || 'OPTED_IN');
      setTags(Array.isArray(contactToEdit.tags) ? contactToEdit.tags.join(', ') : '');
    } else {
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setCompanyName('');
      setConsentState('OPTED_IN');
      setTags('');
    }
    setError(null);
  }, [contactToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !phone.trim()) {
      setError('First name and phone number are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim() || undefined,
      phone: phone.trim(),
      company_name: companyName.trim() || undefined,
      consent_state: consentState,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean)
    };

    try {
      if (contactToEdit) {
        await contactsApi.updateContact(contactToEdit.id, payload);
      } else {
        await contactsApi.createContact(payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save contact.');
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
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTopLeftRadius: '15px',
            borderTopRightRadius: '15px',
            backgroundColor: '#0f172a'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus size={18} color="#38bdf8" />
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
              {contactToEdit ? 'Edit Contact Record' : 'Add New Contact'}
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
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>FIRST NAME *</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. John"
                style={{ width: '100%', height: '38px', padding: '0 12px', marginTop: '4px', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#f8fafc', fontSize: '13px' }}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>LAST NAME</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Doe"
                style={{ width: '100%', height: '38px', padding: '0 12px', marginTop: '4px', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#f8fafc', fontSize: '13px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>PHONE NUMBER *</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 123 4567"
                style={{ width: '100%', height: '38px', padding: '0 12px', marginTop: '4px', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#f8fafc', fontSize: '13px' }}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>EMAIL ADDRESS</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                style={{ width: '100%', height: '38px', padding: '0 12px', marginTop: '4px', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#f8fafc', fontSize: '13px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>COMPANY NAME</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Corp"
                style={{ width: '100%', height: '38px', padding: '0 12px', marginTop: '4px', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#f8fafc', fontSize: '13px' }}
              />
            </div>
            <div>
              <FormSelect
                label="CONSENT STATUS"
                value={consentState}
                options={consentStatuses}
                onSelect={(val) => setConsentState(String(val))}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>TAGS (COMMA SEPARATED)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. decision-maker, vip, q4-budget"
              style={{ width: '100%', height: '38px', padding: '0 12px', marginTop: '4px', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#f8fafc', fontSize: '13px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={isSubmitting} icon={<Save size={14} />}>
              {contactToEdit ? 'Save Changes' : 'Create Contact'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
