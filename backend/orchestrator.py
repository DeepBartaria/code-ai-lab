import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from backend.models import RunArtifactModel
from backend.agents import GeneratorAgent, ReviewerAgent, RefinerAgent, TaggerAgent, SchemaValidationError
from backend.schemas import GenerateRequest

class PipelineOrchestrator:
    def __init__(self, db: Session):
        self.db = db

    def run_pipeline(self, request: GenerateRequest) -> dict:

        db_artifact = RunArtifactModel(
            input_data=request.model_dump_json(),
            attempts="[]",
            final="{}"
        )
        self.db.add(db_artifact)
        self.db.commit()
        self.db.refresh(db_artifact)

        attempts_log = []
        final_state = {"status": "rejected", "content": None, "tags": None}

        try:
            # Attempt 1:
            draft = GeneratorAgent.generate(request.grade, request.topic)
            review = ReviewerAgent.review(request.grade, draft)
            
            attempt_record = {
                "attempt": 1,
                "draft": draft.model_dump(),
                "review": review.model_dump(by_alias=True),
                "refined": None
            }
            attempts_log.append(attempt_record)

            current_draft = draft
            current_review = review
            attempt_count = 1

            # Refinement Loop 
            while not current_review.pass_ and attempt_count <= 2:
                attempt_count += 1
                refined = RefinerAgent.refine(
                    request.grade, 
                    request.topic, 
                    current_draft, 
                    current_review.feedback
                )
                
              
                current_draft = refined
                current_review = ReviewerAgent.review(request.grade, current_draft)

                refine_record = {
                    "attempt": attempt_count,
                    "draft": None, 
                    "review": current_review.model_dump(by_alias=True),
                    "refined": refined.model_dump()
                }
                attempts_log.append(refine_record)

            if current_review.pass_:
                tags = TaggerAgent.tag(current_draft)
                final_state = {
                    "status": "approved",
                    "content": current_draft.model_dump(),
                    "tags": tags.model_dump()
                }
            else:
                final_state["status"] = "rejected"
                
        except SchemaValidationError as e:
            final_state["status"] = "rejected_schema_error"
            final_state["error"] = str(e)
        except Exception as e:
            final_state["status"] = "error"
            final_state["error"] = str(e)

        db_artifact.attempts = json.dumps(attempts_log)
        db_artifact.final = json.dumps(final_state)
        db_artifact.finished_at = datetime.now(timezone.utc)

        self.db.commit()
        self.db.refresh(db_artifact)

        return db_artifact.to_dict()
