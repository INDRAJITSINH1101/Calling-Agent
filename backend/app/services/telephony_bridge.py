import os
import re
import time
import logging
from typing import Optional, Dict, Any, List
import httpx
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.config import settings
from app.models.call_log import CallLog, CallTranscript
from app.models.lead import Lead
from app.models.contact import Contact
from app.models.training import AgentPersonaConfig
from app.services.voice_agent import voice_agent_service
from app.services.scoring_engine import calculate_lead_score

logger = logging.getLogger(__name__)


class TelephonyBroadcaster:
    """Manages active WebSockets for streaming live PSTN call events to frontend UI in real-time."""

    def __init__(self):
        self.active_connections: Dict[int, List[Any]] = {}

    async def connect(self, call_id: int, websocket: Any):
        await websocket.accept()
        if call_id not in self.active_connections:
            self.active_connections[call_id] = []
        self.active_connections[call_id].append(websocket)
        logger.info(f"[TelephonyBroadcaster] Client connected for call_id={call_id}")

    def disconnect(self, call_id: int, websocket: Any):
        if call_id in self.active_connections:
            if websocket in self.active_connections[call_id]:
                self.active_connections[call_id].remove(websocket)
            if not self.active_connections[call_id]:
                del self.active_connections[call_id]
        logger.info(f"[TelephonyBroadcaster] Client disconnected for call_id={call_id}")

    async def broadcast(self, call_id: int, message: Dict[str, Any]):
        if call_id in self.active_connections:
            dead_connections = []
            for ws in self.active_connections[call_id]:
                try:
                    await ws.send_json(message)
                except Exception as e:
                    logger.warning(f"[TelephonyBroadcaster] Failed to send message to ws: {e}")
                    dead_connections.append(ws)
            for dead in dead_connections:
                if dead in self.active_connections[call_id]:
                    self.active_connections[call_id].remove(dead)


broadcaster = TelephonyBroadcaster()


class TelephonyBridgeService:
    """
    Live PSTN Telephony Engine connecting Twilio telecom carriers
    with DEVDUTT AI Conversational Intelligence (Groq LPU, RAG Knowledge, Guardrails).
    """

    def get_client(self):
        """Instantiates authenticated Twilio REST Client dynamically."""
        if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
            raise ValueError("Twilio Account SID or Auth Token is not configured in .env")
        from twilio.rest import Client
        return Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

    def get_live_status(self) -> Dict[str, Any]:
        """Queries live Twilio account information, caller IDs, and balance."""
        is_configured = bool(settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN)
        account_name = "Not Configured"
        account_status = "unconfigured"
        verified_numbers = []
        incoming_numbers = []

        if is_configured:
            try:
                client = self.get_client()
                acc = client.api.accounts(settings.TWILIO_ACCOUNT_SID).fetch()
                account_name = acc.friendly_name
                account_status = acc.status

                caller_ids = client.outgoing_caller_ids.list(limit=20)
                verified_numbers = [cid.phone_number for cid in caller_ids]

                incomings = client.incoming_phone_numbers.list(limit=10)
                incoming_numbers = [num.phone_number for num in incomings]
            except Exception as e:
                logger.error(f"[TelephonyBridge] Error querying Twilio status: {e}")
                account_status = f"error: {str(e)}"

        return {
            "is_configured": is_configured,
            "account_sid": settings.TWILIO_ACCOUNT_SID[:6] + "..." + settings.TWILIO_ACCOUNT_SID[-4:] if settings.TWILIO_ACCOUNT_SID else "",
            "account_name": account_name,
            "status": account_status,
            "twilio_phone_number": settings.TWILIO_PHONE_NUMBER,
            "webhook_base_url": settings.TWILIO_WEBHOOK_BASE_URL,
            "verified_caller_ids": verified_numbers,
            "active_twilio_numbers": incoming_numbers
        }

    def set_webhook_base_url(self, new_url: str) -> str:
        """Dynamically persists the public tunnel URL into backend/.env and current settings."""
        clean_url = new_url.strip().rstrip('/')
        settings.TWILIO_WEBHOOK_BASE_URL = clean_url

        env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                content = f.read()

            if "TWILIO_WEBHOOK_BASE_URL=" in content:
                content = re.sub(
                    r"TWILIO_WEBHOOK_BASE_URL=.*",
                    f"TWILIO_WEBHOOK_BASE_URL={clean_url}",
                    content
                )
            else:
                content += f"\nTWILIO_WEBHOOK_BASE_URL={clean_url}\n"

            with open(env_path, "w", encoding="utf-8") as f:
                f.write(content)

        logger.info(f"[TelephonyBridge] Webhook Base URL updated to: {clean_url}")
        return clean_url

    def initiate_outbound_pstn_call(
        self,
        to_number: str,
        persona_code: str,
        lead_id: Optional[int],
        contact_id: Optional[int],
        db: Session,
        webhook_base_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Triggers a real phone call to target_number via Twilio REST API,
        routing the live audio into our conversational webhook bridge.
        """
        clean_to = to_number.strip().replace(" ", "").replace("-", "")
        if not clean_to.startswith("+"):
            if len(clean_to) == 10:
                clean_to = "+91" + clean_to
            else:
                clean_to = "+" + clean_to

        public_url = (webhook_base_url or settings.TWILIO_WEBHOOK_BASE_URL or "").strip().rstrip('/')
        if not public_url:
            raise ValueError(
                "Public Webhook URL (ngrok) is required for Twilio live calling. "
                "Please configure TWILIO_WEBHOOK_BASE_URL or pass webhook_base_url."
            )

        client = self.get_client()

        lead = None
        contact = None
        if lead_id:
            lead = db.query(Lead).filter(Lead.id == lead_id).first()
            if lead and lead.contact:
                contact = lead.contact
        elif contact_id:
            contact = db.query(Contact).filter(Contact.id == contact_id).first()
            if contact:
                lead = db.query(Lead).filter(Lead.contact_id == contact.id).first()

        call_log = CallLog(
            contact_id=contact.id if contact else None,
            lead_id=lead.id if lead else None,
            status="DIALING",
            direction="OUTBOUND",
            duration_seconds=0,
            provider_used="twilio_groq",
            sentiment="NEUTRAL"
        )
        db.add(call_log)
        db.commit()
        db.refresh(call_log)

        twiml_url = f"{public_url}/api/v1/telephony/live/voice-twiml?call_id={call_log.id}&persona={persona_code}"
        status_url = f"{public_url}/api/v1/telephony/live/status-callback?call_id={call_log.id}"
        recording_url = f"{public_url}/api/v1/telephony/live/recording-callback?call_id={call_log.id}"

        logger.info(f"[TelephonyBridge] Initiating PSTN call: From={settings.TWILIO_PHONE_NUMBER} To={clean_to} TwiML={twiml_url}")

        try:
            # Twilio Trial accounts disallow 'record=True' and recording parameters in calls.create().
            # Using clean standard parameters ensures 100% compatibility across trial and upgraded accounts.
            call = client.calls.create(
                to=clean_to,
                from_=settings.TWILIO_PHONE_NUMBER,
                url=twiml_url,
                status_callback=status_url,
                status_callback_event=['initiated', 'ringing', 'answered', 'completed']
            )

            call_log.summary = f"Twilio Call SID: {call.sid} | Target: {clean_to}"
            db.commit()

            return {
                "success": True,
                "call_sid": call.sid,
                "call_id": call_log.id,
                "status": call.status,
                "to_number": clean_to,
                "from_number": settings.TWILIO_PHONE_NUMBER
            }
        except Exception as e:
            err_str = str(e)
            call_log.status = "FAILED"
            call_log.summary = f"Call Failed: {err_str}"
            db.commit()
            logger.error(f"[TelephonyBridge] Outbound call trigger failed: {err_str}")

            # Provide clear actionable guidance for Twilio trial limitations
            if "unverified" in err_str.lower() or "21219" in err_str or "21214" in err_str:
                raise RuntimeError(
                    f"Twilio Trial Account Limitation: The number '{clean_to}' is not verified. "
                    "Twilio trial accounts can only call Verified Caller IDs. "
                    "Please verify this phone number in your Twilio Console (Phone Numbers -> Verified Caller IDs) or upgrade your account."
                )
            elif "disallowed parameters" in err_str.lower() or "trial" in err_str.lower():
                # Fallback to minimal parameters if trial account restrictions persist
                try:
                    logger.info("[TelephonyBridge] Retrying with strictly minimal Twilio parameters...")
                    call = client.calls.create(
                        to=clean_to,
                        from_=settings.TWILIO_PHONE_NUMBER,
                        url=twiml_url
                    )
                    call_log.status = "DIALING"
                    call_log.summary = f"Twilio Call SID: {call.sid} | Target: {clean_to}"
                    db.commit()
                    return {
                        "success": True,
                        "call_sid": call.sid,
                        "call_id": call_log.id,
                        "status": call.status,
                        "to_number": clean_to,
                        "from_number": settings.TWILIO_PHONE_NUMBER
                    }
                except Exception as retry_err:
                    raise RuntimeError(f"Twilio call failed: {str(retry_err)}")
            raise e

    def generate_voice_twiml(self, call_id: int, persona_code: str, db: Session, base_url: str) -> str:
        """
        Produces initial TwiML when physical phone is picked up by user.
        Greets the user and initiates real-time speech recognition.
        """
        call_log = db.query(CallLog).filter(CallLog.id == call_id).first()
        contact_name = "there"
        company_name = "our company"

        if call_log:
            call_log.status = "IN_PROGRESS"
            db.commit()
            if call_log.contact:
                contact_name = f"{call_log.contact.first_name} {call_log.contact.last_name or ''}".strip()
                if call_log.contact.company:
                    company_name = call_log.contact.company.name

        # Lookup Persona Config from Training Studio DB
        persona_cfg = None
        if persona_code:
            persona_cfg = db.query(AgentPersonaConfig).filter(
                (AgentPersonaConfig.persona_code == persona_code) |
                (AgentPersonaConfig.name.ilike(f"%{persona_code}%"))
            ).first()

        if not persona_cfg:
            persona_cfg = db.query(AgentPersonaConfig).filter(AgentPersonaConfig.is_default == True).first()
        if not persona_cfg:
            persona_cfg = db.query(AgentPersonaConfig).first()

        if persona_cfg and persona_cfg.greeting_message:
            greeting = persona_cfg.greeting_message.replace("{contact_name}", contact_name).replace("{company_name}", company_name)
        else:
            greeting = f"Namaste {contact_name}! Main Devdutt AI se call kar raha hoon. Kya aap mujhe sun pa rahe hain?"

        # Save initial AI transcript
        initial_transcript = CallTranscript(
            call_log_id=call_id,
            speaker="AI_AGENT",
            message=greeting,
            timestamp_offset_ms=0
        )
        db.add(initial_transcript)
        db.commit()

        clean_base = base_url.rstrip('/')
        gather_action = f"{clean_base}/api/v1/telephony/live/gather-turn?call_id={call_id}&amp;persona={persona_code}"

        # Broadcast pickup and active status to UI
        import asyncio
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(broadcaster.broadcast(call_id, {
                    "type": "status",
                    "call_id": call_id,
                    "status": "IN_PROGRESS"
                }))
        except Exception as e:
            logger.warning(f"[TelephonyBridge] Pickup broadcast error: {e}")

        twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Aditi" language="en-IN">{self._escape_xml(greeting)}</Say>
    <Gather input="speech" action="{gather_action}" method="POST" speechTimeout="auto" language="en-IN" timeout="5">
    </Gather>
    <Say voice="Polly.Aditi" language="en-IN">Main aapki aawaz nahi sun paaya. Kya aap wahan hain?</Say>
    <Gather input="speech" action="{gather_action}" method="POST" speechTimeout="auto" language="en-IN" timeout="6">
    </Gather>
    <Say voice="Polly.Aditi" language="en-IN">Lagta hai line me issue hai. Sampark karne ke liye dhanyavaad. Alvida!</Say>
    <Hangup/>
</Response>"""
        return twiml

    async def handle_gather_turn(
        self,
        call_id: int,
        speech_result: str,
        persona_code: str,
        db: Session,
        base_url: str
    ) -> str:
        """
        Receives caller's transcribed spoken speech from Twilio carrier,
        queries Groq LLM + RAG + Guardrails, and returns TwiML with voice reply.
        """
        clean_speech = speech_result.strip() if speech_result else ""
        clean_base = base_url.rstrip('/')
        gather_action = f"{clean_base}/api/v1/telephony/live/gather-turn?call_id={call_id}&amp;persona={persona_code}"

        if not clean_speech:
            return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Aditi" language="en-IN">Main aapki aawaz theek se nahi sun paaya. Kya aap dobara bol sakte hain?</Say>
    <Gather input="speech" action="{gather_action}" method="POST" speechTimeout="auto" language="en-IN" timeout="5" />
    <Hangup/>
</Response>"""

        customer_turn = CallTranscript(
            call_log_id=call_id,
            speaker="CUSTOMER",
            message=clean_speech,
            timestamp_offset_ms=0
        )
        db.add(customer_turn)
        db.commit()

        await broadcaster.broadcast(call_id, {
            "type": "transcript",
            "speaker": "CUSTOMER",
            "message": clean_speech,
            "call_id": call_id,
            "timestamp": time.strftime("%H:%M:%S")
        })

        past_turns = db.query(CallTranscript).filter(CallTranscript.call_log_id == call_id).order_by(CallTranscript.id.asc()).all()
        conv_history = []
        for t in past_turns[:-1]:
            role = "assistant" if t.speaker == "AI_AGENT" else "user"
            conv_history.append({"role": role, "content": t.message})

        call_log = db.query(CallLog).filter(CallLog.id == call_id).first()
        lead_id = call_log.lead_id if call_log else None
        contact_id = call_log.contact_id if call_log else None

        ai_reply, provider, latency, tool_actions, is_call_ended = await voice_agent_service.converse(
            user_message=clean_speech,
            conversation_history=conv_history,
            persona=persona_code or "RACHEL_ENTERPRISE",
            lead_id=lead_id,
            contact_id=contact_id,
            db=db
        )

        tool_dicts = [t.model_dump() for t in tool_actions] if tool_actions else []
        ai_turn = CallTranscript(
            call_log_id=call_id,
            speaker="AI_AGENT",
            message=ai_reply,
            timestamp_offset_ms=latency,
            tool_calls=tool_dicts
        )
        db.add(ai_turn)
        db.commit()

        await broadcaster.broadcast(call_id, {
            "type": "transcript",
            "speaker": "AI_AGENT",
            "message": ai_reply,
            "call_id": call_id,
            "provider_used": provider,
            "latency_ms": latency,
            "tool_calls": tool_dicts,
            "timestamp": time.strftime("%H:%M:%S")
        })

        escaped_reply = self._escape_xml(ai_reply)

        if is_call_ended:
            if call_log:
                call_log.status = "COMPLETED"
                db.commit()
            await broadcaster.broadcast(call_id, {
                "type": "status",
                "call_id": call_id,
                "status": "COMPLETED",
                "duration": call_log.duration_seconds if call_log else 0
            })
            return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Aditi" language="en-IN">{escaped_reply}</Say>
    <Hangup/>
</Response>"""

        return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Aditi" language="en-IN">{escaped_reply}</Say>
    <Gather input="speech" action="{gather_action}" method="POST" speechTimeout="auto" language="en-IN" timeout="5">
    </Gather>
    <Say voice="Polly.Aditi" language="en-IN">Main sun raha hoon, aap bol sakte hain.</Say>
    <Gather input="speech" action="{gather_action}" method="POST" speechTimeout="auto" language="en-IN" timeout="6">
    </Gather>
    <Say voice="Polly.Aditi" language="en-IN">Sampark karne ke liye dhanyavaad. Alvida!</Say>
    <Hangup/>
</Response>"""

    async def handle_status_callback(
        self,
        call_id: int,
        call_status: str,
        duration: Optional[int],
        db: Session
    ):
        """Processes Twilio status webhook (initiated, ringing, in-progress, completed)."""
        call_log = db.query(CallLog).filter(CallLog.id == call_id).first()
        if not call_log:
            return

        normalized_status = call_status.upper().replace("-", "_")
        call_log.status = normalized_status

        if duration is not None and duration > 0:
            call_log.duration_seconds = duration

        if normalized_status == "COMPLETED":
            twilio_sid = None
            match = re.search(r'CA[a-f0-9]{32}', call_log.summary or "")
            if match:
                twilio_sid = match.group(0)

            # Generate conversational AI summary from transcripts
            try:
                transcripts = db.query(CallTranscript).filter(CallTranscript.call_log_id == call_id).order_by(CallTranscript.id.asc()).all()
                if transcripts:
                    transcript_list = [{"speaker": t.speaker, "message": t.message} for t in transcripts]
                    contact_name = "Lead"
                    if call_log.contact:
                        contact_name = f"{call_log.contact.first_name} {call_log.contact.last_name or ''}".strip()
                    summary_data = await voice_agent_service.generate_summary(transcript_list, contact_name)
                    call_log.summary = summary_data.get("summary", "Live phone call completed successfully.")
                    if summary_data.get("sentiment"):
                        call_log.sentiment = summary_data["sentiment"]
                    if summary_data.get("key_takeaways"):
                        call_log.key_takeaways = summary_data["key_takeaways"]
            except Exception as e:
                logger.warning(f"[TelephonyBridge] Summary generation error: {e}")

            # Run lead qualification scoring on completed call
            try:
                if call_log.lead:
                    contact = call_log.contact or call_log.lead.contact
                    lead_data = {
                        "source": call_log.lead.source,
                        "deal_value": call_log.lead.deal_value,
                        "stage": call_log.lead.stage
                    }
                    score, bucket, explanation = calculate_lead_score(contact, lead_data, db=db)
                    call_log.lead.score = score
                    call_log.lead.bucket = bucket
                    call_log.lead.score_explanation = explanation
            except Exception as e:
                logger.warning(f"[TelephonyBridge] Lead scoring recalculation error: {e}")

            # Check if Twilio recording is already available via API if callback didn't fire yet
            try:
                if not call_log.recording_url and settings.TWILIO_ACCOUNT_SID and twilio_sid:
                    client = self.get_client()
                    recs = client.calls(twilio_sid).recordings.list(limit=1)
                    if recs:
                        rec = recs[0]
                        rec_url = f"https://api.twilio.com{rec.uri.replace('.json', '')}"
                        await self.handle_recording_callback(
                            call_id=call_id,
                            recording_url=rec_url,
                            recording_sid=rec.sid,
                            duration=int(rec.duration) if rec.duration else None,
                            db=db
                        )
            except Exception as e:
                logger.warning(f"[TelephonyBridge] Fallback recording fetch: {e}")

            # If no telecom recording (e.g. Twilio Free Trial parameter block), synthesize audio from live transcripts
            try:
                if not call_log.recording_url:
                    transcripts = db.query(CallTranscript).filter(CallTranscript.call_log_id == call_id).order_by(CallTranscript.id.asc()).all()
                    if transcripts:
                        dialogue_lines = [t.message for t in transcripts if t.message]
                        if dialogue_lines:
                            import edge_tts
                            combined_text = " ... ".join(dialogue_lines)
                            os.makedirs(settings.RECORDINGS_DIR, exist_ok=True)
                            mp3_filename = f"call_{call_id}_recording_{int(time.time())}.mp3"
                            target_path = os.path.join(settings.RECORDINGS_DIR, mp3_filename)
                            comm = edge_tts.Communicate(combined_text, "hi-IN-SwaraNeural")
                            await comm.save(target_path)
                            call_log.recording_url = f"/recordings/{mp3_filename}"
                            logger.info(f"[TelephonyBridge] Generated dialogue recording for call {call_id}: {mp3_filename}")
            except Exception as e:
                logger.warning(f"[TelephonyBridge] Dialogue audio synthesis fallback error: {e}")

        db.commit()

        # Broadcast status update to frontend
        await broadcaster.broadcast(call_id, {
            "type": "status",
            "call_id": call_id,
            "status": normalized_status,
            "duration": call_log.duration_seconds
        })

    async def handle_recording_callback(
        self,
        call_id: int,
        recording_url: str,
        recording_sid: str,
        duration: Optional[int],
        db: Session
    ):
        """
        Downloads the MP3 recording from Twilio, saves it in storage/recordings/,
        and links it to the CallLog in the database so it appears in the Recordings tab.
        """
        call_log = db.query(CallLog).filter(CallLog.id == call_id).first()
        if not call_log:
            logger.warning(f"[TelephonyBridge] CallLog not found for call_id={call_id}")
            return

        try:
            os.makedirs(settings.RECORDINGS_DIR, exist_ok=True)
            mp3_filename = f"call_{call_id}_twilio_{int(time.time())}.mp3"
            target_path = os.path.join(settings.RECORDINGS_DIR, mp3_filename)

            download_url = recording_url if recording_url.endswith('.mp3') else f"{recording_url}.mp3"

            async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as http_client:
                resp = await http_client.get(
                    download_url,
                    auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
                )
                if resp.status_code == 200:
                    with open(target_path, "wb") as f:
                        f.write(resp.content)

                    # Clean up synthetic fallback file if previously created
                    if call_log.recording_url and "twilio" not in call_log.recording_url:
                        old_fake_file = os.path.join(settings.RECORDINGS_DIR, os.path.basename(call_log.recording_url))
                        if os.path.exists(old_fake_file):
                            try:
                                os.remove(old_fake_file)
                            except Exception:
                                pass

                    call_log.recording_url = f"/recordings/{mp3_filename}"
                    if duration and not call_log.duration_seconds:
                        call_log.duration_seconds = duration
                    db.commit()
                    logger.info(f"[TelephonyBridge] Saved Twilio MP3 recording for call {call_id}: {mp3_filename} ({len(resp.content)} bytes)")

                    await broadcaster.broadcast(call_id, {
                        "type": "recording_ready",
                        "call_id": call_id,
                        "recording_url": call_log.recording_url,
                        "duration": call_log.duration_seconds
                    })
                else:
                    logger.warning(f"[TelephonyBridge] Could not download Twilio MP3 directly (HTTP {resp.status_code}), using URL fallback")
                    call_log.recording_url = download_url
                    db.commit()
        except Exception as e:
            logger.error(f"[TelephonyBridge] Error processing Twilio call recording: {e}")

    def _escape_xml(self, text: str) -> str:
        """Escapes XML entities for safe TwiML formatting."""
        return (
            text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace('"', "&quot;")
                .replace("'", "&apos;")
        )


telephony_bridge = TelephonyBridgeService()

