import React, { useState } from 'react';
import { X, Bot, Plus, Sliders, MessageSquare, Sparkles, BookOpen, Check } from 'lucide-react';
import { KnowledgeDocument, trainingApi } from '../../services/trainingApi';
import { Button } from '../ui/Button';
import { useSystemConstants } from '../../hooks/useSystemConstants';

interface CreatePersonaModalProps {
  isOpen: boolean;
  documents: KnowledgeDocument[];
  onClose: () => void;
  onSuccess: (newPersonaId: number) => void;
}

export const CreatePersonaModal: React.FC<CreatePersonaModalProps> = ({
  isOpen,
  documents,
  onClose,
  onSuccess
}) => {
  const { agentTones = [] } = useSystemConstants();
  const [name, setName] = useState('');
  const [tone, setTone] = useState('PROFESSIONAL');
  const [greetingMessage, setGreetingMessage] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.3);
  const [boundDocIds, setBoundDocIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleToggleDoc = (docId: number) => {
    setBoundDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !systemPrompt.trim()) {
      setError('Persona name and system prompt are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const created = await trainingApi.createPersona({
        name: name.trim(),
        tone,
        system_prompt: systemPrompt.trim(),
        greeting_message: greetingMessage.trim() || `Hello, this is ${name.split(' - ')[0]} speaking. How can I help you?`,
        temperature,
        bound_document_ids: boundDocIds
      });
      onSuccess(created.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create persona.');
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
          maxWidth: '620px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.85), 0 0 20px rgba(56, 189, 248, 0.1)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bot size={18} color="#38bdf8" />
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
              Create New Agent Persona
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', fontSize: '12px' }}>
              {error}
            </div>
          )}

          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>PERSONA NAME & ROLE *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Leo - Payment Recovery Specialist"
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

          {/* Tone Selector Pills */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
              VOICE TONE & PERSONALITY
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {agentTones.map((tOpt) => {
                const active = tone === tOpt.value;
                return (
                  <button
                    key={tOpt.value}
                    type="button"
                    onClick={() => setTone(tOpt.value)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: active ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                      backgroundColor: active ? 'rgba(56, 189, 248, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                      color: active ? '#38bdf8' : '#cbd5e1'
                    }}
                  >
                    {tOpt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Greeting Hook */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MessageSquare size={12} color="#38bdf8" />
              <span>GREETING MESSAGE (FIRST LINE)</span>
            </label>
            <input
              type="text"
              value={greetingMessage}
              onChange={(e) => setGreetingMessage(e.target.value)}
              placeholder="e.g. Good morning! This is Leo from Accounts. Am I speaking with..."
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
            />
          </div>

          {/* System Prompt Instructions */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={12} color="#38bdf8" />
              <span>SYSTEM PROMPT INSTRUCTIONS *</span>
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Describe the agent's behavior, objective, constraints, and speaking rules..."
              rows={4}
              style={{
                width: '100%',
                padding: '10px 12px',
                marginTop: '4px',
                backgroundColor: '#1e293b',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '12px',
                lineHeight: '1.5',
                boxSizing: 'border-box'
              }}
              required
            />
          </div>

          {/* Creativity Slider */}
          <div style={{ backgroundColor: '#111827', padding: '12px 14px', borderRadius: '8px', border: '1px solid #1f2937' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Sliders size={13} color="#38bdf8" />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}>
                  Creativity (Temperature): {temperature.toFixed(2)}
                </span>
              </div>
              <span style={{ fontSize: '10px', color: '#64748b' }}>
                {temperature <= 0.2 ? 'Strictly Factual' : temperature <= 0.5 ? 'Balanced Conversational' : 'Creative'}
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="0.8"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer' }}
            />
          </div>

          {/* Bound Documents */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
              <BookOpen size={12} color="#10b981" />
              <span>LINK KNOWLEDGE BASE DOCUMENTS</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {documents.map((d) => {
                const isChecked = boundDocIds.includes(d.id);
                return (
                  <div
                    key={d.id}
                    onClick={() => handleToggleDoc(d.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      backgroundColor: isChecked ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      border: isChecked ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(255, 255, 255, 0.05)',
                      cursor: 'pointer'
                    }}
                  >
                    <div
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '3px',
                        backgroundColor: isChecked ? '#10b981' : 'transparent',
                        border: isChecked ? 'none' : '1px solid #64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {isChecked && <Check size={10} color="#ffffff" />}
                    </div>
                    <span style={{ fontSize: '11px', color: isChecked ? '#f8fafc' : '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {d.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={isSubmitting} icon={<Plus size={14} />}>
              Create Persona
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

