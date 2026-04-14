from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from backend.database import engine, Base, get_db
from backend.schemas import GenerateRequest
from backend.models import RunArtifactModel
from backend.orchestrator import PipelineOrchestrator
from dotenv import load_dotenv

import os
load_dotenv() 

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Code AI Lab Pipeline API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/generate")
def generate_content(request: GenerateRequest, db: Session = Depends(get_db)):
    orchestrator = PipelineOrchestrator(db)
    result = orchestrator.run_pipeline(request)
    return result

@app.get("/api/history")
def get_history(user_id: str, db: Session = Depends(get_db)):

    artifacts = db.query(RunArtifactModel).order_by(RunArtifactModel.started_at.desc()).all()
    filtered = [a.to_dict() for a in artifacts if f'"user_id": "{user_id}"' in a.input_data or f'"user_id":"{user_id}"' in a.input_data]
    return {"user_id": user_id, "history": filtered}
