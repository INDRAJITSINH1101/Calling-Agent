from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class KnowledgeChunkOut(BaseModel):
    id: int
    document_id: int
    chunk_index: int
    content: str
    token_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class KnowledgeDocumentOut(BaseModel):
    id: int
    title: str
    category: str
    file_name: str
    file_size_bytes: int
    mime_type: str
    status: str
    total_chunks: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class KnowledgeDocumentDetailOut(BaseModel):
    id: int
    title: str
    category: str
    file_name: str
    file_size_bytes: int
    mime_type: str
    status: str
    total_chunks: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    content: Optional[str] = None
    chunks: List[KnowledgeChunkOut] = Field(default_factory=list)

    class Config:
        from_attributes = True


class KnowledgeDocumentUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    content: Optional[str] = None


class KnowledgeDocumentListOut(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[KnowledgeDocumentOut]


class AgentPersonaConfigCreate(BaseModel):
    name: str
    persona_code: Optional[str] = None
    system_prompt: str
    greeting_message: str
    tone: str = "PROFESSIONAL"
    temperature: float = 0.3
    objection_scripts: Dict[str, str] = Field(default_factory=dict)
    bound_document_ids: List[int] = Field(default_factory=list)
    is_default: bool = False


class AgentPersonaConfigOut(BaseModel):
    id: int
    name: str
    persona_code: str
    system_prompt: str
    greeting_message: str
    tone: str
    temperature: float
    objection_scripts: Dict[str, str] = Field(default_factory=dict)
    bound_document_ids: List[int] = Field(default_factory=list)
    is_default: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AgentPersonaConfigUpdate(BaseModel):
    name: Optional[str] = None
    system_prompt: Optional[str] = None
    greeting_message: Optional[str] = None
    tone: Optional[str] = None
    temperature: Optional[float] = None
    objection_scripts: Optional[Dict[str, str]] = None
    bound_document_ids: Optional[List[int]] = None
    is_default: Optional[bool] = None


class AgentGuardrailOut(BaseModel):
    id: int
    name: str
    trigger_keywords: List[str]
    action: str
    deflection_phrase: str
    is_enabled: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AgentGuardrailCreate(BaseModel):
    name: str
    trigger_keywords: List[str]
    action: str = "WARN_AND_DEFLECT"
    deflection_phrase: str
    is_enabled: bool = True


class AgentGuardrailUpdate(BaseModel):
    name: Optional[str] = None
    trigger_keywords: Optional[List[str]] = None
    action: Optional[str] = None
    deflection_phrase: Optional[str] = None
    is_enabled: Optional[bool] = None


class TrainingSummaryOut(BaseModel):
    total_documents: int
    active_documents: int
    total_chunks: int
    total_personas: int
    total_guardrails: int
    active_guardrails: int


class TestQueryRequest(BaseModel):
    query: str
    persona_id: Optional[int] = None


class CitedChunk(BaseModel):
    document_id: int
    document_title: str
    content: str
    similarity_score: float


class TestQueryResultOut(BaseModel):
    query: str
    persona_name: str
    response: str
    guardrail_triggered: Optional[str] = None
    cited_chunks: List[CitedChunk] = Field(default_factory=list)
    latency_ms: int

