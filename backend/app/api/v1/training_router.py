import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.training_schema import (
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
    TestQueryRequest,
    TestQueryResultOut
)
from app.services.training_service import training_service

router = APIRouter(prefix="/training", tags=["AI Agent Training Studio & Knowledge Base"])


class DocumentCreateTextPayload(BaseModel):
    title: str
    category: str = "FAQ"
    content: str
    file_name: Optional[str] = None


@router.get("/summary", response_model=TrainingSummaryOut)
def get_training_summary(db: Session = Depends(get_db)):
    """Returns top KPI metrics for documents, chunks, personas, and guardrails."""
    return training_service.get_summary(db)


# -------------------------------------------------------------
# KNOWLEDGE DOCUMENTS ENDPOINTS
# -------------------------------------------------------------

@router.get("/documents", response_model=KnowledgeDocumentListOut)
def list_knowledge_documents(
    category: Optional[str] = Query(None, description="Category filter e.g. FAQ, PRICING, SCRIPT"),
    search: Optional[str] = Query(None, description="Search query for title or filename"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Lists knowledge documents with filtering and pagination."""
    return training_service.list_documents(
        db,
        category=category,
        search=search,
        page=page,
        page_size=page_size
    )


@router.post("/documents/text", response_model=KnowledgeDocumentOut, status_code=status.HTTP_201_CREATED)
def ingest_text_document(
    payload: DocumentCreateTextPayload,
    db: Session = Depends(get_db)
):
    """Ingests a knowledge base document from raw text input."""
    if not payload.title.strip() or not payload.content.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Title and content are required."
        )
    file_name = payload.file_name or f"{payload.title.strip().lower().replace(' ', '_')[:30]}.txt"
    return training_service.ingest_document(
        db=db,
        title=payload.title,
        category=payload.category,
        file_name=file_name,
        raw_text=payload.content,
        mime_type="text/plain"
    )


@router.post("/documents/upload", response_model=KnowledgeDocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_knowledge_document(
    title: str = Form(...),
    category: str = Form("FAQ"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Uploads and ingests a file (.txt, .md, .csv, .pdf) into the knowledge base."""
    contents = await file.read()
    filename_lower = (file.filename or "").lower()
    text_content = ""

    if filename_lower.endswith(".pdf") or "pdf" in (file.content_type or "").lower():
        try:
            import io
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(contents))
            extracted_pages = []
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text and page_text.strip():
                    extracted_pages.append(page_text.strip())
            text_content = "\n\n".join(extracted_pages)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to extract text from PDF document: {str(e)}"
            )
    else:
        try:
            text_content = contents.decode("utf-8", errors="ignore")
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unable to decode file content as text: {e}"
            )

    if not text_content.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file has no readable text content."
        )

    return training_service.ingest_document(
        db=db,
        title=title,
        category=category,
        file_name=file.filename or "uploaded_document.txt",
        raw_text=text_content,
        mime_type=file.content_type or "text/plain"
    )


@router.get("/documents/{doc_id}", response_model=KnowledgeDocumentDetailOut)
def get_knowledge_document(doc_id: int, db: Session = Depends(get_db)):
    """Retrieves full document details, reconstructed raw content, and all chunks."""
    try:
        return training_service.get_document_detail(db, doc_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.put("/documents/{doc_id}", response_model=KnowledgeDocumentDetailOut)
def update_knowledge_document(
    doc_id: int,
    payload: KnowledgeDocumentUpdate,
    db: Session = Depends(get_db)
):
    """Updates document metadata or raw text content with automatic re-chunking."""
    try:
        return training_service.update_document(db, doc_id, payload)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.put("/documents/{doc_id}/toggle", response_model=KnowledgeDocumentOut)
def toggle_document_active(doc_id: int, db: Session = Depends(get_db)):
    """Toggles active/inactive state of a knowledge base document."""
    try:
        return training_service.toggle_document_status(db, doc_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/documents/{doc_id}")
def delete_knowledge_document(doc_id: int, db: Session = Depends(get_db)):
    """Deletes a knowledge base document and its embedded chunks."""
    success = training_service.delete_document(db, doc_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Document #{doc_id} not found.")
    return {"success": True, "message": f"Document #{doc_id} deleted successfully."}


# -------------------------------------------------------------
# AGENT PERSONA CONFIGURATION ENDPOINTS
# -------------------------------------------------------------

@router.get("/personas", response_model=List[AgentPersonaConfigOut])
def list_personas(db: Session = Depends(get_db)):
    """Lists all configurable AI agent personas."""
    return training_service.list_personas(db)


@router.post("/personas", response_model=AgentPersonaConfigOut, status_code=status.HTTP_201_CREATED)
def create_persona(
    payload: AgentPersonaConfigCreate,
    db: Session = Depends(get_db)
):
    """Creates a new custom agent persona in the database."""
    if not payload.name.strip() or not payload.system_prompt.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Name and System Prompt are required.")
    return training_service.create_persona(db, payload)


@router.put("/personas/{persona_id}", response_model=AgentPersonaConfigOut)
def update_persona(
    persona_id: int,
    payload: AgentPersonaConfigUpdate,
    db: Session = Depends(get_db)
):
    """Updates system prompt, tone, greeting message, temperature, or bound documents."""
    try:
        return training_service.update_persona(db, persona_id, payload)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/personas/{persona_id}")
def delete_persona(persona_id: int, db: Session = Depends(get_db)):
    """Deletes a custom agent persona."""
    try:
        success = training_service.delete_persona(db, persona_id)
        if not success:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Persona #{persona_id} not found.")
        return {"success": True, "message": f"Persona #{persona_id} deleted."}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# -------------------------------------------------------------
# GUARDRAILS & SAFETY ENDPOINTS
# -------------------------------------------------------------

@router.get("/guardrails", response_model=List[AgentGuardrailOut])
def list_guardrails(db: Session = Depends(get_db)):
    """Lists compliance guardrails and deflection rules."""
    return training_service.list_guardrails(db)


@router.post("/guardrails", response_model=AgentGuardrailOut, status_code=status.HTTP_201_CREATED)
def create_guardrail(
    payload: AgentGuardrailCreate,
    db: Session = Depends(get_db)
):
    """Creates a new safety deflection guardrail."""
    return training_service.create_guardrail(db, payload)


@router.put("/guardrails/{guardrail_id}", response_model=AgentGuardrailOut)
def update_guardrail(
    guardrail_id: int,
    payload: AgentGuardrailUpdate,
    db: Session = Depends(get_db)
):
    """Updates an existing guardrail rule."""
    try:
        return training_service.update_guardrail(db, guardrail_id, payload)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/guardrails/{guardrail_id}")
def delete_guardrail(guardrail_id: int, db: Session = Depends(get_db)):
    """Deletes a safety guardrail."""
    success = training_service.delete_guardrail(db, guardrail_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Guardrail #{guardrail_id} not found.")
    return {"success": True, "message": f"Guardrail #{guardrail_id} deleted."}


# -------------------------------------------------------------
# INTERACTIVE TESTING SANDBOX ENDPOINT
# -------------------------------------------------------------

@router.post("/test-query", response_model=TestQueryResultOut)
def test_sandbox_query(
    payload: TestQueryRequest,
    db: Session = Depends(get_db)
):
    """
    Simulates a prospect inquiry against the selected persona prompt,
    guardrail checker, and knowledge retrieval engine.
    """
    if not payload.query.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Query cannot be empty.")
    return training_service.test_query(db, payload.query, payload.persona_id)

