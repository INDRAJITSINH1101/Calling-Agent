import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Megaphone, RefreshCw } from 'lucide-react';
import { campaignsApi } from '../services/campaignsApi';
import { Button } from '../components/ui/Button';
import { FilterBar } from '../components/ui/FilterBar';
import {
  CampaignStatsCards,
  CampaignsTable,
  CreateCampaignModal
} from '../components/campaigns';

export const CampaignsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Fetch campaign stats
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['campaignStats'],
    queryFn: campaignsApi.getStats,
    refetchInterval: 5000
  });

  // Fetch campaigns list
  const { data: campaigns = [], isLoading: isLoadingCampaigns } = useQuery({
    queryKey: ['campaigns', statusFilter, searchTerm],
    queryFn: () => campaignsApi.getCampaigns(statusFilter, searchTerm),
    refetchInterval: (query) => {
      const hasRunning = query.state.data?.some(c => c.status === 'RUNNING');
      return hasRunning ? 3000 : 15000;
    }
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    queryClient.invalidateQueries({ queryKey: ['campaignStats'] });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Page Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{
            margin: 0,
            fontSize: '22px',
            fontWeight: 700,
            color: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <Megaphone size={22} color="#38bdf8" />
            <span>Unified Outreach Campaigns & Batch AI Calling</span>
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
            Automated multi-contact AI dialing sequences, cadence scheduling, and live qualification
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoadingCampaigns}
            icon={<RefreshCw size={14} style={{ animation: isLoadingCampaigns ? 'spin 1s linear infinite' : 'none' }} />}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
            icon={<Plus size={16} />}
          >
            Create Campaign
          </Button>
        </div>
      </div>

      {/* Aggregate Stats Strip */}
      <CampaignStatsCards stats={stats || null} isLoading={isLoadingStats} />

      {/* Standard Reusable FilterBar */}
      <FilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search campaigns by name or persona..."
        searchWidth="320px"
        filters={[
          {
            key: 'status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: '', label: 'All Statuses' },
              { value: 'RUNNING', label: 'Running Only' },
              { value: 'PAUSED', label: 'Paused Only' },
              { value: 'DRAFT', label: 'Draft Only' },
              { value: 'COMPLETED', label: 'Completed Only' }
            ]
          }
        ]}
      />

      {/* Reusable Table Implementation */}
      <CampaignsTable
        campaigns={campaigns}
        isLoading={isLoadingCampaigns}
        onRefresh={handleRefresh}
      />

      {/* Create Campaign Modal */}
      <CreateCampaignModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleRefresh}
      />
    </div>
  );
};
