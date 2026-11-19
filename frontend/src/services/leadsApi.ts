import { Lead, LeadsResponse, PipelineSummary } from '../types/crm';

const API_BASE = 'http://localhost:8000/api/v1/leads';

export type { Lead, LeadsResponse, PipelineSummary };

export const leadsApi = {
  async getLeads(
    page = 1,
    pageSize = 50,
    stage = '',
    bucket = '',
    source = '',
    search = ''
  ): Promise<LeadsResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
      ...(stage && { stage }),
      ...(bucket && { bucket }),
      ...(source && { source }),
      ...(search && { search })
    });
    const res = await fetch(`${API_BASE}?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch leads');
    return res.json();
  },

  async getPipelineSummary(): Promise<PipelineSummary> {
    const res = await fetch(`${API_BASE}/pipeline/summary`);
    if (!res.ok) throw new Error('Failed to fetch pipeline summary');
    return res.json();
  },

  async createLead(data: Partial<Lead>): Promise<Lead> {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to create lead');
    }
    return res.json();
  },

  async getLead(id: number | string): Promise<Lead> {
    const res = await fetch(`${API_BASE}/${id}`);
    if (!res.ok) throw new Error('Failed to fetch lead');
    return res.json();
  },

  async updateLead(id: number | string, data: Partial<Lead>): Promise<Lead> {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update lead');
    return res.json();
  },

  async updateLeadStage(id: number | string, stage: string): Promise<Lead> {
    const res = await fetch(`${API_BASE}/${id}/stage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage })
    });
    if (!res.ok) throw new Error('Failed to update lead stage');
    return res.json();
  },

  async recalculateScore(id: number | string): Promise<Lead> {
    const res = await fetch(`${API_BASE}/${id}/re-score`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to recalculate lead score');
    return res.json();
  },

  async deleteLead(id: number | string): Promise<void> {
    const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete lead');
  }
};
