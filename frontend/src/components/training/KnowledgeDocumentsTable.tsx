import React from 'react';
import { FileText, ToggleLeft, ToggleRight, Trash2, Layers, Eye, Edit2 } from 'lucide-react';
import { KnowledgeDocument } from '../../services/trainingApi';
import {
  TableContainer,
  Table,
  TableHead,
  TableHeaderRow,
  TableHeadCell,
  TableBody,
  TableRow,
  TableCell
} from '../ui/Table';
import { FilterBar } from '../ui/FilterBar';
import { Pagination } from '../common/Pagination';
import { Badge } from '../ui/Badge';
import { ActionButton } from '../ui/ActionButtons';
import { useSystemConstants } from '../../hooks/useSystemConstants';

interface KnowledgeDocumentsTableProps {
  documents: KnowledgeDocument[];
  total: number;
  page: number;
  pageSize: number;
  searchTerm: string;
  categoryFilter: string;
  isLoading: boolean;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newPageSize: number) => void;
  onSearchChange: (newSearch: string) => void;
  onCategoryFilterChange: (newCategory: string) => void;
  onToggleActive: (docId: number) => void;
  onDelete: (docId: number) => void;
  onView: (docId: number) => void;
  onEdit: (docId: number) => void;
}

export const KnowledgeDocumentsTable: React.FC<KnowledgeDocumentsTableProps> = ({
  documents,
  total,
  page,
  pageSize,
  searchTerm,
  categoryFilter,
  isLoading,
  onPageChange,
  onPageSizeChange,
  onSearchChange,
  onCategoryFilterChange,
  onToggleActive,
  onDelete,
  onView,
  onEdit
}) => {
  const { knowledgeDocumentTypes = [] } = useSystemConstants();

  const filterOptions = [
    { value: 'ALL', label: 'All Document Categories' },
    ...knowledgeDocumentTypes
  ];

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <TableContainer>
      {/* Filter and Search Bar */}
      <FilterBar
        searchValue={searchTerm}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search documents by title or file name..."
        filters={[
          {
            key: 'category',
            value: categoryFilter,
            onChange: onCategoryFilterChange,
            options: filterOptions,
            placeholder: 'All Categories'
          }
        ]}
      />

      {/* Main Table */}
      <Table>
        <TableHead>
          <TableHeaderRow>
            <TableHeadCell style={{ width: '60px' }}>ID</TableHeadCell>
            <TableHeadCell>Document Title & File</TableHeadCell>
            <TableHeadCell style={{ width: '130px' }}>Category</TableHeadCell>
            <TableHeadCell style={{ width: '110px' }}>Chunks</TableHeadCell>
            <TableHeadCell style={{ width: '100px' }}>File Size</TableHeadCell>
            <TableHeadCell style={{ width: '110px' }}>Status</TableHeadCell>
            <TableHeadCell style={{ width: '120px' }} align="right">Actions</TableHeadCell>
          </TableHeaderRow>
        </TableHead>

        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                Loading knowledge documents...
              </TableCell>
            </TableRow>
          ) : documents.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
                <FileText size={32} color="#334155" style={{ margin: '0 auto 10px auto', display: 'block' }} />
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8' }}>No knowledge documents found</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  Upload a FAQ, pricing sheet, or company documentation to train your AI callers.
                </div>
              </TableCell>
            </TableRow>
          ) : (
            documents.map((doc, idx) => {
              // Dynamic sequential numbering without '#'
              const seqNumber = (page - 1) * pageSize + idx + 1;

              return (
                <TableRow key={doc.id}>
                  {/* Dynamic Sequential ID */}
                  <TableCell style={{ color: '#64748b', fontWeight: 600, fontSize: '12px' }}>
                    {seqNumber}
                  </TableCell>

                  {/* Title & Filename */}
                  <TableCell>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          backgroundColor: 'rgba(56, 189, 248, 0.1)',
                          border: '1px solid rgba(56, 189, 248, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        <FileText size={16} color="#38bdf8" />
                      </div>
                      <div
                        style={{ minWidth: 0, cursor: 'pointer' }}
                        onClick={() => onView(doc.id)}
                        title="Click to view full document & chunks"
                      >
                        <div
                          style={{
                            fontWeight: 700,
                            color: '#f8fafc',
                            fontSize: '13px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            transition: 'color 0.15s ease'
                          }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#38bdf8')}
                          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#f8fafc')}
                        >
                          {doc.title}
                        </div>
                        <div
                          style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#94a3b8')}
                          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#64748b')}
                        >
                          {doc.file_name} &bull; {new Date(doc.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Category */}
                  <TableCell>
                    <Badge variant="info">
                      {doc.category}
                    </Badge>
                  </TableCell>

                  {/* Total Chunks */}
                  <TableCell>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>
                      <Layers size={13} color="#10b981" />
                      <span>{doc.total_chunks} chunks</span>
                    </div>
                  </TableCell>

                  {/* File Size */}
                  <TableCell style={{ fontSize: '12px', color: '#94a3b8' }}>
                    {formatFileSize(doc.file_size_bytes)}
                  </TableCell>

                  {/* Status & Active Pill */}
                  <TableCell>
                    <Badge variant={doc.is_active ? 'success' : 'neutral'}>
                      {doc.is_active ? 'INDEXED' : 'DISABLED'}
                    </Badge>
                  </TableCell>

                  {/* Actions */}
                  <TableCell align="right">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                      <ActionButton
                        title="View Document & Chunks"
                        icon={<Eye size={15} color="#38bdf8" />}
                        onClick={() => onView(doc.id)}
                      />
                      <ActionButton
                        title="Edit Document Content"
                        icon={<Edit2 size={15} color="#fbbf24" />}
                        onClick={() => onEdit(doc.id)}
                      />
                      <ActionButton
                        title={doc.is_active ? 'Deactivate from RAG' : 'Activate for RAG'}
                        icon={doc.is_active ? <ToggleRight size={17} color="#34d399" /> : <ToggleLeft size={17} color="#64748b" />}
                        onClick={() => onToggleActive(doc.id)}
                      />
                      <ActionButton
                        title="Delete Document & Chunks"
                        icon={<Trash2 size={15} color="#f87171" />}
                        onClick={() => onDelete(doc.id)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      <Pagination
        currentPage={page}
        pageSize={pageSize}
        totalRecords={total}
        pageSizeOptions={[5, 10, 20, 50]}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        itemName="documents"
      />
    </TableContainer>
  );
};
