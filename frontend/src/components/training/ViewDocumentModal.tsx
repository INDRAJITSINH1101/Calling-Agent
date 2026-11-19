import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, FileText, Layers, Copy, Check } from 'lucide-react';
import { trainingApi } from '../../services/trainingApi';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface ViewDocumentModalProps {
  docId: number | null;
  onClose: () => void;
  onEdit: (docId: number) => void;
}

export const ViewDocumentModal: React.FC<ViewDocumentModalProps> = ({
  docId,
  onClose,
  onEdit
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'chunks'>('content');
  const [copied, setCopied] = useState(false);

  const { data: document, isLoading } = useQuery({
    queryKey: ['documentDetail', docId],
    queryFn: () => (docId ? trainingApi.getDocumentDetail(docId) : null),
    enabled: Boolean(docId)
  });

  if (!docId) return null;

  const handleCopyContent = () => {
    if (document?.content) {
      navigator.clipboard.writeText(document.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#0d1527',
          border: '1px solid #1e293b',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '740px',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.85), 0 0 20px rgba(56, 189, 248, 0.1)',
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
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <FileText size={18} color="#38bdf8" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
                {document?.title || 'Loading Document Details...'}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>{document?.file_name}</span>
                {document && (
                  <Badge variant={document.is_active ? 'success' : 'neutral'} size="xs">
                    {document.is_active ? 'ACTIVE' : 'DISABLED'}
                  </Badge>
                )}
                {document && (
                  <Badge variant="info" size="xs">
                    {document.category}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Tab switch: Full Document Content vs Chunks Breakdown */}
        <div style={{ padding: '12px 24px 0 24px', display: 'flex', gap: '10px', borderBottom: '1px solid #1e293b' }}>
          <button
            type="button"
            onClick={() => setActiveTab('content')}
            style={{
              padding: '8px 14px',
              borderBottom: activeTab === 'content' ? '2px solid #38bdf8' : '2px solid transparent',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              color: activeTab === 'content' ? '#38bdf8' : '#94a3b8',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Raw Ingested Content
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('chunks')}
            style={{
              padding: '8px 14px',
              borderBottom: activeTab === 'chunks' ? '2px solid #38bdf8' : '2px solid transparent',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              color: activeTab === 'chunks' ? '#38bdf8' : '#94a3b8',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            RAG Semantic Chunks ({document?.chunks?.length || 0})
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '50px 0', color: '#64748b' }}>
              Loading document content...
            </div>
          ) : !document ? (
            <div style={{ textAlign: 'center', padding: '50px 0', color: '#ef4444' }}>
              Failed to load document details.
            </div>
          ) : activeTab === 'content' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Total {document.total_chunks} chunks &bull; {(document.file_size_bytes / 1024).toFixed(1)} KB
                </span>
                <button
                  type="button"
                  onClick={handleCopyContent}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: copied ? '#34d399' : '#94a3b8',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copied ? 'Copied' : 'Copy Text'}</span>
                </button>
              </div>
              <div
                style={{
                  backgroundColor: '#111827',
                  border: '1px solid #1f2937',
                  borderRadius: '10px',
                  padding: '16px',
                  color: '#cbd5e1',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'system-ui, -apple-system, sans-serif'
                }}
              >
                {document.content || 'No text content available.'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {document.chunks.map((chunk) => (
                <div
                  key={chunk.id}
                  style={{
                    backgroundColor: '#111827',
                    border: '1px solid #1f2937',
                    borderRadius: '10px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Layers size={13} color="#10b981" />
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>
                        Chunk #{chunk.chunk_index + 1}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      {chunk.token_count} words / tokens
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#cbd5e1', lineHeight: '1.5' }}>
                    {chunk.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#090d16'
          }}
        >
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onClose();
              onEdit(docId);
            }}
          >
            Edit Document
          </Button>
        </div>
      </div>
    </div>
  );
};
