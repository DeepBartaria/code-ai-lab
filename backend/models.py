import uuid
import json
from sqlalchemy import Column, String, Text, DateTime
from backend.database import Base
from datetime import datetime, timezone

class RunArtifactModel(Base):
    __tablename__ = "run_artifacts"

    run_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    input_data = Column(Text, nullable=False)
    attempts = Column(Text, nullable=False) 
    final = Column(Text, nullable=False)   
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    finished_at = Column(DateTime, nullable=True)

    def to_dict(self):
        return {
            "run_id": self.run_id,
            "input": json.loads(self.input_data) if self.input_data else {},
            "attempts": json.loads(self.attempts) if self.attempts else [],
            "final": json.loads(self.final) if self.final else {},
            "timestamps": {
                "started_at": self.started_at.isoformat() if self.started_at else None,
                "finished_at": self.finished_at.isoformat() if self.finished_at else None,
            }
        }
