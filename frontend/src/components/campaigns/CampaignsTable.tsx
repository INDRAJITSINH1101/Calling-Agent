import React, { useState } from 'react';
import { Play, Pause, Square, Trash2, Users, Bot, Phone, Award } from 'lucide-react';
import { Campaign, campaignsApi } from '../../services/campaignsApi';
import { Badge } from '../ui/Badge';
import { ActionButton } from '../ui/ActionButtons';
import { ConfirmDeleteModal } from '../ui/ConfirmDeleteModal';
import {
  TableContainer,
  Table,
  TableHead,
  TableHeaderRow,
  TableHeadCell,
  TableBody,
  TableRow,
  TableCell,
  TableIdHeadCell,
  TableIdCell
} from '../ui/Table';
import { CampaignRecipientsDrawer } from './CampaignRecipientsDrawer';

interface Props {
  campaigns: Campaign[];
  isLoading: boolean;
  onRefresh: () => void;
}

export const CampaignsTable: React.FC<Props> = ({ campaigns, isLoading, onRefresh }) => {
  const [selectedCampaignForQueue, setSelectedCampaignForQueue] = useState<Campaign | null>(null);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const handleStart = async (id: number) => {
    setActionLoadingId(id);
    try {
      await campaignsApi.startCampaign(id);
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePause = async (id: number) => {
    setActionLoadingId(id);
    try {
      await campaignsApi.pauseCampaign(id);
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResume = async (id: number) => {
    setActionLoadingId(id);
    try {
      await campaignsApi.resumeCampaign(id);
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleStop = async (id: number) => {
    setActionLoadingId(id);
    try {
      await campaignsApi.stopCampaign(id);
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoadingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!campaignToDelete) return;
    setIsDeleting(true);
    try {
      await campaignsApi.deleteCampaign(campaignToDelete.id);
      setCampaignToDelete(null);
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeleting(false);
    }
  };

  const renderStatus = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            fontWeight: 600,
            padding: '3px 9px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#34d399',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            whiteSpace: 'nowrap'
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#34d399',
              boxShadow: '0 0 8px #34d399'
            }} />
            RUNNING
          </span>
        );
      case 'PAUSED':
        return <Badge variant="warning">PAUSED</Badge>;
      case 'COMPLETED':
        return <Badge variant="success">COMPLETED</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger">CANCELLED</Badge>;
      default:
        return <Badge variant="neutral">DRAFT</Badge>;
    }
  };

  return (
    <>
      <TableContainer>
        {isLoading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
            Loading campaigns...
          </div>
        ) : campaigns.length === 0 ? (
          <div style={{
            padding: '50px',
            textAlign: 'center',
            color: '#64748b',
            fontStyle: 'italic',
            fontSize: '13px'
          }}>
            No campaigns found. Click "+ Create Campaign" to launch your first batch!
          </div>
        ) : (
          <Table>
            <TableHead>
              <TableHeaderRow>
                <TableIdHeadCell>#</TableIdHeadCell>
                <TableHeadCell align="left">Campaign Name</TableHeadCell>
                <TableHeadCell align="center" style={{ width: '110px' }}>Status</TableHeadCell>
                <TableHeadCell align="left" style={{ minWidth: '190px' }}>AI Persona & DID</TableHeadCell>
                <TableHeadCell align="left" style={{ minWidth: '200px' }}>Progress</TableHeadCell>
                <TableHeadCell align="center" style={{ width: '120px' }}>Performance</TableHeadCell>
                <TableHeadCell align="center" style={{ width: '170px' }}>Actions</TableHeadCell>
              </TableHeaderRow>
            </TableHead>
            <TableBody>
              {campaigns.map((c, index) => {
                const answerRate = c.completed_count > 0 ? Math.round((c.connected_count / c.completed_count) * 100) : 0;
                const isLoadingAction = actionLoadingId === c.id;

                return (
                  <TableRow key={c.id}>
                    {/* Centered ID (1, 2, 3...) */}
                    <TableIdCell id={index + 1} />

                    {/* Name */}
                    <TableCell align="left">
                      <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '13px' }}>
                        {c.name}
                      </div>
                      {c.description && (
                        <div style={{
                          fontSize: '11px',
                          color: '#64748b',
                          marginTop: '3px',
                          maxWidth: '260px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {c.description}
                        </div>
                      )}
                    </TableCell>

                    {/* Status Centered */}
                    <TableCell align="center">
                      {renderStatus(c.status)}
                    </TableCell>

                    {/* AI Persona & Caller Phone (No Wrapping) */}
                    <TableCell align="left">
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: '#cbd5e1',
                        fontSize: '12px',
                        fontWeight: 500,
                        whiteSpace: 'nowrap'
                      }}>
                        <Bot size={14} color="#a855f7" />
                        <span>{c.persona_name || 'Rachel Enterprise'}</span>
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: '#64748b',
                        fontSize: '11px',
                        marginTop: '3px',
                        whiteSpace: 'nowrap'
                      }}>
                        <Phone size={11} />
                        <span>{c.caller_phone_number || 'Default Outbound DID'}</span>
                      </div>
                    </TableCell>

                    {/* Progress Bar */}
                    <TableCell align="left">
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginBottom: '5px' }}>
                        <span>{c.completed_count} of {c.total_contacts} Calls</span>
                        <span style={{ fontWeight: 600, color: '#38bdf8' }}>{c.progress_percentage}%</span>
                      </div>
                      <div style={{
                        height: '6px',
                        borderRadius: '3px',
                        backgroundColor: '#1e293b',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${c.progress_percentage}%`,
                          background: c.status === 'RUNNING'
                            ? 'linear-gradient(90deg, #38bdf8, #10b981)'
                            : '#64748b',
                          borderRadius: '3px',
                          transition: 'width 0.4s ease'
                        }} />
                      </div>
                    </TableCell>

                    {/* Performance Centered */}
                    <TableCell align="center">
                      <div style={{ fontSize: '12px', color: '#f8fafc', whiteSpace: 'nowrap' }}>
                        <span style={{ color: '#34d399', fontWeight: 600 }}>{answerRate}%</span> Answer
                      </div>
                      <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                        <Award size={11} />
                        <span>{c.qualified_count} Qualified</span>
                      </div>
                    </TableCell>

                    {/* Actions: ONLY Queue keeps name, all others are icon-only */}
                    <TableCell align="center">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        {/* Start / Resume: Icon Only */}
                        {(c.status === 'DRAFT' || c.status === 'PAUSED') && (
                          <ActionButton
                            onClick={() => c.status === 'PAUSED' ? handleResume(c.id) : handleStart(c.id)}
                            disabled={isLoadingAction}
                            title={c.status === 'PAUSED' ? 'Resume Campaign' : 'Start Campaign'}
                            style={{
                              backgroundColor: 'rgba(16, 185, 129, 0.15)',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              color: '#34d399',
                              padding: '6px'
                            }}
                          >
                            <Play size={13} fill="#34d399" />
                          </ActionButton>
                        )}

                        {/* Pause: Icon Only */}
                        {c.status === 'RUNNING' && (
                          <ActionButton
                            onClick={() => handlePause(c.id)}
                            disabled={isLoadingAction}
                            title="Pause Campaign"
                            style={{
                              backgroundColor: 'rgba(245, 158, 11, 0.15)',
                              border: '1px solid rgba(245, 158, 11, 0.3)',
                              color: '#fbbf24',
                              padding: '6px'
                            }}
                          >
                            <Pause size={13} fill="#fbbf24" />
                          </ActionButton>
                        )}

                        {/* Stop: Icon Only */}
                        {(c.status === 'RUNNING' || c.status === 'PAUSED') && (
                          <ActionButton
                            onClick={() => handleStop(c.id)}
                            disabled={isLoadingAction}
                            title="Stop Campaign"
                            variant="delete"
                            style={{ padding: '6px' }}
                          >
                            <Square size={13} fill="#f87171" />
                          </ActionButton>
                        )}

                        {/* View Queue Drawer Button: KEEPS NAME */}
                        <ActionButton
                          onClick={() => setSelectedCampaignForQueue(c)}
                          title="View Recipient Queue"
                          style={{
                            backgroundColor: 'rgba(56, 189, 248, 0.12)',
                            border: '1px solid rgba(56, 189, 248, 0.25)',
                            color: '#38bdf8',
                            padding: '5px 9px',
                            gap: '5px',
                            fontSize: '11px',
                            fontWeight: 500
                          }}
                        >
                          <Users size={12} />
                          <span>Queue ({c.total_contacts})</span>
                        </ActionButton>

                        {/* Delete: Icon Only */}
                        <ActionButton
                          onClick={() => setCampaignToDelete(c)}
                          title="Delete Campaign"
                          variant="delete"
                          style={{ padding: '6px' }}
                        >
                          <Trash2 size={13} />
                        </ActionButton>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {/* Recipient Queue Drawer (rendered cleanly via React Portal) */}
      <CampaignRecipientsDrawer
        campaign={selectedCampaignForQueue}
        isOpen={!!selectedCampaignForQueue}
        onClose={() => setSelectedCampaignForQueue(null)}
      />

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!campaignToDelete}
        title="Delete Campaign"
        message={`Are you sure you want to delete campaign "${campaignToDelete?.name}"? All recipient queue records will be cancelled.`}
        loading={isDeleting}
        onConfirm={confirmDelete}
        onClose={() => setCampaignToDelete(null)}
      />
    </>
  );
};
