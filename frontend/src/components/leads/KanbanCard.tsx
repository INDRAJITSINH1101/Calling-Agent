import React from 'react';
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  PhoneCall,
  Trash2
} from 'lucide-react';
import { Lead, LeadStage } from '../../types/crm';
import { ScoreBadge } from '../ui/Badge';

interface KanbanCardProps {
  lead: Lead;
  stages: { id: LeadStage; title: string; color: string }[];
  onScoreClick: (lead: Lead) => void;
  onStageChange: (leadId: number, newStage: LeadStage) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (leadId: number) => void;
  onTriggerCall: (lead: Lead) => void;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({
  lead,
  stages,
  onScoreClick,
  onStageChange,
  onEdit,
  onDelete,
  onTriggerCall
}) => {
  const currentStageIndex = stages.findIndex((s) => s.id === lead.stage);
  const prevStage = currentStageIndex > 0 ? stages[currentStageIndex - 1] : null;
  const nextStage = currentStageIndex < stages.length - 1 ? stages[currentStageIndex + 1] : null;

  const contactName = lead.contact
    ? `${lead.contact.first_name || ''} ${lead.contact.last_name || ''}`.trim() || 'Unnamed Contact'
    : 'Unknown Contact';

  const companyName = lead.contact?.company?.name || null;

  return (
    <div
      style={{
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '10px',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
        transition: 'transform 0.15s ease, border-color 0.15s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.borderColor = '#475569';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = '#334155';
      }}
    >
      {/* Top Header: Score Badge & Deal Value */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <ScoreBadge
          score={lead.score}
          bucket={lead.bucket}
          onClick={(e) => {
            e.stopPropagation();
            onScoreClick(lead);
          }}
        />

        <div style={{ fontSize: '13px', fontWeight: 800, color: '#34d399' }}>
          ${(lead.deal_value || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}
        </div>
      </div>

      {/* Contact Name & Company */}
      <div>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
          {contactName}
        </div>
        {companyName && (
          <div
            style={{
              fontSize: '12px',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginTop: '2px'
            }}
          >
            <Building2 size={12} />
            <span>{companyName}</span>
          </div>
        )}
      </div>

      {/* Attribution & Phone */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
        <span
          style={{
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: '#0f172a',
            border: '1px solid #1e293b',
            color: '#94a3b8'
          }}
        >
          {lead.source}
        </span>
        {lead.contact?.phone && <span>{lead.contact.phone}</span>}
      </div>

      {/* Footer Controls: Stage Navigation & Quick Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '8px',
          borderTop: '1px solid #334155',
          marginTop: '2px'
        }}
      >
        {/* Left / Right Stage Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={() => prevStage && onStageChange(lead.id, prevStage.id)}
            disabled={!prevStage}
            title={prevStage ? `Move back to ${prevStage.title}` : undefined}
            style={{
              background: 'none',
              border: 'none',
              color: prevStage ? '#cbd5e1' : '#475569',
              cursor: prevStage ? 'pointer' : 'default',
              padding: '3px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ChevronLeft size={16} />
          </button>

          <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>
            {currentStageIndex + 1}/{stages.length}
          </span>

          <button
            onClick={() => nextStage && onStageChange(lead.id, nextStage.id)}
            disabled={!nextStage}
            title={nextStage ? `Advance to ${nextStage.title}` : undefined}
            style={{
              background: 'none',
              border: 'none',
              color: nextStage ? '#38bdf8' : '#475569',
              cursor: nextStage ? 'pointer' : 'default',
              padding: '3px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Action Buttons: Edit, Phone & Delete */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={() => onEdit(lead)}
            style={{
              background: 'none',
              border: 'none',
              color: '#38bdf8',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Edit Lead Opportunity"
          >
            <Pencil size={13} />
          </button>

          <button
            onClick={() => onTriggerCall(lead)}
            style={{
              background: 'none',
              border: 'none',
              color: '#34d399',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Trigger AI Outreach Call"
          >
            <PhoneCall size={14} />
          </button>

          <button
            onClick={() => onDelete(lead.id)}
            style={{
              background: 'none',
              border: 'none',
              color: '#ef4444',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Delete Opportunity"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
