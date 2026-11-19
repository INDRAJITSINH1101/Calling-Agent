import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Form, Request, Response, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.services.telephony_bridge import telephony_bridge, broadcaster

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/telephony/live", tags=["Twilio Live PSTN Telephony"])


class SetWebhookUrlRequest(BaseModel):
    url: str


class OutboundPstnRequest(BaseModel):
    to_number: str
    persona: Optional[str] = "RACHEL_ENTERPRISE"
    lead_id: Optional[int] = None
    contact_id: Optional[int] = None
    webhook_base_url: Optional[str] = None


@router.get("/status")
def get_live_telephony_status():
    """Returns live connection health, balance, verified caller IDs, and active numbers from Twilio."""
    return telephony_bridge.get_live_status()


@router.post("/set-webhook-url")
def update_webhook_tunnel_url(payload: SetWebhookUrlRequest):
    """Persists the public ngrok / localtunnel base URL dynamically into .env and runtime settings."""
    if not payload.url or not (payload.url.startswith("http://") or payload.url.startswith("https://")):
        raise HTTPException(status_code=400, detail="Invalid URL. Must start with http:// or https://")
    updated = telephony_bridge.set_webhook_base_url(payload.url)
    return {"message": "Webhook Base URL updated successfully", "url": updated}


@router.post("/outbound-call")
def trigger_real_phone_call(payload: OutboundPstnRequest, request: Request, db: Session = Depends(get_db)):
    """Triggers a real phone call to target mobile phone via Twilio REST API."""
    try:
        # If frontend didn't pass explicit webhook_base_url, check if request host or header can infer it
        inferred_base = payload.webhook_base_url
        if not inferred_base:
            host_header = request.headers.get("x-forwarded-host") or request.headers.get("host")
            proto_header = request.headers.get("x-forwarded-proto", "https")
            if host_header and "ngrok" in host_header:
                inferred_base = f"{proto_header}://{host_header}"

        result = telephony_bridge.initiate_outbound_pstn_call(
            to_number=payload.to_number,
            persona_code=payload.persona or "RACHEL_ENTERPRISE",
            lead_id=payload.lead_id,
            contact_id=payload.contact_id,
            db=db,
            webhook_base_url=inferred_base
        )
        return result
    except Exception as e:
        logger.error(f"[TelephonyBridgeRouter] Outbound call error: {e}")
        status_code = 400 if ("twilio" in str(e).lower() or isinstance(e, RuntimeError)) else 500
        raise HTTPException(status_code=status_code, detail=str(e))


@router.post("/voice-twiml")
async def twilio_voice_twiml(
    request: Request,
    call_id: int = Query(...),
    persona: str = Query("RACHEL_ENTERPRISE"),
    db: Session = Depends(get_db)
):
    """
    Twilio Webhook: Invoked when physical phone picks up.
    Returns TwiML with greeting and speech gather.
    """
    base_url = str(request.base_url).rstrip('/')
    # If behind ngrok proxy, use X-Forwarded headers
    forwarded_host = request.headers.get("x-forwarded-host")
    forwarded_proto = request.headers.get("x-forwarded-proto", "https")
    if forwarded_host:
        base_url = f"{forwarded_proto}://{forwarded_host}"

    twiml_xml = telephony_bridge.generate_voice_twiml(
        call_id=call_id,
        persona_code=persona,
        db=db,
        base_url=base_url
    )
    return Response(content=twiml_xml, media_type="application/xml")


@router.post("/gather-turn")
async def twilio_gather_turn(
    request: Request,
    call_id: int = Query(...),
    persona: str = Query("RACHEL_ENTERPRISE"),
    SpeechResult: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Twilio Webhook: Invoked whenever caller speaks into their phone.
    SpeechResult contains speech-to-text from Twilio carrier.
    Processes turn through Groq LLM + RAG + Guardrails + CRM tools and returns voice TwiML.
    """
    base_url = str(request.base_url).rstrip('/')
    forwarded_host = request.headers.get("x-forwarded-host")
    forwarded_proto = request.headers.get("x-forwarded-proto", "https")
    if forwarded_host:
        base_url = f"{forwarded_proto}://{forwarded_host}"

    twiml_xml = await telephony_bridge.handle_gather_turn(
        call_id=call_id,
        speech_result=SpeechResult or "",
        persona_code=persona,
        db=db,
        base_url=base_url
    )
    return Response(content=twiml_xml, media_type="application/xml")


@router.post("/status-callback")
async def twilio_status_callback(
    call_id: int = Query(...),
    CallStatus: Optional[str] = Form(None),
    CallDuration: Optional[int] = Form(None),
    db: Session = Depends(get_db)
):
    """Twilio Status Webhook: Notifies when call rings, connects, or hangs up."""
    await telephony_bridge.handle_status_callback(
        call_id=call_id,
        call_status=CallStatus or "unknown",
        duration=CallDuration,
        db=db
    )
    return {"status": "ok"}


@router.post("/recording-callback")
async def twilio_recording_callback(
    call_id: int = Query(...),
    RecordingUrl: Optional[str] = Form(None),
    RecordingSid: Optional[str] = Form(None),
    RecordingDuration: Optional[int] = Form(None),
    db: Session = Depends(get_db)
):
    """Twilio Recording Webhook: Triggered when call audio MP3 is rendered and ready."""
    if RecordingUrl:
        await telephony_bridge.handle_recording_callback(
            call_id=call_id,
            recording_url=RecordingUrl,
            recording_sid=RecordingSid or "",
            duration=RecordingDuration,
            db=db
        )
    return {"status": "ok"}


@router.websocket("/monitor/{call_id}")
async def websocket_call_monitor(websocket: WebSocket, call_id: int):
    """Real-time WebSocket endpoint: Streams caller speech & AI replies to frontend UI."""
    await broadcaster.connect(call_id, websocket)
    try:
        while True:
            # Keep connection open, client can send ping
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        broadcaster.disconnect(call_id, websocket)
    except Exception as e:
        logger.warning(f"[WebSocketMonitor] Socket closed with error: {e}")
        broadcaster.disconnect(call_id, websocket)

