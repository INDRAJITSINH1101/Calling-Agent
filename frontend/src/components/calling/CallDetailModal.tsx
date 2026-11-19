import React from 'react';
import { X, Phone, FileText, Volume2 } from 'lucide-react';
import { CallLog, CallTranscriptItem } from '../../services/callsApi';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface CallDetailModalProps {
  call: CallLog;
  onClose: () => void;
  transcripts?: CallTranscriptItem[];
  isLoadingTranscripts?: boolean;
}

export const CallDetailModal: React.FC<CallDetailModalProps> = ({
  call,
  onClose
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#0b1120',
          border: '1px solid #1e293b',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 20px rgba(56, 189, 248, 0.1)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.4) 0%, rgba(11, 17, 32, 0) 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'rgba(56, 189, 248, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(56, 189, 248, 0.25)'
              }}
            >
              <Phone size={18} color="#38bdf8" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
                Call Session #{call.id}
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                {call.contact_name || call.contact_phone || 'Direct Caller'} &bull; {new Date(call.created_at).toLocaleString()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Metadata Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
              backgroundColor: '#111827',
              padding: '14px',
              borderRadius: '10px',
              border: '1px solid #1f2937'
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>DURATION</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>
                {call.duration_seconds}s
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>SENTIMENT</div>
              <div style={{ marginTop: '3px' }}>
                <Badge variant={call.sentiment === 'POSITIVE' ? 'success' : call.sentiment === 'NEGATIVE' ? 'danger' : 'neutral'}>
                  {call.sentiment || 'NEUTRAL'}
                </Badge>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>DISPOSITION</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#38bdf8', marginTop: '2px' }}>
                {call.disposition || 'COMPLETED'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>PERSONA</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginTop: '2px' }}>
                {call.agent_persona || 'Sales AI'}
              </div>
            </div>
          </div>

          {/* AI Executive Summary */}
          {(() => {
            const cleanSummary = (call.summary || '')
              .replace(/Twilio Call SID:\s*[A-Za-z0-9]+\s*\|\s*Target:\s*\+?[0-9]+/gi, '')
              .replace(/^\|\s*/, '')
              .trim();

            if (!cleanSummary) return null;

            return (
              <div
                style={{
                  backgroundColor: 'rgba(56, 189, 248, 0.05)',
                  border: '1px solid rgba(56, 189, 248, 0.2)',
                  borderRadius: '10px',
                  padding: '14px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <FileText size={14} color="#38bdf8" />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>AI Executive Summary</span>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: '1.5' }}>
                  {cleanSummary}
                </p>
              </div>
            );
          })()}

          {/* Call Audio Recording Player (if available) */}
          {call.recording_url && (
            <div
              style={{
                backgroundColor: 'rgba(30, 41, 59, 0.4)',
                border: '1px solid #334155',
                borderRadius: '10px',
                padding: '14px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Volume2 size={14} color="#38bdf8" />
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1' }}>Call Audio Recording</span>
              </div>
              <audio
                controls
                src={call.recording_url.startsWith('http') ? call.recording_url : `http://localhost:8000${call.recording_url}`}
                style={{ width: '100%', height: '38px', borderRadius: '6px' }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            justifyContent: 'flex-end',
            backgroundColor: '#090d16'
          }}
        >
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
