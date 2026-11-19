const API_BASE = 'http://localhost:8000/api/v1/training';

export interface KnowledgeChunk {
  id: number;
  document_id: number;
  chunk_index: number;
  content: string;
  token_count: number;
  created_at: string;
}

export interface KnowledgeDocument {
  id: number;
  title: string;
  category: string;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  status: string;
  total_chunks: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeDocumentDetail extends KnowledgeDocument {
  content?: string;
  chunks: KnowledgeChunk[];
}

export interface KnowledgeDocumentList {
  total: number;
  page: number;
  page_size: number;
  items: KnowledgeDocument[];
}

export interface AgentPersonaConfig {
  id: number;
  name: string;
  persona_code: string;
  system_prompt: string;
  greeting_message: string;
  tone: string;
  temperature: number;
  objection_scripts: Record<string, string>;
  bound_document_ids: number[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentGuardrail {
  id: number;
  name: string;
  trigger_keywords: string[];
  action: string;
  deflection_phrase: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrainingSummary {
  total_documents: number;
  active_documents: number;
  total_chunks: number;
  total_personas: number;
  total_guardrails: number;
  active_guardrails: number;
}

export interface CitedChunk {
  document_id: number;
  document_title: string;
  content: string;
  similarity_score: number;
}

export interface TestQueryResult {
  query: string;
  persona_name: string;
  response: string;
  guardrail_triggered?: string | null;
  cited_chunks: CitedChunk[];
  latency_ms: number;
}

export const trainingApi = {
  async getSummary(): Promise<TrainingSummary> {
    const res = await fetch(`${API_BASE}/summary`);
    if (!res.ok) throw new Error('Failed to fetch training summary');
    return res.json();
  },

  async getDocuments(params?: {
    category?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<KnowledgeDocumentList> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.pageSize) query.append('page_size', String(params.pageSize));
    if (params?.category && params.category !== 'ALL') query.append('category', params.category);
    if (params?.search) query.append('search', params.search);

    const res = await fetch(`${API_BASE}/documents?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch knowledge documents');
    return res.json();
  },

  async ingestTextDocument(payload: {
    title: string;
    category: string;
    content: string;
    file_name?: string;
  }): Promise<KnowledgeDocument> {
    const res = await fetch(`${API_BASE}/documents/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to ingest text document');
    }
    return res.json();
  },

  async uploadDocument(formData: FormData): Promise<KnowledgeDocument> {
    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to upload knowledge document');
    }
    return res.json();
  },

  async getDocumentDetail(id: number): Promise<KnowledgeDocumentDetail> {
    const res = await fetch(`${API_BASE}/documents/${id}`);
    if (!res.ok) throw new Error('Failed to fetch document details');
    return res.json();
  },

  async updateDocument(id: number, data: { title?: string; category?: string; content?: string }): Promise<KnowledgeDocumentDetail> {
    const res = await fetch(`${API_BASE}/documents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update document');
    }
    return res.json();
  },

  async toggleDocument(id: number): Promise<KnowledgeDocument> {
    const res = await fetch(`${API_BASE}/documents/${id}/toggle`, {
      method: 'PUT'
    });
    if (!res.ok) throw new Error('Failed to toggle document status');
    return res.json();
  },

  async deleteDocument(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/documents/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete knowledge document');
  },

  async getPersonas(): Promise<AgentPersonaConfig[]> {
    const res = await fetch(`${API_BASE}/personas`);
    if (!res.ok) throw new Error('Failed to fetch agent personas');
    return res.json();
  },

  async createPersona(data: Partial<AgentPersonaConfig>): Promise<AgentPersonaConfig> {
    const res = await fetch(`${API_BASE}/personas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to create agent persona');
    }
    return res.json();
  },

  async updatePersona(id: number, data: Partial<AgentPersonaConfig>): Promise<AgentPersonaConfig> {
    const res = await fetch(`${API_BASE}/personas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update agent persona');
    return res.json();
  },

  async deletePersona(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/personas/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete agent persona');
  },

  async getGuardrails(): Promise<AgentGuardrail[]> {
    const res = await fetch(`${API_BASE}/guardrails`);
    if (!res.ok) throw new Error('Failed to fetch guardrails');
    return res.json();
  },

  async createGuardrail(data: {
    name: string;
    trigger_keywords: string[];
    action: string;
    deflection_phrase: string;
    is_enabled?: boolean;
  }): Promise<AgentGuardrail> {
    const res = await fetch(`${API_BASE}/guardrails`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to create guardrail');
    }
    return res.json();
  },

  async updateGuardrail(id: number, data: Partial<AgentGuardrail>): Promise<AgentGuardrail> {
    const res = await fetch(`${API_BASE}/guardrails/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update guardrail');
    return res.json();
  },

  async deleteGuardrail(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/guardrails/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete guardrail');
  },

  async testQuery(payload: { query: string; persona_id?: number }): Promise<TestQueryResult> {
    const res = await fetch(`${API_BASE}/test-query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to execute test sandbox query');
    }
    return res.json();
  }
};

