# Novy Frontend Progress

**Last reviewed:** 2026-11-07

This document inventories frontend capabilities that are implemented in the repository. Novy is
currently a **web app builder**. Native mobile and desktop application generation are outside the
current product scope.

All features marked as implemented below exist in the frontend codebase. Features backed by local
mock repositories or preview-only behavior are identified explicitly and must not be interpreted as
completed production backend integrations.

## 1. Application foundation

- [x] React and TypeScript application with strict type checking.
- [x] Vite development and production build configuration.
- [x] Clean Architecture separation across `domain`, `data`, `presentation`, and `main` layers.
- [x] Dependency injection for authentication, projects, templates, project data, and deployment
  repositories.
- [x] Central Axios client scaffold for future API integration.
- [x] Local-storage repository implementations with simulated request latency.
- [x] DTO and mapper boundaries between persisted/API-shaped data and domain entities.
- [x] Versioned project payloads with migration coverage for previously saved documents.
- [x] Demo project seeding.
- [x] Mandatory repository workflow for keeping `PROGRESS.md` and `CHANGELOGS.md` synchronized.
- [x] Backend-handoff reading checklist covering product requirements, Project JSON contracts,
  mappers, repositories, validation, migrations, and tests.

### Implemented routes

- [x] `/login` — authentication.
- [x] `/projects` — protected projects dashboard.
- [x] `/project/:projectId/editor` — protected visual editor.
- [x] `/project/:projectId/deploy` — protected deployment screen.
- [x] `/project/:projectId` — redirects to the project editor.
- [x] Unknown routes redirect to the projects dashboard.

## 2. Authentication and application shell

- [x] Login and registration modes.
- [x] Client-side email and password validation.
- [x] Loading and error feedback during authentication.
- [x] Demo-user sign-in shortcut.
- [x] Session provider and protected-route guard.
- [x] Restoration of the originally requested route after authentication.
- [x] Sign-out support.
- [x] Responsive application shell.
- [x] Collapsible sidebar with persisted collapsed state.
- [x] Project-aware links to the editor and deployment screen.
- [x] Light and dark theme toggle with persisted preference and system-theme support.

Authentication is currently implemented through a local mock repository. Production accounts,
tokens, password recovery, and remote sessions are not connected.

## 3. Project management

- [x] Projects dashboard with live project cards and rendered screen thumbnails.
- [x] Search projects by name.
- [x] Create projects from a template.
- [x] Open an existing project in the editor.
- [x] Rename projects.
- [x] Duplicate projects.
- [x] Delete projects with confirmation.
- [x] Project timestamps and relative-time labels.
- [x] Loading, empty, no-search-results, and retryable error states.

### Starter templates

- [x] Blank project.
- [x] Landing page.
- [x] Login form.
- [x] Student list.
- [x] Template gallery with previews.
- [x] Viewport-safe, internally scrollable template modal with a responsive one/two/three-column
  gallery.

Project persistence is currently local to the browser.

## 4. Project model and multiple screens

- [x] A project document can contain multiple screens.
- [x] Add, select, rename, and delete screens.
- [x] Screen tabs in the editor.
- [x] Each screen owns its component tree, behaviors, and logic graphs.
- [x] Each screen persists an explicit, editable, project-unique web route path.
- [x] Screen navigation actions can reference another screen.
- [x] Deleting a screen removes invalid navigation actions that target it.
- [x] Project-scoped data collections can be shared by components across screens.
- [x] The complete project structure is serialized as a versioned `ProjectDTO`.

The serialized project model currently contains:

- Project identity and timestamps.
- Screens.
- Component geometry, properties, hierarchy, and editor metadata.
- Project database identity and collection-to-database association.
- Typed appearance and tablet/desktop geometry/visibility overrides with mobile-first cascade
  (Tablet inherits Mobile; Desktop inherits resolved Tablet) and field-level compaction.
- Behaviors/event bindings.
- Logic graphs, dynamic action input mappings, nodes, ports, and edges.

### Generated project JSON

The frontend converts the domain project into a versioned `ProjectDTO` through
`src/data/mappers/project.mapper.ts`. The current local repository writes this DTO as JSON. A future
remote `ProjectRepository` implementation can send the same DTO to the Novy backend without
changing editor components.

The following representative payload shows two screens, component layout, a nested component, an
event binding, and its referenced logic graph:

```json
{
  "schemaVersion": 5,
  "id": "project_notes",
  "name": "Notes App",
  "createdAt": "2026-11-07T08:00:00.000Z",
  "updatedAt": "2026-11-07T08:30:00.000Z",
  "screens": [
    {
      "id": "screen_home",
      "name": "Home",
      "path": "/",
      "nodes": [
        {
          "id": "container_main",
          "name": "Main content",
          "type": "container",
          "x": 24,
          "y": 32,
          "w": 342,
          "h": 300,
          "props": {},
          "children": [
            {
              "id": "button_details",
              "name": "Open details",
              "type": "button",
              "x": 16,
              "y": 24,
              "w": 160,
              "h": 48,
              "appearance": {
                "backgroundColor": "#5551f2",
                "textColor": "#ffffff",
                "borderRadius": 10
              },
              "responsive": {
                "tablet": { "x": 32, "w": 200 },
                "desktop": { "x": 48, "w": 240 }
              },
              "props": {
                "label": "Open details",
                "variant": "solid"
              }
            }
          ]
        }
      ],
      "behaviors": [
        {
          "id": "behavior_open_details",
          "name": "On click — Open details",
          "event": "click",
          "graphId": "graph_open_details",
          "targetNodeId": "button_details"
        }
      ],
      "logicGraphs": [
        {
          "id": "graph_open_details",
          "name": "On click — Open details",
          "sourceNodeId": "button_details",
          "nodes": [
            {
              "kind": "trigger",
              "id": "trigger_click",
              "event": "click",
              "position": { "x": 80, "y": 160 }
            },
            {
              "kind": "action",
              "id": "action_email",
              "position": { "x": 320, "y": 160 },
              "payload": {
                "type": "send-email",
                "to": "",
                "subject": "Details requested",
                "body": "Open the requested details."
              },
              "inputMappings": {
                "to": { "source": "session", "path": "user.email" }
              }
            },
            {
              "kind": "action",
              "id": "action_navigate",
              "position": { "x": 560, "y": 160 },
              "payload": {
                "type": "navigate",
                "targetScreenId": "screen_details"
              }
            }
          ],
          "edges": [
            {
              "id": "edge_click_to_email",
              "fromNodeId": "trigger_click",
              "fromPort": "next",
              "toNodeId": "action_email",
              "toPort": "in"
            },
            {
              "id": "edge_email_to_navigate",
              "fromNodeId": "action_email",
              "fromPort": "success",
              "toNodeId": "action_navigate",
              "toPort": "in"
            }
          ]
        }
      ]
    },
    {
      "id": "screen_details",
      "name": "Details",
      "path": "/details",
      "nodes": [
        {
          "id": "text_details_title",
          "type": "text",
          "x": 24,
          "y": 32,
          "w": 300,
          "h": 48,
          "props": {
            "text": "Details",
            "level": "display"
          }
        }
      ],
      "behaviors": [],
      "logicGraphs": []
    }
  ]
}
```

#### How layout and hierarchy are represented

- `screens` contains every page in the generated web app.
- `nodes` contains the top-level components for one screen in paint order.
- Every component stores `x`, `y`, `w`, and `h` for its position and size.
- Base geometry is mobile; optional `responsive.tablet` and `responsive.desktop` values override
  only the properties they specify. Tablet inherits omitted values from mobile; Desktop inherits
  omitted values from the resolved Tablet layout. Breakpoint overrides may also set `isHidden`.
- Optional typed `appearance` values are shared by editor, preview, thumbnails, and generated JSON.
- `type` selects the renderer/generator component and `props` stores its typed configuration.
- Camera components serialize only labels and `facingMode`; captured media is transient runtime
  state and is never embedded in the project document.
- Optional `name`, `isHidden`, and `isLocked` fields preserve editor-facing layer metadata.
- A container stores nested components in `children`; child coordinates are relative to that
  container.
- Component ordering in `nodes` and `children` represents layer/paint ordering.

#### How event bindings are represented

- A screen's `behaviors` array stores the event bindings.
- `targetNodeId` identifies the component that produces the event.
- `event` is currently `click`, `change`, or `load`.
- `graphId` points to the `LogicGraphDTO` that defines what happens after the event.
- The graph contains the trigger, conditions/actions, their canvas positions, and connecting edges.
- Action payloads reference other components, screens, records, or collections by stable ID.
- Optional `inputMappings` resolve named action inputs from literals, component state, session user
  values, or previous-node outputs.
- RAG and Computer Vision actions use provider-agnostic payloads. Their generated runtime inputs may
  reference temporary camera media, while outputs expose document IDs, answers/citations,
  liveness, credential IDs, verification results, confidence, and reason fields.
- Async database and email actions branch through `success` and `error`; synchronous actions use
  `next` and conditions use `true`/`false`.

The IDs form the contract between layout and behavior. The backend generator must validate these
references and input mappings before generating React code. Static action configuration remains in
the typed `payload`; optional `inputMappings` override named fields at runtime.

### Generated-app backend handoff manifest

The Deployment page can export a versioned generated-app handoff manifest. It contains the complete
`ProjectDTO`, project database and collection schemas, routes, responsive media-query thresholds,
and inferred runtime requirements for authentication, data, email, RAG, Computer Vision, camera
permissions, and deployment. The manifest deliberately excludes app records, secrets, raw camera
captures, and biometric templates. It is a frontend-to-backend contract, not generated React code
or a deployable application bundle.

## 5. Design editor

### Editor shell

- [x] Design, Logic, and Data workspaces.
- [x] Return-to-projects navigation.
- [x] Inline project renaming.
- [x] Saving, saved, and unsaved status feedback.
- [x] Project validation badge.
- [x] Undo and redo controls.
- [x] Preview and Deploy actions.

### Component palette and renderer

- [x] Searchable, categorized component palette.
- [x] Drag components from the palette onto the canvas.
- [x] Click-to-add alternative to drag and drop.
- [x] Shared renderer used by canvas, preview, and project thumbnails.
- [x] Typed defaults and inspector controls for supported components.

Implemented component types:

- [x] Button.
- [x] Text.
- [x] Text input, including text, email, password, number, and multiline options.
- [x] Image.
- [x] Container/frame.
- [x] List.
- [x] Form.
- [x] Checkbox.
- [x] Radio group.
- [x] Switch.
- [x] Dropdown.
- [x] Slider.
- [x] Progress indicator.
- [x] Divider.
- [x] Camera Capture with explicit permission, capture/retake states, and no Project JSON image persistence.

### Layout and direct manipulation

- [x] Persisted `x`, `y`, `w`, and `h` geometry for every component.
- [x] Free-form absolute-positioned canvas.
- [x] Select components from the canvas or Layers panel.
- [x] Drag components to move them.
- [x] Resize components with selection handles.
- [x] Non-wrapping selection actions positioned outside the selected component bounds.
- [x] Position and size editing through the Inspector.
- [x] Duplicate and delete selected components.
- [x] Bring components forward or send them backward.
- [x] Nest components inside containers.
- [x] Drag components between containers and the screen root while preserving their visual
  position.
- [x] Container-relative child coordinates.
- [x] Locked components ignore direct canvas manipulation.
- [x] Hidden components remain persisted but are excluded from rendering.
- [x] Bounds clamping for movement and resizing.

### Canvas controls and precision

- [x] Eight-pixel snap grid with a user-controlled snap toggle.
- [x] Zoom in, zoom out, and fit-to-viewport controls.
- [x] Ctrl/Cmd + wheel canvas zoom.
- [x] Non-passive Design and Logic canvas wheel interception prevents browser page zoom while the
  pointer is over a canvas.
- [x] Space-drag and middle-button canvas panning.
- [x] Responsive web viewport presets for mobile, tablet, and desktop widths.
- [x] Independently minimizable Design, Logic, and Data side panels with narrow restore rails.
- [x] Mobile/base component geometry with optional tablet and desktop overrides.
- [x] Breakpoint-specific visibility plus a mobile-first cascade for layout and visibility.
- [x] Field-level responsive overrides that preserve inheritance when a breakpoint is edited.
- [x] Breakpoint-aware movement, resizing, addition, duplication, nested bounds, reparenting,
  rendering, preview, thumbnails, and Inspector controls.
- [x] Typed background, text, border, corner-radius, and opacity appearance controls.
- [x] Automatic refitting when the active viewport preset changes.
- [x] Smart edge and center alignment guides.
- [x] Optional smart snapping to nearby components and the active frame.
- [x] Horizontal and vertical pixel-distance indicators while dragging.
- [x] Nested-component alignment using absolute design-space coordinates.

The viewport presets represent responsive web layouts; they do not generate native applications.

### Layers panel

- [x] Hierarchical component tree with component-type icons and indentation.
- [x] Expand and collapse nested containers.
- [x] Canvas and Layers selection synchronization.
- [x] Inline layer renaming by double-click or `F2`.
- [x] Visibility and lock controls.
- [x] Theme-safe selected-layer treatment in light and dark mode.
- [x] Hover and keyboard-focus tooltips for visibility, lock, forward, and backward layer controls.
- [x] Bring-forward and send-backward controls.
- [x] Drag-to-reorder and drag-to-reparent.
- [x] Visual insertion and nesting feedback.
- [x] Keyboard reorder and nesting alternatives using `Alt` plus arrow keys.

### Editing history and shortcuts

- [x] Document-level undo and redo history.
- [x] One history entry per drag or resize gesture.
- [x] Debounced project autosave through the project repository.
- [x] `Ctrl/Cmd + Z` to undo.
- [x] `Ctrl/Cmd + Shift + Z` to redo.
- [x] `Ctrl/Cmd + D` to duplicate.
- [x] Delete or Backspace to remove the selection.
- [x] Arrow keys to move by eight pixels.
- [x] Shift + arrow keys to move by one pixel.
- [x] Escape to clear the selection.
- [x] Editor shortcuts are suppressed while typing in form controls.

## 6. Behaviors and event bindings

Event bindings are implemented as `Behavior` entities. A behavior connects a component event to an
entire logic graph rather than directly to one action.

- [x] Bind a component to a logic graph with `targetNodeId`, `event`, and `graphId`.
- [x] Create a behavior from the selected component in Design mode.
- [x] Create a workflow from a trigger in Logic mode.
- [x] Change the bound component and event from the logic inspector.
- [x] Display multiple behaviors as workflow tabs.
- [x] Delete behaviors and their associated graphs.
- [x] Prevent duplicate bindings for the same component and event.
- [x] Remove orphaned behaviors and graphs when their component is deleted.
- [x] Persist behaviors in the project JSON model.

Configurable events:

- [x] Click.
- [x] Change.
- [x] Screen load.

Click, change, and screen-load behaviors execute in the frontend preview against isolated state.
Production execution remains a generated-app/backend responsibility.

## 7. Logic Builder

- [x] Full Logic workspace with a searchable node library, graph canvas, and configuration
  inspector.
- [x] Independently scrollable Logic node catalog with a non-overlapping minimize control.
- [x] Independently collapsible Logic node groups, including consolidated RAG Nodes and Computer
  Vision sections.
- [x] Pannable and zoomable dotted graph canvas.
- [x] Fit-view and zoom controls.
- [x] Add nodes by clicking or dragging from the node library.
- [x] Drag graph nodes and persist their positions.
- [x] Typed input and output ports.
- [x] Solid execution edges plus dashed, typed AI resource edges for documents, splitters,
  embeddings, chat models, memory, tools, rerankers, and prompt templates.
- [x] Resource-port labels use non-overlapping fixed-width slots, with multi-port nodes expanding
  to preserve label readability.
- [x] Drag/click connection workflow with connection feedback.
- [x] Delete graph edges.
- [x] If/Else conditions with true and false branches.
- [x] Condition operators for equals, not equals, contains, not contains, empty, and not empty.
- [x] Component, variable, and previous-node output references in conditions.
- [x] Dynamic action input mappings from literals, component values/text/media, application
  variables, session user values, and previous-node output paths.
- [x] Success/error output ports for async database, email, RAG, and Computer Vision actions, including legacy-port
  migration.
- [x] Connection validation, cycle prevention, self-loop prevention, and incoming-edge limits.
- [x] Graph normalization and repair for older or incomplete saved workflows.

### Trigger nodes

- [x] On Click.
- [x] On Change.
- [x] On Load.

### UI action nodes

- [x] Change Text.
- [x] Show Message.
- [x] Navigate to Screen.

### Data action nodes

- [x] Get Records.
- [x] Insert Record.
- [x] Update Record.
- [x] Delete Record.
- [x] Refresh Collection/refetch effect.

### External action nodes

- [x] Send Email configuration with preview-only simulated delivery.

### AI and Computer Vision nodes

- [x] Separate granular ingestion and chat workflow purposes.
- [x] Document Loader, Text Splitter, Embedding Model, Vector Store Upsert/Delete, Chat Input,
  Query Embedding, Retriever, Prompt Template, LLM Model, and Chat Output nodes.
- [x] Reranker and Conversation Memory nodes.
- [x] Structured document/chunk/embedding/match/answer/citation outputs with preview-only
  simulation and dynamic node-output mappings.
- [x] Schema-v3 RAG Index/Query/Remove migration into deterministic schema-v4 granular chains.
- [x] Note-taking Ask Notes screen with separate Index Notes and Ask Indexed Notes workflows.
- [x] Vector Store main node with upsert, delete, and retrieval-tool modes.
- [x] AI Agent main node with attached generic Chat Model, Memory, Vector Store Tool, Prompt,
  Embeddings, and optional Reranker resources.
- [x] Note create/update write-through indexing from database action output, plus vector cleanup on
  note deletion with non-blocking failure feedback.
- [x] CV Liveness, CV Enroll, and CV Verify provider-agnostic payloads.
- [x] Camera media input mapping, consent validation, liveness/verification output mapping, and
  preview-only biometric simulation.
- [x] Note-taking template Unlock screen with explicit consent and standard sign-in fallback.

Production execution of logic graphs is not implemented in the frontend. The preview simulates safe
effects against isolated state.

## 8. Project data workspace

- [x] One project-scoped database per project, created explicitly before collections.
- [x] Database lifecycle management (create, rename, delete with collection cascade).
- [x] Project-scoped data collections.
- [x] Search collections.
- [x] Create, rename/update, and delete collections.
- [x] Schema editor.
- [x] Text, number, boolean, and date field types.
- [x] Required-field metadata.
- [x] Editable field labels and keys.
- [x] Add, remove, and reorder schema fields.
- [x] Record table.
- [x] Create, update, and delete records.
- [x] Confirmation before destructive data operations.
- [x] Loading, empty, and retryable error states.
- [x] List-to-collection data binding.
- [x] Repeater component for record-driven UI with multiple display fields.
- [x] Logic variables, component-value actions, typed node outputs, and generalized conditions.
- [x] Form-to-collection and form-field-to-data-field binding.
- [x] Logic data nodes can target project collections.

Collections and records currently use a local-storage repository. They are not connected to a
production database.

## 9. AI assistant demo

- [x] Floating assistant entry point and slide-over conversation UI.
- [x] Clearly labeled rule-based demo behavior.
- [x] Structured proposals instead of direct document mutation.
- [x] Keep and Undo proposal controls.
- [x] Assistant changes share the editor's undo history.
- [x] Graceful handling of unsupported or impossible proposals.

Implemented demo requests include:

- [x] Add a button.
- [x] Add text or a heading.
- [x] Add a list, including the student-list example.
- [x] Create a click behavior that changes text.

No external AI model or AI SDK is connected.

## 10. Validation

- [x] Pure project validation in the domain layer.
- [x] Errors and warnings grouped by screen, component, logic, data, and deployment context.
- [x] Duplicate screen and component ID detection.
- [x] Component geometry and size validation.
- [x] Parent-container bounds warnings.
- [x] Component-specific property validation.
- [x] Missing collection and field reference detection.
- [x] Behavior target and graph reference validation.
- [x] Logic trigger-count, edge, cycle, and incoming-connection validation.
- [x] Condition source validation.
- [x] Action target validation for components, screens, records, and collections.
- [x] Screen route, dynamic mapping source, async output-port, Send Email, and Refresh Collection
  validation.
- [x] RAG document/query validation plus Computer Vision media, user, and biometric-consent
  validation.
- [x] Validation badge and issue panel in the editor.
- [x] Preview and deployment blocking when project validation contains errors.

## 11. Interactive preview

- [x] Modal preview using the same component renderer as the editor.
- [x] Preview starts on the active screen.
- [x] Responsive web viewport switching.
- [x] Preview zoom in, zoom out, and fit controls.
- [x] Automatic fitting on open, viewport change, and browser resize.
- [x] Manual zoom with scroll containment.
- [x] Click behavior-chain execution.
- [x] Change and screen-load behavior-chain execution.
- [x] If/Else condition evaluation using component values and text.
- [x] Change-text effects.
- [x] Toast/message effects.
- [x] Navigation between project screens.
- [x] Isolated preview copies of collection records.
- [x] Simulated get, insert, update, and delete data effects.
- [x] Simulated collection refresh/refetch and Send Email success effects.
- [x] Simulated granular document loading, chunking, embeddings, isolated vector indexing/search,
  reranking, prompt compilation, generation, citations, memory, and biometric effects.
- [x] Camera capture remains in isolated preview component state and is never written into Project
  JSON or project collections implicitly.
- [x] Bound forms create isolated preview records.
- [x] Preview state does not write real databases or invoke external services.

## 12. Deployment experience — frontend simulation

- [x] Per-project deployment page.
- [x] Preview and Production environment selection.
- [x] Project validation before publishing.
- [x] Simulated Build, Optimize, Provision, and Live pipeline.
- [x] Generated mock `novy.app` URLs.
- [x] Publish success modal and URL copy action.
- [x] Persisted mock deployment history.
- [x] View and Redeploy actions.
- [x] Failure feedback that states the previous successful deployment remains live.
- [x] Loading, not-found, and retryable error states.
- [x] Disabled custom-domain control labeled as coming soon.
- [x] Backend handoff readiness panel with inferred runtime capability requirements.
- [x] Downloadable provider-agnostic handoff manifest containing Project JSON and app-data schemas.

This is a frontend simulation. React project generation, build orchestration, Vercel API calls, and
real live deployments are not implemented.

## 13. Accessibility and resilience

- [x] Semantic landmarks, labels, and status/alert regions across primary flows.
- [x] Keyboard-accessible editor commands and layer operations.
- [x] Accessible dialogs with focus handling.
- [x] Skip-to-content link.
- [x] Application error boundary with recovery UI.
- [x] Explicit loading, error, empty, and not-found states.
- [x] Theme-safe validation issue cards and visible labels for compact layer icon controls.
- [x] Accessible button, text-input, password-input, and modal primitives.
- [x] Light and dark design tokens.

## 14. Automated test coverage

The repository includes automated coverage for:

- [x] Domain factories, component-tree operations, graph rules, runtime behavior, validation, AI
  proposals, and deployment URLs.
- [x] DTO mapping, migration, local repositories, storage behavior, and templates.
- [x] Authentication, routing, providers, projects, editor state, autosave, keyboard shortcuts,
  canvas interactions, alignment, layers, inspector, logic, data, preview, deployment, and shared
  UI components.

Verification completed on 2026-11-07:

- `npm run typecheck` — passed.
- `npm test -- --run` — 71 test files and 542 tests passed.
- `npm run build` — passed.
- `git diff --check` — passed.

## 15. Current frontend boundaries and remaining integrations

The following are **not yet implemented** and should not be reported as completed frontend
features:

- Real backend authentication and remote project persistence.
- Uploading the Project JSON to the Novy backend.
- Backend React project/code generation.
- Backend consumption of the generated-app handoff manifest and production runtime implementation.
- Generated-app runtime client and authenticated runtime API calls.
- Production workflow execution and external side effects such as email delivery.
- Real database persistence for generated applications.
- Actual Vercel deployment and deployment-status polling.
- Real custom domains.
- Real AI model integration.
- Real vector storage, RAG model execution, biometric template storage, and Computer Vision
  processing. Current RAG and biometric behavior is explicit frontend simulation only.
- Live collaboration, multi-user project access, or platform-administration screens.
- Auto-layout/flex-layout containers.

These integrations must remain behind domain repository and service contracts so the existing
presentation layer does not become coupled to a specific database, deployment provider, or SDK.
