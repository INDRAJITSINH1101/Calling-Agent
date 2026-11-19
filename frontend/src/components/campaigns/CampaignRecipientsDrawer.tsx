import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, RefreshCw, Users, Phone, Award } from 'lucide-react';
import { campaignsApi, Campaign, CampaignRecipient } from '../../services/campaignsApi';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface Props {
  campaign: Campaign | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CampaignRecipientsDrawer: React.FC<Props> = ({ campaign, isOpen, onClose }) => {
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');

  const fetchRecipients = async () => {
    if (!campaign) return;
    setIsLoading(true);
    try {
      const data = await campaignsApi.getRecipients(campaign.id, filterStatus);
      setRecipients(data);
    } catch (e) {
      console.error('Failed to load campaign recipients', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && campaign) {
      fetchRecipients();
    }
  }, [isOpen, campaign, filterStatus]);

  useEffect(() => {
    if (!isOpen || !campaign || campaign.status !== 'RUNNING') return;
    const interval = setInterval(fetchRecipients, 3000);
    return () => clearInterval(interval);
  }, [isOpen, campaign]);

  if (!isOpen || !campaign) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="success">Completed</Badge>;
      case 'IN_CALL':
        return <Badge variant="warning">In Call (Speaking)</Badge>;
      case 'RETRY_SCHEDULED':
        return <Badge variant="info">Retry Scheduled</Badge>;
      case 'QUEUED':
        return <Badge variant="neutral">Queued</Badge>;
      case 'FAILED':
        return <Badge variant="danger">Failed</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const drawerContent = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        justifyContent: 'flex-end',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          height: '100%',
          backgroundColor: '#0b1329',
          borderLeft: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-12px 0 40px rgba(0, 0, 0, 0.85)',
          animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#0f172a'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} color="#38bdf8" />
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
                {campaign.name}
              </h2>
              <Badge variant={campaign.status === 'RUNNING' ? 'success' : campaign.status === 'PAUSED' ? 'warning' : 'neutral'}>
                {campaign.status}
              </Badge>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Live Recipient Queue • {recipients.length} Contacts Targeted
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button variant="ghost" size="sm" onClick={fetchRecipients} disabled={isLoading}>
              <RefreshCw size={14} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
            </Button>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter Chips */}
        <div style={{
          padding: '12px 24px',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          gap: '8px',
          backgroundColor: '#0b1329',
          flexWrap: 'wrap'
        }}>
          {['ALL', 'QUEUED', 'IN_CALL', 'RETRY_SCHEDULED', 'COMPLETED', 'FAILED'].map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: filterStatus === st ? '1px solid #38bdf8' : '1px solid #1e293b',
                background: filterStatus === st ? 'rgba(56, 189, 248, 0.15)' : '#0f172a',
                color: filterStatus === st ? '#38bdf8' : '#94a3b8',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Recipients List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '18px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {recipients.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#64748b',
              fontSize: '13px',
              fontStyle: 'italic'
            }}>
              No recipients match the selected status filter.
            </div>
          ) : (
            recipients.map(r => (
              <div
                key={r.id}
                style={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #1e293b',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                      {r.contact_name}
                    </span>
                    {r.lead_stage && (
                      <span style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgba(168, 85, 247, 0.15)',
                        color: '#c084fc',
                        fontWeight: 600
                      }}>
                        {r.lead_stage}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Phone size={12} color="#64748b" />
                    <span>{r.contact_phone}</span>
                    {r.company_name && <span>&bull; {r.company_name}</span>}
                  </div>

                  {r.call_outcome && (
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span>
                        Outcome:{' '}
                        <strong style={{ color: r.call_outcome === 'ANSWERED' ? '#34d399' : '#f87171' }}>
                          {r.call_outcome}
                        </strong>
                      </span>
                      {r.qualification_score !== null && r.qualification_score !== undefined && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fbbf24', fontWeight: 600 }}>
                          <Award size={12} />
                          {r.qualification_score}/100 Score
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                  {getStatusBadge(r.status)}
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    Attempts: <strong style={{ color: '#cbd5e1' }}>{r.attempt_count}</strong>
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(drawerContent, document.body);
};
