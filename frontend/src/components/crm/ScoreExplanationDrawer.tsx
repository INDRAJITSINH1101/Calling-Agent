import React from 'react';
import { X, RefreshCw, Zap, CheckCircle2 } from 'lucide-react';
import { Lead } from '../../types/crm';
import { leadsApi } from '../../services/leadsApi';
import { Button } from '../ui/Button';
import { ScoreBadge } from '../ui/Badge';

interface ScoreExplanationDrawerProps {
  isOpen: boolean;
  lead: Lead | null;
  onClose: () => void;
  onScoreUpdated: (updated: Lead) => void;
}

export const ScoreExplanationDrawer: React.FC<ScoreExplanationDrawerProps> = ({
  isOpen,
  lead,
  onClose,
  onScoreUpdated
}) => {
  const [isRecalculating, setIsRecalculating] = React.useState(false);

  if (!isOpen || !lead) return null;

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      const updated = await leadsApi.recalculateScore(lead.id);
      onScoreUpdated(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRecalculating(false);
    }
  };

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
          maxWidth: '440px',
          height: '100%',
          backgroundColor: '#0d1527',
          borderLeft: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-10px 0 30px rgba(0,0,0,0.8)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={18} color="#38bdf8" />
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
              Transparent Lead Score
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ backgroundColor: '#111827', padding: '16px', borderRadius: '12px', border: '1px solid #1f2937' }}>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>LEAD CANDIDATE</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>
              {lead.contact_name}
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
              {lead.contact_phone} &bull; {lead.company_name || 'Individual'}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(56, 189, 248, 0.08)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase' }}>Computed Intent Score</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#f8fafc', marginTop: '4px' }}>
                {lead.score} <span style={{ fontSize: '13px', color: '#64748b' }}>/ 100</span>
              </div>
            </div>
            <ScoreBadge score={lead.score} bucket={lead.score_bucket} />
          </div>

          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '10px', textTransform: 'uppercase' }}>
              Scoring Rule Deductions & Bonuses
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={14} color="#10b981" />
                  <span style={{ fontSize: '12px', color: '#cbd5e1' }}>Direct Inbound Channel Bonus</span>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#34d399' }}>+25</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={14} color="#10b981" />
                  <span style={{ fontSize: '12px', color: '#cbd5e1' }}>Verified Phone & Email Match</span>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#34d399' }}>+20</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={14} color="#10b981" />
                  <span style={{ fontSize: '12px', color: '#cbd5e1' }}>Commercial Enterprise Opportunity</span>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#34d399' }}>+15</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'flex-end', gap: '10px', backgroundColor: '#090d16' }}>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" onClick={handleRecalculate} loading={isRecalculating} icon={<RefreshCw size={13} />}>
            Re-Calculate Score
          </Button>
        </div>
      </div>
    </div>
  );
};

