import React from 'react';
import {
  Phone,
  Mail,
  Building2,
  ShieldCheck,
  ShieldAlert,
  Users
} from 'lucide-react';
import { Contact } from '../../types/crm';
import {
  Badge,
  Button,
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableHeaderRow,
  TableRow,
  TableHeadCell,
  TableCell,
  TableActionButtons
} from '../ui';

interface ContactsTableProps {
  contacts: Contact[];
  loading: boolean;
  page?: number;
  pageSize?: number;
  onCall: (contact: Contact) => void;
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
  onAddNew: () => void;
  onImport: () => void;
}

export const ContactsTable: React.FC<ContactsTableProps> = ({
  contacts,
  loading,
  page = 1,
  pageSize = 15,
  onCall,
  onEdit,
  onDelete,
  onAddNew,
  onImport
}) => {
  if (loading) {
    return (
      <div
        style={{
          backgroundColor: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          padding: '60px',
          textAlign: 'center',
          color: '#94a3b8',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}
      >
        <div
          style={{
            width: '24px',
            height: '24px',
            border: '2px solid rgba(56, 189, 248, 0.2)',
            borderTopColor: '#38bdf8',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }}
        />
        <span style={{ fontSize: '13px' }}>Loading directory...</span>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div
        style={{
          backgroundColor: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          padding: '60px 20px',
          textAlign: 'center',
          color: '#94a3b8'
        }}
      >
        <Users size={36} style={{ color: '#475569', margin: '0 auto 12px' }} />
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#f8fafc', margin: '0 0 6px 0' }}>
          No contacts found
        </h3>
        <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '360px', margin: '0 auto 18px' }}>
          Start building your calling pipeline by importing a CSV list or creating a contact manually.
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <Button variant="primary" onClick={onImport}>
            Import CSV
          </Button>
          <Button variant="outline" onClick={onAddNew}>
            Add Contact
          </Button>
        </div>
      </div>
    );
  }

  const renderConsentBadge = (status: string) => {
    switch (status) {
      case 'OPTED_IN':
      case 'EXPLICIT_CONSENT':
        return (
          <Badge variant="success" icon={<ShieldCheck size={11} />}>
            Opted-In
          </Badge>
        );
      case 'LEGITIMATE_INTEREST':
        return (
          <Badge variant="info" icon={<ShieldCheck size={11} />}>
            B2B Interest
          </Badge>
        );
      case 'OPT_OUT':
        return (
          <Badge variant="warning" icon={<ShieldAlert size={11} />}>
            Opted Out
          </Badge>
        );
      case 'DND':
        return (
          <Badge variant="danger" icon={<ShieldAlert size={11} />}>
            DND Blocked
          </Badge>
        );
      case 'SUPPRESSED':
        return (
          <Badge variant="neutral" icon={<ShieldAlert size={11} />}>
            Suppressed
          </Badge>
        );
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableHeaderRow>
            <TableHeadCell>ID</TableHeadCell>
            <TableHeadCell>Name</TableHeadCell>
            <TableHeadCell>Direct Phone</TableHeadCell>
            <TableHeadCell>Email Address</TableHeadCell>
            <TableHeadCell>Company & Role</TableHeadCell>
            <TableHeadCell>Consent Status</TableHeadCell>
            <TableHeadCell>Tags</TableHeadCell>
            <TableHeadCell>Actions</TableHeadCell>
          </TableHeaderRow>
        </TableHead>
        <TableBody>
          {contacts.map((contact, index) => (
            <TableRow key={contact.id}>
              {/* Dynamic Sequential ID */}
              <TableCell style={{ color: '#94a3b8', fontWeight: 600 }}>
                {(page - 1) * pageSize + index + 1}
              </TableCell>

              {/* Name */}
              <TableCell>
                <div style={{ fontWeight: 600, color: '#ffffff' }}>
                  {contact.first_name} {contact.last_name}
                </div>
              </TableCell>

              {/* Phone */}
              <TableCell>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Phone size={13} style={{ color: '#38bdf8' }} />
                  <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                    {contact.phone}
                  </span>
                </div>
              </TableCell>

              {/* Email */}
              <TableCell>
                {contact.email ? (
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#cbd5e1' }}>
                    <Mail size={13} style={{ color: '#94a3b8' }} />
                    <span style={{ fontSize: '12px' }}>{contact.email}</span>
                  </div>
                ) : (
                  <span style={{ color: '#475569', fontSize: '12px' }}>—</span>
                )}
              </TableCell>

              {/* Company & Role */}
              <TableCell>
                {contact.company?.name ? (
                  <div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontWeight: 600 }}>
                      <Building2 size={12} style={{ color: '#94a3b8' }} />
                      <span>{contact.company.name}</span>
                    </div>
                    {contact.title && (
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>
                        {contact.title}
                      </div>
                    )}
                  </div>
                ) : contact.title ? (
                  <span style={{ fontSize: '12px', color: '#cbd5e1' }}>{contact.title}</span>
                ) : (
                  <span style={{ color: '#475569', fontSize: '12px' }}>—</span>
                )}
              </TableCell>

              {/* Consent */}
              <TableCell>
                {renderConsentBadge(contact.consent_status || contact.consent_state || 'OPTED_IN')}
              </TableCell>

              {/* Tags */}
              <TableCell>
                <div style={{ display: 'inline-flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px', maxWidth: '180px' }}>
                  {(contact.tags || []).length > 0 ? (
                    contact.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: '10px',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#cbd5e1'
                        }}
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: '#475569', fontSize: '12px' }}>—</span>
                  )}
                </div>
              </TableCell>

              {/* Actions */}
              <TableCell>
                <TableActionButtons
                  itemName={`${contact.first_name} ${contact.last_name}`.trim()}
                  deleteConfirmTitle="Delete Contact"
                  deleteConfirmMessage={`Are you sure you want to permanently delete "${contact.first_name} ${contact.last_name}"?`}
                  deleteConfirmWarning="All customer notes, tags, and automated call campaign assignments for this contact will be removed from the CRM."
                  onCall={() => onCall(contact)}
                  callDisabled={contact.consent_status === 'DND'}
                  onEdit={() => onEdit(contact)}
                  onDelete={() => onDelete(contact)}
                  callTitle="Trigger Voice AI Call"
                  editTitle="Edit Contact"
                  deleteTitle="Delete Contact"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
