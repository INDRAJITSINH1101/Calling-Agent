import React from 'react';
import { Megaphone, PlayCircle, PhoneCall, Award } from 'lucide-react';
import { CampaignStats } from '../../services/campaignsApi';

interface Props {
  stats: CampaignStats | null;
  isLoading: boolean;
}

export const CampaignStatsCards: React.FC<Props> = ({ stats, isLoading }) => {
  const cards = [
    {
      title: 'Active Campaigns',
      value: stats ? `${stats.active_campaigns}/${stats.total_campaigns}` : '0/0',
      subtitle: `${stats?.total_contacts_queued || 0} Contacts in Queue`,
      icon: Megaphone,
      color: '#38bdf8',
      bgGlow: 'rgba(56, 189, 248, 0.12)'
    },
    {
      title: 'Calls Dispatched',
      value: stats ? `${stats.total_calls_placed}` : '0',
      subtitle: 'Batch Outbound Attempts',
      icon: PlayCircle,
      color: '#a855f7',
      bgGlow: 'rgba(168, 85, 247, 0.12)'
    },
    {
      title: 'Connect / Answer Rate',
      value: stats ? `${stats.overall_connect_rate}%` : '0%',
      subtitle: 'Physical Answer Rate',
      icon: PhoneCall,
      color: '#10b981',
      bgGlow: 'rgba(16, 185, 129, 0.12)'
    },
    {
      title: 'AI Qualified Leads',
      value: stats ? `${stats.total_leads_qualified}` : '0',
      subtitle: 'Pipeline Stage Updated',
      icon: Award,
      color: '#f59e0b',
      bgGlow: 'rgba(245, 158, 11, 0.12)'
    }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    }}>
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div
            key={i}
            style={{
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
            }}
          >
            <div>
              <div style={{ fontSize: '12px', fontWeight: 500, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {c.title}
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#f8fafc', marginTop: '4px' }}>
                {isLoading ? '...' : c.value}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                {c.subtitle}
              </div>
            </div>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: c.bgGlow,
              border: `1px solid ${c.color}33`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: c.color
            }}>
              <Icon size={20} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

