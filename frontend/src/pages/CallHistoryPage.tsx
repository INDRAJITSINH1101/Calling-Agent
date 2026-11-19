import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PhoneCall,
  Clock,
  RefreshCw,
  Sparkles,
  PhoneIncoming,
  PhoneOutgoing
} from 'lucide-react';
import { callsApi } from '../services/callsApi';
import { CallLog } from '../types/calls';
import { Badge } from '../components/ui/Badge';
import { FilterBar } from '../components/ui/FilterBar';
import {
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableHeaderRow,
  TableRow,
  TableHeadCell,
  TableCell
} from '../components/ui/Table';
import { Pagination } from '../components/common/Pagination';
import { CallDetailModal } from '../components/calling/CallDetailModal';

export const CallHistoryPage: React.FC = () => {
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sentimentFilter, setSentimentFilter] = useState<string>('');

  // Active call detail modal state (opens on row click)
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);

  // Fetch paginated call history
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['callHistory', page, pageSize, searchTerm, sentimentFilter],
    queryFn: () => callsApi.getCallHistory({
      page,
      pageSize,
      search: searchTerm.trim() || undefined,
      sentiment: sentimentFilter || undefined
    }),
    staleTime: 1000 * 30
  });

  // Fetch transcript for selected call
  const { data: transcripts = [], isLoading: isLoadingTranscripts } = useQuery({
    queryKey: ['callTranscript', selectedCall?.id],
    queryFn: () => callsApi.getCallTranscript(selectedCall!.id),
    enabled: !!selectedCall?.id
  });

  const callItems = data?.items || [];
  const totalCalls = data?.total || 0;

  // Aggregate stats from current view
  const positiveCount = callItems.filter(c => c.sentiment === 'POSITIVE').length;
  const positiveRatio = callItems.length > 0 ? Math.round((positiveCount / callItems.length) * 100) : 0;
  const totalDuration = callItems.reduce((acc, c) => acc + (c.duration_seconds || 0), 0);
  const avgDuration = callItems.length > 0 ? Math.round(totalDuration / callItems.length) : 0;

  const formatSecs = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: 'calc(100vh - 120px)' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.5px' }}>
            Call History & Logs
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
            Audit all outreach calls, durations, sales dispositions, and AI sentiment analysis. Click any row to view full details.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            background: 'rgba(30, 41, 59, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            color: '#f8fafc',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Analytics KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px'
      }}>
        <div style={{
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', fontSize: '12px' }}>
            <span>Total Calls Logged</span>
            <PhoneCall size={16} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc', marginTop: '8px' }}>
            {totalCalls}
          </div>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Across all outreach campaigns</span>
        </div>

        <div style={{
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', fontSize: '12px' }}>
            <span>Avg Call Duration</span>
            <Clock size={16} color="#10b981" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc', marginTop: '8px' }}>
            {formatSecs(avgDuration)}
          </div>
          <span style={{ fontSize: '11px', color: '#10b981' }}>Optimal engagement length</span>
        </div>

        <div style={{
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', fontSize: '12px' }}>
            <span>Positive Ratio</span>
            <Sparkles size={16} color="#eab308" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc', marginTop: '8px' }}>
            {positiveRatio}%
          </div>
          <span style={{ fontSize: '11px', color: '#38bdf8' }}>{positiveCount} calls rated Positive</span>
        </div>
      </div>

      {/* Reusable FilterBar Component */}
      <FilterBar
        searchValue={searchTerm}
        onSearchChange={(val) => {
          setSearchTerm(val);
          setPage(1);
        }}
        searchPlaceholder="Search calls by contact, phone, or summary..."
        filters={[
          {
            key: 'sentiment',
            value: sentimentFilter,
            onChange: (val) => {
              setSentimentFilter(val);
              setPage(1);
            },
            options: [
              { value: '', label: 'All Sentiments' },
              { value: 'POSITIVE', label: 'Positive' },
              { value: 'NEUTRAL', label: 'Neutral' },
              { value: 'NEGATIVE', label: 'Negative' }
            ]
          }
        ]}
      />

      {/* Reusable TableContainer & Table Component */}
      <TableContainer>
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
            Loading call logs from PostgreSQL...
          </div>
        ) : callItems.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px', fontStyle: 'italic' }}>
            No call records found matching your filters.
          </div>
        ) : (
          <Table>
            <TableHead>
              <TableHeaderRow>
                <TableHeadCell>ID</TableHeadCell>
                <TableHeadCell>Name</TableHeadCell>
                <TableHeadCell>Contact</TableHeadCell>
                <TableHeadCell>Direction</TableHeadCell>
                <TableHeadCell>Duration</TableHeadCell>
                <TableHeadCell>Sentiment</TableHeadCell>
                <TableHeadCell>Date</TableHeadCell>
              </TableHeaderRow>
            </TableHead>

            <TableBody>
              {callItems.map((call, index) => (
                <TableRow
                  key={call.id}
                  hoverable
                  onClick={() => setSelectedCall(call)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Dynamic Sequential ID */}
                  <TableCell style={{ color: '#94a3b8', fontWeight: 600 }}>
                    {(page - 1) * pageSize + index + 1}
                  </TableCell>

                  {/* Name */}
                  <TableCell style={{ color: '#f8fafc', fontWeight: 600 }}>
                    {call.contact_name || 'Prospect'}
                  </TableCell>

                  {/* Contact (Phone & Company) */}
                  <TableCell>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ color: '#cbd5e1', fontSize: '12px' }}>
                        {call.contact_phone || 'Direct Call'}
                      </span>
                      {call.company_name && (
                        <span style={{ color: '#64748b', fontSize: '11px' }}>
                          {call.company_name}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Direction */}
                  <TableCell>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px', color: '#cbd5e1', fontSize: '12px' }}>
                      {call.direction === 'INBOUND' ? (
                        <PhoneIncoming size={13} color="#34d399" />
                      ) : (
                        <PhoneOutgoing size={13} color="#38bdf8" />
                      )}
                      <span>{call.direction}</span>
                    </div>
                  </TableCell>

                  {/* Duration */}
                  <TableCell style={{ color: '#f8fafc', fontWeight: 600 }}>
                    {formatSecs(call.duration_seconds)}
                  </TableCell>

                  {/* Sentiment */}
                  <TableCell>
                    <Badge variant={call.sentiment === 'POSITIVE' ? 'success' : call.sentiment === 'NEGATIVE' ? 'danger' : 'info'}>
                      {call.sentiment}
                    </Badge>
                  </TableCell>

                  {/* Date */}
                  <TableCell style={{ color: '#94a3b8', fontSize: '12px' }}>
                    {new Date(call.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Reusable Pagination Component */}
        <Pagination
          currentPage={page}
          pageSize={pageSize}
          totalRecords={totalCalls}
          pageSizeOptions={[10, 15, 25, 50]}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          itemName="calls"
        />
      </TableContainer>

      {/* Detail Modal with Transcripts (Triggered by clicking row) */}
      {selectedCall && (
        <CallDetailModal
          call={selectedCall}
          onClose={() => setSelectedCall(null)}
          transcripts={transcripts}
          isLoadingTranscripts={isLoadingTranscripts}
        />
      )}
    </div>
  );
};
