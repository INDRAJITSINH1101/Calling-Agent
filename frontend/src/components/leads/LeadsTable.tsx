import React from 'react';
import { Building2 } from 'lucide-react';
import { Lead, LeadStage } from '../../types/crm';
import {
  ScoreBadge,
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableHeaderRow,
  TableRow,
  TableHeadCell,
  TableCell,
  TableActionButtons
} from '../ui';

interface LeadsTableProps {
  leads: Lead[];
  stages: { id: LeadStage; title: string; color: string }[];
  page?: number;
  pageSize?: number;
  onScoreClick: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (leadId: number) => void;
  onTriggerCall: (lead: Lead) => void;
}

export const LeadsTable: React.FC<LeadsTableProps> = ({
  leads,
  stages,
  page = 1,
  pageSize = 20,
  onScoreClick,
  onEdit,
  onDelete,
  onTriggerCall
}) => {
  if (leads.length === 0) {
    return (
      <div
        style={{
          backgroundColor: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          color: '#94a3b8'
        }}
      >
        No leads match your criteria.
      </div>
    );
  }

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableHeaderRow>
            <TableHeadCell>ID</TableHeadCell>
            <TableHeadCell>Lead Contact</TableHeadCell>
            <TableHeadCell>Stage</TableHeadCell>
            <TableHeadCell>AI Lead Score</TableHeadCell>
            <TableHeadCell>Deal Value</TableHeadCell>
            <TableHeadCell>Source</TableHeadCell>
            <TableHeadCell>Created</TableHeadCell>
            <TableHeadCell>Actions</TableHeadCell>
          </TableHeaderRow>
        </TableHead>
        <TableBody>
          {leads.map((lead, index) => {
            const contactName = lead.contact
              ? `${lead.contact.first_name || ''} ${lead.contact.last_name || ''}`.trim() || 'Unnamed'
              : 'Unknown Contact';

            const stageInfo = stages.find((s) => s.id === lead.stage) || {
              title: lead.stage,
              color: '#94a3b8'
            };

            return (
              <TableRow key={lead.id}>
                {/* Dynamic Sequential ID */}
                <TableCell style={{ color: '#94a3b8', fontWeight: 600 }}>
                  {(page - 1) * pageSize + index + 1}
                </TableCell>

                {/* Contact Name & Company */}
                <TableCell>
                  <div style={{ fontWeight: 600 }}>{contactName}</div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      marginTop: '2px'
                    }}
                  >
                    {lead.contact?.company?.name && (
                      <>
                        <Building2 size={11} />
                        <span>{lead.contact.company.name}</span>
                        <span>•</span>
                      </>
                    )}
                    <span>{lead.contact?.phone || 'No phone'}</span>
                  </div>
                </TableCell>

                {/* Stage (View-Only Badge) */}
                <TableCell>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor: `${stageInfo.color}15`,
                      border: `1px solid ${stageInfo.color}35`,
                      color: stageInfo.color,
                      fontSize: '12px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: stageInfo.color
                      }}
                    />
                    {stageInfo.title}
                  </span>
                </TableCell>

                {/* AI Score Badge */}
                <TableCell>
                  <ScoreBadge
                    score={lead.score}
                    bucket={lead.bucket}
                    onClick={() => onScoreClick(lead)}
                  />
                </TableCell>

                {/* Deal Value */}
                <TableCell style={{ fontWeight: 700, color: '#34d399' }}>
                  ${(lead.deal_value || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                </TableCell>

                {/* Source */}
                <TableCell>
                  <span
                    style={{
                      display: 'inline-block',
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#cbd5e1',
                      textTransform: 'uppercase'
                    }}
                  >
                    {lead.source || 'INBOUND'}
                  </span>
                </TableCell>

                {/* Date */}
                <TableCell style={{ fontSize: '12px', color: '#64748b' }}>
                  {new Date(lead.created_at).toLocaleDateString()}
                </TableCell>

                {/* Actions */}
                <TableCell>
                  <TableActionButtons
                    itemName={contactName}
                    deleteConfirmTitle="Delete Opportunity"
                    deleteConfirmMessage={`Are you sure you want to permanently delete this opportunity for ${contactName}?`}
                    onCall={() => onTriggerCall(lead)}
                    onEdit={() => onEdit(lead)}
                    onDelete={() => onDelete(lead.id)}
                    callTitle="Trigger Voice AI Call"
                    editTitle="Edit Opportunity"
                    deleteTitle="Delete Opportunity"
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default LeadsTable;
