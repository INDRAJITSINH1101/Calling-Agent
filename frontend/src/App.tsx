import React, { Suspense } from 'react';
import { MainLayout } from './components/layout/MainLayout';

const DashboardPage = React.lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ContactsPage = React.lazy(() => import('./pages/ContactsPage').then(m => ({ default: m.ContactsPage })));
const LeadsPipelinePage = React.lazy(() => import('./pages/LeadsPipelinePage').then(m => ({ default: m.LeadsPipelinePage })));
const CallingAgentPage = React.lazy(() => import('./pages/CallingAgentPage').then(m => ({ default: m.CallingAgentPage })));
const CallHistoryPage = React.lazy(() => import('./pages/CallHistoryPage').then(m => ({ default: m.CallHistoryPage })));
const RecordingsPage = React.lazy(() => import('./pages/RecordingsPage').then(m => ({ default: m.RecordingsPage })));
const SipPhonePage = React.lazy(() => import('./pages/SipPhonePage').then(m => ({ default: m.SipPhonePage })));
const TrainingStudioPage = React.lazy(() => import('./pages/TrainingStudioPage').then(m => ({ default: m.TrainingStudioPage })));
const CampaignsPage = React.lazy(() => import('./pages/CampaignsPage').then(m => ({ default: m.CampaignsPage })));
const PlaceholderView = React.lazy(() => import('./pages/PlaceholderView').then(m => ({ default: m.PlaceholderView })));

const PageLoader: React.FC = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '260px',
    color: '#94a3b8',
    fontSize: '13px',
    gap: '10px'
  }}>
    <div style={{
      width: '20px',
      height: '20px',
      border: '2px solid rgba(56, 189, 248, 0.2)',
      borderTopColor: '#38bdf8',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite'
    }} />
    <span>Loading module...</span>
  </div>
);

export const App: React.FC = () => {
  return (
    <MainLayout>
      {({ activeTab }) => {
        return (
          <Suspense fallback={<PageLoader />}>
            {activeTab === 'dashboard' && <DashboardPage />}
            {activeTab === 'contacts' && <ContactsPage />}
            {activeTab === 'leads' && <LeadsPipelinePage />}
            {activeTab === 'calling-agent' && <CallingAgentPage />}
            {activeTab === 'call-history' && <CallHistoryPage />}
            {activeTab === 'recordings' && <RecordingsPage />}
            {['sip-phone', 'sip-numbers', 'sip-trunks', 'sip-routing'].includes(activeTab) && (
              <SipPhonePage activeTab={activeTab} />
            )}
            {activeTab === 'training' && <TrainingStudioPage />}
            {activeTab === 'campaigns' && <CampaignsPage />}
            {activeTab !== 'dashboard' && activeTab !== 'contacts' && activeTab !== 'leads' && activeTab !== 'calling-agent' && activeTab !== 'call-history' && activeTab !== 'recordings' && activeTab !== 'training' && activeTab !== 'campaigns' && !['sip-phone', 'sip-numbers', 'sip-trunks', 'sip-routing'].includes(activeTab) && (
              <PlaceholderView
                tabId={activeTab}
                tabTitle="Overview Dashboard"
              />
            )}
          </Suspense>
        );
      }}
    </MainLayout>
  );
};

export default App;

