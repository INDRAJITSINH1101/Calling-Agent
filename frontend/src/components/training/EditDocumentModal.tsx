import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Edit3, Save, Layers } from 'lucide-react';
import { trainingApi } from '../../services/trainingApi';
import { Button } from '../ui/Button';
import { FormSelect } from '../ui/FormSelect';
import { useSystemConstants } from '../../hooks/useSystemConstants';

interface EditDocumentModalProps {
  docId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditDocumentModal: React.FC<EditDocumentModalProps> = ({
  docId,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { knowledgeDocumentTypes = [] } = useSystemConstants();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('FAQ');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: document, isLoading } = useQuery({
    queryKey: ['documentDetail', docId],
    queryFn: () => (docId ? trainingApi.getDocumentDetail(docId) : null),
    enabled: Boolean(docId && isOpen)
  });

  useEffect(() => {
    if (document) {
      setTitle(document.title || '');
      setCategory(document.category || 'FAQ');
      setContent(document.content || '');
    }
    setError(null);
  }, [document]);

  if (!isOpen || !docId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Title and document content cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await trainingApi.updateDocument(docId, {
        title: title.trim(),
        category,
        content: content.trim()
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update document.');
    } finally {
      setIsSubmitting(false);
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
          maxWidth: '640px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.85), 0 0 20px rgba(56, 189, 248, 0.1)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Edit3 size={18} color="#38bdf8" />
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
              Edit Knowledge Document & Chunks
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        {isLoading ? (
          <div style={{ padding: '50px', textAlign: 'center', color: '#64748b' }}>
            Loading document for editing...
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
            {error && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', fontSize: '12px' }}>
                {error}
              </div>
            )}

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>DOCUMENT TITLE *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 12px',
                  marginTop: '4px',
                  backgroundColor: '#1e293b',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>

            <div>
              <FormSelect
                label="CATEGORY"
                value={category}
                options={knowledgeDocumentTypes}
                onSelect={(val) => setCategory(String(val))}
              />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>
                  RAW TEXT CONTENT & SEMANTIC CHUNKS *
                </label>
                <span style={{ fontSize: '11px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Layers size={12} />
                  <span>Auto re-indexes on save</span>
                </span>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={9}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#1e293b',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '12px',
                  lineHeight: '1.5',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={isSubmitting} icon={<Save size={14} />}>
                Save & Re-Index
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

