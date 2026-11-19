import React, { useState } from 'react';
import {
  Calendar,
  OctagonAlert,
  Bell,
  LayoutGrid
} from 'lucide-react';

interface HeaderProps {
  activeTabTitle: string;
  isEmergencyStopped: boolean;
  onToggleEmergencyStop: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTabTitle,
  isEmergencyStopped,
  onToggleEmergencyStop
}) => {
  const [notificationCount] = useState(3);

  const getTodayFormatted = () => {
    const today = new Date();
    return `Today (${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`;
  };

  return (
    <header style={{
      height: '64px',
      backgroundColor: '#0d1322',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexShrink: 0
    }}>
      {/* Left: Breadcrumb / Title */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <h1 style={{
          fontSize: '17px',
          fontWeight: 700,
          color: '#ffffff',
          letterSpacing: '-0.01em',
          margin: 0
        }}>
          {activeTabTitle}
        </h1>
      </div>

      {/* Right: Date, Emergency Stop & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Date Selector Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          padding: '6px 14px',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#cbd5e1',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <Calendar size={14} color="#94a3b8" />
          <span>{getTodayFormatted()}</span>
        </div>

        {/* Emergency Stop Button (Critical Feature from Reference UI) */}
        <button
          onClick={onToggleEmergencyStop}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: isEmergencyStopped ? '#7f1d1d' : '#dc2626',
            color: '#ffffff',
            border: isEmergencyStopped ? '2px solid #ef4444' : 'none',
            padding: '7px 16px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: isEmergencyStopped
              ? '0 0 20px rgba(239, 68, 68, 0.6)'
              : '0 0 14px rgba(220, 38, 38, 0.35)',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          title={isEmergencyStopped ? "Click to resume normal operation" : "Instantly halt all active calling campaigns"}
        >
          <OctagonAlert size={15} color="#ffffff" />
          <span>{isEmergencyStopped ? 'STOPPED (RESUME)' : 'Emergency Stop'}</span>
        </button>

        {/* Action Icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '6px' }}>
          <button style={{
            background: 'transparent',
            border: 'none',
            padding: '7px',
            borderRadius: '6px',
            color: '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}>
            <LayoutGrid size={16} />
          </button>

          <button style={{
            background: 'transparent',
            border: 'none',
            padding: '7px',
            borderRadius: '6px',
            color: '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            position: 'relative'
          }}>
            <Bell size={16} />
            {notificationCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '5px',
                right: '5px',
                width: '6px',
                height: '6px',
                backgroundColor: '#ef4444',
                borderRadius: '50%'
              }}></span>
            )}
          </button>
        </div>

        {/* User Profile Avatar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          paddingLeft: '10px',
          borderLeft: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #f97316, #ec4899)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 700,
            color: '#ffffff'
          }}>
            DA
          </div>
        </div>
      </div>
    </header>
  );
};
