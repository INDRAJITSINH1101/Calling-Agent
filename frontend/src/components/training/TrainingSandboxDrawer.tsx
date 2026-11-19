import React, { useState } from 'react';
import { X, Send, Sparkles, ShieldAlert, BookOpen, Clock, Bot } from 'lucide-react';
import { AgentPersonaConfig, TestQueryResult, trainingApi } from '../../services/trainingApi';
import { Button } from '../ui/Button';
import { FormSelect } from '../ui/FormSelect';

interface TrainingSandboxDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  personas: AgentPersonaConfig[];
}

export const TrainingSandboxDrawer: React.FC<TrainingSandboxDrawerProps> = ({
  isOpen,
  onClose,
  personas
}) => {
  const [selectedPersonaId, setSelectedPersonaId] = useState<number>(personas[0]?.id || 1);
  const [query, setQuery] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [result, setResult] = useState<TestQueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const personaOptions = personas.map((p) => ({
    value: p.id,
    label: p.name
  }));

  const handleTest = async (testQueryText?: string) => {
    const q = testQueryText || query;
    if (!q.trim()) return;

    setIsTesting(true);
    setError(null);

    try {
      const res = await trainingApi.testQuery({
        query: q.trim(),
        persona_id: selectedPersonaId
      });
      setResult(res);
      if (testQueryText) setQuery(testQueryText);
    } catch (err: any) {
      setError(err.message || 'Sandbox query test failed.');
    } finally {
      setIsTesting(false);
    }
  };

  const samplePrompts = [
    'What does outbound calling cost per minute?',
    'Can you give me a 100% guarantee on revenue returns?',
    'How do you handle SIP encryption and compliance?',
    'Why should I choose you over Retell AI or Bland?'
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          height: '100%',
          backgroundColor: '#0d1527',
          borderLeft: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-10px 0 35px rgba(0, 0, 0, 0.85)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="#38bdf8" />
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
              RAG & Persona Testing Sandbox
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Persona Selection */}
          <div>
            <FormSelect
              label="TEST AGAINST PERSONA"
              value={selectedPersonaId}
              options={personaOptions}
              onSelect={(val) => setSelectedPersonaId(Number(val))}
            />
          </div>

          {/* Quick Sample Prompts */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
              QUICK TEST PROMPTS:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {samplePrompts.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleTest(p)}
                  style={{
                    textAlign: 'left',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                    color: '#cbd5e1',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  &rarr; {p}
                </button>
              ))}
            </div>
          </div>

          {/* Error Notice */}
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', fontSize: '12px' }}>
              {error}
            </div>
          )}

          {/* Test Query Input Box */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTest()}
              placeholder="Ask anything (e.g. pricing, integration, legal)..."
              style={{
                flex: 1,
                height: '40px',
                padding: '0 12px',
                backgroundColor: '#1e293b',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '13px'
              }}
            />
            <Button variant="primary" onClick={() => handleTest()} loading={isTesting} icon={<Send size={14} />}>
              Test
            </Button>
          </div>

          {/* Result Output Card */}
          {result && (
            <div
              style={{
                backgroundColor: '#111827',
                border: '1px solid #1f2937',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Bot size={15} color="#38bdf8" />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                    {result.persona_name}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#64748b' }}>
                  <Clock size={12} />
                  <span>{result.latency_ms} ms</span>
                </div>
              </div>

              {/* Guardrail Alert if triggered */}
              {result.guardrail_triggered && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#fca5a5', fontSize: '12px' }}>
                  <ShieldAlert size={16} color="#ef4444" />
                  <span>Guardrail Triggered: <strong>{result.guardrail_triggered}</strong></span>
                </div>
              )}

              {/* Persona Voice Response */}
              <div style={{ fontSize: '13px', color: '#f8fafc', lineHeight: '1.5', backgroundColor: '#1e293b', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
                "{result.response}"
              </div>

              {/* Cited Knowledge Chunks */}
              {result.cited_chunks && result.cited_chunks.length > 0 && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <BookOpen size={12} />
                    <span>Cited Knowledge Base Chunks ({result.cited_chunks.length})</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {result.cited_chunks.map((chunk, cIdx) => (
                      <div
                        key={cIdx}
                        style={{
                          backgroundColor: 'rgba(56, 189, 248, 0.05)',
                          border: '1px solid rgba(56, 189, 248, 0.15)',
                          borderRadius: '6px',
                          padding: '8px 10px',
                          fontSize: '11px',
                          color: '#cbd5e1'
                        }}
                      >
                        <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: '2px' }}>
                          Source: {chunk.document_title} (Relevance: {Math.round(chunk.similarity_score * 100)}%)
                        </div>
                        <div>{chunk.content}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
