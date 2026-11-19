import { Contact, ContactsResponse } from '../types/crm';

const API_BASE = 'http://localhost:8000/api/v1/contacts';

export type { Contact, ContactsResponse };

export const contactsApi = {
  async getContacts(page = 1, pageSize = 25, search = '', consent = '', tag = ''): Promise<ContactsResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
      ...(search && { search }),
      ...(consent && { consent }),
      ...(tag && { tag })
    });
    const res = await fetch(`${API_BASE}?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch contacts');
    return res.json();
  },

  async createContact(data: Partial<Contact>): Promise<Contact> {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to create contact');
    }
    return res.json();
  },

  async updateContact(id: number, data: Partial<Contact>): Promise<Contact> {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update contact');
    return res.json();
  },

  async deleteContact(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete contact');
  },

  async uploadImportFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/upload-file`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to parse file');
    }
    return res.json();
  },

  async previewImport(tempFileId: string, mapping: any, duplicateStrategy: string) {
    const res = await fetch(`${API_BASE}/import-preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ temp_file_id: tempFileId, mapping, duplicate_strategy: duplicateStrategy })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Preview generation failed');
    }
    return res.json();
  },

  async commitImport(tempFileId: string, mapping: any, duplicateStrategy: string, defaultTags: string[]) {
    const res = await fetch(`${API_BASE}/import-commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        temp_file_id: tempFileId,
        mapping,
        duplicate_strategy: duplicateStrategy,
        default_tags: defaultTags
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Import commit failed');
    }
    return res.json();
  },

  getExportCsvUrl(consent = '', tag = '') {
    const params = new URLSearchParams({
      ...(consent && { consent }),
      ...(tag && { tag })
    });
    return `${API_BASE}/export/csv?${params.toString()}`;
  }
};
