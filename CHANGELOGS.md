# Changelogs

All notable repository changes are recorded here. Add new entries under **Unreleased**, newest
first, and retain previous entries as project history.

## Unreleased

### 2026-11-08 — Reusable notes-app builder flows

#### Added
- Added a reusable **Actions menu** presentation for Dropdown widgets. Its options emit change
  events and retain the current ListView item's context, so card-specific workflows can act on
  the selected record. Menu interactions support keyboard navigation, Escape, and focus return.
- Exposed **Get Record**, variable names and defaults, component-prefill targets, variable and
  previous-output conditions, labeled record fields, and the current item ID in the Logic editor.
- Added optional Delete Record confirmation and keyboard access to repeated ListView items.
- Added a Switch option for preview-app light/dark theme control and optional dark-theme component
  colors, scoped independently from Novy's own editor theme.
- Added a multi-screen notes workflow test covering two bound card fields, local persistence,
  create, edit/prefill, update, confirmed delete, theme switching, failures, and duplicate saves.

#### Changed
- Project DTO schema is now version 10. Existing dropdowns, switches, appearances, and delete
  actions without the new optional fields retain their previous behavior.
- Preview asks before discarding sandbox record changes when persistence is enabled, prevents
  repeated submissions of the same workflow, and avoids stale collection snapshots after writes.
- Fixed newline editing of Dropdown options and made preview workflow errors accessible alerts.
- The existing advanced notes starter was not replaced or automatically provisioned; this change
  improves reusable builder capabilities rather than adding a ready-made basic notes template.

#### Verification
- `npm run typecheck` — passed.
- `npm test -- --run` — 80 test files and 636 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- Representative Project JSON — parsed and behavior graph references checked.
- `git diff --check` — passed.

### 2026-11-08 — Preview database persistence and truthful workflow branching

#### Added
- Added an explicit **Save data changes** option to Editor Preview. It is off by default; when
  enabled, Insert, Update, and Delete Record actions write through the project data repository to
  this browser's local project database.
- Added preview record validation and user-facing database error feedback.

#### Fixed
- Database workflow nodes now await the actual preview operation before following their `success`
  or `error` output, so failed inserts no longer navigate through the success path.
- Get Record now returns the requested record instead of falling through to delete behavior.
- Successful preview writes immediately refresh collection-bound ListViews and, in persistence
  mode, the Data workspace's record state.

#### Tests
- Added domain runtime coverage for resolved and rejected database branches.
- Added Preview coverage for opt-in persistence, required-field failure, blocked success
  navigation, and asynchronous behavior effects.
- `npm run typecheck` — passed.
- `npm test -- --run` — 78 test files and 620 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).

### 2026-11-08 — Layer send-to-front and send-to-back controls

#### Added
- Added **Bring to front** and **Send to back** layer ordering for Design widgets.
- Added a compact per-layer **Layer order** menu with accessible menu semantics and
  disabled states at the front/back boundaries.
- Added `Alt+Shift+↑/↓` shortcuts for sending the focused layer to the front or back.
- Extended `node/order` to support `'front'` and `'back'` in addition to forward/backward.

#### Changed
- Layer z-order still uses sibling array order; front moves a node to the end of its
  sibling list and back moves it to the beginning.
- The item-frame guard and boundary no-op behavior remain in place for all four order
  directions.

#### Tests
- `npm run typecheck` — passed.
- `npm test -- --run` — 78 test files and 616 tests passed.
- `npm run build` — passed.

### 2026-11-08 — Resizable split panes and canvas selection improvements

#### Added
- Added `useResizablePane` and `ResizeHandle` primitives for accessible, pointer- and
  keyboard-driven split panes.
- Added horizontal drag resizing to the Design, Logic, and Data side panels.
- Added a vertical drag resize handle for the Validation pane in the Design inspector.
- Added Backspace/Delete removal for selected Logic graph nodes, and made the trigger node
  protected from accidental deletion.
- Added click-away deselection when clicking the dotted Design grid or empty Logic graph
  space.

#### Changed
- Replaced fixed sidebar widths with persisted, clamped resizable widths.
- Removed the lightning glyph from the Behavior action in the Design selection toolbar.
- Scoped Design keyboard shortcuts to Design mode so they no longer fire in Logic/Data mode.
- Made Logic node and edge selection mutually exclusive for clearer keyboard deletion.

#### Tests
- `npm run typecheck` — passed.
- `npm test -- --run` — 78 test files and 608 tests passed.
- `npm run build` — passed.

### 2026-11-08 — Generated layout item-frame container projection

#### Added
- Added `GeneratedLayoutDTO`, `GeneratedLayoutNodeDTO`, and `GeneratedItemFrameDTO` to the
  generated-app handoff contract.
- Added `mapProjectToGeneratedLayout`, which projects screens and components into a normalized
  layout where each ListView's repeated item frame is an explicit `container` with `role:
  repeated-item`, stable ID, constraints, padding, spacing, radius, dividers, and template children.
- Added `layout` to `GeneratedAppManifestDTO`, populated by `buildGeneratedAppManifest`.

#### Changed
- In the generated layout projection, ListView template children move into `itemFrame.children`;
  the persisted Project DTO still keeps its existing `children` array and schema version 9.

#### Tests
- `npm run typecheck` — passed.
- `npm test -- --run` — 77 test files and 599 tests passed.
- `npm run build` — passed.

### 2026-11-08 — Figma-like selectable item frame

#### Changed
- The repeated item frame is now a first-class selectable container in item design. It appears
  as an **Item frame** root layer, can be selected from the canvas background or Layers, and
  shows its own frame-only Inspector with `Item padding`, `Item spacing`, `Item border radius`,
  and `Show dividers`.
- The item-frame guide is now selection-driven: it appears only when the item frame is selected.
  Selecting a widget shows only that widget's outline, removing the competing full-width dashed
  box.
- Opening item design now selects the item frame first. Escape steps from a widget to the frame,
  then exits item design.

#### Fixed
- Prevented delete, duplicate, move, resize, nudge, reorder, rename, and lock actions on the
  item frame, whose size is derived from the ListView and its content.

#### Tests
- `npm run typecheck` — passed.
- `npm test -- --run` — 75 test files and 596 tests passed.
- `npm run build` — passed.

### 2026-11-08 — ListView item frame controls in item design

#### Changed
- Moved `Item padding`, `Item spacing`, `Item border radius`, and `Show dividers` out of the
  ListView inspector and into an always-visible **Item frame** section shown while item design
  is open (including when no child is selected). The ListView inspector now keeps data source,
  primary field, empty text, and scroll direction.
- Added a live item-frame overlay to the item-design canvas: the repeated item's padded,
  rounded container plus a ghost of the next item (including its divider) so padding, spacing,
  radius, and dividers can be tuned in place.

#### Technical
- Extracted `listViewItemExtent` / `listViewItemExtentAtBreakpoint` into the domain layer and
  reused them in `ComponentRenderer` and the editor to keep the overlay and the rendered extent
  consistent.

#### Tests
- `npm run typecheck` — passed.
- `npm test -- --run` — 75 test files and 590 tests passed.
- `npm run build` — passed.

### 2026-11-08 — ListView item drag past centre

#### Fixed
- Removed frame-centre smart alignment in item design. The ListView frame is no longer an
  alignment target there, so its centre line no longer snaps or draws as a boundary while
  dragging direct item-template widgets; sibling alignment is preserved.
- Changed the default size of a new direct item-template Row/Column root from 75% to half of the
  padded cross-axis (floored to the 8 px grid), giving enough horizontal travel to move past the
  frame centre. Existing saved rows keep their geometry.
- Cleared stale alignment guides and distance indicators on pointer-down, window blur/cancel,
  and selection, bounds, or device changes.
- Replaced the canvas frame's 1 px CSS border with an inset ring so the rendered surface and
  interaction layer share the same origin.

#### Changed
- Item-design Row/Column defaults now use half-width (144 px on the default 320 px ListView) instead
  of 75% (224 px). Resize existing wide rows manually to gain travel.

#### Tests
- Updated item-frame default-size expectations to the new half-width geometry.
- `npm run typecheck` — passed.
- `npm test -- --run` — 73 test files and 585 tests passed.

### 2026-11-08 — Free-form ListView item frames

#### Fixed
- Replaced the conflicting ListView item flow/render paths with one free-form item coordinate
  system. Direct template widgets now retain and render their persisted `x`, `y`, `w`, and `h`
  values in item design, repeated canvas output, preview, and generated Project JSON.
- Sized the focused item-design canvas to the real repeated-item cross axis instead of the full
  device viewport, eliminating the misleading empty area that appeared movable but was outside the
  ListView item.
- New Row and Column roots use an intrinsic 75% cross-axis size, leaving immediate placement room
  after a palette drop instead of filling the complete item width or height.
- Removed the now-misleading ListView **Cross axis alignment** and **Template widget gap** controls;
  Row and Column widgets retain their own internal auto-layout controls.

#### Migration
- Raised Project DTO output to schema version 9. Schema-v8 and older ListView flow positions are
  materialized into equivalent mobile, tablet, and desktop free-form child geometry during load so
  existing templates do not overlap or change appearance.

#### Tests
- Added schema-v8 vertical, horizontal, and responsive migration coverage; focused item-frame bound
  coverage; free-form repeated rendering assertions; and first-session Row/Column movement
  regressions.
- `npm run typecheck` — passed.
- `npm test -- --run` — 73 test files and 585 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- Representative Project JSON in `PROGRESS.md` — parsed successfully.
- `git diff --check` — passed (line-ending conversion notices only).

### 2026-11-08 — First-drop ListView item geometry

#### Fixed
- Normalized direct ListView item-template children against one padded geometry boundary during
  palette insertion, dragging, Inspector position/size edits, resizing, keyboard nudging,
  duplication, and reparent finalization.
- Row and Column drops now fit the ListView item cross-axis immediately while retaining their
  pointer position on the repeated item's content-driven axis. Widgets can therefore be moved in
  the first item-design session without exiting and reopening it.
- Preserved the resolved item-child geometry across closing and reopening item design, including
  vertical and horizontal ListViews and responsive breakpoint overrides.
- Removed the inner dotted rectangle from designed-empty ListView placeholders. The outer dashed
  border is now the sole item outline, and item padding is represented by a subtle shaded inset
  gutter instead of a second boundary.

#### Tests
- Added reducer regressions for first-session Row and Column drops, immediate movement,
  close/reopen stability, smaller-widget pointer placement, horizontal ListViews, and padded
  geometry mutations.
- Updated renderer coverage to require one item boundary with a shaded padding gutter.
- `npm run typecheck` — passed.
- `npm test -- --run` — 73 test files and 583 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- Representative Project JSON in `PROGRESS.md` — parsed successfully.
- `git diff --check` — passed (line-ending conversion notices only).

### 2026-11-08 — Designed-empty ListView item outlines

#### Added
- Added editor-only repeated-item outlines for ListViews that have an accepted item design but no
  resolved static or collection records. The outlines fill the available scroll direction and show
  the configured item bounds, padding inset, spacing, and corner radius without creating fake data.
- Added explicit **Item spacing** and **Item border radius** Inspector controls; the existing padding
  control is now labeled **Item padding**, while the internal root-widget gap is labeled
  **Template widget gap**.

#### Changed
- Real repeated items now use the same persisted spacing and border-radius values shown by the
  canvas outlines, including radius-based clipping. Preview/runtime empty-state text remains
  unchanged and replaces outlines outside the design canvas.
- Raised Project DTO output to schema version 8. Older ListViews migrate with zero item spacing and
  radius to preserve their prior appearance; newly created ListViews default to 12px item padding,
  8px item spacing, and an 8px item radius.

#### Tests
- Added factory, mapper/migration, validation, renderer, Inspector, and routed editor integration
  coverage for item-layout persistence, outline geometry, horizontal layout, runtime replacement,
  and legacy defaults.
- `npm run typecheck` — passed.
- `npm test -- --run` — 73 test files and 578 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- Representative Project JSON in `PROGRESS.md` — parsed successfully.
- `git diff --check` — passed (line-ending conversion notices only).

### 2026-11-08 — Empty-by-default ListView item design

#### Changed
- New palette ListViews now start with no static records and no item-template widgets instead of
  creating a sample record and bound Text widget.
- Added an accessible canvas **Add item** prompt that explains the shared item design and opens the
  existing focused item-design editor without creating runtime or persisted data.
- Isolated ListView templates from normal screen editing: template widgets are no longer exposed as
  screen-canvas interaction targets or normal Layers descendants, and ListViews no longer accept
  palette drops, direct reparenting, or Layers nesting outside their own item-design scope.
- Preserved existing saved, migrated, and catalog ListView records and item templates unchanged.

#### Tests
- Added factory, component-tree, reducer, renderer, canvas, Layers, prompt accessibility, and route
  integration coverage for empty defaults, item-design navigation, and template-boundary rules.
- `npm run typecheck` — passed.
- `npm test -- --run` — 73 test files and 574 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- Representative Project JSON in `PROGRESS.md` — parsed successfully.
- `git diff --check` — passed (line-ending conversion notices only).

### 2026-11-08 — Add Local List Item runtime action

#### Added
- Added a synchronous **Add Local List Item** Logic node for static ListViews, with explicit
  append/prepend placement, schema-driven typed values, and dynamic input mappings.
- Added created-item node output (`item.id`, `item.listViewId`, and `item.values`) for downstream
  workflow steps.
- Added isolated preview/runtime additions keyed by ListView ID. Additions layer around persisted
  static seeds or existing component-value JSON replacements without mutating either source.
- Kept generated-app capability inference client-only for this action; it does not require a
  database runtime binding.

#### Validation and UX
- Restricted targets to existing static ListViews and added field existence and static-value type
  validation; collection-bound ListViews continue to use Insert/Update/Delete Record.
- Labeled the action as session-only and non-persistent in the Logic inspector, while preserving
  normal synchronous `next` control flow.

#### Tests
- Added registry, configuration, mapper, runtime-output, renderer-merge, preview-integration, and
  project-validation coverage for local ListView additions.
- `npm run typecheck` — passed.
- `npm test -- --run` — 72 test files and 564 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- Representative Project JSON in `PROGRESS.md` — parsed successfully.
- `git diff --check` — passed (line-ending conversion notices only).

### 2026-11-08 — ListView mutation and backend synchronization decision

#### Documented
- Defined the planned **Add List Item** logic node as a local/generated-runtime action for
  static ListViews only; it will not mutate Project JSON or persist records.
- Defined the production collection flow as `On Click -> Insert Record -> success/error`, with the
  backend returning the canonical record and the frontend updating or invalidating its collection
  cache so bound ListViews rerender without a page refresh.
- Reserved explicit Refresh Collection for external or stale-data refetches and documented
  optimistic insertion, ID reconciliation, and rollback as later enhancements.
- Warned against chaining Add List Item before Insert Record for the same collection-bound ListView
  because it can duplicate rows and diverge from backend state.

#### Verification
- Representative Project JSON in `PROGRESS.md` — parsed successfully.
- `git diff --check` — passed (line-ending conversion notices only).

### 2026-11-07 — ListView item-template design and typed bindings

#### Added
- Added a dedicated ListView item-design scope with a scoped canvas and Layers tree, sample-item
  selection, template-root palette insertion, accessible enter/exit controls, and shared
  undo/redo/autosave behavior.
- Added typed component property bindings for Text, Image, Button, Checkbox, Switch, Progress, and
  visibility, with static values retained as runtime fallbacks.
- Added structured static ListView schemas and records plus current-row logic expressions and event
  context for record-specific nested actions.

#### Changed
- Raised Project DTO output to schema version 7. Schema-v6 Text bindings and static string items
  migrate deterministically while preserving component IDs, responsive metadata, and logic.
- Generalized ListView rendering and validation around a provider-neutral `ListItemContext` and
  nearest-ancestor ListView semantics.

#### Tests
- Added binding resolver and item-design reducer coverage, extended migration/runtime/renderer
  tests, and updated schema-v7 mapper and generated-manifest expectations.
- `npm run typecheck` — passed.
- `npm test -- --run` — 72 test files and 555 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- Representative Project JSON in `PROGRESS.md` — parsed successfully.
- `git diff --check` — passed (line-ending conversion notices only).

### 2026-11-07 — Flutter-style web widget composition

#### Added
- Added nestable Column and Row widgets with Flutter-style main-axis and cross-axis alignment,
  gap, padding, responsive geometry, Layers integration, and Inspector controls.
- Added a scrollable ListView widget with vertical or horizontal direction, static and collection
  sources, search/sort metadata, dividers, empty states, and repeatable nested item templates.
- Added ListView item-field bindings for Text widgets so collection records can populate composed
  rows such as note cards.

#### Changed
- Removed List, Repeater, and Form from the live component union, palette, renderer, Inspector,
  templates, generated-app capability detection, and AI proposal output.
- Raised Project DTO output to schema version 6 and generalized component-tree recursion,
  hit-testing, layer nesting, validation, runtime lookup, and duplication across Container, Column,
  Row, and ListView children.
- Reworked starter student, notes, and citation collections to use ListView.
- Kept generated output scoped to responsive web applications; Flutter is the composition model,
  not a native runtime target.

#### Migration
- Added safe schema-v5 List and Repeater conversion to ListView item templates.
- Added Form conversion to Column + Text/Input/Button composition. Collection-bound Forms also
  receive deterministic click/Insert Record workflows and component input mappings so saved data
  entry behavior is retained.

#### Tests
- Added focused factory, mapper, migration, tree, renderer, palette, Inspector, preview, template,
  validation, assistant, and RAG-target coverage for the new widget model.
- `npm run typecheck` — passed.
- `npm test -- --run` — 71 test files and 543 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- Representative Project JSON in `PROGRESS.md` — parsed successfully.
- `git diff --check` — passed.

### 2026-11-07 — Collapsible Logic node groups

#### Changed
- Turned every Logic node category into an independently collapsible, keyboard-accessible group
  with an expanded state, directional indicator, and visible node count.
- Consolidated document, model, vector, chat, agent, prompt, and memory tools under **RAG Nodes**.
- Consolidated biometric liveness, enrollment, and verification tools under **Computer Vision**.

#### Tests
- Added group-name, default-expanded, independent collapse, and restore coverage for the node
  library.
- `npm run typecheck` — passed.
- `npm test -- --run` — 71 test files and 542 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- `git diff --check` — passed (only LF/CRLF warnings).

### 2026-11-07 — Logic Nodes sidebar scrolling and header layout

#### Fixed
- Moved the Logic Nodes minimize control into the header layout so it no longer covers the node
  search field.
- Restored the sidebar's bounded full-height flex layout so the node catalog scrolls independently
  when its categories exceed the available workspace height.

#### Tests
- Added focused coverage for the non-overlapping header structure and scroll-container constraints.
- `npm run typecheck` — passed.
- `npm test -- --run` — 71 test files and 542 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- `git diff --check` — passed (only LF/CRLF warnings).

### 2026-11-07 — Canvas trackpad zoom interception

#### Fixed
- Replaced React wheel handlers with native non-passive listeners on the Design and Logic canvases
  so Ctrl/Cmd + mouse-wheel or trackpad gestures zoom the canvas instead of the browser page.
- Preserved ordinary unmodified wheel scrolling by cancelling only modifier-assisted zoom gestures.

#### Tests
- Added regression assertions that canvas zoom wheel events are cancelled while normal wheel events
  remain available to the scroll container.
- `npm run typecheck` — passed.
- `npm test -- --run` — 71 test files and 541 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- `git diff --check` — passed (only LF/CRLF warnings).

### 2026-11-07 — Minimizable editor side panels

#### Added
- Added independent collapse and restore controls for the Design Assets/Layers and Inspector rails,
  Logic Nodes and Details rails, and Data Collections rail.
- Added narrow labeled restore rails so minimized panels remain discoverable and keyboard
  accessible while giving more space to the active canvas or data view.

#### Tests
- Added focused coverage for minimizing and restoring all five side panels.
- `npm run typecheck` — passed.
- `npm test -- --run` — 71 test files and 541 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- `git diff --check` — passed (only LF/CRLF warnings).

### 2026-11-07 — Canvas selection toolbar clearance

#### Fixed
- Prevented the floating Duplicate/Delete/Behavior toolbar from wrapping onto two lines and
  intruding into the selected canvas component.
- Replaced the toolbar's approximate offset with an explicit height and gap so it remains fully
  outside the selection border and flips below components near the frame's top edge.

#### Tests
- Added Selection overlay coverage for single-line toolbar sizing and component clearance.
- `npm run typecheck` — passed.
- `npm test -- --run` — 71 test files and 537 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- `git diff --check` — passed (only LF/CRLF warnings).

### 2026-11-07 — Logic resource-port label spacing

#### Fixed
- Prevented resource-port labels from overlapping by widening multi-port Logic nodes as needed and
  centering every label in its own fixed-width slot.
- Kept long port names bounded with truncation and a full-name tooltip instead of allowing them to
  paint over adjacent labels.

#### Tests
- Added Logic canvas coverage for the four resource labels on an AI Agent node.
- `npm run typecheck` — passed.
- `npm test -- --run` — 71 test files and 536 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- `git diff --check` — passed (only LF/CRLF warnings).

### 2026-11-07 — Schema v5 n8n-style AI resources and write-through indexing

#### Added
- Added typed resource ports and dashed resource edges alongside existing solid control-flow edges.
- Added one configurable Vector Store node for upsert, delete, and retrieval-tool operations.
- Added an AI Agent node that composes generic Chat Model, Memory, Vector Store Tool, Prompt
  Template, Embedding Model, and optional Reranker resources.
- Added compact resource-node rendering, typed connection validation, resource-port labels, and
  dashed connection paths in the Logic canvas.
- Added note create/update write-through vector indexing and note-delete vector cleanup workflows.
- Added isolated preview execution for Agent tool retrieval, memory, citations, and previous-record
  document mapping.

#### Changed
- Raised Project DTO output to `schemaVersion: 5` and added resource-edge transport metadata.
- Reworked the Note template ingestion and chatbot graphs around primary Vector Store and AI Agent
  nodes rather than long linear model/retrieval chains.
- Kept providers generic through backend-owned connection profile IDs.

#### Tests
- Added resource connection, dashed-canvas edge, AI Agent composition, and database-to-vector
  write-through runtime coverage.
- `npm run typecheck` — passed.
- `npm test -- --run` — 71 test files and 535 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- `git diff --check` — passed (only LF/CRLF warnings).

### 2026-11-07 — Schema v4 granular RAG pipelines

#### Added
- Added Document Loader, Text Splitter, Embedding Model, Vector Store Upsert/Delete, Chat Input,
  Query Embedding, Retriever, Prompt Template, LLM Model, Chat Output, Reranker, and Conversation
  Memory nodes.
- Added provider-neutral configuration inspectors and structured input mappings for documents,
  chunks, embeddings, matches, prompts, answers, citations, and messages.
- Added deterministic preview execution for chunking, opaque embedding references, isolated vector
  indexing/search, reranking, prompt compilation, answer generation, citation rendering, and memory.
- Added separate editable ingestion and chat workflows to the Note taking app's Ask Notes screen.

#### Changed
- Raised Project DTO output to `schemaVersion: 4`.
- Removed monolithic RAG nodes from the node palette and current domain action union.
- Added backward-compatible schema-v3 migration that expands RAG Index/Query/Remove nodes into
  deterministic granular chains while preserving incoming/outgoing connections and positions.
- Kept provider credentials behind connection-profile IDs and the backend handoff boundary.

#### Tests
- Added schema migration, structured runtime-chain, granular Inspector, node-library, and Note
  template coverage.
- `npm run typecheck` — passed.
- `npm test -- --run` — 71 test files and 530 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- `git diff --check` — passed (only LF/CRLF warnings).

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
