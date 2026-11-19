import React, { useState } from 'react';
import { X, Upload, CheckCircle2 } from 'lucide-react';
import { contactsApi } from '../../services/contactsApi';
import { Button } from '../ui/Button';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      const uploadRes = await contactsApi.uploadImportFile(file);
      const mapping = {
        first_name: 'First Name',
        last_name: 'Last Name',
        phone: 'Phone',
        email: 'Email'
      };
      await contactsApi.commitImport(uploadRes.temp_file_id, mapping, 'SKIP', ['imported-csv']);
      setSuccessCount(uploadRes.row_count || 1);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Import failed.');
    } finally {
      setIsUploading(false);
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
          maxWidth: '480px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 20px rgba(56, 189, 248, 0.1)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Upload size={18} color="#38bdf8" />
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
              Bulk Import Contacts
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', fontSize: '12px' }}>
              {error}
            </div>
          )}

          {successCount !== null ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#34d399', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={36} color="#10b981" />
              <div style={{ fontWeight: 700 }}>Successfully imported {successCount} contacts!</div>
            </div>
          ) : (
            <>
              <div
                style={{
                  border: '2px dashed #334155',
                  borderRadius: '12px',
                  padding: '30px 20px',
                  textAlign: 'center',
                  backgroundColor: 'rgba(30, 41, 59, 0.3)',
                  cursor: 'pointer'
                }}
                onClick={() => document.getElementById('csv-file-input')?.click()}
              >
                <Upload size={28} color="#38bdf8" style={{ margin: '0 auto 8px auto' }} />
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                  {file ? file.name : 'Select CSV or Excel Contact Sheet'}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                  Supports .csv with First Name, Phone, and Email headers
                </div>
                <input
                  id="csv-file-input"
                  type="file"
                  accept=".csv,.txt"
                  style={{ display: 'none' }}
                  onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <Button variant="secondary" onClick={onClose} disabled={isUploading}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleUpload} loading={isUploading} disabled={!file}>
                  Import File
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

