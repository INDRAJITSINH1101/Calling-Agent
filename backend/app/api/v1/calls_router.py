import os
import time
import logging
import re
from typing import List, Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, WebSocket, WebSocketDisconnect, Response
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, or_

from app.core.config import settings
from app.core.database import get_db
from app.models.call_log import CallLog, CallTranscript
from app.models.lead import Lead
from app.models.contact import Contact, Company
from app.models.training import AgentPersonaConfig
from app.schemas.call_schema import (
    CallStartRequest,
    CallConverseRequest,
    CallConverseResponse,
    CallEndRequest,
    CallEndResponse,
    CallLogOut,
    CallTranscriptOut,
    PaginatedCallLogResponse
)
from app.services.voice_agent import voice_agent_service
from app.services.tts_service import synthesize_speech_base64

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/calls", tags=["AI Voice Calling Agent"])


@router.post("/start", response_model=dict)
async def start_call_session(payload: CallStartRequest, db: Session = Depends(get_db)):
    """
    Initializes a live call session for a lead or contact, creates CallLog,
    and returns initial conversational greeting.
    """
    lead = None
    contact = None

    if payload.lead_id:
        lead = db.query(Lead).filter(Lead.id == payload.lead_id).first()
        if lead and lead.contact:
            contact = lead.contact
    elif payload.contact_id:
        contact = db.query(Contact).filter(Contact.id == payload.contact_id).first()
        if contact:
            lead = db.query(Lead).filter(Lead.contact_id == contact.id).first()

    contact_name = f"{contact.first_name} {contact.last_name or ''}".strip() if contact else "Prospective Client"
    company_name = contact.company.name if contact and contact.company else "your business"

    persona_config = None
    if payload.persona:
        persona_config = db.query(AgentPersonaConfig).filter(
            (AgentPersonaConfig.persona_code == payload.persona) |
            (AgentPersonaConfig.name.ilike(f"%{payload.persona}%"))
        ).first()

    if not persona_config:
        persona_config = db.query(AgentPersonaConfig).filter(AgentPersonaConfig.is_default == True).first()
    if not persona_config:
        persona_config = db.query(AgentPersonaConfig).first()

    if persona_config and persona_config.greeting_message:
        raw_greeting = persona_config.greeting_message
        initial_greeting = raw_greeting.replace("{contact_name}", contact_name).replace("{company_name}", company_name)
    else:
        initial_greeting = f"Namaste {contact_name}! Main Devdutt AI Solutions se call kar raha hoon. Hum {company_name} ke sales calls automate karne me help karte hain. Kya aap 2 minute free hain?"

    call_log = CallLog(
        contact_id=contact.id if contact else None,
        lead_id=lead.id if lead else None,
        status="IN_PROGRESS",
        direction=payload.direction or "OUTBOUND",
        provider_used="groq",
        duration_seconds=0
    )
    db.add(call_log)
    db.commit()
    db.refresh(call_log)

    initial_transcript = CallTranscript(
        call_log_id=call_log.id,
        speaker="AI_AGENT",
        message=initial_greeting,
        timestamp_offset_ms=0
    )
    db.add(initial_transcript)

    if lead and lead.stage == "NEW":
        lead.stage = "CONTACTED"
        db.commit()

    audio_base64 = await synthesize_speech_base64(initial_greeting)

    return {
        "call_id": call_log.id,
        "status": "IN_PROGRESS",
        "initial_greeting": initial_greeting,
        "audio_base64": audio_base64,
        "lead": {
            "id": lead.id if lead else None,
            "name": contact_name,
            "company": company_name,
            "stage": lead.stage if lead else "NEW",
            "score": lead.score if lead else 50,
            "bucket": lead.bucket if lead else "WARM",
            "deal_value": lead.deal_value if lead else 0.0
        }
    }


@router.post("/{call_id}/converse", response_model=CallConverseResponse)
async def converse_turn(
    call_id: int,
    payload: CallConverseRequest,
    db: Session = Depends(get_db)
):
    """
    Submits a user speech transcript turn, queries the dual-engine orchestrator
    (Groq LPU -> OpenRouter fallback), executes any triggered CRM tools, and saves transcripts.
    """
    call_log = db.query(CallLog).filter(CallLog.id == call_id).first()
    if not call_log:
        raise HTTPException(status_code=404, detail="Call session not found")

    user_turn = CallTranscript(
        call_log_id=call_id,
        speaker="CUSTOMER",
        message=payload.user_message.strip(),
        timestamp_offset_ms=payload.timestamp_offset_ms or 0
    )
    db.add(user_turn)
    db.commit()

    ai_text, provider_used, latency_ms, tool_actions, is_call_ended = await voice_agent_service.converse(
        user_message=payload.user_message,
        conversation_history=payload.conversation_history,
        persona=payload.persona or "RACHEL_ENTERPRISE",
        lead_id=call_log.lead_id,
        contact_id=call_log.contact_id,
        db=db
    )

    call_log.provider_used = provider_used
    if is_call_ended:
        call_log.status = "COMPLETED"

    tool_dicts = [t.model_dump() for t in tool_actions] if tool_actions else []
    ai_turn = CallTranscript(
        call_log_id=call_id,
        speaker="AI_AGENT",
        message=ai_text,
        timestamp_offset_ms=(payload.timestamp_offset_ms or 0) + latency_ms,
        tool_calls=tool_dicts
    )
    db.add(ai_turn)
    db.commit()

    audio_base64 = await synthesize_speech_base64(ai_text)

    return CallConverseResponse(
        call_id=call_id,
        ai_response=ai_text,
        audio_base64=audio_base64,
        provider_used=provider_used,
        latency_ms=latency_ms,
        tool_actions=tool_actions,
        is_call_ended=is_call_ended
    )


@router.post("/{call_id}/transcribe")
async def transcribe_audio_chunk(
    call_id: int,
    file: UploadFile = File(...)
):
    """
    Universal speech-to-text transcription powered by Groq Whisper (whisper-large-v3-turbo).
    Takes recorded audio chunk from any browser (Edge, Chrome, Safari, Firefox) and transcribes with high accuracy.
    """
    audio_bytes = await file.read()
    if not audio_bytes or len(audio_bytes) < 100:
        return {"transcript": ""}

    if settings.GROQ_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                files = {"file": ("audio.webm", audio_bytes, file.content_type or "audio/webm")}
                data = {"model": "whisper-large-v3-turbo", "language": "hi"}
                res = await client.post(
                    "https://api.groq.com/openai/v1/audio/transcriptions",
                    headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                    files=files,
                    data=data
                )
                if res.status_code == 200:
                    result = res.json()
                    return {"transcript": result.get("text", "").strip()}
        except Exception as e:
            logger.warning(f"Groq Whisper transcription error: {e}")

    return {"transcript": ""}


@router.post("/{call_id}/end", response_model=CallEndResponse)
async def end_call_session(
    call_id: int,
    payload: CallEndRequest,
    db: Session = Depends(get_db)
):
    """
    Ends the call session, performs post-call analysis (Sentiment, Summary, Takeaways),
    updates CallLog and returns the final updated lead state.
    """
    call_log = db.query(CallLog).filter(CallLog.id == call_id).first()
    if not call_log:
        raise HTTPException(status_code=404, detail="Call session not found")

    transcripts = (
        db.query(CallTranscript)
        .filter(CallTranscript.call_log_id == call_id)
        .order_by(CallTranscript.id.asc())
        .all()
    )

    transcript_list = [{"speaker": t.speaker, "message": t.message} for t in transcripts]

    lead = db.query(Lead).filter(Lead.id == call_log.lead_id).first() if call_log.lead_id else None
    contact_name = "Lead"
    if lead and lead.contact:
        contact_name = f"{lead.contact.first_name} {lead.contact.last_name or ''}".strip()

    summary_data = await voice_agent_service.generate_summary(transcript_list, contact_name)

    call_log.status = "COMPLETED"
    call_log.duration_seconds = payload.duration_seconds or call_log.duration_seconds or 30
    call_log.sentiment = summary_data.get("sentiment", "NEUTRAL")
    call_log.summary = summary_data.get("summary", "Call completed successfully.")
    call_log.key_takeaways = summary_data.get("key_takeaways", [])

    db.commit()
    db.refresh(call_log)

    updated_lead_dict = None
    if lead:
        updated_lead_dict = {
            "id": lead.id,
            "stage": lead.stage,
            "score": lead.score,
            "bucket": lead.bucket,
            "deal_value": lead.deal_value
        }

    return CallEndResponse(
        call_id=call_id,
        duration_seconds=call_log.duration_seconds,
        sentiment=call_log.sentiment,
        summary=call_log.summary,
        key_takeaways=call_log.key_takeaways,
        updated_lead=updated_lead_dict
    )


@router.post("/{call_id}/recording", response_model=dict)
async def upload_call_recording(
    call_id: int,
    audio_file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Uploads the audio recording (.webm/.wav) for a call, stores it in storage/recordings/,
    and associates the static URL with the CallLog in PostgreSQL.
    """
    call_log = db.query(CallLog).filter(CallLog.id == call_id).first()
    if not call_log:
        raise HTTPException(status_code=404, detail="Call log session not found")

    os.makedirs(settings.RECORDINGS_DIR, exist_ok=True)
    file_ext = audio_file.filename.split(".")[-1] if "." in audio_file.filename else "webm"
    safe_filename = f"call_{call_id}_{int(time.time())}.{file_ext}"
    target_path = os.path.join(settings.RECORDINGS_DIR, safe_filename)

    file_size = 0
    try:
        with open(target_path, "wb") as f:
            while chunk := await audio_file.read(1024 * 64):
                f.write(chunk)
                file_size += len(chunk)
    except Exception as e:
        logger.error(f"Failed to write recording audio: {e}")
        raise HTTPException(status_code=500, detail="Could not write audio recording file")

    call_log.recording_url = f"/recordings/{safe_filename}"
    db.commit()
    db.refresh(call_log)

    logger.info(f"Recorded audio saved for call {call_id}: {safe_filename} ({file_size} bytes)")
    return {
        "call_id": call_id,
        "recording_url": call_log.recording_url,
        "file_size": file_size,
        "status": "UPLOADED"
    }


@router.get("/history", response_model=PaginatedCallLogResponse)
def get_call_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    sentiment: Optional[str] = Query(None),
    direction: Optional[str] = Query(None),
    has_recording: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    """Returns paginated call history records with contact/company details, recording links and AI sentiment."""
    query = db.query(CallLog).filter(CallLog.is_deleted == False)

    if direction:
        query = query.filter(CallLog.direction == direction.upper())

    if sentiment:
        query = query.filter(CallLog.sentiment == sentiment.upper())

    if has_recording is True:
        query = query.filter(CallLog.recording_url.isnot(None), CallLog.recording_url != "")
    elif has_recording is False:
        query = query.filter(or_(CallLog.recording_url.is_(None), CallLog.recording_url == ""))

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.join(Contact, CallLog.contact_id == Contact.id, isouter=True)
        query = query.filter(
            or_(
                Contact.first_name.ilike(search_pattern),
                Contact.last_name.ilike(search_pattern),
                Contact.phone.ilike(search_pattern),
                CallLog.summary.ilike(search_pattern)
            )
        )

    total = query.count()
    offset = (page - 1) * page_size
    call_logs = (
        query.options(
            joinedload(CallLog.contact).joinedload(Contact.company),
            joinedload(CallLog.lead).joinedload(Lead.contact).joinedload(Contact.company)
        )
        .order_by(desc(CallLog.id))
        .offset(offset)
        .limit(page_size)
        .all()
    )

    items = []
    for cl in call_logs:
        contact_name = None
        contact_phone = None
        company_name = None

        if cl.contact:
            contact_name = f"{cl.contact.first_name} {cl.contact.last_name or ''}".strip()
            contact_phone = cl.contact.phone
            if cl.contact.company:
                company_name = cl.contact.company.name
        elif cl.lead and cl.lead.contact:
            contact_name = f"{cl.lead.contact.first_name} {cl.lead.contact.last_name or ''}".strip()
            contact_phone = cl.lead.contact.phone
            if cl.lead.contact.company:
                company_name = cl.lead.contact.company.name

        items.append(
            CallLogOut(
                id=cl.id,
                contact_id=cl.contact_id,
                lead_id=cl.lead_id,
                contact_name=contact_name,
                contact_phone=contact_phone,
                company_name=company_name,
                status=cl.status,
                direction=cl.direction,
                duration_seconds=cl.duration_seconds,
                provider_used=cl.provider_used,
                sentiment=cl.sentiment,
                summary=cl.summary,
                key_takeaways=cl.key_takeaways or [],
                recording_url=cl.recording_url,
                created_at=cl.created_at
            )
        )

    return PaginatedCallLogResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=items
    )


@router.delete("/{call_id}", response_model=dict)
def delete_call_log(call_id: int, db: Session = Depends(get_db)):
    """Soft-deletes a call log and cleans up any recording file if present."""
    call_log = db.query(CallLog).filter(CallLog.id == call_id).first()
    if not call_log:
        raise HTTPException(status_code=404, detail="Call log not found")

    # If physical recording exists, delete it safely
    if call_log.recording_url:
        filename = os.path.basename(call_log.recording_url)
        filepath = os.path.join(settings.RECORDINGS_DIR, filename)
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except Exception as e:
                logger.warning(f"Could not remove recording file {filepath}: {e}")

    call_log.is_deleted = True
    db.commit()
    return {"message": "Call log deleted successfully", "call_id": call_id}


@router.get("/{call_id}/transcript", response_model=List[CallTranscriptOut])
def get_call_transcript(call_id: int, db: Session = Depends(get_db)):
    """Returns all dialogue transcript turns and tool execution events for a specific call."""
    transcripts = (
        db.query(CallTranscript)
        .filter(CallTranscript.call_log_id == call_id)
        .order_by(CallTranscript.id.asc())
        .all()
    )
    return transcripts


@router.websocket("/ws")
async def websocket_call_stream(websocket: WebSocket):
    """
    WebSocket endpoint for bidirectional real-time audio and transcript streaming.
    """
    await websocket.accept()
    logger.info("[WebSocket] Live calling client connected.")
    try:
        while True:
            data = await websocket.receive_json()
            event = data.get("event")
            if event == "ping":
                await websocket.send_json({"event": "pong", "status": "active"})
            elif event == "speech_turn":
                user_text = data.get("text", "")
                await websocket.send_json({
                    "event": "speech_acknowledged",
                    "text": user_text,
                    "status": "processing"
                })
    except WebSocketDisconnect:
        logger.info("[WebSocket] Live calling client disconnected.")
    except Exception as e:
        logger.error(f"[WebSocket] Error: {e}")
