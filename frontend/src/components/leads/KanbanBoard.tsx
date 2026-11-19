import React from 'react';
import { GitPullRequest, Plus } from 'lucide-react';
import { Lead, LeadStage, PipelineSummary } from '../../types/crm';
import { KanbanCard } from './KanbanCard';
import { Button } from '../ui/Button';

interface KanbanBoardProps {
  leads: Lead[];
  stages: { id: LeadStage; title: string; color: string }[];
  summary?: PipelineSummary;
  selectedStageFilter?: string;
  onScoreClick: (lead: Lead) => void;
  onStageChange: (leadId: number, newStage: LeadStage) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (leadId: number) => void;
  onTriggerCall: (lead: Lead) => void;
  onAddLead: (stageId?: LeadStage) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  leads,
  stages,
  summary,
  selectedStageFilter,
  onScoreClick,
  onStageChange,
  onEdit,
  onDelete,
  onTriggerCall,
  onAddLead
}) => {
  if (leads.length === 0) {
    return (
      <div
        style={{
          backgroundColor: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          padding: '60px 24px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '14px'
        }}
      >
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#38bdf8'
          }}
        >
          <GitPullRequest size={26} />
        </div>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', margin: '0 0 6px 0' }}>
            No Leads in Pipeline
          </h3>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, maxWidth: '440px' }}>
            There are currently no active opportunities matching your filter. Click below to add a new lead and calculate its AI lead score.
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Plus size={14} />}
          onClick={() => onAddLead(selectedStageFilter as LeadStage || undefined)}
        >
          Add Lead
        </Button>
      </div>
    );
  }

  // Filter stages if a specific stage filter is selected, or display active stages
  const displayedStages = selectedStageFilter
    ? stages.filter((s) => s.id === selectedStageFilter)
    : stages;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns:
          displayedStages.length === 1
            ? '1fr'
            : `repeat(${displayedStages.length}, minmax(260px, 1fr))`,
        gap: '14px',
        overflowX: 'auto',
        paddingBottom: '16px'
      }}
    >
      {displayedStages.map((stage) => {
        const stageLeads = leads.filter((l) => l.stage === stage.id);
        const stageStats = summary?.stages?.[stage.id];
        const stageCount = stageStats?.count ?? stageLeads.length;
        const stageTotal =
          stageStats?.total_value ??
          stageLeads.reduce((acc, l) => acc + (l.deal_value || 0), 0);

        return (
          <div
            key={stage.id}
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              minHeight: '360px',
              maxHeight: '75vh',
              overflow: 'hidden'
            }}
          >
            {/* Column Header */}
            <div
              style={{
                padding: '12px 14px',
                borderBottom: '1px solid #1e293b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'rgba(255, 255, 255, 0.02)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: stage.color,
                    boxShadow: `0 0 8px ${stage.color}60`
                  }}
                />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                  {stage.title}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 7px',
                    borderRadius: '999px',
                    backgroundColor: '#1e293b',
                    color: '#94a3b8',
                    fontWeight: 700
                  }}
                >
                  {stageCount}
                </span>
              </div>

              <span style={{ fontSize: '12px', fontWeight: 700, color: '#34d399' }}>
                ${stageTotal.toLocaleString('en-US', { minimumFractionDigits: 0 })}
              </span>
            </div>

            {/* Column Cards Container */}
            <div
              style={{
                padding: '12px',
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              {stageLeads.length === 0 ? (
                <div
                  style={{
                    padding: '32px 16px',
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: '12px',
                    border: '1px dashed rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.01)'
                  }}
                >
                  No opportunities in this stage
                </div>
              ) : (
                stageLeads.map((lead) => (
                  <KanbanCard
                    key={lead.id}
                    lead={lead}
                    stages={stages}
                    onScoreClick={onScoreClick}
                    onStageChange={onStageChange}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onTriggerCall={onTriggerCall}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
