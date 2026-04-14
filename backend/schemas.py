from pydantic import BaseModel, conlist, Field
from typing import List, Optional

#generator
class Explanation(BaseModel):
    text: str
    grade: int

class MCQ(BaseModel):
    question: str
    options: conlist(str, min_length=4, max_length=4) # Exact 4 options
    correct_index: int = Field(ge=0, le=3)

class TeacherNotes(BaseModel):
    learning_objective: str
    common_misconceptions: List[str]

class DraftContent(BaseModel):
    explanation: Explanation
    mcqs: List[MCQ]
    teacher_notes: TeacherNotes

#reviewer
class ReviewerScores(BaseModel):
    age_appropriateness: int = Field(ge=1, le=5)
    correctness: int = Field(ge=1, le=5)
    clarity: int = Field(ge=1, le=5)
    coverage: int = Field(ge=1, le=5)

class ReviewerFeedbackItem(BaseModel):
    field: str
    issue: str

class ReviewResult(BaseModel):
    scores: ReviewerScores
    pass_: bool = Field(alias="pass")
    feedback: List[ReviewerFeedbackItem]

# trigger
class Tags(BaseModel):
    subject: str
    topic: str
    grade: int
    difficulty: str
    content_type: List[str]
    blooms_level: str

#schemas
class GenerateRequest(BaseModel):
    grade: int
    topic: str
    user_id: Optional[str] = "default_user"
