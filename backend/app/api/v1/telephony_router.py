from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, desc

from app.core.database import get_db
from app.models.telephony import SipTrunk, PhoneNumber, InboundRoutingConfig
from app.schemas.telephony_schema import (
    SipTrunkCreate,
    SipTrunkUpdate,
    SipTrunkOut,
    PhoneNumberCreate,
    PhoneNumberUpdate,
    PhoneNumberOut,
    TelephonySummaryOut,
    TrunkTestResultOut,
    TestCallRequest,
    TestCallResultOut,
    InboundRoutingConfigOut,
    InboundRoutingConfigUpdate,
    InboundCallLogItem
)
from app.services.telephony_service import telephony_service

router = APIRouter(prefix="/telephony", tags=["SIP & Phone Numbers Telephony"])


@router.get("/summary", response_model=TelephonySummaryOut)
def get_telephony_summary(db: Session = Depends(get_db)):
    """Returns top KPI metrics for SIP trunks, DIDs, active channels, and carrier latency."""
    telephony_service.seed_default_telephony(db)

    trunks = db.query(SipTrunk).filter(SipTrunk.is_deleted == False).all()
    numbers = db.query(PhoneNumber).filter(PhoneNumber.is_deleted == False).all()

    total_trunks = len(trunks)
    active_trunks = sum(1 for t in trunks if t.status == "ACTIVE")
    total_numbers = len(numbers)
    max_concurrency = sum(t.concurrency_limit for t in trunks if t.status == "ACTIVE") or 20
    
    # Calculate average roundtrip latency
    latencies = [t.latency_ms for t in trunks if t.latency_ms > 0]
    avg_latency = int(sum(latencies) / len(latencies)) if latencies else 42

    # Simulated active voice channels in-use
    active_channels = 1 if total_numbers > 0 else 0

    return TelephonySummaryOut(
        total_trunks=total_trunks,
        active_trunks=active_trunks,
        total_numbers=total_numbers,
        active_channels=active_channels,
        max_concurrency=max_concurrency,
        avg_latency_ms=avg_latency
    )


# -------------------------------------------------------------
# SIP TRUNKS ENDPOINTS
# -------------------------------------------------------------

@router.get("/trunks", response_model=List[SipTrunkOut])
def list_sip_trunks(db: Session = Depends(get_db)):
    """Returns all active SIP trunks."""
    telephony_service.seed_default_telephony(db)
    trunks = db.query(SipTrunk).filter(SipTrunk.is_deleted == False).order_by(desc(SipTrunk.is_default), desc(SipTrunk.id)).all()
    return trunks


@router.post("/trunks", response_model=SipTrunkOut, status_code=status.HTTP_201_CREATED)
def create_sip_trunk(payload: SipTrunkCreate, db: Session = Depends(get_db)):
    """Creates a new SIP trunk gateway."""
    # If set as default, remove default from others
    if payload.is_default:
        db.query(SipTrunk).filter(SipTrunk.is_deleted == False).update({"is_default": False})

    new_trunk = SipTrunk(
        name=payload.name.strip(),
        provider=payload.provider.upper(),
        sip_server=payload.sip_server.strip(),
        transport=payload.transport.upper(),
        username=payload.username.strip() if payload.username else None,
        password_hash=payload.password if payload.password else None,
        auth_method=payload.auth_method.upper(),
        concurrency_limit=payload.concurrency_limit,
        codecs=payload.codecs,
        is_default=payload.is_default,
        status="ACTIVE",
        latency_ms=38
    )
    db.add(new_trunk)
    db.commit()
    db.refresh(new_trunk)
    return new_trunk


@router.put("/trunks/{trunk_id}", response_model=SipTrunkOut)
def update_sip_trunk(trunk_id: int, payload: SipTrunkUpdate, db: Session = Depends(get_db)):
    """Updates an existing SIP trunk."""
    trunk = db.query(SipTrunk).filter(SipTrunk.id == trunk_id, SipTrunk.is_deleted == False).first()
    if not trunk:
        raise HTTPException(status_code=404, detail="SIP Trunk not found")

    if payload.is_default:
        db.query(SipTrunk).filter(SipTrunk.id != trunk_id, SipTrunk.is_deleted == False).update({"is_default": False})

    update_data = payload.model_dump(exclude_unset=True)
    if "password" in update_data and update_data["password"]:
        update_data["password_hash"] = update_data.pop("password")
    elif "password" in update_data:
        del update_data["password"]

    for key, value in update_data.items():
        setattr(trunk, key, value)

    db.commit()
    db.refresh(trunk)
    return trunk


@router.delete("/trunks/{trunk_id}", response_model=dict)
def delete_sip_trunk(trunk_id: int, db: Session = Depends(get_db)):
    """Soft deletes a SIP trunk."""
    trunk = db.query(SipTrunk).filter(SipTrunk.id == trunk_id, SipTrunk.is_deleted == False).first()
    if not trunk:
        raise HTTPException(status_code=404, detail="SIP Trunk not found")

    trunk.soft_delete()
    db.commit()
    return {"message": f"SIP Trunk '{trunk.name}' deleted successfully", "id": trunk_id}


@router.post("/trunks/{trunk_id}/test", response_model=TrunkTestResultOut)
def test_sip_trunk(trunk_id: int, db: Session = Depends(get_db)):
    """Runs an instant connectivity and latency test on the SIP trunk."""
    trunk = db.query(SipTrunk).filter(SipTrunk.id == trunk_id, SipTrunk.is_deleted == False).first()
    if not trunk:
        raise HTTPException(status_code=404, detail="SIP Trunk not found")

    return telephony_service.test_sip_connectivity(trunk, db)


# -------------------------------------------------------------
# PHONE NUMBERS (DID) ENDPOINTS
# -------------------------------------------------------------

@router.get("/numbers")
def list_phone_numbers(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    trunk_id: Optional[int] = Query(None),
    type: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Returns paginated phone numbers with attached SIP trunk details."""
    telephony_service.seed_default_telephony(db)

    query = db.query(PhoneNumber).filter(PhoneNumber.is_deleted == False)

    if trunk_id:
        query = query.filter(PhoneNumber.sip_trunk_id == trunk_id)
    if type:
        query = query.filter(PhoneNumber.type == type.upper())
    if search:
        pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                PhoneNumber.number.ilike(pattern),
                PhoneNumber.label.ilike(pattern),
                PhoneNumber.assigned_agent_persona.ilike(pattern)
            )
        )

    total = query.count()
    numbers = (
        query.options(joinedload(PhoneNumber.sip_trunk))
        .order_by(desc(PhoneNumber.is_default_outbound), desc(PhoneNumber.id))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = []
    for num in numbers:
        item_dict = {
            "id": num.id,
            "number": num.number,
            "label": num.label,
            "country_code": num.country_code,
            "sip_trunk_id": num.sip_trunk_id,
            "sip_trunk_name": num.sip_trunk.name if num.sip_trunk else "No Trunk Attached",
            "type": num.type,
            "assigned_agent_persona": num.assigned_agent_persona,
            "status": num.status,
            "business_hours_start": num.business_hours_start,
            "business_hours_end": num.business_hours_end,
            "fallback_action": num.fallback_action,
            "fallback_forward_number": num.fallback_forward_number,
            "is_default_outbound": num.is_default_outbound,
            "monthly_cost": num.monthly_cost,
            "created_at": num.created_at,
            "updated_at": num.updated_at
        }
        items.append(item_dict)

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": items
    }


@router.post("/numbers", response_model=PhoneNumberOut, status_code=status.HTTP_201_CREATED)
def create_phone_number(payload: PhoneNumberCreate, db: Session = Depends(get_db)):
    """Attaches and provisions a new phone number."""
    if payload.is_default_outbound:
        db.query(PhoneNumber).filter(PhoneNumber.is_deleted == False).update({"is_default_outbound": False})

    new_number = PhoneNumber(
        number=payload.number.strip(),
        label=payload.label.strip(),
        country_code=payload.country_code.upper(),
        sip_trunk_id=payload.sip_trunk_id,
        type=payload.type.upper(),
        assigned_agent_persona=payload.assigned_agent_persona,
        status=payload.status.upper(),
        business_hours_start=payload.business_hours_start,
        business_hours_end=payload.business_hours_end,
        fallback_action=payload.fallback_action.upper(),
        fallback_forward_number=payload.fallback_forward_number,
        is_default_outbound=payload.is_default_outbound,
        monthly_cost=payload.monthly_cost
    )
    db.add(new_number)
    db.commit()
    db.refresh(new_number)
    return new_number


@router.put("/numbers/{number_id}", response_model=PhoneNumberOut)
def update_phone_number(number_id: int, payload: PhoneNumberUpdate, db: Session = Depends(get_db)):
    """Updates routing rules, assigned persona, or fallback configuration on a phone number."""
    number = db.query(PhoneNumber).filter(PhoneNumber.id == number_id, PhoneNumber.is_deleted == False).first()
    if not number:
        raise HTTPException(status_code=404, detail="Phone number record not found")

    if payload.is_default_outbound:
        db.query(PhoneNumber).filter(PhoneNumber.id != number_id, PhoneNumber.is_deleted == False).update({"is_default_outbound": False})

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(number, key, value)

    db.commit()
    db.refresh(number)
    return number


@router.delete("/numbers/{number_id}", response_model=dict)
def delete_phone_number(number_id: int, db: Session = Depends(get_db)):
    """Soft deletes a phone number."""
    number = db.query(PhoneNumber).filter(PhoneNumber.id == number_id, PhoneNumber.is_deleted == False).first()
    if not number:
        raise HTTPException(status_code=404, detail="Phone number record not found")

    number.soft_delete()
    db.commit()
    return {"message": f"Phone Number '{number.number}' released successfully", "id": number_id}


# -------------------------------------------------------------
# TEST CALL SIMULATION
# -------------------------------------------------------------

@router.post("/test-call", response_model=TestCallResultOut)
def initiate_test_call(payload: TestCallRequest, db: Session = Depends(get_db)):
    """Simulates a test call handshake to verify audio packet latency and codec negotiation."""
    trunk = None
    if payload.trunk_id:
        trunk = db.query(SipTrunk).filter(SipTrunk.id == payload.trunk_id, SipTrunk.is_deleted == False).first()
    else:
        trunk = db.query(SipTrunk).filter(SipTrunk.is_default == True, SipTrunk.is_deleted == False).first()

    return telephony_service.simulate_test_call(
        target_phone=payload.target_phone,
        trunk=trunk,
        persona=payload.persona or "enterprise_sales"
    )


# -------------------------------------------------------------
# INBOUND ROUTING WORKFLOW & LIVE CALL RESOLUTION ENDPOINTS
# -------------------------------------------------------------

@router.get("/routing/config", response_model=InboundRoutingConfigOut)
def get_routing_config(db: Session = Depends(get_db)):
    """Returns global inbound call routing rules, business hours, and fallback configuration."""
    return telephony_service.get_or_create_routing_config(db)


@router.put("/routing/config", response_model=InboundRoutingConfigOut)
def update_routing_config(payload: InboundRoutingConfigUpdate, db: Session = Depends(get_db)):
    """Updates database-backed inbound routing parameters (Business hours, human forward number, etc.)."""
    cfg = telephony_service.get_or_create_routing_config(db)
    
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(cfg, key, value)
    
    db.commit()
    db.refresh(cfg)
    return cfg


@router.get("/routing/inbound-calls", response_model=List[InboundCallLogItem])
def get_recent_inbound_calls(limit: int = Query(15, ge=1, le=50), db: Session = Depends(get_db)):
    """Returns database call logs for all inbound phone calls with routing resolution tags."""
    return telephony_service.get_inbound_calls(db, limit=limit)

