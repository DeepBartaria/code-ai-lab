import os
import json
from google import genai
from pydantic import ValidationError
from backend.schemas import DraftContent, ReviewResult, Tags
from google.genai.errors import APIError

def get_client() -> genai.Client:
    return genai.Client(api_key=os.environ.get("VITE_GEMINI_API_KEY", os.environ.get("GEMINI_API_KEY")))

class SchemaValidationError(Exception):
    pass

class GeneratorAgent:
    @staticmethod
    def generate(grade: int, topic: str, retry_count: int = 0) -> DraftContent:
        client = get_client()
        prompt = (
            f"You are an expert educational content creator for grade {grade}.\n"
            f"Generate draft educational content for the topic: '{topic}'.\n"
            "Language must precisely match the grade level.\n"
            "Concepts must be completely correct and easy to understand.\n"
        )
        
        try:
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config={
                    'response_mime_type': 'application/json',
                    'response_schema': DraftContent,
                    'temperature': 0.2,
                }
            )
            return DraftContent.model_validate_json(response.text)
        except (ValidationError, json.JSONDecodeError) as e:
            if retry_count < 1:
                return GeneratorAgent.generate(grade, topic, retry_count + 1)
            raise SchemaValidationError(f"Generator schema validation failed after 1 retry. {e}")

class ReviewerAgent:
    @staticmethod
    def review(grade: int, draft: DraftContent) -> ReviewResult:
        client = get_client()
        prompt = (
            f"You are an expert Educational Reviewer scaling the quality of content for grade {grade} students.\n"
            "Review the following content carefully based on these criteria:\n"
            "1. Age appropriateness\n2. Conceptual correctness\n3. Clarity\n4. Coverage\n\n"
            f"Content Output:\n{draft.model_dump_json()}\n\n"
            "Evaluate the content. Assign scores 1-5 for each criteria.\n"
            "Set 'pass' to true ONLY if ALL scores are >= 4. Otherwise 'pass' is false.\n"
            "If 'pass' is false, you MUST provide at least one feedback item referencing a specific field (e.g. 'explanation.text') and the issue."
        )
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config={
                'response_mime_type': 'application/json',
                'response_schema': ReviewResult,
                'temperature': 0.1,
            }
        )
        # Ensure fallback to schema manually if needed
        try:
            return ReviewResult.model_validate_json(response.text)
        except (ValidationError, json.JSONDecodeError) as e:
            # If the model randomly fails to produce ReviewResult, fail gracefully or treat as fail
            # Reviewer might not have retries mandated, but let's just raise
            raise SchemaValidationError(f"Reviewer schema validation failed. {e}")

class RefinerAgent:
    @staticmethod
    def refine(grade: int, topic: str, draft: DraftContent, feedback: list) -> DraftContent:
        client = get_client()
        feedback_str = "\n".join([f"- {f.field}: {f.issue}" for f in feedback])
        prompt = (
            f"You are an expert educational content creator for grade {grade}.\n"
            f"You previously generated content for the topic '{topic}' which received the following reviewer feedback:\n"
            f"{feedback_str}\n\n"
            f"Previous Draft Output:\n{draft.model_dump_json()}\n\n"
            "Based on the feedback, refine your output and fix all the issues while ensuring strictly valid JSON format."
        )
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config={
                'response_mime_type': 'application/json',
                'response_schema': DraftContent,
                'temperature': 0.2,
            }
        )
        try:
            return DraftContent.model_validate_json(response.text)
        except (ValidationError, json.JSONDecodeError) as e:
            raise SchemaValidationError(f"Refiner schema validation failed. {e}")

class TaggerAgent:
    @staticmethod
    def tag(draft: DraftContent) -> Tags:
        client = get_client()
        prompt = (
            "You are an automated curriculum tagger.\n"
            "Read the following educational content and classify it with appropriate tags.\n"
            f"{draft.model_dump_json()}"
        )
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config={
                'response_mime_type': 'application/json',
                'response_schema': Tags,
                'temperature': 0.1,
            }
        )
        try:
            return Tags.model_validate_json(response.text)
        except (ValidationError, json.JSONDecodeError) as e:
            raise SchemaValidationError(f"Tagger schema validation failed. {e}")
