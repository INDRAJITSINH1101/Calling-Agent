import os
import re
import time
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.training import KnowledgeDocument, KnowledgeChunk, AgentPersonaConfig, AgentGuardrail
from app.schemas.training_schema import (
    KnowledgeChunkOut,
    KnowledgeDocumentOut,
    KnowledgeDocumentDetailOut,
    KnowledgeDocumentUpdate,
    KnowledgeDocumentListOut,
    AgentPersonaConfigOut,
    AgentPersonaConfigCreate,
    AgentPersonaConfigUpdate,
    AgentGuardrailOut,
    AgentGuardrailCreate,
    AgentGuardrailUpdate,
    TrainingSummaryOut,
    CitedChunk,
    TestQueryResultOut
)

logger = logging.getLogger(__name__)


class TrainingService:
    """
    Service for knowledge base document ingestion, chunking,
    RAG similarity retrieval, persona customization, and safety guardrail checks.
    """

    def seed_default_training(self, db: Session) -> None:
        """Seeds default personas, knowledge documents, and safety guardrails if empty."""
        try:
            persona_count = db.query(AgentPersonaConfig).count()
            if persona_count == 0:
                p1 = AgentPersonaConfig(
                    name="Rachel - Enterprise Sales",
                    persona_code="RACHEL_ENTERPRISE",
                    system_prompt=(
                        "You are Rachel, an elite Enterprise AI SDR for Devdutt AI. "
                        "You speak with confidence, warmth, and precision. "
                        "Your goal is to qualify outbound prospects, understand their call center bottlenecks, "
                        "and guide them toward scheduling an executive demo."
                    ),
                    greeting_message="Hi there! This is Rachel from Devdutt AI. I noticed your team manages high-volume customer outreach—how is your current phone conversion holding up?",
                    tone="PROFESSIONAL",
                    temperature=0.3,
                    objection_scripts={
                        "too_expensive": "I completely understand budget sensitivity. Most of our enterprise clients actually see a 4.2x ROI within 30 days by eliminating dropped leads.",
                        "send_email": "I'd be glad to send a summary! What specific metric would make this most relevant for your leadership team?",
                        "already_have_solution": "That makes sense. Many of our customers also used legacy dialers before switching to our zero-latency SIP engine for real-time CRM updates."
                    },
                    bound_document_ids=[],
                    is_default=True
                )
                p2 = AgentPersonaConfig(
                    name="Sarah - Inbound Customer Concierge",
                    persona_code="SARAH_INBOUND",
                    system_prompt=(
                        "You are Sarah, a welcoming Inbound Concierge. "
                        "You listen attentively, answer platform and pricing inquiries accurately using verified documentation, "
                        "and immediately escalate complex technical questions to human specialists."
                    ),
                    greeting_message="Thank you for calling Devdutt AI! My name is Sarah. How can I assist you with your communication workflow today?",
                    tone="FRIENDLY",
                    temperature=0.2,
                    objection_scripts={
                        "need_human": "I'd be more than happy to route you directly to a human specialist right away. One moment while I bridge the line.",
                        "hours": "Our automated AI inbound lines operate 24/7, while our senior solutions engineering team is available 9 AM to 7 PM EST."
                    },
                    bound_document_ids=[],
                    is_default=False
                )
                p3 = AgentPersonaConfig(
                    name="David - Technical Solutions Specialist",
                    persona_code="DAVID_TECH",
                    system_prompt=(
                        "You are David, a Technical Solutions Architect. "
                        "You provide exact, granular answers regarding SIP trunking, WebRTC codecs, API rate limits, "
                        "and bi-directional CRM webhooks."
                    ),
                    greeting_message="Hello, David speaking from Solutions Architecture. Let's dive into your SIP gateway architecture or telephony requirements.",
                    tone="ANALYTICAL",
                    temperature=0.1,
                    objection_scripts={
                        "latency_concern": "Our global edge network maintains round-trip audio latency under 45 milliseconds using native OPUS compression."
                    },
                    bound_document_ids=[],
                    is_default=False
                )
                p4 = AgentPersonaConfig(
                    name="Marcus - Executive Closing Advisor",
                    persona_code="MARCUS_CLOSER",
                    system_prompt=(
                        "You are Marcus, an assertive, results-oriented Executive Advisor. "
                        "You speak directly to business outcomes, cost-per-minute reduction, and revenue acceleration."
                    ),
                    greeting_message="Good morning. Marcus here. I am calling to discuss cutting your outbound call center operating overhead by 60%. Do you have two minutes?",
                    tone="ASSERTIVE",
                    temperature=0.4,
                    objection_scripts={
                        "no_time": "Understood. If 60 seconds could save your sales division $15,000 this quarter, when is the best time to reconnect tomorrow?"
                    },
                    bound_document_ids=[],
                    is_default=False
                )
                db.add_all([p1, p2, p3, p4])
                db.commit()
                logger.info("Successfully seeded 4 default agent personas.")

            guardrail_count = db.query(AgentGuardrail).count()
            if guardrail_count == 0:
                g1 = AgentGuardrail(
                    name="Competitor Price War Deflection",
                    trigger_keywords=["cheaper than vapi", "bland ai", "retell ai cheaper", "discount competitor"],
                    action="WARN_AND_DEFLECT",
                    deflection_phrase="We focus strictly on high-reliability, native CRM-integrated SIP telephony rather than generic wrappers. I'd love to share an ROI benchmark for your scale.",
                    is_enabled=True
                )
                g2 = AgentGuardrail(
                    name="Financial Return Guarantee Restriction",
                    trigger_keywords=["100% guarantee", "guaranteed profit", "promise revenue", "money back guarantee"],
                    action="WARN_AND_DEFLECT",
                    deflection_phrase="While our enterprise clients routinely see 3x-5x efficiency gains, we cannot guarantee specific revenue numbers without an architecture audit.",
                    is_enabled=True
                )
                g3 = AgentGuardrail(
                    name="Legal & Compliance Deflection",
                    trigger_keywords=["legal advice", "sue", "lawsuit", "medical advice", "hipaa violation"],
                    action="BLOCK_AND_ESCALATE",
                    deflection_phrase="I am an AI assistant and cannot provide legal or regulatory compliance opinions. Let me connect you directly to our compliance officer.",
                    is_enabled=True
                )
                g4 = AgentGuardrail(
                    name="Profanity & Abusive Language Filter",
                    trigger_keywords=["idiot", "fraud", "scam artist", "curse", "stupid bot"],
                    action="BLOCK_AND_TERMINATE",
                    deflection_phrase="We maintain a respectful environment for our community. I am concluding this call now. Have a pleasant day.",
                    is_enabled=True
                )
                db.add_all([g1, g2, g3, g4])
                db.commit()
                logger.info("Successfully seeded 4 default safety guardrails.")

            doc_count = db.query(KnowledgeDocument).count()
            if doc_count == 0:
                default_doc = KnowledgeDocument(
                    title="Devdutt AI Platform Architecture & Pricing FAQ",
                    category="FAQ",
                    file_name="platform_pricing_faq.txt",
                    file_path="/knowledge/platform_pricing_faq.txt",
                    file_size_bytes=3420,
                    mime_type="text/plain",
                    status="READY",
                    total_chunks=3,
                    is_active=True
                )
                db.add(default_doc)
                db.commit()
                db.refresh(default_doc)

                c1 = KnowledgeChunk(
                    document_id=default_doc.id,
                    chunk_index=0,
                    content=(
                        "Devdutt AI provides an all-in-one AI voice calling agent integrated with SIP trunking, "
                        "CRM contact management, live analytics, and WebRTC streaming. Outbound calling costs $0.05 per minute "
                        "with sub-50ms latency across Twilio, LiveKit, and custom SIP carrier gateways."
                    ),
                    token_count=48
                )
                c2 = KnowledgeChunk(
                    document_id=default_doc.id,
                    chunk_index=1,
                    content=(
                        "Security and Compliance: Devdutt AI encrypts all SIP audio streams with SRTP and TLS 1.3. "
                        "Customer call recordings and transcriptions are stored securely with SOC2 Type II compliance standards. "
                        "Call center managers can configure automatic PII masking for sensitive credit card or health details."
                    ),
                    token_count=52
                )
                c3 = KnowledgeChunk(
                    document_id=default_doc.id,
                    chunk_index=2,
                    content=(
                        "Integration and CRM Webhooks: Incoming and outgoing call status changes trigger bi-directional webhooks "
                        "to HubSpot, Salesforce, and custom endpoints. Dispositions like 'Interested', 'Follow Up Needed', "
                        "and 'Do Not Call' are saved immediately to contact records."
                    ),
                    token_count=44
                )
                db.add_all([c1, c2, c3])
                db.commit()
                logger.info("Successfully seeded default knowledge base document and chunks.")

        except Exception as e:
            db.rollback()
            logger.error(f"Error seeding default training data: {e}", exc_info=True)

    def get_summary(self, db: Session) -> TrainingSummaryOut:
        """Retrieves high-level counts for training studio metric cards."""
        self.seed_default_training(db)
        total_docs = db.query(KnowledgeDocument).count()
        active_docs = db.query(KnowledgeDocument).filter(KnowledgeDocument.is_active == True).count()
        total_chunks = db.query(KnowledgeChunk).count()
        total_personas = db.query(AgentPersonaConfig).count()
        total_guardrails = db.query(AgentGuardrail).count()
        active_guardrails = db.query(AgentGuardrail).filter(AgentGuardrail.is_enabled == True).count()

        return TrainingSummaryOut(
            total_documents=total_docs,
            active_documents=active_docs,
            total_chunks=total_chunks,
            total_personas=total_personas,
            total_guardrails=total_guardrails,
            active_guardrails=active_guardrails
        )

    def list_documents(
        self,
        db: Session,
        category: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 10
    ) -> KnowledgeDocumentListOut:
        """Lists knowledge documents with filtering and pagination."""
        self.seed_default_training(db)
        query = db.query(KnowledgeDocument)

        if category and category != "ALL":
            query = query.filter(KnowledgeDocument.category == category)

        if search:
            like_term = f"%{search.strip()}%"
            query = query.filter(
                (KnowledgeDocument.title.ilike(like_term)) |
                (KnowledgeDocument.file_name.ilike(like_term))
            )

        total = query.count()
        items = query.order_by(desc(KnowledgeDocument.created_at)).offset((page - 1) * page_size).limit(page_size).all()

        return KnowledgeDocumentListOut(
            total=total,
            page=page,
            page_size=page_size,
            items=[KnowledgeDocumentOut.model_validate(doc) for doc in items]
        )

    def chunk_text(self, text: str, max_words: int = 65) -> List[str]:
        """Simple, deterministic semantic chunking by paragraphs and word limit."""
        cleaned = text.strip()
        if not cleaned:
            return []

        # Split by double newline or headers
        paragraphs = [p.strip() for p in re.split(r'\n{2,}|\r\n{2,}', cleaned) if p.strip()]
        chunks = []
        for p in paragraphs:
            words = p.split()
            if len(words) <= max_words:
                chunks.append(p)
            else:
                for i in range(0, len(words), max_words):
                    chunk_slice = " ".join(words[i:i + max_words])
                    chunks.append(chunk_slice)
        return chunks

    def ingest_document(
        self,
        db: Session,
        title: str,
        category: str,
        file_name: str,
        raw_text: str,
        mime_type: str = "text/plain"
    ) -> KnowledgeDocumentOut:
        """Ingests raw text or file content, chunks it, and persists to DB."""
        file_size = len(raw_text.encode('utf-8'))
        doc = KnowledgeDocument(
            title=title.strip(),
            category=category,
            file_name=file_name,
            file_path=f"/knowledge/{file_name}",
            file_size_bytes=file_size,
            mime_type=mime_type,
            status="PROCESSING",
            is_active=True
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

        text_chunks = self.chunk_text(raw_text)
        created_chunks = []
        for idx, chunk_text in enumerate(text_chunks):
            chunk = KnowledgeChunk(
                document_id=doc.id,
                chunk_index=idx,
                content=chunk_text,
                token_count=len(chunk_text.split())
            )
            created_chunks.append(chunk)

        if created_chunks:
            db.add_all(created_chunks)

        doc.total_chunks = len(created_chunks)
        doc.status = "READY"
        db.commit()
        db.refresh(doc)

        return KnowledgeDocumentOut.model_validate(doc)

    def get_document_detail(self, db: Session, doc_id: int) -> KnowledgeDocumentDetailOut:
        """Retrieves full details of a document including its chunks and reconstructed text."""
        doc = db.query(KnowledgeDocument).filter(KnowledgeDocument.id == doc_id).first()
        if not doc:
            raise ValueError(f"Knowledge document #{doc_id} not found.")

        ordered_chunks = sorted(doc.chunks, key=lambda c: c.chunk_index)
        full_content = "\n\n".join([c.content for c in ordered_chunks])

        return KnowledgeDocumentDetailOut(
            id=doc.id,
            title=doc.title,
            category=doc.category,
            file_name=doc.file_name,
            file_size_bytes=doc.file_size_bytes,
            mime_type=doc.mime_type,
            status=doc.status,
            total_chunks=doc.total_chunks,
            is_active=doc.is_active,
            created_at=doc.created_at,
            updated_at=doc.updated_at,
            content=full_content,
            chunks=[KnowledgeChunkOut.model_validate(c) for c in ordered_chunks]
        )

    def update_document(
        self,
        db: Session,
        doc_id: int,
        payload: KnowledgeDocumentUpdate
    ) -> KnowledgeDocumentDetailOut:
        """Updates document title, category, and if content provided, re-chunks and re-indexes."""
        doc = db.query(KnowledgeDocument).filter(KnowledgeDocument.id == doc_id).first()
        if not doc:
            raise ValueError(f"Knowledge document #{doc_id} not found.")

        if payload.title is not None and payload.title.strip():
            doc.title = payload.title.strip()

        if payload.category is not None and payload.category.strip():
            doc.category = payload.category.strip()

        if payload.content is not None and payload.content.strip():
            # Delete existing chunks
            db.query(KnowledgeChunk).filter(KnowledgeChunk.document_id == doc.id).delete()
            db.commit()

            # Re-chunk
            raw_text = payload.content.strip()
            text_chunks = self.chunk_text(raw_text)
            created_chunks = []
            for idx, chunk_text in enumerate(text_chunks):
                chunk = KnowledgeChunk(
                    document_id=doc.id,
                    chunk_index=idx,
                    content=chunk_text,
                    token_count=len(chunk_text.split())
                )
                created_chunks.append(chunk)

            if created_chunks:
                db.add_all(created_chunks)

            doc.total_chunks = len(created_chunks)
            doc.file_size_bytes = len(raw_text.encode('utf-8'))
            doc.status = "READY"

        doc.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(doc)

        return self.get_document_detail(db, doc.id)

    def toggle_document_status(self, db: Session, doc_id: int) -> KnowledgeDocumentOut:
        """Toggles active/inactive state of a knowledge document."""
        doc = db.query(KnowledgeDocument).filter(KnowledgeDocument.id == doc_id).first()
        if not doc:
            raise ValueError(f"Knowledge document #{doc_id} not found.")
        doc.is_active = not doc.is_active
        db.commit()
        db.refresh(doc)
        return KnowledgeDocumentOut.model_validate(doc)

    def delete_document(self, db: Session, doc_id: int) -> bool:
        """Deletes a document and its cascading chunks."""
        doc = db.query(KnowledgeDocument).filter(KnowledgeDocument.id == doc_id).first()
        if not doc:
            return False
        db.delete(doc)
        db.commit()
        return True

    def list_personas(self, db: Session) -> List[AgentPersonaConfigOut]:
        """Lists all agent persona configurations."""
        self.seed_default_training(db)
        personas = db.query(AgentPersonaConfig).order_by(AgentPersonaConfig.id).all()
        return [AgentPersonaConfigOut.model_validate(p) for p in personas]

    def update_persona(self, db: Session, persona_id: int, payload: AgentPersonaConfigUpdate) -> AgentPersonaConfigOut:
        """Updates agent persona prompt, tone, greeting, temperature, or bound documents."""
        persona = db.query(AgentPersonaConfig).filter(AgentPersonaConfig.id == persona_id).first()
        if not persona:
            raise ValueError(f"Persona #{persona_id} not found.")

        update_data = payload.model_dump(exclude_unset=True)
        for key, val in update_data.items():
            setattr(persona, key, val)

        persona.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(persona)
        return AgentPersonaConfigOut.model_validate(persona)

    def create_persona(self, db: Session, payload: AgentPersonaConfigCreate) -> AgentPersonaConfigOut:
        """Creates a new custom agent persona."""
        raw_code = payload.persona_code or re.sub(r'[^a-zA-Z0-9_]', '', payload.name.upper().replace(' ', '_'))
        code = raw_code
        existing = db.query(AgentPersonaConfig).filter(AgentPersonaConfig.persona_code == code).first()
        if existing:
            code = f"{code}_{int(time.time())}"

        persona = AgentPersonaConfig(
            name=payload.name.strip(),
            persona_code=code,
            system_prompt=payload.system_prompt.strip(),
            greeting_message=payload.greeting_message.strip(),
            tone=payload.tone,
            temperature=payload.temperature,
            objection_scripts=payload.objection_scripts or {},
            bound_document_ids=payload.bound_document_ids or [],
            is_default=payload.is_default
        )
        db.add(persona)
        db.commit()
        db.refresh(persona)
        return AgentPersonaConfigOut.model_validate(persona)

    def delete_persona(self, db: Session, persona_id: int) -> bool:
        """Deletes a custom agent persona."""
        persona = db.query(AgentPersonaConfig).filter(AgentPersonaConfig.id == persona_id).first()
        if not persona:
            return False
        if persona.is_default:
            raise ValueError("Default system personas cannot be deleted.")
        db.delete(persona)
        db.commit()
        return True

    def list_guardrails(self, db: Session) -> List[AgentGuardrailOut]:
        """Lists all compliance guardrails."""
        self.seed_default_training(db)
        guardrails = db.query(AgentGuardrail).order_by(AgentGuardrail.id).all()
        return [AgentGuardrailOut.model_validate(g) for g in guardrails]

    def create_guardrail(self, db: Session, payload: AgentGuardrailCreate) -> AgentGuardrailOut:
        """Creates a new safety deflection guardrail."""
        guardrail = AgentGuardrail(
            name=payload.name,
            trigger_keywords=payload.trigger_keywords,
            action=payload.action,
            deflection_phrase=payload.deflection_phrase,
            is_enabled=payload.is_enabled
        )
        db.add(guardrail)
        db.commit()
        db.refresh(guardrail)
        return AgentGuardrailOut.model_validate(guardrail)

    def update_guardrail(self, db: Session, guardrail_id: int, payload: AgentGuardrailUpdate) -> AgentGuardrailOut:
        """Updates an existing guardrail."""
        g = db.query(AgentGuardrail).filter(AgentGuardrail.id == guardrail_id).first()
        if not g:
            raise ValueError(f"Guardrail #{guardrail_id} not found.")

        data = payload.model_dump(exclude_unset=True)
        for k, v in data.items():
            setattr(g, k, v)

        g.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(g)
        return AgentGuardrailOut.model_validate(g)

    def delete_guardrail(self, db: Session, guardrail_id: int) -> bool:
        """Deletes a safety guardrail."""
        g = db.query(AgentGuardrail).filter(AgentGuardrail.id == guardrail_id).first()
        if not g:
            return False
        db.delete(g)
        db.commit()
        return True

    def find_relevant_chunks(
        self,
        db: Session,
        query_text: str,
        bound_doc_ids: Optional[List[int]] = None,
        limit: int = 3
    ) -> List[CitedChunk]:
        """Performs lexical and token similarity search over active knowledge chunks."""
        q_tokens = set(re.findall(r'\b\w{3,}\b', query_text.lower()))
        if not q_tokens:
            return []

        doc_query = db.query(KnowledgeDocument).filter(KnowledgeDocument.is_active == True)
        if bound_doc_ids and len(bound_doc_ids) > 0:
            doc_query = doc_query.filter(KnowledgeDocument.id.in_(bound_doc_ids))
        
        active_docs = {d.id: d.title for d in doc_query.all()}
        if not active_docs:
            return []

        chunks = db.query(KnowledgeChunk).filter(KnowledgeChunk.document_id.in_(list(active_docs.keys()))).all()
        scored_chunks: List[Tuple[KnowledgeChunk, float]] = []

        for ch in chunks:
            ch_tokens = set(re.findall(r'\b\w{3,}\b', ch.content.lower()))
            overlap = q_tokens.intersection(ch_tokens)
            if overlap:
                score = round(len(overlap) / (len(q_tokens) + 1), 2)
                scored_chunks.append((ch, score))

        scored_chunks.sort(key=lambda x: x[1], reverse=True)
        top = scored_chunks[:limit]

        return [
            CitedChunk(
                document_id=item[0].document_id,
                document_title=active_docs.get(item[0].document_id, "Knowledge Base Document"),
                content=item[0].content,
                similarity_score=item[1]
            )
            for item in top
        ]

    def test_query(self, db: Session, query: str, persona_id: Optional[int] = None) -> TestQueryResultOut:
        """
        Executes an interactive test query against guardrails, persona prompt,
        and knowledge chunks with latency simulation and cited sources.
        """
        start_time = time.time()
        self.seed_default_training(db)

        persona = None
        if persona_id:
            persona = db.query(AgentPersonaConfig).filter(AgentPersonaConfig.id == persona_id).first()
        if not persona:
            persona = db.query(AgentPersonaConfig).filter(AgentPersonaConfig.is_default == True).first()
        if not persona:
            persona = db.query(AgentPersonaConfig).first()

        persona_name = persona.name if persona else "Default Agent"
        bound_docs = persona.bound_document_ids if persona else []

        guardrails = db.query(AgentGuardrail).filter(AgentGuardrail.is_enabled == True).all()
        query_lower = query.lower()
        triggered_guardrail = None

        for g in guardrails:
            for kw in g.trigger_keywords:
                if kw.lower() in query_lower:
                    triggered_guardrail = g
                    break
            if triggered_guardrail:
                break

        if triggered_guardrail:
            elapsed_ms = int((time.time() - start_time) * 1000) + 12
            return TestQueryResultOut(
                query=query,
                persona_name=persona_name,
                response=triggered_guardrail.deflection_phrase,
                guardrail_triggered=f"{triggered_guardrail.name} ({triggered_guardrail.action})",
                cited_chunks=[],
                latency_ms=elapsed_ms
            )

        cited = self.find_relevant_chunks(db, query, bound_docs, limit=2)

        if cited:
            cited_summary = " ".join([c.content for c in cited])
            if persona and persona.tone == "ANALYTICAL":
                response = f"According to technical specifications: {cited_summary[:160]}... Latency remains bounded under 50ms with direct carrier handoff."
            elif persona and persona.tone == "ASSERTIVE":
                response = f"Here is the bottom line: {cited_summary[:140]}. It translates directly to higher connection rates and zero dropped leads."
            elif persona and persona.tone == "FRIENDLY":
                response = f"I'd love to help clarify that! {cited_summary[:150]} Would you like me to connect you with our team for more details?"
            else:
                response = f"Based on our platform documentation: {cited_summary[:160]} We can easily configure this for your team."
        else:
            if persona and "price" in query_lower or "cost" in query_lower:
                response = "Our outbound calling rates start at $0.05 per minute with flat-rate SIP trunking options for high-volume enterprise teams."
            elif "demo" in query_lower or "schedule" in query_lower:
                response = "I'd be delighted to schedule a live product walk-through for you! When is the best time this week?"
            else:
                response = f"I understand your question regarding '{query}'. Let me check our verified knowledge base or connect you directly with a specialist."

        elapsed_ms = int((time.time() - start_time) * 1000) + 28
        return TestQueryResultOut(
            query=query,
            persona_name=persona_name,
            response=response,
            guardrail_triggered=None,
            cited_chunks=cited,
            latency_ms=elapsed_ms
        )

    def evaluate_guardrails(self, db: Session, query: str) -> Tuple[bool, Optional[str]]:
        """Evaluates enabled guardrails against caller message. Returns (is_triggered, deflection_phrase)."""
        guardrails = db.query(AgentGuardrail).filter(AgentGuardrail.is_enabled == True).all()
        q_lower = query.lower()
        for g in guardrails:
            for kw in (g.trigger_keywords or []):
                if kw and kw.lower() in q_lower:
                    return True, g.deflection_phrase
        return False, None

    def query_knowledge_base(
        self,
        db: Session,
        query: str,
        document_ids: Optional[List[int]] = None,
        top_k: int = 3
    ) -> List[Dict[str, Any]]:
        """Queries knowledge chunks grounded in the database."""
        chunks = self.find_relevant_chunks(db, query, document_ids or [], limit=top_k)
        results = []
        for c in chunks:
            results.append({
                "content": c.content,
                "source_document": getattr(c, "document_title", "Official Documentation"),
                "similarity_score": getattr(c, "similarity_score", 0.85)
            })
        return results


training_service = TrainingService()

