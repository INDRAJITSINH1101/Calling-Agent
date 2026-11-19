import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Sparkles, BookOpen, Bot, ShieldCheck } from 'lucide-react';
import { trainingApi, AgentGuardrail } from '../services/trainingApi';
import { Button } from '../components/ui/Button';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';
import {
  TrainingStatsCards,
  KnowledgeDocumentsTable,
  UploadDocumentModal,
  ViewDocumentModal,
  EditDocumentModal,
  CreatePersonaModal,
  PersonaConfigCard,
  GuardrailsList,
  TrainingSandboxDrawer
} from '../components/training';

type SubTab = 'documents' | 'personas' | 'guardrails';

export const TrainingStudioPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<SubTab>('documents');

  // Documents state & modals
  const [docPage, setDocPage] = useState(1);
  const [docPageSize, setDocPageSize] = useState(10);
  const [docSearch, setDocSearch] = useState('');
  const [docCategory, setDocCategory] = useState('ALL');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [viewDocId, setViewDocId] = useState<number | null>(null);
  const [editDocId, setEditDocId] = useState<number | null>(null);
  const [deleteDocId, setDeleteDocId] = useState<number | null>(null);

  // Persona creation state
  const [isCreatePersonaOpen, setIsCreatePersonaOpen] = useState(false);

  // Sandbox drawer
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);

  // TanStack Queries
  const { data: summary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['trainingSummary'],
    queryFn: trainingApi.getSummary,
    staleTime: 1000 * 30
  });

  const { data: docsData, isLoading: isLoadingDocs } = useQuery({
    queryKey: ['knowledgeDocs', docPage, docPageSize, docSearch, docCategory],
    queryFn: () => trainingApi.getDocuments({ page: docPage, pageSize: docPageSize, search: docSearch, category: docCategory }),
    staleTime: 1000 * 15
  });

  const { data: personas = [] } = useQuery({
    queryKey: ['agentPersonas'],
    queryFn: trainingApi.getPersonas,
    staleTime: 1000 * 30
  });

  const { data: guardrails = [], isLoading: isLoadingGuardrails } = useQuery({
    queryKey: ['agentGuardrails'],
    queryFn: trainingApi.getGuardrails,
    staleTime: 1000 * 30
  });

  // Mutations
  const toggleDocMutation = useMutation({
    mutationFn: trainingApi.toggleDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledgeDocs'] });
      queryClient.invalidateQueries({ queryKey: ['trainingSummary'] });
    }
  });

  const deleteDocMutation = useMutation({
    mutationFn: trainingApi.deleteDocument,
    onSuccess: () => {
      setDeleteDocId(null);
      queryClient.invalidateQueries({ queryKey: ['knowledgeDocs'] });
      queryClient.invalidateQueries({ queryKey: ['trainingSummary'] });
    }
  });

  const updatePersonaMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => trainingApi.updatePersona(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agentPersonas'] })
  });

  const deletePersonaMutation = useMutation({
    mutationFn: trainingApi.deletePersona,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agentPersonas'] });
      queryClient.invalidateQueries({ queryKey: ['trainingSummary'] });
    }
  });

  const toggleGuardrailMutation = useMutation({
    mutationFn: ({ id, is_enabled }: { id: number; is_enabled: boolean }) => trainingApi.updateGuardrail(id, { is_enabled: !is_enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agentGuardrails'] });
      queryClient.invalidateQueries({ queryKey: ['trainingSummary'] });
    }
  });

  const createGuardrailMutation = useMutation({
    mutationFn: trainingApi.createGuardrail,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agentGuardrails'] });
      queryClient.invalidateQueries({ queryKey: ['trainingSummary'] });
    }
  });

  const updateGuardrailMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<AgentGuardrail> }) =>
      trainingApi.updateGuardrail(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agentGuardrails'] });
      queryClient.invalidateQueries({ queryKey: ['trainingSummary'] });
    }
  });

  const deleteGuardrailMutation = useMutation({
    mutationFn: trainingApi.deleteGuardrail,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agentGuardrails'] });
      queryClient.invalidateQueries({ queryKey: ['trainingSummary'] });
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '30px' }}>
      {/* Top Header & Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.3px' }}>
            AI Agent Training Studio & Ingestion
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
            Ground your calling personas with live company documents, tone tuning, and compliance guardrails.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Button variant="secondary" icon={<Sparkles size={14} color="#38bdf8" />} onClick={() => setIsSandboxOpen(true)}>
            Test AI Caller
          </Button>
          {activeTab === 'documents' && (
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => setIsUploadModalOpen(true)}>
              Upload Document
            </Button>
          )}
          {activeTab === 'personas' && (
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => setIsCreatePersonaOpen(true)}>
              Create Persona
            </Button>
          )}
        </div>
      </div>

      {/* Top Summary Cards */}
      <TrainingStatsCards summary={summary} isLoading={isLoadingSummary} />

      {/* Sub Tabs Selector */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #1e293b', paddingBottom: '10px' }}>
        {[
          { key: 'documents', label: 'Knowledge Base & Documents', icon: <BookOpen size={14} /> },
          { key: 'personas', label: 'Persona & Voice Tuning', icon: <Bot size={14} /> },
          { key: 'guardrails', label: 'Safety & Guardrails', icon: <ShieldCheck size={14} /> }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as SubTab)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              backgroundColor: activeTab === tab.key ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: activeTab === tab.key ? '#38bdf8' : '#94a3b8'
            }}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Views */}
      {activeTab === 'documents' && (
        <KnowledgeDocumentsTable
          documents={docsData?.items || []}
          total={docsData?.total || 0}
          page={docPage}
          pageSize={docPageSize}
          searchTerm={docSearch}
          categoryFilter={docCategory}
          isLoading={isLoadingDocs}
          onPageChange={setDocPage}
          onPageSizeChange={setDocPageSize}
          onSearchChange={setDocSearch}
          onCategoryFilterChange={setDocCategory}
          onToggleActive={(id) => toggleDocMutation.mutate(id)}
          onDelete={(id) => setDeleteDocId(id)}
          onView={(id) => setViewDocId(id)}
          onEdit={(id) => setEditDocId(id)}
        />
      )}

      {activeTab === 'personas' && (
        <PersonaConfigCard
          personas={personas}
          documents={docsData?.items || []}
          onSave={(id, data) => updatePersonaMutation.mutate({ id, data })}
          onCreatePersona={() => setIsCreatePersonaOpen(true)}
          onDeletePersona={(id) => deletePersonaMutation.mutate(id)}
          isSaving={updatePersonaMutation.isPending}
        />
      )}

      {activeTab === 'guardrails' && (
        <GuardrailsList
          guardrails={guardrails}
          isLoading={isLoadingGuardrails}
          onToggleEnabled={(id, is_enabled) => toggleGuardrailMutation.mutate({ id, is_enabled })}
          onDelete={(id) => deleteGuardrailMutation.mutate(id)}
          onCreate={(data) => createGuardrailMutation.mutate(data)}
          onUpdate={(id, data) => updateGuardrailMutation.mutate({ id, data })}
          isCreating={createGuardrailMutation.isPending}
          isUpdating={updateGuardrailMutation.isPending}
        />
      )}

      {/* Modals & Drawers */}
      <UploadDocumentModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['knowledgeDocs'] });
          queryClient.invalidateQueries({ queryKey: ['trainingSummary'] });
        }}
      />

      <ViewDocumentModal
        docId={viewDocId}
        onClose={() => setViewDocId(null)}
        onEdit={(id) => setEditDocId(id)}
      />

      <EditDocumentModal
        docId={editDocId}
        isOpen={Boolean(editDocId)}
        onClose={() => setEditDocId(null)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['knowledgeDocs'] });
          queryClient.invalidateQueries({ queryKey: ['documentDetail', editDocId] });
          queryClient.invalidateQueries({ queryKey: ['trainingSummary'] });
        }}
      />

      <CreatePersonaModal
        isOpen={isCreatePersonaOpen}
        documents={docsData?.items || []}
        onClose={() => setIsCreatePersonaOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['agentPersonas'] });
          queryClient.invalidateQueries({ queryKey: ['trainingSummary'] });
        }}
      />

      <TrainingSandboxDrawer
        isOpen={isSandboxOpen}
        onClose={() => setIsSandboxOpen(false)}
        personas={personas}
      />

      <ConfirmDeleteModal
        isOpen={!!deleteDocId}
        title="Delete Knowledge Document"
        itemName={docsData?.items.find((d) => d.id === deleteDocId)?.title}
        message="Are you sure you want to remove this document? All associated RAG chunks will be permanently purged from the AI vector retrieval cache."
        loading={deleteDocMutation.isPending}
        onClose={() => setDeleteDocId(null)}
        onConfirm={() => deleteDocId && deleteDocMutation.mutate(deleteDocId)}
      />
    </div>
  );
};
