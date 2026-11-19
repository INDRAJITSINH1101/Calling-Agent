import React from 'react';
import { X, Sliders } from 'lucide-react';
import { Button } from '../ui/Button';

interface ScoringRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRulesChanged: () => void;
}

export const ScoringRulesModal: React.FC<ScoringRulesModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

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
          maxWidth: '640px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 20px rgba(56, 189, 248, 0.1)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={18} color="#38bdf8" />
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
              Lead Scoring Engine Configuration
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
            Deterministic rule weights automatically calculate lead priority (0–100) and assign calls to top AI personas.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', backgroundColor: '#111827', borderRadius: '8px', border: '1px solid #1f2937' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>Inbound Organic / Website Lead</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Condition: source EQUALS 'INBOUND'</div>
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#34d399' }}>+25 pts</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', backgroundColor: '#111827', borderRadius: '8px', border: '1px solid #1f2937' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>Opportunity Size &gt; $10,000</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Condition: deal_value &gt;= 10000</div>
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#34d399' }}>+30 pts</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', backgroundColor: '#111827', borderRadius: '8px', border: '1px solid #1f2937' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>Consent Status: Do Not Call (DND)</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Condition: consent_status EQUALS 'DND'</div>
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#f87171' }}>-100 pts</span>
            </div>
          </div>
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#090d16' }}>
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};
