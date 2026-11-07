# Changelogs

All notable repository changes are recorded here. Add new entries under **Unreleased**, newest
first, and retain previous entries as project history.

## Unreleased

### 2026-11-07 — Template modal and editor dark-mode UI fixes

#### Fixed
- Constrained all modal panels to the viewport and enabled contained scrolling so the template
  gallery heading, choices, project-name field, and actions remain reachable.
- Expanded the template gallery to a responsive one/two/three-column layout with shorter previews,
  preventing the fifth template from pushing form actions below the viewport.
- Replaced the selected Layers row's light-only background with a translucent, theme-safe brand
  state.
- Added theme-safe backgrounds and hover/focus states to Validation issue cards.

#### Added
- Added visible tooltips on hover and keyboard focus for layer visibility, locking, forward, and
  backward icon controls while preserving descriptive accessible names.
- Added focused Modal, template gallery, Layers, and Validation tests.

#### Tests
- `npm run typecheck` — passed.
- `npm test -- --run` — 70 test files and 526 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- `git diff --check` — passed (only LF/CRLF warnings).

### 2026-11-07 — Milestone 6 frontend backend-handoff contract

#### Added
- Added a versioned generated-app handoff manifest containing Project JSON, database/collection
  schemas, routes, responsive thresholds, and inferred runtime capabilities.
- Added capability detection for authentication, database, email, RAG, Computer Vision, camera
  permission, and deployment requirements.
- Added a Deployment-page readiness panel and JSON handoff export.
- Added security exclusions proving that records, secrets, camera captures, and biometric templates
  are not exported.

#### Changed
- Documented the backend boundary explicitly: this frontend repository exports validated contracts
  but does not implement persistence services, provider secrets, React generation, or real cloud
  deployment.
- Updated PD6 traceability and backend handoff documentation.

#### Tests
- Added manifest generation and readiness-panel coverage.
- Focused generation/deployment tests — passed.
- `npm run typecheck` — passed.
- `npm test -- --run` — 69 test files and 523 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- `git diff --check` — passed (only LF/CRLF warnings).

### 2026-11-07 — Note-app milestone 5: Computer Vision and biometric unlock

#### Added
- Added a Camera component with explicit permission, live preview, capture, retake, error, and
  cleanup states.
- Added provider-agnostic CV Liveness, CV Enroll, and CV Verify payloads, DTOs, Logic nodes,
  Inspector controls, dynamic input mappings, validation, runtime outputs, and preview simulation.
- Added biometric consent, liveness, enrollment, verification, rejection, error, and standard
  sign-in fallback workflows to the Note taking app template.
- Added focused factory, mapper, renderer, node-library, runtime, template, and navigation-remapping
  tests.

#### Changed
- Remapped template Navigate targets when projects receive fresh screen IDs.
- Kept captured images in isolated preview component state; Project JSON stores only camera
  configuration and never raw camera images or biometric templates.

#### Tests
- `npm run typecheck` — passed.
- `npm test -- --run` — 67 test files and 520 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- `git diff --check` — passed (only LF/CRLF warnings).

### 2026-11-07 — Note-app milestone 4: RAG logic nodes

#### Added
- Added RAG index, query, and remove action payloads and DTOs.
- Added an AI category with RAG node definitions in the Logic library.
- Added RAG inspector configuration and Logic canvas details.
- Added simulated RAG preview effects and resolver support.

#### Changed
- Updated validation, runtime, and preview handling for RAG actions.

#### Tests
- `npm run typecheck` — passed.
- `npm test -- --run` — 67 test files and 513 tests passed.
- `npm run build` — passed.

### 2026-11-07 — Note-app milestone 3: wired note template

#### Added
- Added note create/open/save/delete/cancel/prefill logic graphs to the Note taking app template.
- Added repeater search and sort support.
- Added RepeaterProps and DTO support for search/sort fields.

#### Changed
- Updated the template catalog note app to include wired CRUD flows.

#### Tests
- `npm run typecheck` — passed.
- `npm test -- --run` — 67 test files and 513 tests passed.
- `npm run build` — passed.

### 2026-11-07 — Note-app milestone 2: note-taking starter template

#### Added
- Added a Note taking app starter template with Notes and Note Editor screens.
- Added get-record logic payload for loading a selected note into the editor.
- Added preview data resolution for get-record effects.

#### Changed
- Updated starter template tests for the new catalog entry.

#### Tests
- `npm run typecheck` — passed.
- `npm test -- --run` — 67 test files and 513 tests passed.
- `npm run build` — passed.

### 2026-11-07 — Note-app milestone 1: data repeater and logic primitives

#### Added
- Added a Repeater component for rendering database records with multiple display fields.
- Added set-variable and set-component-value logic actions with runtime effects and preview handling.
- Generalized logic conditions to use typed value expressions.
- Added runtime node outputs and variable context for downstream logic.
- Added controlled input values for component-value bindings.

#### Changed
- Updated DTOs, mappers, validation, renderer, preview, and logic configuration for the new primitives.

#### Tests
- `npm run typecheck` — passed.
- `npm test -- --run` — 67 test files and 513 tests passed.
- `npm run build` — passed.

### 2026-11-07 — Per-project databases for app data

#### Added

- Added a `ProjectDatabase` domain entity and repository lifecycle methods for creating, listing,
  renaming, and deleting project databases.
- Added a database gate to the Data workspace: collections can be created only after a project
  database exists.
- Added `databaseId` to data collections and DTOs, with backward-compatible migration that creates
  one database for legacy projects that already contain collections.
- Added database identity display in the Data workspace header.

#### Changed

- Updated local app-data storage to persist databases alongside collections and records.
- Updated project data loading to expose the active database and database list.
- Updated existing app-data tests for the explicit database creation flow.

#### Tests

- `npm run typecheck` — passed.
- `npm test -- --run` — 67 test files and 513 tests passed.
- `npm run build` — passed.
- `git diff --check` — passed.

### 2026-11-07 — Mobile-first responsive cascade and breakpoint visibility

#### Added

- Added cascading responsive geometry resolution: Tablet inherits Mobile and Desktop inherits the
  resolved Tablet layout, including field-level overrides.
- Added breakpoint-specific visibility through `isHidden` overrides and effective-visibility
  resolution for rendering, canvas interaction, Layers, and validation.
- Added field-level compaction for responsive overrides so unchanged properties keep inheriting
  lower-breakpoint edits.
- Added explicit breakpoint propagation through `ScreenFrame`, canvas, preview, and thumbnails.
- Preserved selection when switching responsive devices.

#### Changed

- Updated responsive reset to remove only the active breakpoint override while preserving other
  breakpoint overrides.
- Updated Layers visibility controls to reflect and toggle effective visibility for the active
  breakpoint.
- Updated validation to check responsive override geometry and visibility values.
- Updated responsive documentation to describe the mobile-first cascade, visibility, media-query
  thresholds, and canvas preview sizes.

#### Tests

- Updated responsive reducer coverage for compacted overrides and preserved selection.
- `npm run typecheck` — passed.
- `npm test -- --run` — 67 test files and 513 tests passed.
- `npm run build` — passed.
- `git diff --check` — passed (only LF/CRLF warnings).

### 2026-11-07 — Schema v3 logic, routes, and responsive web layout

#### Added

- Added serializable action input mappings for literal, component, session-user, and prior-node
  output values, plus an accessible mapping editor in the Logic inspector.
- Added Send Email configuration and Refresh Collection/refetch actions. Preview simulates email
  success and collection refresh without invoking production side effects.
- Added async `success`/`error` graph ports for database and email actions; preview follows the
  simulated success branch.
- Added explicit, editable, validated screen route paths for generated web applications.
- Added typed component appearance controls for background, text, border, corner radius, and
  opacity.
- Added mobile/base geometry with optional tablet and desktop overrides across editor movement,
  resizing, addition, nested bounds, rendering, preview, thumbnails, and Inspector controls.
- Added frontend preview execution for `change` and screen `load` behaviors alongside click chains.

#### Changed

- Raised Project DTO output to `schemaVersion: 3` and documented the updated generated-project JSON
  contract in `PROGRESS.md` and `CONVO_DEEPSEEK.md`.
- Added backward-compatible migration for missing routes, repeated legacy route candidates,
  positionless graph nodes, untyped edges, and legacy async `next` edges.
- Expanded project validation for routes, mapping references, async ports, Send Email, and Refresh
  Collection.
- Kept real email delivery, protected data access, generated-app runtime execution, code generation,
  and deployment behind the future backend boundary.

#### Tests

- Added focused domain, mapper, reducer, renderer, Logic workspace, Inspector, route editor, input
  mapping editor, and preview coverage for the schema-v3 capabilities.
- `npm run typecheck` — passed.
- `npm test -- --run` — 67 test files and 513 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- `git diff --check` — passed.

### 2026-11-07 — Progress and backend handoff governance

#### Changed

- Added an `AGENTS.md` rule requiring every repository task to update `PROGRESS.md` alongside the
  append-only `CHANGELOGS.md` history.
- Required progress updates to distinguish implemented, mocked, preview-only, deferred, and
  production-integrated behavior and to keep the generated Project JSON contract current.
- Added a mandatory backend-handoff reading checklist covering the product baseline, progress
  inventory, DTOs, mappers, domain contracts, validation, migrations, and tests.
- Defined conflict priority and backward-compatibility expectations for future backend contract
  changes.
- Updated `PROGRESS.md` to record the new maintenance and backend-handoff workflow.

#### Tests

- `npm run typecheck` — passed.
- `npm test -- --run` — 65 test files and 488 tests passed.
- `npm run build` — passed.
- `git diff --check -- AGENTS.md PROGRESS.md CHANGELOGS.md` — passed.

### 2026-11-07 — Project JSON structure documentation

#### Added

- Expanded `PROGRESS.md` with a representative versioned `ProjectDTO` containing multiple screens,
  nested component geometry, an event binding, and its referenced logic graph.
- Documented how screen layout, container-relative hierarchy, layer ordering, behavior references,
  graph nodes, edges, and action payloads are represented for the future backend handoff.
- Clarified that the current model stores typed action payloads and does not yet implement generic
  event input mapping.

#### Tests

- `npm test -- --run` — 65 test files and 488 tests passed.
- `git diff --check -- PROGRESS.md CHANGELOGS.md` — passed.

### 2026-11-07 — Frontend implementation inventory

#### Added

- Added `PROGRESS.md` with a code-audited inventory of implemented frontend features across
  authentication, projects, the multi-screen editor, component layout, event bindings, logic,
  project data, preview, validation, AI assistance, deployment simulation, and accessibility.
- Documented local/mock boundaries separately from completed behavior to avoid presenting backend
  persistence, React generation, production workflow execution, or Vercel deployment as complete.

#### Tests

- `npm run typecheck` — passed.
- `npm test -- --run` — 65 test files and 488 tests passed.
- `npm run build` — passed.
- `git diff --check -- PROGRESS.md CHANGELOGS.md` — passed.

### 2026-11-07 — Preview behavior execution boundary

#### Changed

- Clarified in `CONVO_DEEPSEEK.md` that the frontend may simulate behavior chains during preview
  using isolated local data while no backend is available.
- Distinguished safe preview simulation from production logic and prohibited real external side
  effects, protected-service calls, secret exposure, and provider-specific deployment operations.

#### Tests

- `npm test -- --run` — 488 tests passed.

### 2026-11-06 — Web-only product scope terminology

#### Changed

- Updated `CONVO_DEEPSEEK.md` to describe Novy exclusively as a web app builder.
- Removed out-of-scope native application language and replaced the vendor-specific persistence
  wording with a backend-agnostic integration boundary.
- Preserved mobile, tablet, and desktop viewport terminology used for responsive web previews.

#### Tests

- `npm test -- --run` — 488 tests passed.

### 2026-11-06 — Smart alignment guides and pixel-distance indicators

#### Added

- Added pure, design-space alignment calculations in
  `src/presentation/editor/state/alignment.ts`.
- Added zoom-aware edge and center matching on both axes with a default 6 px alignment
  threshold.
- Added optional snapping while continuing to report visual guides when snapping is disabled.
- Added alignment against other components and the active device frame.
- Added deduplicated alignment lines that span the moving and matched component rectangles.
- Added nearest-gap calculations for horizontal and vertical component spacing. Measurements are
  shown only when the components overlap on the perpendicular axis, producing direct edge-to-edge
  distances.
- Added `AlignmentGuides`, a non-interactive canvas overlay for edge and center guide lines.
- Added `DistanceIndicators`, a non-interactive canvas overlay with endpoint markers and rounded
  pixel labels such as `168 px`.
- Added semantic `guide` and `guide-ink` color tokens for light and dark themes.

#### Changed

- Updated `EditorCanvas` drag handling to:
  - Build alignment targets from visible, unlocked components while excluding the moving subtree.
  - Work in absolute design-space coordinates for nested components.
  - Apply zoom-aware smart snapping during component movement.
  - Include the device frame as an alignment target but exclude it from component-distance labels.
  - Render only the nearest measurable gap on each axis to avoid visual clutter.
  - Clear guides and measurements after pointer release or cancellation.
  - Preserve the snapped absolute position when reparenting a dragged component.
- Ported only the alignment functionality from `feature/editor-enhancements`; canvas rulers,
  ruler controls, branch documentation, and unrelated editor changes were not merged or copied.

#### Tests

- Added unit coverage for edge, center, threshold, snap-disabled, frame, deduplication, and invalid
  target alignment behavior.
- Added unit coverage for horizontal and vertical distance calculations, nearest-target selection,
  overlap rules, and degenerate targets.
- Added component coverage for guide placement, distance placement, zoom scaling, and pixel-label
  rendering.
- Added editor integration coverage for snapping, active drag feedback, distance labels, and
  cleanup after release.
- Verification completed successfully:
  - `npm run typecheck`
  - `npm test -- --run` — 488 tests passed
  - `npm run build`
  - `git diff --check`

### 2026-11-06 — Repository workflow documentation

#### Added

- Added this root `CHANGELOGS.md` as the required history for repository changes.
- Added an `AGENTS.md` rule requiring every addition, update, fix, removal, configuration change,
  test change, and documentation change to append a matching changelog entry before completion.
- Added `AGENTS.md` rules requiring Repomix for repository analysis and Context7 for current
  external library, framework, SDK, API, CLI, and cloud-service documentation.
