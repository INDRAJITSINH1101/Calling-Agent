import React, { useState } from 'react';
import { ShieldCheck, Plus, Trash2, ToggleLeft, ToggleRight, X, Edit2 } from 'lucide-react';
import { AgentGuardrail } from '../../services/trainingApi';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { FormSelect } from '../ui/FormSelect';
import { ActionButton } from '../ui/ActionButtons';
import { useSystemConstants } from '../../hooks/useSystemConstants';

interface GuardrailsListProps {
  guardrails: AgentGuardrail[];
  isLoading: boolean;
  onToggleEnabled: (id: number, currentEnabled: boolean) => void;
  onDelete: (id: number) => void;
  onCreate: (data: {
    name: string;
    trigger_keywords: string[];
    action: string;
    deflection_phrase: string;
  }) => void;
  onUpdate: (id: number, data: {
    name?: string;
    trigger_keywords?: string[];
    action?: string;
    deflection_phrase?: string;
  }) => void;
  isCreating: boolean;
  isUpdating?: boolean;
}

export const GuardrailsList: React.FC<GuardrailsListProps> = ({
  guardrails,
  isLoading,
  onToggleEnabled,
  onDelete,
  onCreate,
  onUpdate,
  isCreating,
  isUpdating = false
}) => {
  const { guardrailActions = [] } = useSystemConstants();

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [action, setAction] = useState('WARN_AND_DEFLECT');
  const [keywords, setKeywords] = useState('');
  const [phrase, setPhrase] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Edit Modal State
  const [editingGuardrail, setEditingGuardrail] = useState<AgentGuardrail | null>(null);
  const [editName, setEditName] = useState('');
  const [editAction, setEditAction] = useState('WARN_AND_DEFLECT');
  const [editKeywords, setEditKeywords] = useState('');
  const [editPhrase, setEditPhrase] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const handleOpenAdd = () => {
    setName('');
    setAction('WARN_AND_DEFLECT');
    setKeywords('');
    setPhrase('');
    setError(null);
    setIsAddModalOpen(true);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !keywords.trim() || !phrase.trim()) {
      setError('Name, trigger keywords, and deflection phrase are all required.');
      return;
    }
    const kwList = keywords.split(',').map((k) => k.trim().toLowerCase()).filter(Boolean);
    onCreate({
      name: name.trim(),
      trigger_keywords: kwList,
      action,
      deflection_phrase: phrase.trim()
    });
    setIsAddModalOpen(false);
  };

  const handleOpenEdit = (g: AgentGuardrail) => {
    setEditingGuardrail(g);
    setEditName(g.name);
    setEditAction(g.action);
    setEditKeywords(g.trigger_keywords.join(', '));
    setEditPhrase(g.deflection_phrase);
    setEditError(null);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGuardrail) return;
    if (!editName.trim() || !editKeywords.trim() || !editPhrase.trim()) {
      setEditError('Name, trigger keywords, and deflection phrase are all required.');
      return;
    }
    const kwList = editKeywords.split(',').map((k) => k.trim().toLowerCase()).filter(Boolean);
    onUpdate(editingGuardrail.id, {
      name: editName.trim(),
      trigger_keywords: kwList,
      action: editAction,
      deflection_phrase: editPhrase.trim()
    });
    setEditingGuardrail(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>
            Safety & Compliance Deflection Rules
          </h3>
          <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
            Real-time keyword interception to deflect competitors, legal promises, and abusive language.
          </p>
        </div>
        <Button variant="primary" icon={<Plus size={15} />} onClick={handleOpenAdd}>
          Add Safety Guardrail
        </Button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          Loading safety guardrails...
        </div>
      ) : guardrails.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#0d1527', borderRadius: '12px', border: '1px solid #1e293b' }}>
          <ShieldCheck size={32} color="#334155" style={{ margin: '0 auto 10px auto', display: 'block' }} />
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8' }}>No guardrails configured</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            Add rules to prevent AI callers from making financial guarantees or mentioning competitors.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {guardrails.map((g) => {
            const isBlock = g.action.includes('BLOCK');
            return (
              <div
                key={g.id}
                style={{
                  backgroundColor: '#0d1527',
                  border: '1px solid #1e293b',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                      {g.name}
                    </span>
                    <Badge variant={isBlock ? 'danger' : 'warning'}>
                      {g.action.replace(/_/g, ' ')}
                    </Badge>
                  </div>

                  {/* Trigger Keywords Chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, alignSelf: 'center' }}>
                      TRIGGERS:
                    </span>
                    {g.trigger_keywords.map((kw, kwIdx) => (
                      <span
                        key={kwIdx}
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#cbd5e1'
                        }}
                      >
                        "{kw}"
                      </span>
                    ))}
                  </div>

                  {/* Deflection Phrase */}
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px', fontStyle: 'italic', backgroundColor: 'rgba(0,0,0,0.25)', padding: '6px 10px', borderRadius: '6px' }}>
                    Deflection response: "{g.deflection_phrase}"
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Edit Guardrail Action Button */}
                  <ActionButton
                    title="Edit Guardrail"
                    icon={<Edit2 size={16} color="#fbbf24" />}
                    onClick={() => handleOpenEdit(g)}
                  />
                  {/* Toggle Guardrail Action Button */}
                  <ActionButton
                    title={g.is_enabled ? 'Disable Guardrail' : 'Enable Guardrail'}
                    icon={g.is_enabled ? <ToggleRight size={22} color="#34d399" /> : <ToggleLeft size={22} color="#64748b" />}
                    onClick={() => onToggleEnabled(g.id, g.is_enabled)}
                  />
                  {/* Delete Guardrail Action Button */}
                  <ActionButton
                    title="Delete Guardrail"
                    icon={<Trash2 size={16} color="#f87171" />}
                    onClick={() => onDelete(g.id)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Guardrail Modal */}
      {editingGuardrail && (
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
          onClick={() => setEditingGuardrail(null)}
        >
          <div
            style={{
              backgroundColor: '#0d1527',
              border: '1px solid #1e293b',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '540px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 20px rgba(251, 191, 36, 0.15)',
              overflow: 'visible',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #1e293b',
                borderRadius: '16px 16px 0 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={18} color="#fbbf24" />
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
                  Edit Compliance Guardrail
                </h2>
              </div>
              <button
                onClick={() => setEditingGuardrail(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {editError && (
                <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', fontSize: '12px' }}>
                  {editError}
                </div>
              )}

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>RULE NAME *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Unlicensed Financial Advice Interception"
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 12px',
                    marginTop: '4px',
                    backgroundColor: '#1e293b',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              <div style={{ position: 'relative', zIndex: 30 }}>
                <FormSelect
                  label="DEFLECTION ACTION"
                  value={editAction}
                  options={guardrailActions}
                  onSelect={(val) => setEditAction(String(val))}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>
                  TRIGGER KEYWORDS (COMMA SEPARATED) *
                </label>
                <input
                  type="text"
                  value={editKeywords}
                  onChange={(e) => setEditKeywords(e.target.value)}
                  placeholder="e.g. stock tip, buy shares, 100% returns"
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 12px',
                    marginTop: '4px',
                    backgroundColor: '#1e293b',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>DEFLECTION PHRASE *</label>
                <textarea
                  value={editPhrase}
                  onChange={(e) => setEditPhrase(e.target.value)}
                  placeholder="What the AI should say when this rule is triggered..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    marginTop: '4px',
                    backgroundColor: '#1e293b',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '12px',
                    lineHeight: '1.4',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <Button variant="secondary" onClick={() => setEditingGuardrail(null)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" loading={isUpdating}>
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Guardrail Modal */}
      {isAddModalOpen && (
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
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#0d1527',
              border: '1px solid #1e293b',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '540px',
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
                borderRadius: '16px 16px 0 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} color="#38bdf8" />
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
                  New Compliance Guardrail
                </h2>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {error && (
                <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', fontSize: '12px' }}>
                  {error}
                </div>
              )}

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>RULE NAME *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Unlicensed Financial Advice Interception"
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 12px',
                    marginTop: '4px',
                    backgroundColor: '#1e293b',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              <div style={{ position: 'relative', zIndex: 30 }}>
                <FormSelect
                  label="DEFLECTION ACTION"
                  value={action}
                  options={guardrailActions}
                  onSelect={(val) => setAction(String(val))}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>
                  TRIGGER KEYWORDS (COMMA SEPARATED) *
                </label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="e.g. stock tip, buy shares, 100% returns"
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 12px',
                    marginTop: '4px',
                    backgroundColor: '#1e293b',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>DEFLECTION PHRASE *</label>
                <textarea
                  value={phrase}
                  onChange={(e) => setPhrase(e.target.value)}
                  placeholder="What the AI should say when this rule is triggered..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    marginTop: '4px',
                    backgroundColor: '#1e293b',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '12px',
                    lineHeight: '1.4',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" loading={isCreating}>
                  Create Rule
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
