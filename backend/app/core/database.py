import os
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

logger = logging.getLogger(__name__)

Base = declarative_base()

_postgres_error: str | None = None
active_engine_name: str = "postgresql"

def _initialize_engine():
    global _postgres_error, active_engine_name
    
    try:
        pg_engine = create_engine(
            settings.DATABASE_URL,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
            echo=False,
            connect_args={"connect_timeout": 2}
        )
        with pg_engine.connect() as conn:
            conn.execute(text("SELECT 1;"))
        logger.info(f"Connected to PostgreSQL 18 on port {settings.POSTGRES_PORT}.")
        active_engine_name = "postgresql"
        _postgres_error = None
        return pg_engine
    except Exception as e:
        _postgres_error = str(e)
        logger.warning(
            f"PostgreSQL 18 connection failed ({e}). "
            "Falling back to local SQLite so the CRM remains fully functional without crashing."
        )
        active_engine_name = "sqlite"
        sqlite_file = os.path.join(settings.STORAGE_DIR, "devdutt_crm.db")
        sqlite_engine = create_engine(
            f"sqlite:///{sqlite_file}",
            echo=False,
            connect_args={"check_same_thread": False}
        )
        return sqlite_engine

engine = _initialize_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """
    FastAPI dependency that yields a SQLAlchemy database session
    and closes it automatically after request completion.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def check_db_connection() -> dict:
    """
    Utility to verify database accessibility.
    Returns diagnostic details for active engine (PostgreSQL or SQLite fallback).
    """
    global _postgres_error, active_engine_name
    
    try:
        with engine.connect() as conn:
            if active_engine_name == "postgresql":
                result = conn.execute(text("SELECT version();")).fetchone()
                return {
                    "status": "connected",
                    "engine": "postgresql",
                    "database": settings.POSTGRES_DB,
                    "host": settings.POSTGRES_HOST,
                    "port": settings.POSTGRES_PORT,
                    "version": result[0] if result else "PostgreSQL 18"
                }
            else:
                return {
                    "status": "connected",
                    "engine": "sqlite",
                    "database": "devdutt_crm.db",
                    "storage_dir": settings.STORAGE_DIR,
                    "postgres_status": "disconnected",
                    "postgres_error": _postgres_error,
                    "hint": f"PostgreSQL 18 is running on port {settings.POSTGRES_PORT}. Set POSTGRES_PASSWORD in backend/.env to connect."
                }
    except Exception as e:
        logger.warning(f"Database health check warning: {e}")
        return {
            "status": "disconnected",
            "error": str(e),
            "hint": f"Check if PostgreSQL 18 is accessible on port {settings.POSTGRES_PORT}."
        }

def run_schema_migrations(target_engine=None):
    """
    Auto-migrates existing tables to ensure audit columns (updated_at, deleted_at, is_deleted)
    exist across all tables without dropping data.
    """
    from sqlalchemy import inspect
    
    if target_engine is None:
        target_engine = engine

    tables = ["companies", "contacts", "leads", "scoring_rules", "call_logs", "call_transcripts"]
    
    with target_engine.connect() as conn:
        inspector = inspect(target_engine)
        existing_tables = inspector.get_table_names()
        
        for table in tables:
            if table not in existing_tables:
                continue
                
            cols = [c["name"] for c in inspector.get_columns(table)]
            
            # 1. updated_at
            if "updated_at" not in cols:
                try:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN updated_at TIMESTAMP NULL;"))
                    conn.execute(text(f"UPDATE {table} SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL;"))
                    logger.info(f"Added updated_at column to {table}")
                except Exception as e:
                    logger.warning(f"Could not add updated_at to {table}: {e}")

            # 2. deleted_at
            if "deleted_at" not in cols:
                try:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN deleted_at TIMESTAMP NULL;"))
                    logger.info(f"Added deleted_at column to {table}")
                except Exception as e:
                    logger.warning(f"Could not add deleted_at to {table}: {e}")

            # 3. is_deleted
            if "is_deleted" not in cols:
                try:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE;"))
                    logger.info(f"Added is_deleted column to {table}")
                except Exception as e:
                    logger.warning(f"Could not add is_deleted to {table}: {e}")

        conn.commit()


