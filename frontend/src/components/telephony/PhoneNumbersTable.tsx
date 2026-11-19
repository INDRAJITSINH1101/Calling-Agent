import React from 'react';
import { Phone, Edit2, PhoneForwarded, Trash2 } from 'lucide-react';
import { PhoneNumber } from '../../services/telephonyApi';
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

interface PhoneNumbersTableProps {
  numbers: PhoneNumber[];
  total: number;
  page: number;
  pageSize: number;
  searchTerm: string;
  typeFilter: string;
  isLoading: boolean;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newPageSize: number) => void;
  onSearchChange: (newSearch: string) => void;
  onTypeFilterChange: (newType: string) => void;
  onEdit: (number: PhoneNumber) => void;
  onDelete: (numberId: number) => void;
  onTestCall: (number: PhoneNumber) => void;
}

export const PhoneNumbersTable: React.FC<PhoneNumbersTableProps> = ({
  numbers,
  total,
  page,
  pageSize,
  searchTerm,
  typeFilter,
  isLoading,
  onPageChange,
  onPageSizeChange,
  onSearchChange,
  onTypeFilterChange,
  onEdit,
  onDelete,
  onTestCall
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Reusable FilterBar */}
      <FilterBar
        searchValue={searchTerm}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search phone numbers, label, or persona..."
        filters={[
          {
            key: 'type',
            value: typeFilter,
            onChange: onTypeFilterChange,
            options: [
              { value: '', label: 'All Number Types' },
              { value: 'BIDIRECTIONAL', label: 'Bidirectional' },
              { value: 'INBOUND', label: 'Inbound Only' },
              { value: 'OUTBOUND', label: 'Outbound Only' }
            ]
          }
        ]}
      />

      {/* Reusable Table Container */}
      <TableContainer>
        {isLoading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
            Loading provisioned virtual numbers...
          </div>
        ) : numbers.length === 0 ? (
          <div style={{
            padding: '50px',
            textAlign: 'center',
            color: '#64748b',
            fontStyle: 'italic',
            fontSize: '13px'
          }}>
            No phone numbers found matching your search.
          </div>
        ) : (
          <Table>
            <TableHead>
              <TableHeaderRow>
                <TableHeadCell>ID</TableHeadCell>
                <TableHeadCell>Phone Number</TableHeadCell>
                <TableHeadCell>Line Label</TableHeadCell>
                <TableHeadCell>SIP Trunk</TableHeadCell>
                <TableHeadCell>Direction Type</TableHeadCell>
                <TableHeadCell>Agent Persona</TableHeadCell>
                <TableHeadCell>Status</TableHeadCell>
                <TableHeadCell>Actions</TableHeadCell>
              </TableHeaderRow>
            </TableHead>
            <TableBody>
              {numbers.map((item, index) => {
                // Dynamic sequential ID without '#'
                const displayId = (page - 1) * pageSize + index + 1;

                return (
                  <TableRow key={item.id} hoverable>
                    {/* Dynamic ID */}
                    <TableCell style={{ color: '#94a3b8', fontWeight: 600 }}>
                      {displayId}
                    </TableCell>

                    {/* Phone Number */}
                    <TableCell>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Phone size={13} color="#38bdf8" />
                        <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '13px', letterSpacing: '0.3px' }}>
                          {item.number}
                        </span>
                        {item.is_default_outbound && (
                          <Badge variant="info" style={{ fontSize: '9px', padding: '1px 5px' }}>
                            Primary CLI
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Label */}
                    <TableCell style={{ color: '#cbd5e1', fontWeight: 500 }}>
                      {item.label}
                    </TableCell>

                    {/* SIP Trunk */}
                    <TableCell style={{ color: '#94a3b8', fontSize: '12px' }}>
                      {item.sip_trunk_name || 'Generic Gateway'}
                    </TableCell>

                    {/* Type */}
                    <TableCell>
                      <Badge variant={item.type === 'BIDIRECTIONAL' ? 'success' : item.type === 'INBOUND' ? 'info' : 'warning'}>
                        {item.type}
                      </Badge>
                    </TableCell>

                    {/* Persona */}
                    <TableCell style={{ color: '#f8fafc', fontSize: '12px', textTransform: 'capitalize' }}>
                      {(item.assigned_agent_persona || item.assigned_persona || '').replace(/_/g, ' ')}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge variant={item.status === 'ACTIVE' ? 'success' : item.status === 'BUSY' ? 'warning' : 'neutral'}>
                        ● {item.status}
                      </Badge>
                    </TableCell>

                    {/* Reusable Action Buttons */}
                    <TableCell>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        {/* Test Dial Button */}
                        <ActionButton
                          onClick={() => onTestCall(item)}
                          title="Simulate SIP test call on this line"
                          style={{
                            background: 'rgba(56, 189, 248, 0.1)',
                            border: '1px solid rgba(56, 189, 248, 0.25)',
                            color: '#38bdf8'
                          }}
                        >
                          <PhoneForwarded size={13} />
                        </ActionButton>

                        {/* Edit Button */}
                        <ActionButton
                          onClick={() => onEdit(item)}
                          title="Edit Line & Routing Rules"
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#cbd5e1'
                          }}
                        >
                          <Edit2 size={13} />
                        </ActionButton>

                        {/* Delete Button */}
                        <ActionButton
                          onClick={() => onDelete(item.id)}
                          title="Release Phone Number"
                          style={{
                            background: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            color: '#ef4444'
                          }}
                        >
                          <Trash2 size={13} />
                        </ActionButton>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Reusable Pagination */}
        <Pagination
          currentPage={page}
          pageSize={pageSize}
          totalRecords={total}
          pageSizeOptions={[5, 10, 20, 50]}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          itemName="phone numbers"
        />
      </TableContainer>
    </div>
  );
};
