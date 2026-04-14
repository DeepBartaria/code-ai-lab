import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from backend.main import app, get_db
from backend.database import Base, engine
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Setup test DB
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
test_engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

Base.metadata.create_all(bind=test_engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

from backend.schemas import DraftContent, Explanation, MCQ, TeacherNotes, ReviewResult, ReviewerScores, ReviewerFeedbackItem, Tags
from backend.agents import SchemaValidationError

def valid_draft() -> DraftContent:
    return DraftContent(
        explanation=Explanation(text="valid", grade=5),
        mcqs=[MCQ(question="test?", options=["a","b","c","d"], correct_index=0)],
        teacher_notes=TeacherNotes(learning_objective="obj", common_misconceptions=["misc"])
    )

def valid_review(pass_: bool) -> ReviewResult:
    return ReviewResult(**{
        "scores": {
            "age_appropriateness": 5, "correctness": 5, "clarity": 5, "coverage": 5
        },
        "pass": pass_,
        "feedback": [] if pass_ else [{"field": "test", "issue": "bad"}]
    })

def valid_tags() -> Tags:
    return Tags(subject="Math", topic="Fraction", grade=5, difficulty="Easy", content_type=["x"], blooms_level="y")

@patch('backend.agents.GeneratorAgent.generate')
def test_schema_validation_failure_handling(mock_generate):
    mock_generate.side_effect = SchemaValidationError("Mocked schema failure")
    
    response = client.post("/api/generate", json={"grade": 5, "topic": "test", "user_id": "tester"})
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["final"]["status"] == "rejected_schema_error"

@patch('backend.agents.TaggerAgent.tag')
@patch('backend.agents.RefinerAgent.refine')
@patch('backend.agents.ReviewerAgent.review')
@patch('backend.agents.GeneratorAgent.generate')
def test_fail_refine_pass_orchestration(mock_gen, mock_rev, mock_ref, mock_tag):
    mock_gen.return_value = valid_draft()
    mock_rev.side_effect = [valid_review(pass_=False), valid_review(pass_=True)]
    mock_ref.return_value = valid_draft()
    mock_tag.return_value = valid_tags()

    response = client.post("/api/generate", json={"grade": 5, "topic": "test", "user_id": "tester"})
    assert response.status_code == 200
    res_data = response.json()
    
    attempts = res_data["attempts"]
    assert len(attempts) == 2
    assert res_data["final"]["status"] == "approved"
    assert res_data["final"]["tags"]["subject"] == "Math"

@patch('backend.agents.TaggerAgent.tag')
@patch('backend.agents.RefinerAgent.refine')
@patch('backend.agents.ReviewerAgent.review')
@patch('backend.agents.GeneratorAgent.generate')
def test_fail_refine_fail_reject_orchestration(mock_gen, mock_rev, mock_ref, mock_tag):
    mock_gen.return_value = valid_draft()
    # Attempt 1, Attempt 2, Attempt 3
    mock_rev.side_effect = [valid_review(pass_=False), valid_review(pass_=False), valid_review(pass_=False)]
    mock_ref.side_effect = [valid_draft(), valid_draft()]

    response = client.post("/api/generate", json={"grade": 5, "topic": "test", "user_id": "tester"})
    assert response.status_code == 200
    res_data = response.json()
    
    attempts = res_data["attempts"]
    assert len(attempts) == 3 
    assert res_data["final"]["status"] == "rejected"
