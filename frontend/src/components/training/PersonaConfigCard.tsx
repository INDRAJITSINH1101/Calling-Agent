import React, { useState } from 'react';
import { Bot, Save, Sliders, MessageSquare, Check, Sparkles, BookOpen, Plus, Trash2 } from 'lucide-react';
import { AgentPersonaConfig, KnowledgeDocument } from '../../services/trainingApi';
import { Button } from '../ui/Button';
import { useSystemConstants } from '../../hooks/useSystemConstants';

interface PersonaConfigCardProps {
  personas: AgentPersonaConfig[];
  documents: KnowledgeDocument[];
  onSave: (id: number, data: Partial<AgentPersonaConfig>) => void;
  onCreatePersona: () => void;
  onDeletePersona?: (id: number) => void;
  isSaving: boolean;
}

export const PersonaConfigCard: React.FC<PersonaConfigCardProps> = ({
  personas,
  documents,
  onSave,
  onCreatePersona,
  onDeletePersona,
  isSaving
}) => {
  const { agentTones = [] } = useSystemConstants();
  const [selectedPersonaId, setSelectedPersonaId] = useState<number>(personas[0]?.id || 1);

  const currentPersona = personas.find((p) => p.id === selectedPersonaId) || personas[0];

  const [name, setName] = useState(currentPersona?.name || '');
  const [tone, setTone] = useState(currentPersona?.tone || 'PROFESSIONAL');
  const [systemPrompt, setSystemPrompt] = useState(currentPersona?.system_prompt || '');
  const [greetingMessage, setGreetingMessage] = useState(currentPersona?.greeting_message || '');
  const [temperature, setTemperature] = useState(currentPersona?.temperature ?? 0.3);
  const [boundDocIds, setBoundDocIds] = useState<number[]>(currentPersona?.bound_document_ids || []);

  // Sync state when selecting a different persona
  const handleSelectPersona = (p: AgentPersonaConfig) => {
    setSelectedPersonaId(p.id);
    setName(p.name);
    setTone(p.tone);
    setSystemPrompt(p.system_prompt);
    setGreetingMessage(p.greeting_message);
    setTemperature(p.temperature);
    setBoundDocIds(p.bound_document_ids || []);
  };

  const handleToggleDoc = (docId: number) => {
    setBoundDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const handleSave = () => {
    if (!currentPersona) return;
    onSave(currentPersona.id, {
      name,
      tone,
      system_prompt: systemPrompt,
      greeting_message: greetingMessage,
      temperature,
      bound_document_ids: boundDocIds
    });
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '280px 1fr',
        gap: '20px',
        alignItems: 'start'
      }}
    >
      {/* Left Column: Persona Selector List */}
      <div
        style={{
          backgroundColor: '#0d1527',
          border: '1px solid #1e293b',
          borderRadius: '14px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
            Voice Personas ({personas.length})
          </div>
          <Button
            variant="primary"
            size="xs"
            icon={<Plus size={12} />}
            onClick={onCreatePersona}
          >
            New Persona
          </Button>
        </div>

        {personas.map((p) => {
          const isSelected = p.id === currentPersona?.id;
          return (
            <div
              key={p.id}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <button
                type="button"
                onClick={() => handleSelectPersona(p)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                  border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.05)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: isSelected ? '#0284c7' : '#1e293b',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Bot size={16} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.name.split(' - ')[0]}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.name.split(' - ')[1] || p.tone}
                  </div>
                </div>
              </button>

              {!p.is_default && onDeletePersona && (
                <button
                  type="button"
                  title="Delete Custom Persona"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePersona(p.id);
                  }}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Right Column: Persona Tuning Editor */}
      <div
        style={{
          backgroundColor: '#0d1527',
          border: '1px solid #1e293b',
          borderRadius: '14px',
          padding: '22px 26px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '14px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>
              {name || currentPersona?.name}
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
              System instructions, conversational style, and grounded knowledge scope.
            </p>
          </div>
          <Button variant="primary" onClick={handleSave} loading={isSaving} icon={<Save size={14} />}>
            Save Persona Profile
          </Button>
        </div>

        {/* Tone Selector Pills */}
        <div>
          <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
            Agent Tone & Personality
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {agentTones.map((tOption) => {
              const active = tone === tOption.value;
              return (
                <button
                  key={tOption.value}
                  type="button"
                  onClick={() => setTone(tOption.value)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: active ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                    backgroundColor: active ? 'rgba(56, 189, 248, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                    color: active ? '#38bdf8' : '#cbd5e1'
                  }}
                >
                  {tOption.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Temperature Slider */}
        <div style={{ backgroundColor: '#111827', padding: '14px 16px', borderRadius: '10px', border: '1px solid #1f2937' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sliders size={14} color="#38bdf8" />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>
                Creativity & Temperature: {temperature.toFixed(2)}
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              {temperature <= 0.2 ? 'Deterministic & Strictly Factual' : temperature <= 0.5 ? 'Balanced Conversational' : 'High Creativity'}
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

        {/* Greeting Message */}
        <div>
          <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
            <MessageSquare size={13} color="#38bdf8" />
            <span>Call Opening / Greeting Hook</span>
          </label>
          <input
            type="text"
            value={greetingMessage}
            onChange={(e) => setGreetingMessage(e.target.value)}
            style={{
              width: '100%',
              height: '38px',
              padding: '0 12px',
              backgroundColor: '#1e293b',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              color: '#f8fafc',
              fontSize: '13px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* System Prompt Instruction */}
        <div>
          <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
            <Sparkles size={13} color="#38bdf8" />
            <span>System Persona Prompt & Instructions</span>
          </label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={5}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#1e293b',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              color: '#f8fafc',
              fontSize: '12px',
              lineHeight: '1.5',
              fontFamily: 'monospace',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Bound Documents Multiselect */}
        <div>
          <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
            <BookOpen size={13} color="#10b981" />
            <span>Bound Knowledge Base Scope ({boundDocIds.length > 0 ? `${boundDocIds.length} Linked` : 'All Documents'})</span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {documents.map((d) => {
              const isChecked = boundDocIds.length === 0 || boundDocIds.includes(d.id);
              return (
                <div
                  key={d.id}
                  onClick={() => handleToggleDoc(d.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: isChecked ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    border: isChecked ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(255, 255, 255, 0.05)',
                    cursor: 'pointer'
                  }}
                >
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '4px',
                      backgroundColor: isChecked ? '#10b981' : 'transparent',
                      border: isChecked ? 'none' : '1px solid #64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {isChecked && <Check size={11} color="#ffffff" />}
                  </div>
                  <span style={{ fontSize: '12px', color: isChecked ? '#f8fafc' : '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {d.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
