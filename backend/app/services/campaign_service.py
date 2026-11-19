import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, desc

from app.core.database import SessionLocal
from app.models.contact import Contact
from app.models.lead import Lead
from app.models.telephony import PhoneNumber
from app.models.training import AgentPersonaConfig
from app.models.call_log import CallLog, CallTranscript
from app.models.campaign import Campaign, CampaignRecipient
from app.schemas.campaign_schema import AudienceFilter, CampaignCreate, CampaignUpdate

logger = logging.getLogger(__name__)

# In-memory tracking for running dispatcher tasks
_ACTIVE_DISPATCHERS: Dict[int, bool] = {}


class CampaignService:
    @staticmethod
    def get_audience_preview(db: Session, filters: AudienceFilter) -> Dict[str, Any]:
        """
        Evaluates contacts and leads based on filter criteria, excluding suppressed/opted-out contacts.
        """
        query = db.query(Contact).filter(Contact.is_deleted == False)
        
        # Exclude revoked consent contacts
        query = query.filter(Contact.consent_status != "REVOKED")

        # Join with leads if lead-specific filters are provided
        if filters.stages or filters.min_score is not None:
            query = query.join(Lead, Lead.contact_id == Contact.id)
            
            # Exclude suppressed leads
            query = query.filter(Lead.stage != "SUPPRESSED")
            
            if filters.stages and len(filters.stages) > 0:
                query = query.filter(Lead.stage.in_(filters.stages))
            
            if filters.min_score is not None:
                query = query.filter(Lead.score >= filters.min_score)

        if filters.search:
            search_term = f"%{filters.search}%"
            query = query.filter(
                or_(
                    Contact.first_name.ilike(search_term),
                    Contact.last_name.ilike(search_term),
                    Contact.phone.ilike(search_term),
                    Contact.email.ilike(search_term)
                )
            )

        total_eligible = query.count()
        sample_contacts_db = query.options(joinedload(Contact.company)).limit(5).all()
        contact_ids = [c.id for c in sample_contacts_db]
        leads_map = {l.contact_id: l for l in db.query(Lead).filter(Lead.contact_id.in_(contact_ids)).all()} if contact_ids else {}

        sample_contacts = []
        for c in sample_contacts_db:
            lead = leads_map.get(c.id)
            sample_contacts.append({
                "id": c.id,
                "name": f"{c.first_name} {c.last_name or ''}".strip(),
                "phone": c.phone,
                "company": c.company.name if c.company else None,
                "lead_stage": lead.stage if lead else "NEW",
                "lead_score": lead.score if lead else 0
            })

        return {
            "total_eligible": total_eligible,
            "sample_contacts": sample_contacts
        }

    @staticmethod
    def create_campaign(db: Session, data: CampaignCreate) -> Campaign:
        """
        Creates a new campaign, resolves target audience, and creates recipient queue entries.
        """
        campaign = Campaign(
            name=data.name,
            description=data.description,
            status="DRAFT",
            persona_id=data.persona_id,
            caller_phone_id=data.caller_phone_id,
            target_filters=data.target_filters or {},
            concurrency_limit=data.concurrency_limit,
            calls_per_minute=data.calls_per_minute,
            max_retry_attempts=data.max_retry_attempts,
            retry_cooldown_mins=data.retry_cooldown_mins,
            active_hours_start=data.active_hours_start,
            active_hours_end=data.active_hours_end,
            total_contacts=0,
            completed_count=0,
            connected_count=0,
            qualified_count=0,
            failed_count=0
        )
        db.add(campaign)
        db.flush()

        # Query eligible contacts based on target_filters
        target_filters = data.target_filters or {}
        filter_obj = AudienceFilter(
            stages=target_filters.get("stages"),
            min_score=target_filters.get("min_score"),
            tags=target_filters.get("tags"),
            search=target_filters.get("search")
        )
        
        # Fetch all matching contacts
        query = db.query(Contact).filter(Contact.is_deleted == False, Contact.consent_status != "REVOKED")
        if filter_obj.stages or filter_obj.min_score is not None:
            query = query.join(Lead, Lead.contact_id == Contact.id).filter(Lead.stage != "SUPPRESSED")
            if filter_obj.stages and len(filter_obj.stages) > 0:
                query = query.filter(Lead.stage.in_(filter_obj.stages))
            if filter_obj.min_score is not None:
                query = query.filter(Lead.score >= filter_obj.min_score)

        matching_contacts = query.all()
        contact_ids = [c.id for c in matching_contacts]
        leads_map = {l.contact_id: l.id for l in db.query(Lead.contact_id, Lead.id).filter(Lead.contact_id.in_(contact_ids)).all()} if contact_ids else {}

        recipient_records = []
        for contact in matching_contacts:
            lead_id = leads_map.get(contact.id)
            recipient = CampaignRecipient(
                campaign_id=campaign.id,
                contact_id=contact.id,
                lead_id=lead_id,
                status="QUEUED",
                attempt_count=0
            )
            recipient_records.append(recipient)

        if recipient_records:
            db.bulk_save_objects(recipient_records)
            campaign.total_contacts = len(recipient_records)

        db.commit()
        db.refresh(campaign)
        return campaign

    @staticmethod
    def get_campaign_stats(db: Session) -> Dict[str, Any]:
        """Returns aggregate top metrics for all campaigns."""
        campaigns = db.query(Campaign).filter(Campaign.is_deleted == False).all()
        total_campaigns = len(campaigns)
        active_campaigns = sum(1 for c in campaigns if c.status == "RUNNING")
        total_contacts_queued = sum(c.total_contacts for c in campaigns)
        total_calls_placed = sum(c.completed_count for c in campaigns)
        total_connected = sum(c.connected_count for c in campaigns)
        total_leads_qualified = sum(c.qualified_count for c in campaigns)

        overall_connect_rate = round((total_connected / total_calls_placed * 100), 1) if total_calls_placed > 0 else 0.0

        return {
            "total_campaigns": total_campaigns,
            "active_campaigns": active_campaigns,
            "total_contacts_queued": total_contacts_queued,
            "total_calls_placed": total_calls_placed,
            "overall_connect_rate": overall_connect_rate,
            "total_leads_qualified": total_leads_qualified
        }

    @staticmethod
    def start_campaign(db: Session, campaign_id: int) -> Campaign:
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            raise ValueError("Campaign not found")
        campaign.status = "RUNNING"
        db.commit()
        db.refresh(campaign)

        _ACTIVE_DISPATCHERS[campaign_id] = True
        # Launch async dispatcher loop as background task
        asyncio.create_task(CampaignService._dispatch_worker(campaign_id))
        return campaign

    @staticmethod
    def pause_campaign(db: Session, campaign_id: int) -> Campaign:
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            raise ValueError("Campaign not found")
        campaign.status = "PAUSED"
        db.commit()
        db.refresh(campaign)

        _ACTIVE_DISPATCHERS[campaign_id] = False
        return campaign

    @staticmethod
    def resume_campaign(db: Session, campaign_id: int) -> Campaign:
        return CampaignService.start_campaign(db, campaign_id)

    @staticmethod
    def stop_campaign(db: Session, campaign_id: int) -> Campaign:
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            raise ValueError("Campaign not found")
        campaign.status = "CANCELLED"
        
        # Mark pending queued recipients as CANCELLED
        db.query(CampaignRecipient).filter(
            CampaignRecipient.campaign_id == campaign_id,
            CampaignRecipient.status.in_(["QUEUED", "RETRY_SCHEDULED"])
        ).update({"status": "FAILED", "call_outcome": "CAMPAIGN_CANCELLED"}, synchronize_session=False)

        db.commit()
        db.refresh(campaign)

        _ACTIVE_DISPATCHERS[campaign_id] = False
        return campaign

    @staticmethod
    async def _dispatch_worker(campaign_id: int):
        """
        Background execution engine that paces and dials batch recipients.
        """
        logger.info(f"[CampaignDispatcher] Worker started for campaign {campaign_id}")
        
        while _ACTIVE_DISPATCHERS.get(campaign_id, False):
            db: Session = SessionLocal()
            try:
                campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
                if not campaign or campaign.status != "RUNNING":
                    logger.info(f"[CampaignDispatcher] Campaign {campaign_id} paused or stopped.")
                    break

                # Find next eligible recipient: status QUEUED or RETRY_SCHEDULED where next_retry_at <= now
                now = datetime.utcnow()
                recipient = db.query(CampaignRecipient).filter(
                    CampaignRecipient.campaign_id == campaign_id,
                    or_(
                        CampaignRecipient.status == "QUEUED",
                        and_(
                            CampaignRecipient.status == "RETRY_SCHEDULED",
                            CampaignRecipient.next_retry_at <= now
                        )
                    )
                ).first()

                if not recipient:
                    # Check if any retries remain pending in future
                    pending_retries = db.query(CampaignRecipient).filter(
                        CampaignRecipient.campaign_id == campaign_id,
                        CampaignRecipient.status == "RETRY_SCHEDULED"
                    ).count()

                    if pending_retries == 0:
                        # All recipients completed
                        campaign.status = "COMPLETED"
                        db.commit()
                        logger.info(f"[CampaignDispatcher] Campaign {campaign_id} completed all contacts.")
                        break
                    else:
                        # Wait for next retry window
                        db.close()
                        await asyncio.sleep(5)
                        continue

                # Execute call simulation for this recipient
                recipient.status = "IN_CALL"
                recipient.last_attempt_at = now
                recipient.attempt_count += 1
                db.commit()

                # Get persona greeting and info
                persona = campaign.persona
                persona_name = persona.name if persona else "Rachel Enterprise"
                contact = recipient.contact
                contact_name = f"{contact.first_name} {contact.last_name or ''}".strip() if contact else "Client"

                # Simulate AI conversational execution (takes 1.5s)
                await asyncio.sleep(1.5)

                # Outcome probability: 75% answered, 25% busy/unanswered
                is_answered = (recipient.attempt_count > 1) or (recipient.id % 4 != 0)

                if is_answered:
                    outcome = "ANSWERED"
                    score = min(95, 60 + (recipient.id * 7) % 35)
                    recipient.status = "COMPLETED"
                    recipient.call_outcome = outcome
                    recipient.qualification_score = score

                    # Create CallLog
                    call_log = CallLog(
                        contact_id=recipient.contact_id,
                        lead_id=recipient.lead_id,
                        status="COMPLETED",
                        direction="OUTBOUND",
                        provider_used="groq",
                        duration_seconds=45 + (recipient.id * 13) % 90
                    )
                    db.add(call_log)
                    db.flush()

                    # Add transcript snippet
                    db.add(CallTranscript(
                        call_log_id=call_log.id,
                        speaker="AI_AGENT",
                        message=f"Hello {contact_name}! Calling on behalf of Devdutt AI regarding enterprise outbound automation.",
                        timestamp_offset_ms=0
                    ))
                    db.add(CallTranscript(
                        call_log_id=call_log.id,
                        speaker="LEAD",
                        message="Yes, tell me more about your AI calling platform.",
                        timestamp_offset_ms=2500
                    ))

                    recipient.last_call_log_id = call_log.id
                    campaign.completed_count += 1
                    campaign.connected_count += 1

                    if score >= 70:
                        campaign.qualified_count += 1
                        if recipient.lead:
                            recipient.lead.stage = "QUALIFIED"
                            recipient.lead.score = score
                else:
                    # Busy / No answer
                    outcome = "BUSY"
                    if recipient.attempt_count < campaign.max_retry_attempts:
                        recipient.status = "RETRY_SCHEDULED"
                        recipient.call_outcome = "BUSY"
                        # Set retry cooldown (e.g. 1 minute for demo purposes, or retry_cooldown_mins)
                        recipient.next_retry_at = datetime.utcnow() + timedelta(seconds=15)
                    else:
                        recipient.status = "FAILED"
                        recipient.call_outcome = "UNREACHABLE_MAX_RETRIES"
                        campaign.completed_count += 1
                        campaign.failed_count += 1

                db.commit()

                # Pacing sleep according to calls_per_minute
                pacing_delay = max(1.0, 60.0 / (campaign.calls_per_minute or 10))
                await asyncio.sleep(pacing_delay)

            except Exception as e:
                logger.error(f"[CampaignDispatcher] Error processing campaign {campaign_id}: {e}")
                await asyncio.sleep(2)
            finally:
                db.close()

        _ACTIVE_DISPATCHERS[campaign_id] = False
        logger.info(f"[CampaignDispatcher] Worker exited for campaign {campaign_id}")
