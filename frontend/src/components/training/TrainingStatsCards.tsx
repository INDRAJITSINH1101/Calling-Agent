import React from 'react';
import { BookOpen, Layers, Bot, ShieldCheck } from 'lucide-react';
import { TrainingSummary } from '../../services/trainingApi';

interface TrainingStatsCardsProps {
  summary?: TrainingSummary;
  isLoading: boolean;
}

export const TrainingStatsCards: React.FC<TrainingStatsCardsProps> = ({ summary, isLoading }) => {
  const cards = [
    {
      title: 'Indexed Documents',
      value: isLoading ? '...' : `${summary?.active_documents ?? 0} / ${summary?.total_documents ?? 0}`,
      subtext: 'Active Ingested Files & FAQs',
      icon: <BookOpen size={18} color="#38bdf8" />,
      color: '#38bdf8',
      glow: 'rgba(56, 189, 248, 0.2)'
    },
    {
      title: 'Knowledge Chunks',
      value: isLoading ? '...' : `${summary?.total_chunks ?? 0} Chunks`,
      subtext: 'RAG Embeddings & Context Segments',
      icon: <Layers size={18} color="#10b981" />,
      color: '#10b981',
      glow: 'rgba(168, 85, 129, 0.2)'
    },
    {
      title: 'Active Agent Personas',
      value: isLoading ? '...' : `${summary?.total_personas ?? 4} Personas`,
      subtext: 'Tuned Prompts & Voice Profiles',
      icon: <Bot size={18} color="#a855f7" />,
      color: '#a855f7',
      glow: 'rgba(168, 85, 247, 0.2)'
    },
    {
      title: 'Compliance Guardrails',
      value: isLoading ? '...' : `${summary?.active_guardrails ?? 0} / ${summary?.total_guardrails ?? 0}`,
      subtext: 'Real-time Deflection & Safety Rules',
      icon: <ShieldCheck size={18} color="#f59e0b" />,
      color: '#f59e0b',
      glow: 'rgba(245, 158, 11, 0.2)'
    }
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: '16px'
      }}
    >
      {cards.map((card, idx) => (
        <div
          key={idx}
          style={{
            backgroundColor: '#0d1527',
            border: '1px solid #1e293b',
            borderRadius: '14px',
            padding: '18px 20px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          {/* Subtle Glow top-right accent */}
          <div
            style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: card.glow,
              filter: 'blur(30px)',
              pointerEvents: 'none'
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.3px' }}>
              {card.title}
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {card.icon}
            </div>
          </div>

          <div style={{ fontSize: '22px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.5px' }}>
            {card.value}
          </div>

          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
            {card.subtext}
          </div>
        </div>
      ))}
    </div>
  );
};

