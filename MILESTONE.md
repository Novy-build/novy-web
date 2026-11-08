# Novy Milestones

## Milestone 1 — Data-binding foundation

- ListView with static and collection-backed item templates (replacing the legacy Data Repeater).
- Item context.
- Record-to-component property bindings.
- Multiline note editor.
- Selected-record state or navigation parameters.
- Loading, empty, success, and error states.

Status: Completed.

## Milestone 2 — Complete note CRUD

- Notes and editor screens.
- Create, view, update, and delete notes.
- Search and sort.
- Empty/loading/error states.
- Responsive layouts.
- Persistent preview behavior.

Status: Completed.

## Milestone 3 — Note template

- Add a "Note Taking App" project template.
- Preconfigure database schema, screens, components, and graphs.
- Ensure generated JSON contains no note-specific hidden behavior.

Status: Completed.

## Milestone 4 — RAG

- RAG payload contracts.
- Index/query/remove operations.
- Inspector configuration.
- Preview simulation.
- Answer and citation bindings.
- Validation and migration coverage.

Status: Completed.

## Milestone 5 — Computer Vision and biometric unlock

- Camera Capture widget.
- Computer Vision payload contracts.
- Liveness/enrollment/verification branches.
- Consent and fallback flow.
- Preview simulation.
- Security and privacy validation.

Status: Completed (frontend contracts and safe preview simulation; protected production processing remains backend work).

## Milestone 6 — Generated app/runtime integration

- Backend database persistence.
- Authentication/session enforcement.
- RAG provider integration.
- Protected biometric processing.
- Secrets and provider configuration.
- React generation.
- Deployment verification.

Status: Frontend handoff complete. The exportable manifest, capability detection, data-schema
handoff, security exclusions, and deployment readiness UI are implemented. Real persistence,
authentication, provider execution, React generation, secrets, and cloud deployment remain pending
in the separate backend repository.

## Milestone 7 — Granular RAG pipelines

- Separate ingestion and chat/retrieval workflows.
- Document Loader, Text Splitter, Embedding, Vector Store, Chat Input, Retriever, Prompt, LLM, and
  Chat Output nodes.
- Reranker and Conversation Memory nodes.
- Typed structured runtime outputs and dynamic mappings.
- Schema-v3 legacy RAG migration to schema v4.
- Ask Notes screen with editable ingestion and chat pipelines.

Status: Completed (frontend contracts and deterministic preview simulation; real model/vector
providers remain backend work).

## Milestone 8 — n8n-style AI resources and write-through indexing

- Solid control edges and dashed typed resource edges.
- Vector Store main node with upsert, delete, and retrieval-tool operations.
- AI Agent main node with Chat Model, Memory, Vector Store Tool, Prompt, Embeddings, and Reranker
  resources.
- Direct database create/update to vector indexing and database delete to vector cleanup.
- Schema-v5 edge/resource contracts and provider-neutral profiles.

Status: Completed (frontend graph/runtime simulation; backend provider execution remains pending).
