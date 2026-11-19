import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

interface PlaceholderViewProps {
  tabId: string;
  tabTitle: string;
}

export const PlaceholderView: React.FC<PlaceholderViewProps> = ({ tabTitle }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '400px',
      gap: '16px',
      textAlign: 'center'
    }}>
      <div style={{
        width: '56px',
        height: '56px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.2), rgba(6, 182, 212, 0.2))',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Sparkles size={26} color="#38bdf8" />
      </div>

      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff' }}>
          {tabTitle}
        </h2>
        <p style={{ fontSize: '13px', color: '#94a3b8', maxWidth: '440px', marginTop: '6px' }}>
          This module is part of the upcoming Phase roadmap. Phase 1 (Foundation & PostgreSQL 18 Architecture) is currently active.
        </p>
      </div>

      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '12px',
        color: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        padding: '6px 14px',
        borderRadius: '8px',
        border: '1px solid rgba(56, 189, 248, 0.2)',
        marginTop: '8px'
      }}>
        <span>Ready for Phase 2 Implementation</span>
        <ArrowRight size={14} />
      </div>
    </div>
  );
};
