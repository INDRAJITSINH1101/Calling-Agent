import os
from fastapi import APIRouter
from app.core.config import settings
from app.core.database import check_db_connection

router = APIRouter(prefix="/health", tags=["Health & Diagnostics"])

# In-memory emergency stop flag (can be moved to DB / Redis in later phases)
emergency_state = {
    "is_stopped": False,
    "triggered_at": None,
    "reason": None
}

@router.get("")
def get_system_health():
    """
    Returns the real-time operational status of DEVDUTT AI Backend,
    including PostgreSQL 18 database connectivity and storage directory checks.
    """
    db_status = check_db_connection()
    
    storage_check = {
        "recordings": os.path.exists(settings.RECORDINGS_DIR),
        "knowledge": os.path.exists(settings.KNOWLEDGE_DIR),
        "exports": os.path.exists(settings.EXPORTS_DIR)
    }
    
    return {
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "healthy" if db_status.get("status") == "connected" else "degraded",
        "database": db_status,
        "storage": storage_check,
        "llm_provider": settings.LLM_PROVIDER,
        "groq_configured": bool(settings.GROQ_API_KEY),
        "emergency_stop": emergency_state
    }

@router.post("/emergency-stop")
def trigger_emergency_stop():
    """
    Toggles the Emergency Stop kill-switch. When active, all automated
    calling campaigns and agent dials are instantly halted.
    """
    from datetime import datetime
    emergency_state["is_stopped"] = not emergency_state["is_stopped"]
    emergency_state["triggered_at"] = datetime.utcnow().isoformat() if emergency_state["is_stopped"] else None
    emergency_state["reason"] = "Operator triggered manual kill-switch from CRM Dashboard" if emergency_state["is_stopped"] else None
    
    return {
        "message": "Emergency Stop ACTIVATED. All calls halted." if emergency_state["is_stopped"] else "Emergency Stop RELEASED. System normal.",
        "emergency_state": emergency_state
    }
