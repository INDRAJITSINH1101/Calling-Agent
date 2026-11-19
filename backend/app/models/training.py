from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Boolean, Float, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimeStampedModel


class KnowledgeDocument(Base, TimeStampedModel):
    __tablename__ = "knowledge_documents"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    title = Column(String(200), nullable=False)
    category = Column(String(50), default="FAQ", nullable=False, index=True)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size_bytes = Column(Integer, default=0, nullable=False)
    mime_type = Column(String(100), default="text/plain", nullable=False)
    status = Column(String(50), default="READY", nullable=False, index=True)
    total_chunks = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    chunks = relationship("KnowledgeChunk", back_populates="document", cascade="all, delete-orphan")


class KnowledgeChunk(Base, TimeStampedModel):
    __tablename__ = "knowledge_chunks"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    document_id = Column(Integer, ForeignKey("knowledge_documents.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index = Column(Integer, default=0, nullable=False)
    content = Column(Text, nullable=False)
    token_count = Column(Integer, default=0, nullable=False)

    document = relationship("KnowledgeDocument", back_populates="chunks")


class AgentPersonaConfig(Base, TimeStampedModel):
    __tablename__ = "agent_persona_configs"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    name = Column(String(100), nullable=False)
    persona_code = Column(String(50), unique=True, nullable=False, index=True)
    system_prompt = Column(Text, nullable=False)
    greeting_message = Column(String(500), nullable=False)
    tone = Column(String(50), default="PROFESSIONAL", nullable=False)
    temperature = Column(Float, default=0.3, nullable=False)
    objection_scripts = Column(JSON, default=dict, nullable=False)
    bound_document_ids = Column(JSON, default=list, nullable=False)
    is_default = Column(Boolean, default=False, nullable=False)


class AgentGuardrail(Base, TimeStampedModel):
    __tablename__ = "agent_guardrails"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    name = Column(String(150), nullable=False)
    trigger_keywords = Column(JSON, default=list, nullable=False)
    action = Column(String(50), default="WARN_AND_DEFLECT", nullable=False)
    deflection_phrase = Column(String(500), nullable=False)
    is_enabled = Column(Boolean, default=True, nullable=False)

