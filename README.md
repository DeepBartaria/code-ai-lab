# Governed, Auditable AI Content Pipeline

This repository provisions a full-stack educational content pipeline where generative AI agents operate via a deterministic pipeline backed by strict output validation (Pydantic), bounds on retries, and comprehensive auditability using PostgreSQL (Supabase).

## Agent Roles

1. **Generator Agent**: Responsible for drafting the initial educational content payload. It strictly outputs a specific JSON schema consisting of explanation text, multiple-choice questions (exactly 4 options, 1 valid `correct_index`), and teacher notes. If it fails structural schema validation, it is allowed exactly *one* retry before failing the entire run gracefully.
2. **Reviewer Agent (Gatekeeper)**: Evaluates the draft on four dimensions: Age Appropriateness, Correctness, Clarity, and Coverage. Outputs quantitative scores (1-5) and specific field-level actionable feedback.
3. **Refiner Agent**: Receives a failed draft and the specific feedback from the Reviewer. It is bound to a maximum of *two* refinement shots per pipeline run. If it cannot correct the output after two attempts, the pipeline finishes with a `rejected` status.
4. **Tagger Agent**: Applied *only* to approved content. It deterministically classifies the output by Subject, Difficulty, and Bloom's Taxonomy Level.

## Pass/Fail Criteria

To be approved, a draft must score at least **4 out of 5** across **all four metrics** assigned by the Reviewer Agent. Any score $\le 3$ results in a failure loop, forcing precisely targeted refinement via the Refiner Agent based on the field-specific feedback provided.

## Orchestration Decisions

The system opts for a highly deterministic procedural `while` loop architecture rather than an unconstrained "agentic loop."
- **Initialization**: A single pipeline run is recorded synchronously in a PostgreSQL database (Supabase) using an overarching `RunArtifact`.
- **Bounded loops**: The refinement cycle guarantees absolute completion without infinite loops by strictly capping attempts at a maximum of two. 
- **Tracing**: Every generation payload, qualitative feedback score, and refinement iteration is incrementally appended to the `RunArtifact`'s attempts array, preserving a 100% auditable lifecycle.

## Trade-offs

- **High latency**: Performing multiple blocking LLM calls inside robust synchronous loops makes immediate UI rendering impossible. We intentionally traded streamed partial completion for extreme consistency and auditable provenance.
- **Strictness**: Enforcing Pydantic schemas strictly allows us to reject malformed data cleanly but relies heavily on the underlying model's (`gemini-2.5-flash`) adherence to JSON generation. The application has been designed to fail gracefully if the LLM cannot recover after its immediate retry.
- **Network Overhead for Persistence**: Shifting from local SQLite to a remote Supabase PostgreSQL pooler adds slight network latency on writes, but was deemed necessary to achieve production-grade remote persistence.

## Setup

1. Create a Python environment (`python -m venv venv`) and `pip install -r backend/requirements.txt`.
2. Define a `.env` file at the root containing:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key
   DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[db_name] # Use Supabase pooler URL
   ```
3. Start the UI: `npm install && npm run dev`.
4. Start the backend API: `uvicorn backend.main:app --reload`.
5. Run Tests: `pytest backend/test_pipeline.py`.
