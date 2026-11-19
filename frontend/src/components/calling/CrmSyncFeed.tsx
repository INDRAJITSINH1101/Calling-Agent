import React from 'react';
import { Zap, CheckCircle2, ShieldCheck } from 'lucide-react';
import { ToolAction } from '../../types/calls';

interface CrmSyncFeedProps {
  toolEvents: ToolAction[];
}

export const CrmSyncFeed: React.FC<CrmSyncFeedProps> = ({ toolEvents }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '16px',
      padding: '20px',
      gap: '14px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={16} color="#10b981" />
          <span style={{ fontSize: '14px', fontWeight: '700', color: '#f8fafc' }}>
            Live CRM Sync Feed
          </span>
        </div>
        <span style={{
          fontSize: '11px',
          padding: '2px 8px',
          borderRadius: '12px',
          background: 'rgba(16, 185, 129, 0.1)',
          color: '#34d399',
          fontWeight: 600
        }}>
          {toolEvents.length} Actions
        </span>
      </div>

      <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>
        Real-time PostgreSQL modifications autonomously triggered by Groq / OpenRouter tool calling during the call.
      </p>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        maxHeight: '440px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {toolEvents.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#64748b',
            textAlign: 'center',
            gap: '8px',
            padding: '40px 0'
          }}>
            <ShieldCheck size={28} opacity={0.4} />
            <span style={{ fontSize: '12px' }}>
              No tool actions triggered yet. When customer states budget or agrees to a demo, real-time sync events will appear here!
            </span>
          </div>
        ) : (
          toolEvents.map((ev, eIdx) => (
            <div
              key={eIdx}
              style={{
                background: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '10px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <CheckCircle2 size={12} />
                  {ev.tool_name}
                </span>
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                  {ev.execution_status}
                </span>
              </div>

              <p style={{ fontSize: '12px', color: '#cbd5e1', margin: 0, lineHeight: 1.4 }}>
                {ev.message}
              </p>

              {ev.updated_lead && (
                <div style={{
                  marginTop: '4px',
                  paddingTop: '6px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '10px',
                  color: '#94a3b8'
                }}>
                  <span>Stage: <strong style={{ color: '#38bdf8' }}>{ev.updated_lead.stage}</strong></span>
                  <span>Score: <strong style={{ color: '#10b981' }}>{ev.updated_lead.score} ({ev.updated_lead.bucket})</strong></span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
