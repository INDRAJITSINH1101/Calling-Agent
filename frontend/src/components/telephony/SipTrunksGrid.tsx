import React from 'react';
import { Server, Activity, Zap, RefreshCw, Edit2, Trash2 } from 'lucide-react';
import { SipTrunk } from '../../services/telephonyApi';
import { Badge } from '../ui/Badge';
import { ActionButton } from '../ui/ActionButtons';

interface SipTrunksGridProps {
  trunks: SipTrunk[];
  isLoading: boolean;
  testingTrunkId?: number | null;
  onTestPing?: (trunkId: number) => void;
  onEdit: (trunk: SipTrunk) => void;
  onDelete: (trunkId: number) => void;
}

export const SipTrunksGrid: React.FC<SipTrunksGridProps> = ({
  trunks,
  isLoading,
  testingTrunkId = null,
  onTestPing,
  onEdit,
  onDelete
}) => {
  if (isLoading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
        Loading SIP trunks and telecom gateways...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
        gap: '16px'
      }}>
        {trunks.map((trunk) => {
          const isPinging = testingTrunkId === trunk.id;

          return (
            <div
              key={trunk.id}
              className="glass-panel-hover"
              style={{
                background: trunk.is_default
                  ? 'linear-gradient(145deg, rgba(20, 32, 56, 0.8) 0%, rgba(12, 18, 34, 0.9) 100%)'
                  : 'linear-gradient(145deg, rgba(17, 25, 44, 0.7) 0%, rgba(10, 15, 27, 0.85) 100%)',
                backdropFilter: 'blur(16px)',
                border: trunk.is_default
                  ? '1px solid rgba(56, 189, 248, 0.35)'
                  : '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: trunk.is_default
                  ? '0 12px 30px -5px rgba(0, 0, 0, 0.6), 0 0 20px rgba(56, 189, 248, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                  : '0 10px 25px -5px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
                borderRadius: '16px',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                position: 'relative'
              }}
            >
              {/* Header: Provider & Status */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(56, 189, 248, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(56, 189, 248, 0.2)'
                  }}>
                    <Server size={18} color="#38bdf8" />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                      {trunk.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {trunk.provider} • {trunk.transport}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {trunk.is_default && (
                    <Badge variant="info" style={{ fontSize: '10px' }}>
                      Default
                    </Badge>
                  )}
                  <Badge variant={trunk.status === 'ACTIVE' ? 'success' : 'danger'}>
                    ● {trunk.status}
                  </Badge>
                </div>
              </div>

              {/* Server Host info */}
              <div style={{
                background: 'rgba(30, 41, 59, 0.5)',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '12px',
                fontFamily: 'monospace',
                color: '#cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: '1px solid rgba(255, 255, 255, 0.04)'
              }}>
                <span>{trunk.sip_server}</span>
                <span style={{ fontSize: '10px', color: '#38bdf8' }}>Max {trunk.concurrency_limit} Ch</span>
              </div>

              {/* Codecs & Latency */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Zap size={13} color="#f59e0b" />
                  <span>Codecs: {trunk.codecs.join(', ')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', fontWeight: 600 }}>
                  <Activity size={13} />
                  <span>{trunk.latency_ms} ms</span>
                </div>
              </div>

              {/* Footer: Live Test Ping & Actions */}
              <div style={{
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                paddingTop: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <button
                  type="button"
                  disabled={isPinging}
                  onClick={() => onTestPing?.(trunk.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: 'rgba(56, 189, 248, 0.1)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    color: '#38bdf8',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: isPinging ? 'not-allowed' : 'pointer'
                  }}
                >
                  <RefreshCw size={12} className={isPinging ? 'animate-spin' : ''} />
                  <span>{isPinging ? 'Pinging Trunk...' : 'Test Connectivity'}</span>
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ActionButton
                    onClick={() => onEdit(trunk)}
                    title="Edit Trunk Gateway"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#cbd5e1'
                    }}
                  >
                    <Edit2 size={13} />
                  </ActionButton>

                  <ActionButton
                    onClick={() => onDelete(trunk.id)}
                    title="Remove SIP Trunk"
                    style={{
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      color: '#ef4444'
                    }}
                  >
                    <Trash2 size={13} />
                  </ActionButton>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
