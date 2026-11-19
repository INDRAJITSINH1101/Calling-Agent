import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Upload,
  Download,
  Plus,
  RefreshCw
} from 'lucide-react';
import { contactsApi } from '../services/contactsApi';
import { Contact } from '../types/crm';
import { Button, SearchInput, Select } from '../components/ui';
import { ContactsTable } from '../components/contacts/ContactsTable';
import { BulkImportModal } from '../components/crm/BulkImportModal';
import { AddContactModal } from '../components/crm/AddContactModal';
import { Pagination } from '../components/common/Pagination';
import { useSystemConstants } from '../hooks/useSystemConstants';

export const ContactsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { consentStatuses } = useSystemConstants();
  const consentFilterOptions = [
    { value: '', label: 'All Consent Statuses' },
    ...consentStatuses
  ];
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [search, setSearch] = useState<string>('');
  const [consentFilter, setConsentFilter] = useState<string>('');

  // Modals state
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState<boolean>(false);
  const [contactToEdit, setContactToEdit] = useState<Contact | null>(null);

  // Use React Query with 3-minute cache: Real backend data only
  const { data, isLoading: loading } = useQuery({
    queryKey: ['contacts', { page, pageSize, search, consentFilter }],
    queryFn: () => contactsApi.getContacts(page, pageSize, search, consentFilter),
    staleTime: 1000 * 60 * 3
  });

  const contacts: Contact[] = data?.contacts ?? [];
  const total: number = data?.total ?? 0;

  const handleOpenAdd = () => {
    setContactToEdit(null);
    setIsContactModalOpen(true);
  };

  const handleOpenEdit = (contact: Contact) => {
    setContactToEdit(contact);
    setIsContactModalOpen(true);
  };

  const handleDeleteContact = async (contact: Contact) => {
    try {
      await contactsApi.deleteContact(contact.id);
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    } catch (err) {
      console.error('Failed to delete contact:', err);
      alert('Could not delete contact. Please try again.');
    }
  };

  const handleExportCSV = () => {
    window.open(contactsApi.getExportCsvUrl(consentFilter), '_blank');
  };

  const handleTriggerCall = (contact: Contact) => {
    alert(`Initiating simulated AI Voice outreach to ${contact.first_name} at ${contact.phone}...`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Header Row: Title & Badges on Left, Action Buttons on Right */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', margin: 0 }}>
              Contacts Directory
            </h2>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '999px',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.3)'
              }}
            >
              {total} Total
            </span>
          </div>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0 0' }}>
            Manage calling lists, customer profiles & verified contact records
          </p>
        </div>

        {/* Primary & Secondary Action Buttons (Right-aligned) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Button
            variant="outline"
            icon={<RefreshCw size={13} />}
            onClick={() => queryClient.invalidateQueries({ queryKey: ['contacts'] })}
            title="Refresh Directory"
          >
            Refresh
          </Button>

          <Button
            variant="outline"
            icon={<Download size={14} />}
            onClick={handleExportCSV}
            title="Export contacts as CSV"
          >
            Export
          </Button>

          <Button
            variant="sky"
            icon={<Upload size={14} />}
            onClick={() => setIsImportModalOpen(true)}
          >
            Import CSV
          </Button>

          <Button
            variant="primary"
            icon={<Plus size={14} />}
            onClick={handleOpenAdd}
          >
            Add Contact
          </Button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '12px 16px',
          backgroundColor: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <SearchInput
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Search name, phone, email..."
            width="280px"
          />

          <Select
            options={consentFilterOptions}
            value={consentFilter}
            onChange={(e) => {
              setConsentFilter(e.target.value);
              setPage(1);
            }}
            width="200px"
          />
        </div>

        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
          Showing verified CRM contact profiles
        </div>
      </div>

      {/* Directory Table */}
      <ContactsTable
        contacts={contacts}
        loading={loading}
        page={page}
        pageSize={pageSize}
        onCall={handleTriggerCall}
        onEdit={handleOpenEdit}
        onDelete={handleDeleteContact}
        onAddNew={handleOpenAdd}
        onImport={() => setIsImportModalOpen(true)}
      />

      {/* Pagination */}
      {!loading && total > 0 && (
        <Pagination
          currentPage={page}
          pageSize={pageSize}
          totalRecords={total}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      )}

      {/* Modals */}
      <BulkImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['contacts'] })}
      />

      <AddContactModal
        isOpen={isContactModalOpen}
        contactToEdit={contactToEdit}
        onClose={() => setIsContactModalOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['contacts'] })}
      />
    </div>
  );
};
