import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface MainLayoutProps {
  children: (props: {
    activeTab: string;
    isEmergencyStopped: boolean;
    onToggleEmergencyStop: () => void;
  }) => React.ReactNode;
}

const TAB_TITLES: Record<string, string> = {
  dashboard: 'Overview Dashboard',
  contacts: 'Contacts Management',
  leads: 'Leads & Sales Pipeline',
  'calling-agent': 'AI Calling Agent & Dialer',
  'call-history': 'Call History & Logs',
  recordings: 'Call Audio Recordings & Transcripts',
  training: 'Training Studio & Knowledge Base',
  'sip-phone': 'SIP Trunks & Phone Numbers',
  'sip-numbers': 'Virtual Phone Numbers (DIDs)',
  'sip-trunks': 'SIP Trunks & Telecom Gateways',
  'sip-routing': 'Inbound Call Routing Workflow',
  'meta-ads': 'Meta Lead Ads Integration',
  'linkedin-ads': 'LinkedIn Campaign Manager',
  'google-ads': 'Google Ads Lead Tracking',
  campaigns: 'Outreach Campaigns & Automation',
  reports: 'Reports & Revenue Analytics',
  integrations: 'API Integrations & Webhooks',
  settings: 'System & Security Settings'
};

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isEmergencyStopped, setIsEmergencyStopped] = useState<boolean>(false);

  const handleToggleEmergencyStop = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/health/emergency-stop', {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setIsEmergencyStopped(data.emergency_state.is_stopped);
      } else {
        setIsEmergencyStopped(prev => !prev);
      }
    } catch {
      setIsEmergencyStopped(prev => !prev);
    }
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      backgroundColor: 'transparent',
      color: '#e2e8f0',
      overflow: 'hidden'
    }}>
      {/* 15-Section Left Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden'
      }}>
        {/* Top Header */}
        <Header
          activeTabTitle={TAB_TITLES[activeTab] || 'Overview Dashboard'}
          isEmergencyStopped={isEmergencyStopped}
          onToggleEmergencyStop={handleToggleEmergencyStop}
        />

        {/* Emergency Stop Banner (When Active) */}
        {isEmergencyStopped && (
          <div style={{
            backgroundColor: '#7f1d1d',
            color: '#fecaca',
            padding: '8px 24px',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #ef4444'
          }}>
            <span>⚠️ EMERGENCY STOP ENGAGED: All outbound AI calls and dialing queues are currently suspended.</span>
            <button
              onClick={handleToggleEmergencyStop}
              style={{
                background: '#ef4444',
                color: '#ffffff',
                border: 'none',
                padding: '4px 12px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Resume Calling
            </button>
          </div>
        )}

        {/* Scrollable Viewport */}
        <main style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          backgroundColor: '#0b0f19'
        }}>
          {children({
            activeTab,
            isEmergencyStopped,
            onToggleEmergencyStop: handleToggleEmergencyStop
          })}
        </main>
      </div>
    </div>
  );
};
