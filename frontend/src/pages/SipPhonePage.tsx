import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Activity, Plus } from 'lucide-react';
import { telephonyApi, SipTrunk, PhoneNumber } from '../services/telephonyApi';
import { Button } from '../components/ui/Button';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';
import {
  TelephonyStatsCards,
  PhoneNumbersTable,
  SipTrunksGrid,
  InboundRoutingView,
  AddSipTrunkModal,
  AddPhoneNumberModal,
  SipDiagnosticModal
} from '../components/telephony';

type SubTab = 'numbers' | 'trunks' | 'routing';

interface SipPhonePageProps {
  activeTab?: string;
}

export const SipPhonePage: React.FC<SipPhonePageProps> = ({ activeTab: navTab }) => {
  const queryClient = useQueryClient();

  const getSubTabFromNav = (tab?: string): SubTab => {
    if (tab === 'sip-trunks') return 'trunks';
    if (tab === 'sip-routing') return 'routing';
    return 'numbers';
  };

  const [activeTab, setActiveTab] = useState<SubTab>(() => getSubTabFromNav(navTab));

  React.useEffect(() => {
    if (navTab) {
      setActiveTab(getSubTabFromNav(navTab));
    }
  }, [navTab]);

  // Filter & Pagination state for Phone Numbers
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  // Modals state
  const [isAddTrunkOpen, setIsAddTrunkOpen] = useState(false);
  const [editingTrunk, setEditingTrunk] = useState<SipTrunk | null>(null);
  const [testingTrunkId, setTestingTrunkId] = useState<number | null>(null);
  const [isAddNumberOpen, setIsAddNumberOpen] = useState(false);
  const [editingNumber, setEditingNumber] = useState<PhoneNumber | null>(null);
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);
  const [diagnosticPhone, setDiagnosticPhone] = useState('');

  // Confirm delete modal state
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'trunk' | 'number'; id: number; name: string } | null>(null);

  // Queries
  const { data: summary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['telephonySummary'],
    queryFn: telephonyApi.getSummary,
    staleTime: 1000 * 30
  });

  const { data: trunks = [], isLoading: isLoadingTrunks } = useQuery({
    queryKey: ['sipTrunks'],
    queryFn: telephonyApi.getTrunks,
    staleTime: 1000 * 30
  });

  const { data: numbersData, isLoading: isLoadingNumbers } = useQuery({
    queryKey: ['phoneNumbers', page, pageSize, search, typeFilter],
    queryFn: () => telephonyApi.getNumbers({ page, pageSize, search, type: typeFilter || undefined }),
    staleTime: 1000 * 15
  });

  // Mutations
  const trunkMutation = useMutation({
    mutationFn: (payload: Partial<SipTrunk> & { password?: string }) => {
      if (editingTrunk) return telephonyApi.updateTrunk(editingTrunk.id, payload);
      return telephonyApi.createTrunk(payload);
    },
    onSuccess: () => {
      setIsAddTrunkOpen(false);
      setEditingTrunk(null);
      queryClient.invalidateQueries({ queryKey: ['sipTrunks'] });
      queryClient.invalidateQueries({ queryKey: ['telephonySummary'] });
    }
  });

  const numberMutation = useMutation({
    mutationFn: (payload: Partial<PhoneNumber>) => {
      if (editingNumber) return telephonyApi.updateNumber(editingNumber.id, payload);
      return telephonyApi.createNumber(payload);
    },
    onSuccess: () => {
      setIsAddNumberOpen(false);
      setEditingNumber(null);
      queryClient.invalidateQueries({ queryKey: ['phoneNumbers'] });
      queryClient.invalidateQueries({ queryKey: ['telephonySummary'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deleteTarget) return;
      if (deleteTarget.type === 'trunk') await telephonyApi.deleteTrunk(deleteTarget.id);
      else await telephonyApi.deleteNumber(deleteTarget.id);
    },
    onSuccess: () => {
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['sipTrunks'] });
      queryClient.invalidateQueries({ queryKey: ['phoneNumbers'] });
      queryClient.invalidateQueries({ queryKey: ['telephonySummary'] });
    }
  });

  const handleTestCall = (num: PhoneNumber) => {
    setDiagnosticPhone(num.number);
    setIsDiagnosticOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '30px' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.3px' }}>
            {activeTab === 'trunks'
              ? 'SIP Trunks & Telecom Gateways'
              : activeTab === 'routing'
              ? 'Inbound Call Routing Architecture & Engine'
              : 'Virtual Phone Numbers & DIDs'}
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
            {activeTab === 'trunks'
              ? 'Configure Elastic SIP trunks, carrier endpoints, and live channel capacity'
              : activeTab === 'routing'
              ? 'Live real-time pipeline, active working hours, and warm human transfer fallback'
              : 'Provision PSTN phone numbers, assign AI calling personas, and manage inbound lines'}
          </p>
        </div>

        {/* Action Buttons: Hidden in Inbound Routing */}
        {activeTab !== 'routing' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Button
              variant="secondary"
              icon={<Activity size={14} color="#38bdf8" />}
              onClick={() => {
                setDiagnosticPhone('');
                setIsDiagnosticOpen(true);
              }}
            >
              Run SIP Diagnostic
            </Button>

            {activeTab === 'trunks' ? (
              <Button
                variant="primary"
                icon={<Plus size={15} />}
                onClick={() => {
                  setEditingTrunk(null);
                  setIsAddTrunkOpen(true);
                }}
              >
                Add SIP Trunk
              </Button>
            ) : (
              <Button
                variant="primary"
                icon={<Plus size={15} />}
                onClick={() => {
                  setEditingNumber(null);
                  setIsAddNumberOpen(true);
                }}
              >
                Provision Number
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 4-Metric Summary Cards: Hidden in Inbound Routing */}
      {activeTab !== 'routing' && (
        <TelephonyStatsCards summary={summary} isLoading={isLoadingSummary} />
      )}

      {/* Main Content Area */}
      {activeTab === 'numbers' && (
        <PhoneNumbersTable
          numbers={numbersData?.items || []}
          total={numbersData?.total || 0}
          page={page}
          pageSize={pageSize}
          searchTerm={search}
          typeFilter={typeFilter}
          isLoading={isLoadingNumbers}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSearchChange={setSearch}
          onTypeFilterChange={setTypeFilter}
          onEdit={num => {
            setEditingNumber(num);
            setIsAddNumberOpen(true);
          }}
          onDelete={id => {
            const num = numbersData?.items.find(n => n.id === id);
            setDeleteTarget({ type: 'number', id, name: num ? `${num.number} (${num.label})` : `Number #${id}` });
          }}
          onTestCall={handleTestCall}
        />
      )}

      {activeTab === 'trunks' && (
        <SipTrunksGrid
          trunks={trunks}
          isLoading={isLoadingTrunks}
          testingTrunkId={testingTrunkId}
          onTestPing={async (trunkId) => {
            setTestingTrunkId(trunkId);
            try {
              await telephonyApi.testTrunk(trunkId);
              queryClient.invalidateQueries({ queryKey: ['sipTrunks'] });
              queryClient.invalidateQueries({ queryKey: ['telephonySummary'] });
            } finally {
              setTestingTrunkId(null);
            }
          }}
          onEdit={t => {
            setEditingTrunk(t);
            setIsAddTrunkOpen(true);
          }}
          onDelete={id => {
            const t = trunks.find(item => item.id === id);
            setDeleteTarget({ type: 'trunk', id, name: t ? t.name : `Trunk #${id}` });
          }}
        />
      )}

      {activeTab === 'routing' && (
        <InboundRoutingView
          onEditNumber={num => {
            setEditingNumber(num);
            setIsAddNumberOpen(true);
          }}
        />
      )}

      {/* Modals */}
      <AddSipTrunkModal
        isOpen={isAddTrunkOpen}
        trunkToEdit={editingTrunk}
        onClose={() => {
          setIsAddTrunkOpen(false);
          setEditingTrunk(null);
        }}
        onSubmit={data => trunkMutation.mutate(data)}
        isSubmitting={trunkMutation.isPending}
      />

      <AddPhoneNumberModal
        isOpen={isAddNumberOpen}
        numberToEdit={editingNumber}
        trunks={trunks}
        onClose={() => {
          setIsAddNumberOpen(false);
          setEditingNumber(null);
        }}
        onSubmit={data => numberMutation.mutate(data)}
        isSubmitting={numberMutation.isPending}
      />

      <SipDiagnosticModal
        isOpen={isDiagnosticOpen}
        trunks={trunks}
        initialPhoneNumber={diagnosticPhone}
        onClose={() => setIsDiagnosticOpen(false)}
      />

      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title={deleteTarget?.type === 'trunk' ? 'Delete SIP Trunk' : 'Release Phone Number'}
        itemName={deleteTarget?.name}
        message={`Are you sure you want to remove ${deleteTarget?.name}? Any calls assigned to this route will fail over to your default carrier.`}
        loading={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
};
