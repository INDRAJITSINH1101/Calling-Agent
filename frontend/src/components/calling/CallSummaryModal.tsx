import React from 'react';
import { Sparkles, ChevronRight } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { CallEndResponse } from '../../types/calls';

interface CallSummaryModalProps {
  summary: CallEndResponse;
  onClose: () => void;
}

export const CallSummaryModal: React.FC<CallSummaryModalProps> = ({ summary, onClose }) => {
  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '540px',
        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '20px',
        padding: '28px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={22} color="#38bdf8" />
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
              Post-Call Intelligence Summary
            </h2>
          </div>
          <Badge variant={summary.sentiment === 'POSITIVE' ? 'success' : summary.sentiment === 'NEGATIVE' ? 'danger' : 'info'}>
            {summary.sentiment} Sentiment
          </Badge>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Call Duration</span>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
              {formatTimer(summary.duration_seconds)}
            </div>
          </div>

          {summary.updated_lead && (
            <div style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Updated Pipeline Stage</span>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#38bdf8' }}>
                {summary.updated_lead.stage}
              </div>
            </div>
          )}
        </div>

        {/* AI Executive Summary */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          borderRadius: '12px',
          padding: '14px',
          border: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
            Executive Call Summary:
          </span>
          <p style={{ fontSize: '13px', color: '#e2e8f0', margin: 0, lineHeight: 1.5 }}>
            {summary.summary}
          </p>
        </div>

        {/* Key Takeaways */}
        <div>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
            Key Takeaways & Action Items:
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {summary.key_takeaways?.map((item, kIdx) => (
              <div key={kIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#cbd5e1' }}>
                <ChevronRight size={14} color="#38bdf8" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <Button
            variant="primary"
            style={{ width: '100%' }}
            onClick={onClose}
          >
            Close Summary & Continue
          </Button>
        </div>
      </div>
    </div>
  );
};
