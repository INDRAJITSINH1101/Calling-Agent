import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.core.database import Base, engine
import app.models
from app.api.v1.health_router import router as health_router
from app.api.v1.contacts_router import router as contacts_router
from app.api.v1.leads_router import router as leads_router
from app.api.v1.scoring_rules_router import router as scoring_rules_router
from app.api.v1.constants_router import router as constants_router
from app.api.v1.calls_router import router as calls_router
from app.api.v1.telephony_router import router as telephony_router
from app.api.v1.telephony_bridge_router import router as telephony_bridge_router
from app.api.v1.training_router import router as training_router
from app.api.v1.campaigns_router import router as campaigns_router
from app.api.v1.dashboard_router import router as dashboard_router

logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Unified Enterprise CRM with Integrated AI Calling Agent, PostgreSQL 18, and Groq LLM",
    docs_url="/docs",
    redoc_url="/redoc"
)

@app.on_event("startup")
def on_startup():
    try:
        from app.core.database import active_engine_name, run_schema_migrations
        Base.metadata.create_all(bind=engine)
        run_schema_migrations(engine)
        logger.info(f"{active_engine_name.capitalize()} database tables and soft-delete columns verified/created successfully.")
    except Exception as e:
        logger.warning(f"Could not initialize database tables on startup: {e}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=settings.CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(settings.RECORDINGS_DIR, exist_ok=True)
app.mount("/recordings", StaticFiles(directory=settings.RECORDINGS_DIR), name="recordings")

app.include_router(health_router, prefix="/api/v1")
app.include_router(contacts_router, prefix="/api/v1")
app.include_router(leads_router, prefix="/api/v1")
app.include_router(scoring_rules_router, prefix="/api/v1")
app.include_router(constants_router, prefix="/api/v1")
app.include_router(calls_router, prefix="/api/v1")
app.include_router(telephony_router, prefix="/api/v1")
app.include_router(telephony_bridge_router, prefix="/api/v1")
app.include_router(training_router, prefix="/api/v1")
app.include_router(campaigns_router, prefix="/api/v1")
app.include_router(dashboard_router, prefix="/api/v1")

@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "online",
        "docs": "/docs",
        "health": "/api/v1/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=settings.DEBUG)
