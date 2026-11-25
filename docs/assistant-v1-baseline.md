# Builder assistant V1 baseline

**Recorded:** 2026-11-24  
**Purpose:** Phase 0 lock before the experimental design-intelligence pipeline is implemented.

## Contract versions

- Project DTO schema: **v14** (`src/data/mappers/project.mapper.ts`).
- Generated app manifest: **v2** (`src/data/generation/generatedAppManifest.ts`).
- Generated layout: **v2** (`src/data/generation/generatedLayout.ts`).
- Assistant blueprint/proposal: **v1**.

## Current request behavior

- The composer requires non-empty text; an image by itself cannot submit.
- One in-memory PNG, JPEG, GIF, or WebP attachment may accompany a request.
- The API request contains `prompt`, `conversation`, optional `draftBlueprint`, explicit provider and
  model IDs, `images`, and optional editor `view` context.
- Refinement conversation text is retained, but the original image bytes are not automatically
  retained and resent after submission.
- Provider/model selection is explicit and there is no automatic fallback.

## Current response and preview behavior

- A build request returns either a concise assistant message or an `AssistantProposalV1`.
- Proposals contain the validated `AppBlueprintV1` and a deterministic Project v14 preview with
  collection schemas.
- The user reviews a pending draft before revision-checked acceptance; generation itself is
  side-effect-free.
- Editor preview consumes the Project document. Generated applications consume generated layout v2,
  which is derived from the same mapper output.
- `src/data/generation/assistantPhase0Baseline.test.ts` locks mapper, manifest, layout, and serialized
  preview/generated geometry parity with a representative fixture.

## Known V1 limits preserved by this baseline

- No image-only or multi-reference request.
- No independent reference-analysis or design-intent stage.
- Coarse width, spacing, alignment, and typography vocabulary.
- No bounded seed records, explicit default theme, or visual comparison/repair stage.
- Provider output is nondeterministic, so CI locks a deterministic recorded blueprint/compiler
  baseline rather than making a live model call.

The Phase 0 backend feature flag defaults to disabled. This document does not claim any V2 behavior
is available.

## Guarded Phase 1 behavior

Phase 1 is implemented but remains unreachable unless `NOVY_ASSISTANT_DESIGN_PIPELINE_V2=true` is
explicitly configured. When enabled, the composer and API accept prompt text, one or more references,
or both; send ordered role-bearing `references`; expose model/effective request limits; and retain
references only in memory while a proposal remains pending. Apply, discard, supersession, mode
changes, and terminal requests clear or replace the relevant composer media deterministically;
pending references remain available only for their active draft. The backend derives image
dimensions, enforces byte/pixel totals, and never persists or logs raw media. Blueprint/proposal
output remains V1 in this phase; independent reference analysis starts in Phase 2.

## Guarded Phase 2 behavior

Phase 2 is backend-internal and does not alter the Phase 1 frontend request or capability response.
When V2 is explicitly enabled, the selected model first emits strict observation-only reference
analysis and then strict capability-independent design intent. Only reference analysis receives the
transient images; later stages consume validated structures. Intermediate OCR/analysis is not
returned to the browser or persisted. The final proposal remains `AppBlueprintV1` until a later
phase introduces and coordinates a new blueprint contract.

## Guarded Phase 3 behavior

Phase 3 is also backend-led. When V2 is explicitly enabled, validated design intent is checked
against a versioned capability catalog derived from active backend contracts. The browser receives
only a small optional feasibility summary: status, fidelity score, approximation counts, and no more
than ten concise notices. A request with a blocking primary-purpose or composition gap returns
`assistant_feasibility_blocked` before any blueprint model call; no raw media, analysis, or internal
reasoning is returned.

## Guarded Phase 4 behavior

When V2 is explicitly enabled, an approved proposal uses `AppBlueprintV2`: the existing V1 screen,
collection, and workflow vocabulary plus bounded semantic design intent. The frontend parses that
intent strictly and converts it back to the backend API shape when refining or accepting, so V1
proposals and their review UI remain unchanged with the flag disabled. The compiler lowers faithful
intent into Project v14; default-theme persistence, viewport anchoring, first-class grids, and seed
provisioning remain deferred to later phases and are never silently invented.

## Guarded Phase 5 behavior

Phase 5 adds optional persisted design primitives without bumping the canonical Project v14 or
generated v2 identifiers: a project default theme, per-screen viewport fill, and a bottom action
anchor. These fields are omitted for legacy documents, so old projects render exactly as before.
The editor inspector and generated runtime resolve anchoring and dynamic viewport height with the
same deterministic rules, and both start from the project default theme while honoring an explicit
stored preference. The three-reference decision gate proved that nested rows and columns cover the
dashboard grid, so no first-class grid node was introduced.

## Guarded Phase 6 behavior

Phase 6 allows a V2 proposal to carry bounded, typed seed records. The browser receives only a small
seed count, exclusion notices, and preview values; IDs are generated by the backend at acceptance.
Sensitive-looking fields are excluded and disclosed instead of being silently seeded. The sandbox Run
App preview uses the same seed values that acceptance will persist, so populated references remain
populated after a draft is applied.

## Guarded Phase 7 behavior

When the V2 pipeline flag is enabled, the editor offers standard and high-fidelity quality modes.
High fidelity runs additional bounded model stages with a shared call ceiling and returns stage
outcomes (status, attempts, repair flag) for display; it never substitutes a lower-fidelity draft
when a stage fails. The control and its locality/cost disclosure are hidden entirely while the V2
flag is disabled, preserving the legacy assistant flow.

## Guarded Phase 8 behavior

High-fidelity drafts expose a visual-review action. The editor renders the proposal's screens offscreen
with `ScreenFrame`, waits for `document.fonts.ready`, captures the requested mobile/tablet/desktop
frames with `modern-screenshot` (4.7.0, selected from official docs), and sends them with the original
references to the authenticated backend review route. Captures never enter local storage, URLs, logs,
or persisted project data. Review results replace the hidden draft only on success; failures keep the
draft and offer retry, an explicit continue-without-review choice (clearly labeled as unreviewed), or
cancel. Acceptance remains blocked until one of those terminal states is reached.

## Guarded Phase 9 behavior

Proposals may now include a content-free quality report with a label such as `verified-high-fidelity`,
`verified-responsive`, `review-incomplete`, or `unsupported-fidelity`, plus an overall score. The card
shows the label and score. The editor's mirrored layout-intent helpers are tested against explicit
mobile/tablet/desktop dimensions so they continue to match the generated runtime.

## Rollout behavior

Development enables V2 by default, but production remains fail-closed until an operator explicitly
sets `NOVY_ASSISTANT_DESIGN_PIPELINE_ROLLOUT=production` and configures a provider. The editor reacts
only to the capabilities response, so disabling V2 with `NOVY_ASSISTANT_DESIGN_PIPELINE_V2=false`
restores the legacy assistant flow without any frontend deployment or project-data migration. Aggregate
operations metrics are content-free and exposed only to authenticated builders.
