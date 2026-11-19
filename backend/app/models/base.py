import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean

def generate_uuid() -> str:
    return str(uuid.uuid4())

class TimeStampedModel:
    """Mixin for models requiring created_at and updated_at timestamps."""
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    deleted_at = Column(DateTime, nullable=True, index=True)
    is_deleted = Column(Boolean, default=False, nullable=False, index=True)

    def soft_delete(self):
        """Marks the record as soft-deleted with current UTC timestamp."""
        now = datetime.utcnow()
        self.is_deleted = True
        self.deleted_at = now
        self.updated_at = now

    def restore(self):
        """Restores a soft-deleted record back to active state."""
        self.is_deleted = False
        self.deleted_at = None
        self.updated_at = datetime.utcnow()
