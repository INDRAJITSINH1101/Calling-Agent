import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle2, ExternalLink } from 'lucide-react';
import { Button } from '../ui/Button';
import { FormSelect } from '../ui/FormSelect';
import { useSystemConstants } from '../../hooks/useSystemConstants';
import { trainingApi } from '../../services/trainingApi';

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const UploadDocumentModal: React.FC<UploadDocumentModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { knowledgeDocumentTypes = [] } = useSystemConstants();
  const [tab, setTab] = useState<'upload' | 'text'>('upload');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('FAQ');
  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileSelected = (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    // Auto-fill title if empty
    if (!title.trim()) {
      const cleanName = selectedFile.name.replace(/\.[^/.]+$/, '');
      setTitle(cleanName);
    }
  };

  // Directly open selected file in a new browser tab
  const handleOpenPreview = () => {
    if (!file) return;
    const blobUrl = URL.createObjectURL(file);
    window.open(blobUrl, '_blank');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a document title.');
      return;
    }

    if (tab === 'upload' && !file) {
      setError('Please select a file to upload.');
      return;
    }

    if (tab === 'text' && !rawText.trim()) {
      setError('Please paste document content.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (tab === 'upload' && file) {
        const formData = new FormData();
        formData.append('title', title.trim());
        formData.append('category', category);
        formData.append('file', file);
        await trainingApi.uploadDocument(formData);
      } else {
        await trainingApi.ingestTextDocument({
          title: title.trim(),
          category,
          content: rawText.trim()
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to upload knowledge document.');
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
        padding: '20px',
        overflowY: 'auto'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#0d1527',
          border: '1px solid #1e293b',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '560px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 20px rgba(56, 189, 248, 0.1)',
          overflow: 'visible', // Prevents dropdown clipping
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #1e293b',
            borderRadius: '16px 16px 0 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Upload size={18} color="#38bdf8" />
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
              Upload Knowledge Base Document
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Toggle: File Upload vs Raw Text */}
        <div style={{ padding: '12px 24px 0 24px', display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setTab('upload')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              border: tab === 'upload' ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)',
              backgroundColor: tab === 'upload' ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
              color: tab === 'upload' ? '#38bdf8' : '#94a3b8'
            }}
          >
            File Upload (.txt, .md, .csv, .pdf)
          </button>
          <button
            type="button"
            onClick={() => setTab('text')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              border: tab === 'text' ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)',
              backgroundColor: tab === 'text' ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
              color: tab === 'text' ? '#38bdf8' : '#94a3b8'
            }}
          >
            Direct Text Input
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
              placeholder="e.g. Enterprise Pricing Tiers 2026"
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

          {/* Category Dropdown (with zIndex to float cleanly) */}
          <div style={{ position: 'relative', zIndex: 30 }}>
            <FormSelect
              label="CATEGORY"
              value={category}
              options={knowledgeDocumentTypes}
              onSelect={(val) => setCategory(String(val))}
            />
          </div>

          {tab === 'upload' ? (
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                DOCUMENT FILE *
              </label>

              {file ? (
                /* Selected File Card: Clicking opens directly in New Tab */
                <div
                  style={{
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                    borderRadius: '10px',
                    padding: '14px 16px',
                    backgroundColor: 'rgba(15, 23, 42, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                  }}
                >
                  <div
                    onClick={handleOpenPreview}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      flex: 1,
                      minWidth: 0
                    }}
                    title="Click to open file in new tab"
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(56, 189, 248, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <FileText size={18} color="#38bdf8" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#34d399',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <CheckCircle2 size={14} color="#34d399" />
                        <span>{file.name}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                        {(file.size / 1024).toFixed(1)} KB &bull;{' '}
                        <span style={{ color: '#38bdf8', textDecoration: 'underline' }}>
                          Click to open in new tab
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
                    <button
                      type="button"
                      onClick={handleOpenPreview}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(56, 189, 248, 0.15)',
                        border: '1px solid rgba(56, 189, 248, 0.4)',
                        color: '#38bdf8',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                      title="Open in new tab"
                    >
                      <ExternalLink size={13} />
                      <span>Open in New Tab</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '6px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#f87171',
                        cursor: 'pointer'
                      }}
                      title="Remove file"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                /* Dropzone when no file selected */
                <div
                  style={{
                    border: '2px dashed #334155',
                    borderRadius: '10px',
                    padding: '24px 16px',
                    textAlign: 'center',
                    backgroundColor: 'rgba(30, 41, 59, 0.3)',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s ease'
                  }}
                  onClick={() => document.getElementById('kb-file-input')?.click()}
                >
                  <FileText size={24} color="#38bdf8" style={{ margin: '0 auto 6px auto' }} />
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}>
                    Click to browse or drop file here
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                    Supports text files and documents (.txt, .md, .csv, .pdf)
                  </div>
                  <input
                    id="kb-file-input"
                    type="file"
                    accept=".txt,.md,.csv,.pdf"
                    style={{ display: 'none' }}
                    onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
                  />
                </div>
              )}
            </div>
          ) : (
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                KNOWLEDGE CONTENT TEXT *
              </label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste FAQ answers, pricing details, product guidelines, or objections here. The RAG engine will split this into semantic chunks..."
                rows={6}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: '#1e293b',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '12px',
                  lineHeight: '1.5',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={isSubmitting} icon={<Upload size={14} />}>
              {isSubmitting ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
