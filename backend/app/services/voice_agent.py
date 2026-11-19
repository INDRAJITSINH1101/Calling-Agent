import time
import json
import logging
import re
from typing import List, Dict, Any, Optional, Tuple
import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.lead import Lead
from app.models.contact import Contact
from app.services.scoring_engine import calculate_lead_score
from app.schemas.call_schema import ToolExecutionResult

logger = logging.getLogger(__name__)

CRM_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "update_lead_stage",
            "description": "Updates the lead's sales pipeline stage in the PostgreSQL database when purchase intent changes.",
            "parameters": {
                "type": "object",
                "properties": {
                    "stage": {
                        "type": "string",
                        "enum": ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "LOST"],
                        "description": "The new pipeline stage for the lead"
                    }
                },
                "required": ["stage"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "record_commercial_budget",
            "description": "Records the deal value / commercial budget provided by the customer and automatically recalculates the dynamic lead score.",
            "parameters": {
                "type": "object",
                "properties": {
                    "deal_value": {
                        "type": "number",
                        "description": "The monetary amount of the deal or stated budget in USD or INR"
                    }
                },
                "required": ["deal_value"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "schedule_followup_meeting",
            "description": "Schedules a follow-up demonstration or callback with the lead.",
            "parameters": {
                "type": "object",
                "properties": {
                    "meeting_datetime": {
                        "type": "string",
                        "description": "Requested meeting date or time (e.g. 'Tomorrow 3 PM', 'Friday morning')"
                    },
                    "notes": {
                        "type": "string",
                        "description": "Brief context or meeting agenda"
                    }
                },
                "required": ["meeting_datetime"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "suppress_dnc_contact",
            "description": "Suppresses contact, adds to Do-Not-Call (DND) list, drops lead score to 0, and halts further outreach.",
            "parameters": {
                "type": "object",
                "properties": {
                    "reason": {
                        "type": "string",
                        "description": "Reason for suppression (e.g. 'Requested DND', 'Wrong Number')"
                    }
                },
                "required": ["reason"]
            }
        }
    }
]


def execute_crm_tool(
    tool_name: str,
    arguments: Dict[str, Any],
    lead_id: Optional[int],
    contact_id: Optional[int],
    db: Session
) -> ToolExecutionResult:
    """Executes CRM tool calls against the database and recalculates lead scores in real-time."""
    logger.info(f"[CRM Tool Execution] Invoking {tool_name} with arguments: {arguments}")
    
    lead = None
    contact = None
    if lead_id:
        lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead and contact_id:
        lead = db.query(Lead).filter(Lead.contact_id == contact_id).first()
    if contact_id:
        contact = db.query(Contact).filter(Contact.id == contact_id).first()
    elif lead and lead.contact_id:
        contact = db.query(Contact).filter(Contact.id == lead.contact_id).first()

    try:
        if tool_name == "update_lead_stage":
            new_stage = str(arguments.get("stage", "CONTACTED")).upper()
            if lead:
                old_stage = lead.stage
                lead.stage = new_stage
                
                lead_data = {
                    "source": lead.source,
                    "deal_value": lead.deal_value,
                    "stage": lead.stage
                }
                score, bucket, explanation = calculate_lead_score(contact, lead_data, db=db)
                lead.score = score
                lead.bucket = bucket
                lead.score_explanation = explanation
                db.commit()
                db.refresh(lead)

                return ToolExecutionResult(
                    tool_name=tool_name,
                    arguments=arguments,
                    execution_status="SUCCESS",
                    message=f"Lead stage upgraded from {old_stage} to {new_stage}. Dynamic score recalculated to {lead.score} ({lead.bucket}).",
                    updated_lead={
                        "id": lead.id,
                        "stage": lead.stage,
                        "score": lead.score,
                        "bucket": lead.bucket,
                        "deal_value": lead.deal_value
                    }
                )

        elif tool_name == "record_commercial_budget":
            raw_value = arguments.get("deal_value", 0)
            try:
                deal_val = float(raw_value)
            except (ValueError, TypeError):
                deal_val = 5000.0

            if lead:
                lead.deal_value = deal_val
                lead_data = {
                    "source": lead.source,
                    "deal_value": lead.deal_value,
                    "stage": lead.stage
                }
                score, bucket, explanation = calculate_lead_score(contact, lead_data, db=db)
                lead.score = score
                lead.bucket = bucket
                lead.score_explanation = explanation
                db.commit()
                db.refresh(lead)

                return ToolExecutionResult(
                    tool_name=tool_name,
                    arguments=arguments,
                    execution_status="SUCCESS",
                    message=f"Commercial budget of ₹{deal_val:,.2f} recorded in CRM. Lead score updated to {lead.score} ({lead.bucket}).",
                    updated_lead={
                        "id": lead.id,
                        "stage": lead.stage,
                        "score": lead.score,
                        "bucket": lead.bucket,
                        "deal_value": lead.deal_value
                    }
                )

        elif tool_name == "schedule_followup_meeting":
            dt_str = arguments.get("meeting_datetime", "Upcoming")
            notes = arguments.get("notes", "Follow-up requested during AI voice call")
            if lead:
                existing_notes = lead.notes or ""
                lead.notes = f"{existing_notes}\n[AI Call Callback]: {dt_str} - {notes}".strip()
                if lead.stage in ["NEW", "CONTACTED"]:
                    lead.stage = "QUALIFIED"
                db.commit()
                db.refresh(lead)

            return ToolExecutionResult(
                tool_name=tool_name,
                arguments=arguments,
                execution_status="SUCCESS",
                message=f"Callback meeting logged for '{dt_str}'. Context: {notes}",
                updated_lead={
                    "id": lead.id if lead else None,
                    "stage": lead.stage if lead else None,
                    "score": lead.score if lead else None,
                    "bucket": lead.bucket if lead else None
                }
            )

        elif tool_name == "suppress_dnc_contact":
            reason = arguments.get("reason", "Customer requested Do-Not-Call during voice interaction")
            if contact:
                contact.consent_status = "SUPPRESSED"
            if lead:
                lead.bucket = "SUPPRESSED"
                lead.score = 0
                lead.stage = "LOST"
                lead.notes = f"{lead.notes or ''}\n[DNC SUPPRESSION]: {reason}".strip()
            db.commit()

            return ToolExecutionResult(
                tool_name=tool_name,
                arguments=arguments,
                execution_status="SUCCESS",
                message=f"Contact suppressed and added to DNC list. Lead score dropped to 0 (SUPPRESSED). Reason: {reason}",
                updated_lead={
                    "id": lead.id if lead else None,
                    "stage": "LOST" if lead else None,
                    "score": 0,
                    "bucket": "SUPPRESSED"
                }
            )

    except Exception as e:
        logger.error(f"Error executing CRM tool {tool_name}: {e}", exc_info=True)
        db.rollback()
        return ToolExecutionResult(
            tool_name=tool_name,
            arguments=arguments,
            execution_status="FAILED",
            message=f"Database execution error: {str(e)}"
        )

    return ToolExecutionResult(
        tool_name=tool_name,
        arguments=arguments,
        execution_status="FAILED",
        message="Unknown tool or target lead not found"
    )


class DualEngineVoiceAgent:
    """
    Intelligent Orchestrator:
    - Primary: Groq Cloud LPU (llama-3.1-8b-instant) for <250ms voice speed.
    - Secondary: OpenRouter API (meta-llama/llama-3.3-70b-instruct) for zero-downtime failover on 429.
    - Fallback: Local conversational simulator if offline or keys not configured.
    """

    def __init__(self):
        self.groq_api_key = settings.GROQ_API_KEY.strip() if settings.GROQ_API_KEY else ""
        self.groq_base_url = settings.GROQ_BASE_URL or "https://api.groq.com/openai/v1"
        self.groq_model = settings.GROQ_MODEL or "llama-3.1-8b-instant"

        self.openrouter_api_key = settings.OPENROUTER_API_KEY.strip() if settings.OPENROUTER_API_KEY else ""
        self.openrouter_base_url = settings.OPENROUTER_BASE_URL or "https://openrouter.ai/api/v1"
        self.openrouter_model = settings.OPENROUTER_MODEL or "meta-llama/llama-3.3-70b-instruct"
        self.enable_fallback = settings.ENABLE_FALLBACK

    async def converse(
        self,
        user_message: str,
        conversation_history: List[Dict[str, str]],
        persona: str = "RACHEL_ENTERPRISE",
        lead_id: Optional[int] = None,
        contact_id: Optional[int] = None,
        db: Optional[Session] = None
    ) -> Tuple[str, str, int, List[ToolExecutionResult], bool]:
        """
        Processes a voice turn through Groq -> OpenRouter -> Simulator with dynamic
        Training Studio personas, RAG knowledge base grounded context, and guardrails.
        Returns: (ai_response_text, provider_used, latency_ms, tool_actions_executed, is_call_ended)
        """
        start_time = time.time()

        # 1. Evaluate Dynamic Safety Guardrails First (Pre-turn deflection)
        if db:
            try:
                from app.services.training_service import training_service
                guardrail_hit, deflection_msg = training_service.evaluate_guardrails(db, user_message)
                if guardrail_hit and deflection_msg:
                    latency = int((time.time() - start_time) * 1000)
                    return deflection_msg, "guardrail", latency, [], False
            except Exception as e:
                logger.warning(f"[VoiceAgent] Guardrail evaluation error: {e}")

        # 2. Fetch Dynamic Persona from Training Studio DB
        persona_cfg = None
        if db:
            try:
                from app.models.training import AgentPersonaConfig
                if persona:
                    persona_cfg = db.query(AgentPersonaConfig).filter(
                        (AgentPersonaConfig.persona_code == persona) |
                        (AgentPersonaConfig.name.ilike(f"%{persona}%"))
                    ).first()

                if not persona_cfg:
                    persona_cfg = db.query(AgentPersonaConfig).filter(AgentPersonaConfig.is_default == True).first()
                if not persona_cfg:
                    persona_cfg = db.query(AgentPersonaConfig).first()
            except Exception as e:
                logger.warning(f"[VoiceAgent] Persona DB lookup error: {e}")

        # 3. Retrieve Grounded Knowledge Base Chunks (RAG)
        rag_context = ""
        if db and persona_cfg:
            try:
                from app.services.training_service import training_service
                bound_docs = persona_cfg.bound_document_ids or []
                doc_filter = [int(d) for d in bound_docs if str(d).isdigit()] if bound_docs else None
                kb_chunks = training_service.query_knowledge_base(
                    db=db,
                    query=user_message,
                    document_ids=doc_filter if doc_filter and len(doc_filter) > 0 else None,
                    top_k=3
                )
                if kb_chunks:
                    chunk_texts = [f"• {c['content']} (Source: {c['source_document']})" for c in kb_chunks]
                    rag_context = "\n\nGROUNDED KNOWLEDGE BASE CONTEXT (ONLY ANSWER USING THESE VERIFIED FACTS, NEVER HALLUCINATE):\n" + "\n".join(chunk_texts)
            except Exception as e:
                logger.warning(f"[VoiceAgent] RAG retrieval error: {e}")

        # 4. Build Context from Lead and Contact
        lead_info_text = ""
        if db and (lead_id or contact_id):
            lead = db.query(Lead).filter(Lead.id == lead_id).first() if lead_id else None
            contact = db.query(Contact).filter(Contact.id == contact_id).first() if contact_id else (lead.contact if lead else None)
            if contact:
                lead_info_text += f"\nContact Name: {contact.first_name} {contact.last_name or ''}, Phone: {contact.phone or 'N/A'}, Company: {contact.company.name if contact.company else 'N/A'}."
            if lead:
                lead_info_text += f" Current Stage: {lead.stage}, Stated Deal Value: ₹{lead.deal_value:,.2f}, Score: {lead.score} ({lead.bucket})."

        # 5. Build Dynamic Prompt & Temperature
        language_guideline = (
            "\n\nCRITICAL LIVE TELEPHONY GUIDELINES (STRICT COMPLIANCE REQUIRED):\n"
            "1. ONLY speak in natural, polite Hinglish (Hindi written in English alphabet/Latin script) or pure English.\n"
            "2. NEVER output Devanagari script (no हिंदी अक्षर). Always use Latin letters (e.g. write 'Namaste, main Devdutt AI se Rachel hoon. Hum sales calls automate karte hain.').\n"
            "3. If the user speaks in Hindi or Hinglish, reply in clear, friendly Hinglish.\n"
            "4. If the user speaks in English, reply in fluent English.\n"
            "5. Keep responses concise: 1 to 2 sentences max (telecom latency constraint).\n"
            "6. You MUST ALWAYS produce spoken content. Do NOT return an empty reply.\n"
            "7. Do NOT trigger 'suppress_dnc_contact' unless the user explicitly commands: 'stop calling me', 'remove my number', or 'do not call'.\n"
            "8. ABSOLUTE RULE - ZERO INTERNAL MONOLOGUE: NEVER output internal reasoning, thought processes, planning steps, or commentary like 'The user said...', 'I should...', 'Wait...', 'Let me...'.\n"
            "9. DIRECT SPOKEN DIALOG ONLY: Return ONLY the exact 1-2 sentence spoken dialog that the caller will hear over the phone receiver. Zero explanations, zero meta-commentary."
        )

        if persona_cfg:
            base_system_prompt = (
                f"{persona_cfg.system_prompt}\n"
                f"Conversational Demeanor & Tone: {persona_cfg.tone}."
            )
            creativity_temp = float(persona_cfg.temperature) if persona_cfg.temperature is not None else 0.3
        else:
            base_system_prompt = (
                "You are an elite bilingual AI Executive for Devdutt AI solutions. "
                "Keep spoken replies short, natural, and helpful (1-2 sentences max). Do not use markdown."
            )
            creativity_temp = 0.3

        system_content = f"{base_system_prompt}\n{language_guideline}{rag_context}\n\nLEAD CONTEXT FROM CRM DATABASE:{lead_info_text}"

        # Construct messages payload
        messages = [{"role": "system", "content": system_content}]
        for turn in conversation_history[-8:]:  # Keep recent 8 turns for tight token usage
            role = turn.get("role", "user")
            content = turn.get("content", "")
            if role in ["user", "assistant", "system"] and content:
                messages.append({"role": role, "content": content})

        messages.append({"role": "user", "content": user_message})

        # 1. Attempt Primary: Groq Cloud LPU (<250ms)
        if self.groq_api_key:
            try:
                ai_text, tool_calls = await self._call_llm_api(
                    endpoint=f"{self.groq_base_url}/chat/completions",
                    api_key=self.groq_api_key,
                    model=self.groq_model,
                    messages=messages,
                    tools=CRM_TOOLS,
                    temperature=creativity_temp
                )
                latency = int((time.time() - start_time) * 1000)
                tool_results, is_ended = self._process_tools(tool_calls, lead_id, contact_id, db)
                ai_text = self._sanitize_spoken_dialog(ai_text)
                if not ai_text.strip():
                    ai_text = self._fallback_voice_text_for_tool(tool_calls, user_message)

                # Automatic natural call termination on farewell
                farewell_pattern = r'\b(alvida|shubh ho|shubh din|have a great day|have a nice day|have a good day|goodbye|bye bye|bye)\b'
                if re.search(farewell_pattern, ai_text, re.IGNORECASE) or re.search(r'\b(bye|goodbye|alvida|khatam karo)\b', user_message, re.IGNORECASE):
                    is_ended = True

                return ai_text, "groq", latency, tool_results, is_ended
            except httpx.HTTPStatusError as e:
                logger.warning(f"[VoiceAgent] Groq returned HTTP {e.response.status_code}. Checking OpenRouter fallback...")
            except Exception as e:
                logger.warning(f"[VoiceAgent] Groq connection failed: {e}. Checking OpenRouter fallback...")

        # 2. Attempt Secondary: OpenRouter Fallback
        if self.openrouter_api_key and self.enable_fallback:
            try:
                ai_text, tool_calls = await self._call_llm_api(
                    endpoint=f"{self.openrouter_base_url}/chat/completions",
                    api_key=self.openrouter_api_key,
                    model=self.openrouter_model,
                    messages=messages,
                    tools=CRM_TOOLS,
                    temperature=creativity_temp
                )
                latency = int((time.time() - start_time) * 1000)
                tool_results, is_ended = self._process_tools(tool_calls, lead_id, contact_id, db)
                ai_text = self._sanitize_spoken_dialog(ai_text)
                if not ai_text.strip():
                    ai_text = self._fallback_voice_text_for_tool(tool_calls, user_message)

                farewell_pattern = r'\b(alvida|shubh ho|shubh din|have a great day|have a nice day|have a good day|goodbye|bye bye|bye)\b'
                if re.search(farewell_pattern, ai_text, re.IGNORECASE) or re.search(r'\b(bye|goodbye|alvida|khatam karo)\b', user_message, re.IGNORECASE):
                    is_ended = True

                return ai_text, "openrouter", latency, tool_results, is_ended
            except Exception as e:
                logger.error(f"[VoiceAgent] OpenRouter fallback also failed: {e}")

        # 3. Intelligent Local Voice Simulator (Zero Keys Needed / Offline Development)
        persona_name = persona_cfg.name if persona_cfg else persona
        ai_text, tool_calls, is_ended = self._simulate_sales_turn(user_message, persona_name, lead_info_text, rag_context)
        latency = int((time.time() - start_time) * 1000)
        tool_results = []
        if db:
            tool_results, ended_by_tool = self._process_tools(tool_calls, lead_id, contact_id, db)
            if ended_by_tool:
                is_ended = True

        return ai_text, "mock", latency, tool_results, is_ended

    async def _call_llm_api(
        self,
        endpoint: str,
        api_key: str,
        model: str,
        messages: List[Dict[str, Any]],
        tools: List[Dict[str, Any]],
        temperature: float = 0.3
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """Calls an OpenAI-compatible endpoint (Groq or OpenRouter) with dynamic temperature."""
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model,
            "messages": messages,
            "tools": tools,
            "tool_choice": "auto",
            "temperature": temperature,
            "max_tokens": 250
        }

        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(endpoint, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()

            choice = data["choices"][0]
            message = choice["message"]
            content = message.get("content") or ""
            raw_tool_calls = message.get("tool_calls") or []

            parsed_tools = []
            for tc in raw_tool_calls:
                func = tc.get("function", {})
                name = func.get("name")
                args_str = func.get("arguments", "{}")
                try:
                    args = json.loads(args_str)
                except Exception:
                    args = {}
                parsed_tools.append({"name": name, "arguments": args})

            return content.strip(), parsed_tools

    def _process_tools(
        self,
        tool_calls: List[Dict[str, Any]],
        lead_id: Optional[int],
        contact_id: Optional[int],
        db: Optional[Session]
    ) -> Tuple[List[ToolExecutionResult], bool]:
        """Runs the tools against the DB and returns execution events."""
        results: List[ToolExecutionResult] = []
        is_ended = False
        if not db or not tool_calls:
            return results, is_ended

        for tc in tool_calls:
            name = tc.get("name")
            args = tc.get("arguments", {})
            if name:
                res = execute_crm_tool(name, args, lead_id, contact_id, db)
                results.append(res)
                if name == "suppress_dnc_contact":
                    is_ended = True

        return results, is_ended

    def _fallback_voice_text_for_tool(self, tool_calls: List[Dict[str, Any]], user_message: str) -> str:
        """Ensures the caller ALWAYS hears an intelligent spoken answer even if the model returned only a tool call."""
        for tc in tool_calls:
            name = tc.get("name")
            if name == "suppress_dnc_contact":
                return "Samajh gayi, maine aapka number list se remove kar diya hai. Have a good day!"
            elif name == "schedule_followup_meeting":
                return "Bilkul, maine demo meeting note kar li hai. Hamari team aapse timely connect karegi."
            elif name == "record_commercial_budget":
                return "Maine aapka stated budget note kar liya hai, thank you!"
            elif name == "update_lead_stage":
                return "Maine aapki details CRM me update kar di hain. Aap aur kya jaanna chahte hain?"
        return "Haan ji, main sun rahi hoon. Aap bataiye, main kaise madad kar sakti hoon?"

    def _sanitize_spoken_dialog(self, text: str) -> str:
        """Removes any internal monologue, reasoning, or meta-commentary leaked by reasoning models."""
        if not text:
            return ""
        clean = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL).strip()

        # Intercept raw JSON tool calls leaked as text content
        if clean.startswith("{") and ("function" in clean or "name" in clean):
            logger.warning(f"[VoiceAgent] Leaked JSON tool call intercepted: {clean}")
            try:
                data = json.loads(clean)
                func_name = data.get("function", {}).get("name") or data.get("name")
                if func_name == "record_commercial_budget":
                    return "Maine aapka budget note kar liya hai, thank you! Kya aap demo schedule karna chahenge?"
                elif func_name == "schedule_followup_meeting":
                    return "Bilkul, maine demo meeting note kar li hai. Hamari team aapse timely connect karegi."
            except Exception:
                pass
            return "Maine aapki details note kar li hain, thank you!"

        reasoning_markers = [
            "the user said", "i need to schedule", "wait, looking at", "let me pick",
            "given the context", "actually, i need to", "let's look at the tool",
            "i should probably ask", "since no specific date", "i should have done that",
            "i should probably", "to be professional"
        ]
        lower_clean = clean.lower()
        if any(marker in lower_clean for marker in reasoning_markers):
            logger.warning(f"[VoiceAgent] Leaked model reasoning intercepted and suppressed: {clean[:80]}...")
            # If the model suggested a quoted Hindi/Hinglish dialog at the end, attempt to extract it cleanly
            match = re.search(r':\s*["\']([^"\']{8,})["\']', clean)
            if match and not any(m in match.group(1).lower() for m in ["tool", "schedule_"]):
                return match.group(1).strip()
            return "Theek hai ji, kya aap demo ke liye koi specific time batana chahenge?"

        return clean.strip()

    def _simulate_sales_turn(
        self,
        user_message: str,
        persona: str,
        lead_info: str,
        rag_context: str = ""
    ) -> Tuple[str, List[Dict[str, Any]], bool]:
        """
        Realistic conversational fallback when testing without API keys.
        Understands intent, extracts numeric budgets, detects DND, cites RAG knowledge chunks, and qualifies leads.
        """
        msg = user_message.lower()
        tool_calls = []
        is_ended = False

        # Check if grounded RAG knowledge exists for factual queries
        if rag_context and any(w in msg for w in ["price", "cost", "kitna", "rate", "feature", "document", "faq", "tier", "offer"]):
            rag_lines = [l.strip().lstrip('• ') for l in rag_context.split('\n') if l.strip().startswith('•')]
            if rag_lines:
                clean_fact = rag_lines[0].split('(Source:')[0].strip()
                return (
                    f"Ji bilkul, hamare official documentation ke mutabiq: {clean_fact}. Isme aapka specific requirement kya rahega?",
                    tool_calls,
                    False
                )

        # Check for DND / hostility
        if any(w in msg for w in ["call mat karo", "don't call", "wrong number", "galti se", "not interested", "stop calling"]):
            tool_calls.append({
                "name": "suppress_dnc_contact",
                "arguments": {"reason": "Customer requested DND during call"}
            })
            return (
                "Main samajh gaya sir, asuvidha ke liye maafi chahta hoon. Maine aapka number Do-Not-Call list me daal diya hai. Have a nice day!",
                tool_calls,
                True
            )

        # Check for Budget mentions (numbers like 50000, 5 lakh, 3l, etc.)
        budget_match = re.search(r"(\d+[\d,.]*)\s*(lakh|lac|k|crore|cr)?", msg)
        if budget_match and any(w in msg for w in ["budget", "lakh", "lac", "hazaar", "rupaye", "rupees", "dollar", "$"]):
            raw_num = float(budget_match.group(1).replace(",", ""))
            unit = budget_match.group(2)
            deal_val = raw_num
            if unit in ["lakh", "lac"]:
                deal_val = raw_num * 100000
            elif unit == "k":
                deal_val = raw_num * 1000
            elif unit in ["crore", "cr"]:
                deal_val = raw_num * 10000000

            tool_calls.append({
                "name": "record_commercial_budget",
                "arguments": {"deal_value": deal_val}
            })
            tool_calls.append({
                "name": "update_lead_stage",
                "arguments": {"stage": "QUALIFIED"}
            })
            return (
                f"Bahut badhiya sir! Maine aapka budget ₹{deal_val:,.0f} note kar liya hai aur aapki requirement hamare enterprise plan me fit baithti hai. Kya kal subah 11 baje ek 10 minute ka live demo arrange karein?",
                tool_calls,
                False
            )

        # Check for Demo / Positive Agreement
        if any(w in msg for w in ["demo", "theek hai", "haan", "yes", "sure", "interested", "batao", "dikhao", "schedule"]):
            tool_calls.append({
                "name": "update_lead_stage",
                "arguments": {"stage": "QUALIFIED"}
            })
            tool_calls.append({
                "name": "schedule_followup_meeting",
                "arguments": {"meeting_datetime": "Tomorrow 11:00 AM", "notes": "Client requested product demo"}
            })
            return (
                "Perfect sir! Maine aapke liye kal 11 baje demo schedule kar diya hai aur confirmation WhatsApp/Email par bhej di hai. Aapko product me specific AI calling features dekhne hain ya CRM pipeline?",
                tool_calls,
                False
            )

        # Check for Pricing queries
        if any(w in msg for w in ["price", "cost", "kitna", "rate", "charges"]):
            return (
                "Hamara plan ₹4,999 se start hota hai jisme unlimited calling simulation aur lead scoring included hai. Aapki team me kitne members hain jo ise use karenge?",
                tool_calls,
                False
            )

        # Standard initial greetings / default conversational reply
        return (
            "Ji bilkul sir, Devdutt AI CRM aapki sales team ke calls ko automate karke 3x conversions deta hai. Kya aap abhi manual calling karte hain ya koi software use kar rahe hain?",
            tool_calls,
            False
        )

    async def generate_summary(
        self,
        transcripts: List[Dict[str, str]],
        lead_name: Optional[str] = "Lead"
    ) -> Dict[str, Any]:
        """Generates post-call executive summary, sentiment analysis, and bullet takeaways."""
        dialogue_text = "\n".join([f"{t.get('speaker', 'SPEAKER')}: {t.get('message', '')}" for t in transcripts])
        
        prompt = (
            f"Analyze this sales phone call between an AI Sales Agent and customer '{lead_name}':\n\n"
            f"{dialogue_text}\n\n"
            f"Provide a JSON response with:\n"
            f"1. 'sentiment': either 'POSITIVE', 'NEUTRAL', or 'NEGATIVE'\n"
            f"2. 'summary': 2-sentence executive summary\n"
            f"3. 'key_takeaways': array of 3 concise bullet points\n"
            f"Output strictly valid JSON with no backticks."
        )

        messages = [
            {"role": "system", "content": "You are a CRM sales intelligence analyst. Output strictly valid JSON."},
            {"role": "user", "content": prompt}
        ]

        # Try Groq or OpenRouter
        if self.groq_api_key or (self.openrouter_api_key and self.enable_fallback):
            endpoint = f"{self.groq_base_url}/chat/completions" if self.groq_api_key else f"{self.openrouter_base_url}/chat/completions"
            key = self.groq_api_key or self.openrouter_api_key
            model = self.groq_model if self.groq_api_key else self.openrouter_model
            try:
                content, _ = await self._call_llm_api(endpoint, key, model, messages, [])
                cleaned = re.sub(r"^```json\s*|```$", "", content.strip(), flags=re.MULTILINE)
                return json.loads(cleaned)
            except Exception as e:
                logger.warning(f"Error calling LLM for call summary: {e}")

        # Local intelligent summary rule-based fallback
        full_text = " ".join([t.get("message", "").lower() for t in transcripts])
        sentiment = "POSITIVE" if any(w in full_text for w in ["demo", "budget", "interested", "theek", "yes"]) else \
                    ("NEGATIVE" if any(w in full_text for w in ["dnd", "mat karo", "not interested", "wrong"]) else "NEUTRAL")

        summary = f"Customer interacted regarding Devdutt AI CRM solutions. Discussed requirements and qualified interest level with {sentiment.lower()} sentiment."
        takeaways = [
            f"Call concluded with {sentiment} overall sentiment.",
            "Customer engagement was captured and logged into CRM database.",
            "Next steps recorded in pipeline activity history."
        ]

        return {
            "sentiment": sentiment,
            "summary": summary,
            "key_takeaways": takeaways
        }


voice_agent_service = DualEngineVoiceAgent()
