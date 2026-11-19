import React from 'react';
import {
  Volume2,
  Mic,
  MicOff,
  Bot,
  User,
  PhoneCall,
  Zap,
  Send
} from 'lucide-react';
import { Button } from '../ui/Button';
import { TranscriptItem } from '../../types/calls';

interface ConversationalStageProps {
  isCallActive: boolean;
  isAgentSpeaking: boolean;
  isUserSpeaking: boolean;
  isMicMuted: boolean;
  onToggleMic: () => void;
  transcripts: TranscriptItem[];
  userInputText: string;
  onUserInputChange: (val: string) => void;
  onSendTurn: (msg: string) => void;
  isProcessingTurn: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export const ConversationalStage: React.FC<ConversationalStageProps> = ({
  isCallActive,
  isAgentSpeaking,
  isUserSpeaking,
  isMicMuted,
  onToggleMic,
  transcripts,
  userInputText,
  onUserInputChange,
  onSendTurn,
  isProcessingTurn,
  messagesEndRef
}) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '16px',
      overflow: 'hidden'
    }}>
      {/* Top Waveform Audio Stage */}
      <div style={{
        padding: '24px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at center, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.8) 100%)',
        position: 'relative'
      }}>
        {/* Glowing Pulsing Circle */}
        <div style={{
          width: '110px',
          height: '110px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          background: isAgentSpeaking
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(5, 150, 105, 0.4))'
            : isUserSpeaking
            ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(37, 99, 235, 0.4))'
            : 'rgba(30, 41, 59, 0.5)',
          border: `2px solid ${isAgentSpeaking ? '#10b981' : isUserSpeaking ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)'}`,
          boxShadow: isAgentSpeaking
            ? '0 0 35px rgba(16, 185, 129, 0.4)'
            : isUserSpeaking
            ? '0 0 35px rgba(56, 189, 248, 0.4)'
            : 'none',
          transition: 'all 0.3s ease'
        }}>
          {isAgentSpeaking ? (
            <Volume2 size={40} color="#10b981" />
          ) : isUserSpeaking ? (
            <Mic size={40} color="#38bdf8" />
          ) : isCallActive ? (
            <Bot size={40} color="#94a3b8" />
          ) : (
            <PhoneCall size={36} color="#64748b" />
          )}
        </div>

        {/* State Label */}
        <div style={{ marginTop: '14px', textAlign: 'center' }}>
          <span style={{
            fontSize: '13px',
            fontWeight: 600,
            color: isAgentSpeaking ? '#10b981' : isUserSpeaking ? '#38bdf8' : isCallActive ? '#94a3b8' : '#64748b'
          }}>
            {isAgentSpeaking
              ? 'Devdutt AI is speaking to customer...'
              : isUserSpeaking
              ? 'Customer is speaking into mic...'
              : isCallActive
              ? 'Listening for customer response...'
              : 'Ready to connect live call simulation'}
          </span>
        </div>

        {/* Mic Control */}
        {isCallActive && (
          <div style={{ position: 'absolute', right: '20px', top: '20px' }}>
            <button
              type="button"
              onClick={onToggleMic}
              style={{
                padding: '8px 12px',
                borderRadius: '10px',
                background: isMicMuted ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                border: `1px solid ${isMicMuted ? 'rgba(239, 68, 68, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`,
                color: isMicMuted ? '#f87171' : '#38bdf8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              {isMicMuted ? <MicOff size={14} /> : <Mic size={14} />}
              <span>{isMicMuted ? 'Mic Muted' : 'Mic Active'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Transcript Bubbles Stream */}
      <div style={{
        flex: 1,
        padding: '24px',
        overflowY: 'auto',
        minHeight: '260px',
        maxHeight: '480px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        {transcripts.length === 0 ? (
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
            <PhoneCall size={32} opacity={0.4} />
            <span style={{ fontSize: '13px' }}>
              No active conversation yet. Click <strong>"Start AI Call"</strong> on the left to begin live speech interaction.
            </span>
          </div>
        ) : (
          transcripts.map((t, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: t.speaker === 'AI_AGENT' ? 'flex-start' : 'flex-end',
                gap: '4px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94a3b8' }}>
                {t.speaker === 'AI_AGENT' ? (
                  <>
                    <Bot size={12} color="#10b981" />
                    <span style={{ fontWeight: 600, color: '#10b981' }}>Devdutt AI</span>
                    {t.provider_used && (
                      <span style={{
                        fontSize: '10px',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: 'rgba(56, 189, 248, 0.1)',
                        color: '#38bdf8'
                      }}>
                        {t.provider_used.toUpperCase()} {t.latency_ms ? `· ${t.latency_ms}ms` : ''}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <User size={12} color="#38bdf8" />
                    <span style={{ fontWeight: 600, color: '#38bdf8' }}>Customer</span>
                  </>
                )}
                <span>{t.timestamp}</span>
              </div>

              <div style={{
                maxWidth: '85%',
                padding: '10px 14px',
                borderRadius: t.speaker === 'AI_AGENT' ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
                background: t.speaker === 'AI_AGENT'
                  ? 'rgba(30, 41, 59, 0.85)'
                  : 'linear-gradient(135deg, rgba(37, 99, 235, 0.25), rgba(56, 189, 248, 0.15))',
                border: `1px solid ${t.speaker === 'AI_AGENT' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(56, 189, 248, 0.3)'}`,
                color: '#f8fafc',
                fontSize: '13px',
                lineHeight: '1.5'
              }}>
                {t.message}
              </div>

              {t.tool_actions && t.tool_actions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
                  {t.tool_actions.map((act, aIdx) => (
                    <div
                      key={aIdx}
                      style={{
                        fontSize: '11px',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        color: '#34d399',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Zap size={11} />
                      <span>{act.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div style={{
        padding: '14px 20px',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        background: 'rgba(15, 23, 42, 0.95)',
        display: 'flex',
        gap: '10px',
        alignItems: 'center'
      }}>
        <input
          type="text"
          value={userInputText}
          onChange={(e) => onUserInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSendTurn(userInputText);
          }}
          disabled={!isCallActive || isProcessingTurn}
          placeholder={isCallActive ? "Speak into your mic or type customer response here..." : "Start call to enable mic & dialogue input..."}
          style={{
            flex: 1,
            padding: '10px 16px',
            background: 'rgba(30, 41, 59, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            color: '#f8fafc',
            fontSize: '13px',
            outline: 'none'
          }}
        />
        <Button
          variant="primary"
          disabled={!isCallActive || !userInputText.trim() || isProcessingTurn}
          onClick={() => onSendTurn(userInputText)}
        >
          <Send size={15} />
        </Button>
      </div>
    </div>
  );
};
