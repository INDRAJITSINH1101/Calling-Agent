import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  RefreshCw,
  Sliders
} from 'lucide-react';
import { leadsApi } from '../services/leadsApi';
import { Lead, LeadStage } from '../types/crm';
import { Button, SearchInput, Select } from '../components/ui';
import { PipelineStatsStrip, LeadsTable } from '../components/leads';
import { Pagination } from '../components/common/Pagination';
import { ScoreExplanationDrawer } from '../components/crm/ScoreExplanationDrawer';
import { AddLeadModal } from '../components/crm/AddLeadModal';
import { ScoringRulesModal } from '../components/crm/ScoringRulesModal';
import { useSystemConstants } from '../hooks/useSystemConstants';

export const LeadsPipelinePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { leadStages, scoreBuckets } = useSystemConstants();

  const stages = leadStages.map((s) => ({
    id: s.value as LeadStage,
    title: s.label,
    color: s.color || '#38bdf8'
  }));

  const bucketOptions = [
    { value: '', label: 'All Score Buckets' },
    ...scoreBuckets
  ];

  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [bucketFilter, setBucketFilter] = useState<string>('');
  const [selectedLeadForScore, setSelectedLeadForScore] = useState<Lead | null>(null);
  const [leadToEdit, setLeadToEdit] = useState<Lead | null>(null);
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState<boolean>(false);
  const [isScoringRulesModalOpen, setIsScoringRulesModalOpen] = useState<boolean>(false);

  // Fetch leads dynamically from backend REST API
  const { data: leadsData, isLoading: loadingLeads } = useQuery({
    queryKey: ['leads', { page, pageSize, stage: selectedStage, bucket: bucketFilter, search }],
    queryFn: () => leadsApi.getLeads(page, pageSize, selectedStage, bucketFilter, '', search),
    staleTime: 1000 * 60 * 2
  });

  // Fetch pipeline summary stats dynamically from backend
  const { data: summary } = useQuery({
    queryKey: ['pipelineSummary'],
    queryFn: () => leadsApi.getPipelineSummary(),
    staleTime: 1000 * 60 * 2
  });

  const leads: Lead[] = leadsData?.leads || [];
  const totalLeads: number = leadsData?.total ?? 0;


  const handleEditLead = (lead: Lead) => {
    setLeadToEdit(lead);
    setIsAddLeadModalOpen(true);
  };

  const handleDeleteLead = async (leadId: number) => {
    try {
      await leadsApi.deleteLead(leadId);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['pipelineSummary'] });
    } catch (err) {
      console.error('Failed to delete lead:', err);
      alert('Could not delete lead');
    }
  };

  const handleTriggerCall = (lead: Lead) => {
    alert(`Initiating AI Voice Call to ${lead.contact?.first_name || 'Contact'} (${lead.contact?.phone || 'No phone'})...`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Header Row: Title on Left, Action Buttons on Right */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', margin: 0 }}>
              Leads & Sales Pipeline
            </h2>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '999px',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.3)'
              }}
            >
              {summary?.total_leads ?? leads.length} Opportunities
            </span>
          </div>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0 0' }}>
            Track deal stages, revenue pipeline & explainable AI lead scoring
          </p>
        </div>

        {/* Action Buttons (Right-aligned) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Button
            variant="outline"
            icon={<RefreshCw size={13} />}
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['leads'] });
              queryClient.invalidateQueries({ queryKey: ['pipelineSummary'] });
            }}
            title="Refresh Pipeline"
          >
            Refresh
          </Button>

          <Button
            variant="sky"
            icon={<Sliders size={13} />}
            onClick={() => setIsScoringRulesModalOpen(true)}
            title="Configure Dynamic Scoring Rules"
          >
            Scoring Rules
          </Button>

          <Button
            variant="primary"
            icon={<Plus size={14} />}
            onClick={() => {
              setLeadToEdit(null);
              setIsAddLeadModalOpen(true);
            }}
          >
            Add Lead
          </Button>
        </div>
      </div>

      {/* Filter & View Mode Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '12px 16px',
          backgroundColor: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <SearchInput
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Search leads, companies..."
            width="260px"
          />

          <Select
            options={bucketOptions}
            value={bucketFilter}
            onChange={(e) => {
              setBucketFilter(e.target.value);
              setPage(1);
            }}
            width="190px"
          />
        </div>

      </div>

      {/* Dynamic Stage Filter Tabs Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '4px'
        }}
      >
        {/* All Leads Tab */}
        <button
          onClick={() => {
            setSelectedStage('');
            setPage(1);
          }}
          style={{
            padding: '6px 14px',
            borderRadius: '8px',
            border: selectedStage === '' ? '1px solid #38bdf8' : '1px solid #1e293b',
            backgroundColor: selectedStage === '' ? 'rgba(56, 189, 248, 0.15)' : '#0f172a',
            color: selectedStage === '' ? '#38bdf8' : '#94a3b8',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <span>All Leads</span>
          <span
            style={{
              fontSize: '10px',
              padding: '1px 6px',
              borderRadius: '999px',
              backgroundColor: selectedStage === '' ? '#38bdf8' : '#1e293b',
              color: selectedStage === '' ? '#0f172a' : '#64748b',
              fontWeight: 800
            }}
          >
            {summary?.total_leads ?? 0}
          </span>
        </button>

        {/* Dynamic Individual Stage Tabs */}
        {stages.map((st) => {
          const isSelected = selectedStage === st.id;
          const stageCount = summary?.stages?.[st.id]?.count ?? 0;

          return (
            <button
              key={st.id}
              onClick={() => {
                setSelectedStage(isSelected ? '' : st.id);
                setPage(1);
              }}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: isSelected ? `1px solid ${st.color}` : '1px solid #1e293b',
                backgroundColor: isSelected ? `${st.color}20` : '#0f172a',
                color: isSelected ? '#ffffff' : '#94a3b8',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <div
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: st.color
                }}
              />
              <span>{st.title}</span>
              <span
                style={{
                  fontSize: '10px',
                  padding: '1px 6px',
                  borderRadius: '999px',
                  backgroundColor: isSelected ? st.color : '#1e293b',
                  color: isSelected ? '#0f172a' : '#64748b',
                  fontWeight: 800
                }}
              >
                {stageCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Top Summary Stats Strip */}
      <PipelineStatsStrip summary={summary} totalLeadsFallback={leads.length} />

      {/* Main View: Leads List Table */}
      {loadingLeads ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
          Loading pipeline leads...
        </div>
      ) : (
        <LeadsTable
          leads={leads}
          stages={stages}
          page={page}
          pageSize={pageSize}
          onScoreClick={setSelectedLeadForScore}
          onEdit={handleEditLead}
          onDelete={handleDeleteLead}
          onTriggerCall={handleTriggerCall}
        />
      )}

      {/* Pagination */}
      {!loadingLeads && totalLeads > 0 && (
        <Pagination
          currentPage={page}
          pageSize={pageSize}
          totalRecords={totalLeads}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          itemName="opportunities"
        />
      )}

      {/* Drawers & Modals */}
      <ScoreExplanationDrawer
        isOpen={Boolean(selectedLeadForScore)}
        lead={selectedLeadForScore}
        onClose={() => setSelectedLeadForScore(null)}
        onScoreUpdated={(updated: Lead) => {
          setSelectedLeadForScore(updated);
          queryClient.invalidateQueries({ queryKey: ['leads'] });
          queryClient.invalidateQueries({ queryKey: ['pipelineSummary'] });
        }}
      />

      <AddLeadModal
        isOpen={isAddLeadModalOpen}
        leadToEdit={leadToEdit}
        defaultStage={(selectedStage as LeadStage) || 'NEW'}
        onClose={() => {
          setIsAddLeadModalOpen(false);
          setLeadToEdit(null);
        }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['leads'] });
          queryClient.invalidateQueries({ queryKey: ['pipelineSummary'] });
        }}
      />

      <ScoringRulesModal
        isOpen={isScoringRulesModalOpen}
        onClose={() => setIsScoringRulesModalOpen(false)}
        onRulesChanged={() => {
          queryClient.invalidateQueries({ queryKey: ['leads'] });
          queryClient.invalidateQueries({ queryKey: ['pipelineSummary'] });
        }}
      />
    </div>
  );
};
