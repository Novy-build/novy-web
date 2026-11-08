# Novy PD6 Redesign — Gates 3 to 6 Implementation Plan

> Historical plan: references to List, Repeater, and Form below describe the schema-v5 model that
> existed while these gates were implemented. The current schema-v9 editor uses Column, Row, and
> ListView and migrates those legacy widgets on load.

## 1. Purpose

This document is the implementation specification for the remaining PD6 interaction redesign.
It covers:

- **Gate 3:** n8n-inspired Logic Builder with conditions and typed ports
- **Gate 4:** project-scoped Data workspace, schema/record CRUD, and bindings
- **Gate 5:** project validation integrated with preview and deployment
- **Gate 6:** PD6 traceability, migration hardening, accessibility, regression, and final acceptance

The functional baseline is `project_information/PD6_A-04.pdf`, specifically builder-facing use
cases UC-01 through UC-07. UC-08 Platform Administration remains excluded while Novy is a
single-builder product.

Figma and n8n are interaction references only. Novy must keep its own branding, Tailwind tokens,
Clean Architecture boundaries, repository contracts, undo/autosave behavior, and accessibility
standards.

---

## 2. Current State at the Start of Gate 3

### Already implemented

- Authentication and guarded project routes
- Project dashboard, templates, and local persistence
- Shared canvas/preview/thumbnail renderer
- Figma-style Layers/Assets sidebar
- Nested frames with layer reordering and reparenting
- Hidden, locked, and custom-named layers
- Canvas drag, resize, snap, pan, zoom, and frame-aware drops
- Button, Text, Input, Image, Frame/Container, List, and Form components
- Undo/redo and autosave
- Initial Logic workspace with trigger/action cards and simple edges
- Rule-based AI proposal flow with Keep/Undo
- Preview runtime for click, change-text, message, and navigation effects
- Mock deployment pipeline and deployment history

### Gaps this plan closes

- Logic graphs are still modeled primarily as a linear trigger/action chain.
- Edges have no typed ports or branch identity.
- Conditions and true/false execution branches do not exist.
- Logic node positions are not persisted.
- The graph canvas does not yet support direct node dragging or port-to-port connection gestures.
- PD6 D4 App Data has no domain entities, repository, DTOs, or user interface.
- Components cannot bind to project collections or records.
- There is no project-wide component/logic/data validator.
- Preview and deployment do not run a shared validation gate.
- Saved project documents do not have an explicit schema version/migration pipeline.

---

## 3. Cross-Gate Architecture Rules

### 3.1 Layer boundaries

- `src/domain` owns entities, graph rules, validation, migrations expressed as pure model
  transformations, runtime traversal, and repository contracts.
- `src/data` owns DTOs, localStorage persistence, DTO migrations/normalization, and repository
  implementations.
- `src/presentation` owns React state orchestration, node canvases, forms, tables, dialogs, and
  user feedback.
- `src/main` owns repository composition, providers, routes, and dependency injection.

No React imports in `domain`. No direct localStorage, Axios, Supabase, MongoDB, Vercel, or model
SDK use in presentation code.

### 3.2 Compatibility and migration

Before changing persisted graph or project shapes:

1. Add a `schemaVersion` to the project DTO/document boundary.
2. Treat missing `schemaVersion` as the current legacy version.
3. Normalize old DTOs before mapping them to domain entities.
4. Preserve IDs whenever possible so behavior bindings and undo history remain valid.
5. Give legacy logic nodes deterministic default positions.
6. Convert legacy edges to the new default ports.
7. Add round-trip and legacy-fixture tests before changing UI code.

No migration may silently remove nodes, behaviors, records, bindings, or deployment history.

### 3.3 State/history policy

- One completed user gesture equals one undo step.
- Intermediate pointer-move frames must not create history entries.
- Logic node drag starts one history transaction, updates position cheaply, and commits once.
- Connecting/disconnecting an edge is one history entry.
- Adding/configuring/deleting a condition or action is one history entry per committed change.
- Data records are repository-backed, not editor undo-stack data. Record mutations use explicit
  confirmation/toast feedback instead.

### 3.4 Accessibility

Every pointer interaction requires a keyboard path:

- Graph nodes: keyboard selectable and movable.
- Ports: accessible connection menu or “Connect to…” controls in the inspector.
- Edges: selectable and deletable by keyboard.
- Data tables: labelled controls, keyboard-operable menus, and explicit empty/error states.
- Validation issues: focusable list entries that navigate to the affected editor surface.

### 3.5 Required gate workflow

For every gate:

1. Add domain/data tests first.
2. Implement presentation behavior and interaction tests.
3. Run focused test slices during development.
4. Run `npm run typecheck`.
5. Run `npm test -- --run` with zero failures.
6. Run `npm run build` at the gate milestone.
7. Update `docs/frontend-plan.md` with the final test/build gate.

---

# Gate 3 — n8n-Inspired Logic Builder

## 4. Gate 3 Goal

Replace the current chain-oriented editor with a real node graph that supports direct node
placement, typed ports, drag-to-connect, conditions, deterministic branch execution, validation,
pan/zoom, and a focused configuration inspector.

The result should feel familiar to n8n users without copying n8n branding or exact visuals.

## 5. Gate 3 Domain Model

### 5.1 Persisted node geometry

Add a shared graph position to every logic node:

```ts
interface LogicNodePosition {
  x: number;
  y: number;
}
```

`TriggerNode`, `ConditionNode`, and `ActionNode` must include `position`.

Legacy nodes receive deterministic positions during migration:

- Trigger at `(80, 160)`
- Subsequent chain nodes separated horizontally by a fixed graph spacing
- Orphans placed on a second row

### 5.2 Condition nodes

Introduce:

```ts
type ConditionOperator =
  | 'equals'
  | 'not-equals'
  | 'contains'
  | 'not-contains'
  | 'is-empty'
  | 'is-not-empty';

interface ComponentValueReference {
  source: 'component';
  nodeId: string;
  property: 'value' | 'text';
}

interface ConditionNode {
  kind: 'condition';
  id: string;
  position: LogicNodePosition;
  left: ComponentValueReference;
  operator: ConditionOperator;
  compareValue: string;
}
```

Gate 4 may extend the left operand with data-field references. Gate 3 should not embed data
repository assumptions in condition evaluation.

### 5.3 Typed control-flow ports

Use explicit ports:

```ts
type LogicInputPort = 'in';
type LogicOutputPort = 'next' | 'true' | 'false';

interface LogicEdge {
  id: string;
  fromNodeId: string;
  fromPort: LogicOutputPort;
  toNodeId: string;
  toPort: LogicInputPort;
}
```

Port rules:

- Trigger: no input, one `next` output
- Action: one `in` input, one `next` output
- Condition: one `in` input, `true` and `false` outputs
- Trigger cannot be a target
- A node cannot connect to itself
- Each output port has at most one outgoing edge
- Each non-trigger node has at most one incoming control edge for deterministic execution
- Duplicate edges and cycles are rejected

### 5.4 Pure graph operations

Extend or replace functions in `src/domain/logic/graph.ts`:

- `addLogicNode(graph, node)`
- `addConditionNode(graph, defaults?)`
- `moveLogicNode(graph, nodeId, position)`
- `connectLogicPorts(graph, fromNodeId, fromPort, toNodeId, toPort)`
- `disconnectLogicEdge(graph, edgeId)`
- `removeLogicNode(graph, nodeId)`
- `wouldCreateCycle(graph, fromNodeId, toNodeId)`
- `incomingEdgeFor(graph, nodeId)`
- `outgoingEdgeFor(graph, nodeId, port)`
- `validateLogicGraph(graph)`

All operations must be immutable and reference-stable for no-op/invalid requests.

Do not use React Flow. Keep graph rules and SVG connection rendering hand-built unless project
constraints are explicitly changed.

## 6. Gate 3 Migration and DTO Changes

Update:

- `src/data/dto/project.dto.ts`
- `src/data/mappers/project.mapper.ts`
- Add a project DTO normalizer/migrator under `src/data/migrations/`

Legacy edge migration:

```text
{ fromNodeId, toNodeId }
    ->
{ id, fromNodeId, fromPort: "next", toNodeId, toPort: "in" }
```

Legacy graph order supplies initial positions. Migration must preserve graph IDs, node IDs,
behavior IDs, and source component IDs.

Add fixtures representing:

- A Phase 5 linear graph
- A graph with orphan action nodes
- A graph whose target component has been deleted
- A graph with a navigate action to a deleted screen

## 7. Gate 3 Runtime

Replace `orderChain` execution with port-aware traversal:

1. Start at the graph trigger.
2. Follow the trigger's `next` edge.
3. Execute actions and follow `next`.
4. Evaluate conditions against preview component values.
5. Follow `true` or `false` based on the result.
6. Stop when no valid outgoing edge exists.
7. Enforce a defensive maximum-step count even though cycles are rejected.

Extend preview runtime input:

```ts
interface PreviewRuntimeContext {
  componentValues: ReadonlyMap<string, string>;
}
```

`PreviewOverlay` must track Input/Form values and pass them to the domain runtime. Invalid or
missing references produce no destructive effects and should be surfaced later by Gate 5
validation.

## 8. Gate 3 Reducer Actions

Add typed actions such as:

```text
graph/node-add-action
graph/node-add-condition
graph/node-drag-start
graph/node-move
graph/node-delete
graph/condition-update
graph/connect-ports
graph/edge-delete
graph/edge-select (presentation-only if not persisted)
graph/view-set (presentation-only pan/zoom)
```

Graph pan/zoom belongs to editor UI state and should not mark the project unsaved. Logic node
positions, conditions, nodes, and edges are persisted and must mark the project unsaved.

## 9. Gate 3 Presentation UX

### 9.1 Graph stage

Refactor `LogicGraphCanvas.tsx` into smaller components, recommended structure:

```text
logic/
  LogicGraphCanvas.tsx
  LogicNodeCard.tsx
  LogicPort.tsx
  LogicEdgeLayer.tsx
  LogicToolbar.tsx
  LogicMiniMap.tsx          (optional if scope permits)
  useLogicViewport.ts
  useLogicConnectionDrag.ts
```

Required stage behavior:

- Dotted infinite-feeling canvas
- Space-drag or middle-button pan
- Wheel/modifier zoom and toolbar zoom controls
- Fit graph to viewport
- Draggable persisted node positions
- Selected node and selected edge states
- Temporary bezier while connecting a port
- Valid target highlighting
- Invalid target cursor/message
- Edge click/select and Delete removal
- Node delete with incident-edge cleanup

### 9.2 Node cards

- Trigger cards use the Novy accent color and expose `next`.
- Condition cards use a distinct semantic style and expose `true` and `false` ports.
- Action cards expose `in` and `next`.
- Cards display concise configuration summaries and invalid-reference badges.
- Node selection opens configuration in the right inspector.

### 9.3 Node palette and inspector

Add a compact “Add node” menu with:

- Condition
- Change text
- Show message
- Navigate to screen

The inspector configures:

- Condition source component/property/operator/value
- Action-specific settings
- Accessible “Connect output to…” controls as the keyboard alternative to port dragging
- Delete node/behavior actions with clear destructive labels

## 10. Gate 3 Test Matrix

### Domain

- Legacy edge/position migration
- Typed port compatibility
- Duplicate-edge prevention
- One-edge-per-output enforcement
- Trigger-target rejection
- Cycle prevention
- Node movement reference stability
- Node deletion prunes incident edges
- True/false condition evaluation
- Runtime traversal for both branches
- Missing-reference safety
- Maximum-step guard

### Reducer

- Node drag creates one history entry
- Pan/zoom creates no history entry
- Add/delete/configure node is undoable
- Connect/disconnect edge is undoable
- Invalid connection is a no-op
- Deleting referenced screens/components prunes or reports affected graph nodes consistently

### Presentation

- Drag node updates position
- Pan, zoom, and fit controls
- Port drag renders temporary edge
- Valid drop creates edge
- Invalid drop leaves graph unchanged and announces feedback
- Edge selection/Delete
- Condition inspector updates
- Keyboard connection path
- Preview executes true and false branches

## 11. Gate 3 Definition of Done

- Existing saved linear graphs load without data loss.
- Users can add and position condition/action nodes.
- Users can connect typed ports by pointer and keyboard.
- Cycles and invalid connections are rejected before persistence.
- Preview executes deterministic true/false branches.
- Full typecheck, tests, and production build pass.

---

# Gate 4 — Project Data Workspace and CRUD

## 12. Gate 4 Goal

Implement PD6 D4 App Data as a project-scoped frontend domain with collection schemas, records,
CRUD operations, component bindings, preview test data, and data-aware Logic actions.

This remains frontend-only and localStorage-backed. The future backend replaces the data
repository implementation, not presentation contracts.

## 13. Gate 4 Domain Entities

Create `src/domain/entities/appData.ts` with explicit value types:

```ts
type DataFieldType = 'text' | 'number' | 'boolean' | 'date';
type DataValue = string | number | boolean | null;

interface DataField {
  id: string;
  key: string;
  label: string;
  type: DataFieldType;
  required: boolean;
}

interface DataCollection {
  id: string;
  projectId: string;
  name: string;
  fields: DataField[];
  createdAt: Date;
  updatedAt: Date;
}

interface DataRecord {
  id: string;
  projectId: string;
  collectionId: string;
  values: Record<string, DataValue>;
  createdAt: Date;
  updatedAt: Date;
}
```

Domain invariants:

- Collection and record access is always project-scoped.
- Field keys are unique within a collection.
- Collection names are non-empty.
- Required values cannot be null/empty.
- Values must match field types.
- Removing a field removes or migrates its values from records explicitly.
- Removing a collection requires confirmation and produces reference validation issues until
  dependent component/logic bindings are updated.

## 14. Gate 4 Repository and Data Layer

Add `AppDataRepository` under `src/domain/repositories/`:

```ts
interface AppDataRepository {
  listCollections(projectId: string): Promise<DataCollection[]>;
  getCollection(projectId: string, collectionId: string): Promise<DataCollection | null>;
  createCollection(projectId: string, input: CreateCollectionInput): Promise<DataCollection>;
  updateCollection(projectId: string, collectionId: string, input: UpdateCollectionInput): Promise<DataCollection>;
  deleteCollection(projectId: string, collectionId: string): Promise<void>;
  listRecords(projectId: string, collectionId: string): Promise<DataRecord[]>;
  createRecord(projectId: string, collectionId: string, values: Record<string, DataValue>): Promise<DataRecord>;
  updateRecord(projectId: string, collectionId: string, recordId: string, values: Record<string, DataValue>): Promise<DataRecord>;
  deleteRecord(projectId: string, collectionId: string, recordId: string): Promise<void>;
}
```

Data implementation:

```text
src/data/dto/appData.dto.ts
src/data/mappers/appData.mapper.ts
src/data/repositories/local/LocalStorageAppDataRepository.ts
src/data/repositories/local/LocalStorageAppDataRepository.test.ts
```

Use a versioned localStorage bucket such as `novy.app-data.v1`. Repository methods must filter by
both `projectId` and collection/record ID so cross-project reads and writes fail.

Register the repository in `Repositories`, `createLocalRepositories`, and test stubs.

## 15. Gate 4 Editor Navigation

Extend `EditorMode` from:

```text
design | logic
```

to:

```text
design | logic | data
```

The top bar mode switch should remain compact and preserve the same project/document state while
moving between workspaces.

Recommended presentation structure:

```text
src/presentation/editor/data/
  DataWorkspace.tsx
  CollectionList.tsx
  CollectionSchemaEditor.tsx
  RecordsTable.tsx
  RecordDialog.tsx
  DeleteCollectionDialog.tsx
  useProjectData.ts
```

## 16. Gate 4 Data Workspace UX

### 16.1 Collection list

- Search/filter collections
- Create collection CTA
- Collection name and record count
- Selected state
- Rename/delete actions
- Explicit empty, loading, error, and retry states

### 16.2 Schema editor

- Add/reorder/remove fields
- Edit label, generated/editable key, type, and required state
- Inline validation for duplicate/empty keys
- Warn before destructive type changes or field removal
- Save through repository, not component-local mock state

### 16.3 Records table

- Columns derive from schema
- Add, view/edit, and delete records
- Type-appropriate editors
- Required/type validation before repository calls
- Empty state with “Add first record” CTA
- Horizontal overflow handling for wider schemas
- Mock latency/loading and recoverable errors

## 17. Gate 4 Component Bindings

### 17.1 List binding

Extend `ListProps` with a backwards-compatible data source:

```ts
type ListDataSource =
  | { kind: 'static' }
  | { kind: 'collection'; collectionId: string; displayFieldId: string };
```

Old lists normalize to `{ kind: 'static' }`.

Inspector behavior:

- Source selector: Static / Collection
- Collection selector
- Display-field selector
- Broken binding warning when collection/field is missing

### 17.2 Form submission binding

Extend `FormProps` with an optional binding:

```ts
interface FormDataBinding {
  collectionId: string;
  fields: Array<{ formFieldIndex: number; dataFieldId: string }>;
}
```

Preview form submission creates an in-memory test record or calls an explicitly injected preview
data adapter. It must not accidentally mutate persisted records unless the UI clearly labels that
behavior as test data persistence.

## 18. Gate 4 Data-Aware Logic

Add action payloads after the repository/entity foundation exists:

- `create-record`
- `update-record`
- `delete-record`

Do not let domain logic call repositories directly. Logic runtime emits data effects; a
presentation/application orchestrator applies those effects through `AppDataRepository`.

Gate 3 typed ports remain control-flow ports. Data payload types belong in action configuration,
not in React component state.

## 19. Gate 4 Tests

### Data repository

- Collection CRUD
- Record CRUD
- Date DTO round-trips
- Required/type validation
- Project isolation
- Missing collection/record errors
- Persistence across repository instances
- Field deletion/type-change behavior

### Hooks/workspace

- Loading/error/empty/success states
- Create/edit/delete collection
- Add/reorder/remove fields
- Create/edit/delete record
- Confirmation flows
- Retry behavior

### Bindings/runtime

- Legacy static list migration
- Collection list rendering in preview
- Missing collection/field warning
- Form-to-record field mapping
- Data action effect generation/application
- Cross-project IDs rejected

## 20. Gate 4 Definition of Done

- Users can define a collection schema and perform create/read/update/delete operations.
- Collections and records remain project-scoped.
- Lists can render collection records in preview.
- Forms can map fields to a collection in preview/test-data mode.
- Logic can emit supported data CRUD effects.
- Repository replacement remains isolated to the data/main layers.
- Full typecheck, tests, and production build pass.

---

# Gate 5 — Validation, Preview, and Deployment Integration

## 21. Gate 5 Goal

Add one pure, shared project validator and make it the source of truth for editor feedback,
preview eligibility, and deployment eligibility. Invalid projects must provide actionable errors,
and failed validation/deployment must never overwrite the previous successful live deployment.

## 22. Gate 5 Validation Model

Create `src/domain/validation/`:

```ts
type ValidationSeverity = 'error' | 'warning';
type ValidationArea = 'screen' | 'component' | 'logic' | 'data' | 'deployment';

interface ValidationIssue {
  id: string;
  code: string;
  severity: ValidationSeverity;
  area: ValidationArea;
  message: string;
  screenId?: string;
  componentId?: string;
  behaviorId?: string;
  graphId?: string;
  logicNodeId?: string;
  collectionId?: string;
  fieldId?: string;
}

interface ValidationReport {
  isValid: boolean;
  issues: ValidationIssue[];
}
```

Primary API:

```ts
validateProject(document, collections): ValidationReport
```

Validation must be deterministic and pure.

## 23. Gate 5 Validation Rules

### Components/screens

- Project has at least one screen
- Screen IDs and component IDs are unique
- Names required where applicable
- Geometry values finite and dimensions positive
- Child coordinates valid relative to parent frames
- Required component props present
- Form fields have non-empty labels
- Image alt text warning when source exists and alt is empty

### Logic

- Behavior target exists
- Behavior graph exists
- Exactly one trigger per behavior graph
- Trigger event matches behavior event
- Edge ports compatible
- No cycles
- No edge references missing nodes
- Condition component/property reference exists
- Action target component/screen exists
- Required action values configured
- Unreachable nodes reported as warnings or errors according to agreed policy

### Data

- Collection/field IDs unique
- Collection name and field keys valid
- Field keys unique per collection
- Record values conform to schema
- Component bindings reference existing collections/fields
- Data actions reference existing collections/fields

### Deployment

- No validation errors
- Project/document is saved before publishing
- Required deployment configuration present when real backend integration arrives

## 24. Gate 5 Editor Feedback

Add a validation status near Preview/Deploy:

- Valid: subtle success state
- Warnings: count badge
- Errors: blocking count badge

Add a Validation panel/sheet:

- Group issues by screen/component/logic/data
- Selecting an issue navigates to Design, Logic, or Data mode
- Select the affected screen/node/graph/collection
- Move focus to the relevant inspector/control when practical
- Use `role="status"` for summaries and `role="alert"` for blocking failures

Validation should run:

- After document/data changes using a short debounce
- Immediately when Preview is requested
- Immediately when Deploy is requested

## 25. Gate 5 Preview Integration

Preview flow:

1. Validate document plus current data schema.
2. If errors exist, open Validation panel and do not open preview.
3. If only warnings exist, allow preview while showing the warning count.
4. Render the current unsaved working document and project-scoped test data.
5. Runtime errors become visible preview feedback without deployment side effects.

Do not silently fix invalid references during preview. Pruning remains an explicit reducer/domain
operation; validation explains what is wrong.

## 26. Gate 5 Deployment Integration

Deployment flow should align with PD6 Process 4.0:

```text
Validate -> Build -> Optimize -> Provision -> Live
```

Before calling `DeploymentRepository.publishDeployment`:

1. Load/receive the project data schema.
2. Run the same domain validator.
3. If invalid, return a validation result without creating a new live deployment.
4. Keep the previous live record and URL visible.
5. If repository publish fails, record/show failure according to the repository contract without
   deleting or replacing previous successful history.

The deployment page must distinguish:

- Validation failure
- Build/provider failure
- Successful live deployment

“Redeploy” uses the same validation path.

## 27. Gate 5 Tests

### Validator

- Valid complete project
- Duplicate IDs
- Missing behavior target/graph
- Invalid edge/port/cycle
- Invalid condition/action references
- Missing collection/field binding
- Invalid records
- Warning-only report
- Stable issue IDs/order
- Input immutability

### Preview

- Errors block opening preview
- Warnings allow preview
- Issue click navigates/selects correct editor target
- Valid bound data renders
- Runtime failure shows feedback without changing saved document

### Deployment

- Validation failure never calls publish repository
- Previous live URL remains visible after validation failure
- Previous live URL remains visible after provider failure
- Successful publish appends history
- Redeploy revalidates
- Validation/build/provider statuses are announced accessibly

## 28. Gate 5 Definition of Done

- One validator powers editor, preview, and deployment decisions.
- Errors are actionable and navigate to their source.
- Preview never deploys implicitly.
- Invalid deployment never calls the publish provider.
- Failed validation/deployment preserves previous live details.
- Full typecheck, tests, and production build pass.

---

# Gate 6 — PD6 Traceability and Final Acceptance

## 29. Gate 6 Goal

Prove that the frontend implements the agreed builder scope, safely migrates old local data,
remains accessible and responsive, and can be handed to backend integration without presentation
layer rewrites.

Gate 6 should avoid large new product features. It closes defects and evidence gaps discovered by
the traceability and acceptance pass.

## 30. Requirements Traceability

Create a maintained traceability document, recommended:

```text
docs/pd6-traceability.md
```

Map every included use case to routes, domain entities, repository contracts, UI surfaces, and
automated tests.

### Required mappings

#### UC-01 Register / Sign In

- `/login`
- Auth repository/session provider
- Validation and protected-route tests
- Clear invalid-credential feedback

#### UC-02 Manage Projects

- `/projects`
- Create/open/rename/duplicate/delete
- Missing/unauthorized project states
- Project repository tests

#### UC-03 Design UI with Components and Templates

- Assets/Layers/Canvas/Inspector
- Drag/drop/reparent/resize/lock/hide/rename
- Form placement/edit/preview acceptance
- Templates and autosave

#### UC-04 Configure Logic and App Data

- Event/condition/action graph
- Typed connections and validation
- Data collection/schema/record CRUD
- Data bindings and preview test data

#### UC-05 Generate UI Component with AI

- Prompt plus project context boundary
- Structured proposal
- Validation before acceptance
- Keep/Undo
- Rejection/failure leaves document unchanged

#### UC-06 Preview Project

- Shared validator
- Working-document preview
- Logic/data runtime
- Inline validation/runtime feedback
- No implicit deployment

#### UC-07 Deploy Application

- Validate/build/provider/result stages
- Deployment history and live URL
- Failure preservation
- Repository-owned provider boundary

Document UC-08 as intentionally excluded due to the approved single-builder scope.

## 31. Migration Hardening

Build fixture-based migration tests for documents produced after each historical milestone:

- Pre-logic project document
- Linear Phase 5 graph
- Pre-layer-metadata document
- Pre-Form document
- Pre-typed-port graph
- Static-list-only document
- Current document/data schema

For every fixture:

1. Parse stored JSON.
2. Normalize/migrate.
3. Map to domain.
4. Render or inspect critical entities.
5. Save back to DTO.
6. Reload again.
7. Assert no supported content was lost.

Corrupt localStorage remains recoverable and must not crash the application.

## 32. Accessibility Acceptance

Complete a keyboard/screen-reader-oriented pass over:

- Authentication
- Project dashboard/dialogs
- Layers/Assets
- Canvas controls and keyboard alternatives
- Logic graph node/port/edge operations
- Data schema and records table
- AI sheet
- Preview dialog
- Validation panel
- Deployment flow

Required checks:

- One meaningful `main` landmark per route
- Labelled regions, dialogs, tabs, trees, tables, forms, and status messages
- Focus trap and opener restoration for dialogs/sheets
- Visible focus indicators
- No keyboard traps
- Accessible drag/drop alternatives
- Error messages connected to controls
- Live announcements for save, validation, logic connection, CRUD, preview, and deployment results
- Color is not the only status indicator
- Reduced-motion support for non-essential animation

Automated RTL tests remain mandatory; add an accessibility tool only if dependency policy allows
it. Manual checks should be recorded in the traceability/acceptance document.

## 33. Responsive and Performance Acceptance

### Responsive behavior

- Dashboard remains usable at mobile widths.
- Editor declares and handles its minimum supported width instead of silently clipping controls.
- Side panels collapse or become drawers at narrower widths if required by the agreed target.
- Data tables scroll without breaking route layout.
- Dialogs/sheets fit within viewport height and width.

### Performance behavior

- Large layer trees do not remap unnecessarily.
- Pointer move and graph pan/zoom avoid project history writes per frame.
- Validation is pure and debounced in presentation.
- Data tables avoid repeated repository loads during local edits.
- Preview runtime has traversal limits.
- Build output is reviewed for accidental dependency/bundle regressions.

## 34. Final Automated Acceptance Scenarios

At minimum, retain route-level tests for:

1. Sign in and open a project.
2. Create a project from a template.
3. Add a frame, nest components, rename/hide/lock/reorder, undo, and autosave.
4. Add/edit/preview a Form.
5. Build a trigger -> condition -> true/false action graph and preview both branches.
6. Create a Student collection and perform full record CRUD.
7. Bind a List to the Student collection and preview records.
8. Bind a Form to create a Student record in preview/test-data mode.
9. Apply and undo an AI proposal.
10. Block preview/deployment for a broken reference and navigate to the issue.
11. Successfully deploy a valid project and copy/view the URL.
12. Fail a later deployment and retain the previous live URL.
13. Load and resave each legacy migration fixture.

## 35. Documentation and Handoff

Update:

- `AGENTS.md` only if implementation decisions refine existing rules
- `docs/frontend-plan.md` gate statuses and final counts
- `docs/pd6-traceability.md`
- README setup, test, architecture, mock-data, and backend-swap notes
- Repository interface documentation for backend implementers

Explicitly identify the future backend seams:

- Supabase-backed `AuthRepository`
- API-backed `ProjectRepository`
- API-backed `AppDataRepository`
- AI generation repository/service boundary
- Vercel-backed `DeploymentRepository`

Presentation hooks/components must continue to consume contracts, not provider SDKs.

## 36. Gate 6 Final Commands and Definition of Done

Run:

```bash
npm run typecheck
npm test -- --run
npm run build
```

Gate 6 is complete only when:

- All commands pass with zero failures.
- UC-01 through UC-07 have documented implementation/test evidence.
- UC-08 is documented as intentionally excluded.
- Migration fixtures pass without supported-data loss.
- No blocking accessibility issue remains in the agreed browser/viewport matrix.
- Preview and deployment use the same validator.
- Project data remains isolated by project ID.
- Provider integrations remain replaceable through repositories.
- The frontend is ready for backend implementation without redesigning presentation contracts.

---

## 37. Recommended Delivery Order

Implement strictly in this order:

1. **Gate 3A:** versioning/migration plus typed graph domain
2. **Gate 3B:** condition runtime plus reducer
3. **Gate 3C:** n8n-style graph interactions and inspector
4. **Gate 4A:** app-data entities, DTOs, repository, DI
5. **Gate 4B:** Data workspace CRUD
6. **Gate 4C:** component bindings and data-aware logic effects
7. **Gate 5A:** pure validator and issue model
8. **Gate 5B:** editor/preview validation UX
9. **Gate 5C:** deployment validation/failure preservation
10. **Gate 6:** traceability, migrations, accessibility, performance, final regression

Do not start a later sub-gate while an earlier domain/data contract is unstable. Each sub-gate
should leave the full existing suite green.
