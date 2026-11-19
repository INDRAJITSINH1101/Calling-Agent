import React from 'react';
import { Server, PhoneCall, Radio, Activity, TrendingUp } from 'lucide-react';
import { TelephonySummary } from '../../services/telephonyApi';

interface TelephonyStatsCardsProps {
  summary?: TelephonySummary;
  isLoading: boolean;
}

export const TelephonyStatsCards: React.FC<TelephonyStatsCardsProps> = ({ summary, isLoading }) => {
  const cards = [
    {
      title: 'Active SIP Trunks',
      value: isLoading ? '...' : `${summary?.active_trunks ?? 0} / ${summary?.total_trunks ?? 0}`,
      subtext: 'Operational Telecom Gateways',
      icon: <Server size={18} color="#38bdf8" />,
      color: '#38bdf8',
      glow: 'rgba(56, 189, 248, 0.2)'
    },
    {
      title: 'Provisioned DIDs',
      value: isLoading ? '...' : `${summary?.total_numbers ?? 0} Lines`,
      subtext: 'Virtual Phone Numbers Active',
      icon: <PhoneCall size={18} color="#10b981" />,
      color: '#10b981',
      glow: 'rgba(16, 185, 129, 0.2)'
    },
    {
      title: 'Voice Channels In-Use',
      value: isLoading ? '...' : `${summary?.active_channels ?? 0} / ${summary?.max_concurrency ?? 20}`,
      subtext: 'Live Concurrent Call Capacity',
      icon: <Radio size={18} color="#a855f7" />,
      color: '#a855f7',
      glow: 'rgba(168, 85, 247, 0.2)'
    },
    {
      title: 'Carrier Latency',
      value: isLoading ? '...' : `${summary?.avg_latency_ms ?? 38} ms`,
      subtext: 'Roundtrip RTP Audio Ping',
      icon: <Activity size={18} color="#f59e0b" />,
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
          className="glass-panel-hover"
          style={{
            background: 'linear-gradient(145deg, rgba(18, 27, 46, 0.72) 0%, rgba(10, 16, 28, 0.88) 100%)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Subtle ambient corner glow */}
          <div
            style={{
              position: 'absolute',
              top: '-30px',
              right: '-30px',
              width: '90px',
              height: '90px',
              borderRadius: '50%',
              background: card.glow,
              filter: 'blur(35px)',
              pointerEvents: 'none'
            }}
          />

          {/* Card Header with Icon */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.2px' }}>
              {card.title}
            </span>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: `linear-gradient(135deg, ${card.glow} 0%, rgba(255, 255, 255, 0.02) 100%)`,
                border: `1px solid ${card.color}35`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 0 12px ${card.glow}`
              }}
            >
              {card.icon}
            </div>
          </div>

          {/* Metric Value */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.5px' }}>
              {card.value}
            </span>
          </div>

          {/* Subtext */}
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '5px' }}>
            <TrendingUp size={12} color="#10b981" />
            <span>{card.subtext}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
