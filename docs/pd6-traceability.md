# Novy PD6 Traceability

This document maps the builder-facing requirements in `project_information/PD6_A-04.pdf` to the
implemented frontend surfaces, domain/data contracts, and automated tests. UC-08 Platform
Administration is intentionally excluded because Novy currently targets one application builder.

## UC-01 Register and Sign In

- Routes: `/login`, guarded `/projects`, `/project/:id/editor`, `/project/:id/deploy`
- Domain/data: `AuthRepository`, `SessionProvider`, `RequireAuth`
- Presentation: `AuthPage`, `LoginForm`, `RegisterForm`
- Tests:
  - `src/presentation/pages/auth/AuthPage.test.tsx`
  - `src/main/providers/SessionProvider.test.tsx`
  - `src/main/app.test.tsx`
- Evidence: login/register validation, demo-user sign-in, deep-link restoration, unauthorized
  guard behavior, and error banners.

## UC-02 Manage Projects

- Route: `/projects`
- Domain/data: `ProjectRepository`, `Project`, `ProjectSummary`
- Presentation: `ProjectsPage`, `ProjectCard`, `TemplateGalleryModal`, `RenameDialog`,
  `ConfirmDeleteDialog`
- Tests:
  - `src/presentation/pages/projects/ProjectsPage.test.tsx`
  - `src/presentation/pages/projects/TemplateGalleryModal.test.tsx`
  - `src/data/repositories/local/LocalStorageProjectRepository.test.ts`
  - `src/domain/templates/instantiateTemplate.test.ts`
  - `src/presentation/hooks/useCreateProject.test.tsx`
- Evidence: CRUD operations, search, duplicate, rename, delete confirmation, empty states,
  template-based creation, and transactional provisioning of template databases, collections,
  schemas, and seed records with collection-reference remapping.

## UC-03 Design UI with Components and Templates

- Routes: `/project/:id/editor`
- Domain/data: `ComponentNode`, `ComponentType`, `ContainerNode`, `ColumnNode`, `RowNode`,
  `ListViewNode`, `ProjectDocument`, `Screen`, `TemplateRepository`
- Presentation: `EditorWorkspace`, `ComponentsPalette`, `EditorLeftPanel`, `LayersPanel`,
  `EditorCanvas`, `ScreenTabs`, `Inspector`, `ScreenFrame`, `ComponentRenderer`
- Tests:
  - `src/presentation/pages/editor/EditorPage.test.tsx`
  - `src/presentation/editor/workspace/EditorCanvas.test.tsx`
  - `src/presentation/editor/workspace/EditorLeftPanel.test.tsx`
  - `src/presentation/editor/workspace/LayersPanel.test.tsx`
  - `src/presentation/editor/workspace/ComponentsPalette.test.tsx`
  - `src/presentation/editor/workspace/Inspector.test.tsx`
  - `src/presentation/editor/renderer/ComponentRenderer.test.tsx`
  - `src/presentation/editor/renderer/useDocumentAppTheme.test.ts`
  - `src/data/mappers/project.mapper.test.ts`
  - `src/data/templates/templateCatalog.test.ts`
- Evidence: drag/drop, free-form and linear nested composition, reparenting, resize, visibility,
  locking, inline rename, ordering, snap, pan, zoom, palette search, templates, Column/Row/ListView
  widgets, focused free-form ListView item-template editing with representative data and explicit
  responsive child geometry, designed-empty item outlines that reflect persisted
  padding/spacing/radius, schema-driven typed property bindings with optional record labels and
  image-only item templates, autosave, undo/redo, and Mobile/Tablet/Desktop
  canvas and preview device switching. The canvas follows the editor's light/dark shell theme,
  including component dark appearance variants, while Preview keeps an independent app-theme
  selector. The Notes CRUD starter demonstrates a mobile card list, accessible per-card overflow
  actions, and dedicated add/detail/edit screens without an app sidebar.

## UC-04 Configure Logic and App Data

- Routes: `/project/:id/editor` (Design, Logic, Data modes)
- Domain/data:
  - `LogicGraph`, `Behavior`, `TriggerNode`, `ConditionNode`, `ActionNode`
  - `AppDataRepository`, `DataCollection`, `DataField`, `DataRecord`
  - `validateProject`
- Presentation:
  - `LogicWorkspace`, `LogicNodeLibrary`, `LogicGraphCanvas`, `LogicNodeConfig`
  - `DataWorkspace`, `CollectionSchemaEditor`, `RecordsTable`, `RecordDialog`
  - `Inspector` data bindings
- Tests:
  - `src/presentation/editor/logic/LogicWorkspace.test.tsx`
  - `src/presentation/editor/logic/LogicGraphCanvas.test.tsx`
  - `src/presentation/editor/logic/LogicNodeLibrary.test.tsx`
  - `src/presentation/editor/state/editorReducer.test.ts`
  - `src/presentation/editor/data/DataWorkspace.test.tsx`
  - `src/presentation/editor/data/useProjectData.test.tsx`
  - `src/data/repositories/local/LocalStorageAppDataRepository.test.ts`
  - `src/domain/logic/graph.test.ts`
  - `src/domain/logic/runtime.test.ts`
  - `src/presentation/editor/workspace/NotesTemplateFlow.test.tsx`
- Evidence: typed workflow ports, node positioning, If/Else branches, node dragging, connection
  validation, cycle prevention, searchable node library, component/data node configuration,
  project-scoped collection CRUD, backend-generated record identifier naming, records, schema
  editing, structured static ListView records,
  typed ListView property bindings, component-derived triggers, automatic current-row update/delete
  actions, Gesture Detector wrappers, current-record detail navigation with explicit URL parameter
  mappings, atomic and idempotent target-screen route linking with home/static-route and
  multi-collection validation, session-only Add Local List
  Item actions, composed Input/Button record workflows, granular RAG
  ingestion/chat nodes, solid control and dashed typed resource edges, AI Agent/Vector Store
  composition, write-through indexing, structured output mappings, schema migration, and preview
  data effects. The Notes starter provides complete insert, record-aware open, prefill, update,
  detail delete, and current-card menu delete workflows against its provisioned Notes collection.

## UC-05 Generate UI Component with AI

- Route: `/project/:id/editor`
- Domain/data: `AssistantProposal`, `applyAssistantProposal`, `interpretAssistantMessage`
- Presentation: `AssistantChip`, `AssistantSheet`, `useAssistantConversation`
- Tests:
  - `src/domain/ai/assistant.test.ts`
  - `src/domain/ai/proposal.test.ts`
  - `src/presentation/editor/assistant/AssistantSheet.test.tsx`
  - `src/presentation/pages/editor/EditorPage.test.tsx`
- Evidence: rule-based intents, structured proposals, Keep/Undo, one history entry per proposal,
  demo badge, and no-op handling for impossible proposals.

## UC-06 Preview Project

- Route: `/project/:id/editor`
- Domain/data: `runClickBehavior`, `applyTextOverrides`, `validateProject`
- Presentation: `PreviewOverlay`, `ScreenFrame`
- Tests:
  - `src/presentation/editor/workspace/PreviewOverlay.test.tsx`
  - `src/presentation/pages/editor/EditorPage.test.tsx`
- Evidence: shared renderer, reactive click chains, text overrides, toast behavior, screen
  navigation with current-record route context and detail-screen record bindings, dynamic detail
  paths, keyboard-operable Gesture Detectors, nested action isolation, condition branch execution,
  isolated preview data, validation blocking, and close controls.

## UC-07 Deploy Application

- Route: `/project/:id/deploy`
- Domain/data: `DeploymentRepository`, `DeploymentRecord`, `deploymentUrl`, `validateProject`,
  `GeneratedAppManifestDTO`, `buildGeneratedAppManifest`
- Presentation: `DeploymentPage`, `useDeployment`, `PublishStepper`, `DeploymentHistory`,
  `PublishSuccessModal`, `RuntimeReadinessPanel`
- Tests:
  - `src/presentation/pages/deployment/DeploymentPage.test.tsx`
  - `src/presentation/pages/deployment/useDeployment.test.tsx`
  - `src/data/repositories/local/LocalStorageDeploymentRepository.test.ts`
  - `src/domain/deployment/deploymentUrl.test.ts`
  - `src/data/generation/generatedAppManifest.test.ts`
  - `src/presentation/pages/deployment/RuntimeReadinessPanel.test.tsx`
- Evidence: environment selection, animated publish pipeline, fake live URLs, copy action,
  deployment history, View/Redeploy, custom-domain stub, validation blocking, failure preservation,
  inferred runtime requirements, and an exportable manifest-v2 backend handoff with collection
  record identities and typed route parameters but without records or secrets. Backend source
  export now stores an immutable app version, generates a browser graph executor, and connects
  declared CRUD/email actions to `/runtime/v1`; AI/RAG/CV and generated-app authentication remain
  explicit unsupported boundaries.

## UC-08 Platform Administration

- Status: intentionally excluded.
- Reason: Novy currently has a single application-builder role. Multi-user administration, audit
  dashboards, and service-health screens are outside the current frontend scope.
- Boundary: repository and authorization contracts remain compatible with a future backend.

## Gate Summary

| Gate | Status | Tests |
|---|---|---|
| 0 Foundations | Complete | router smoke tests |
| 1 Domain + mock data + renderer | Complete | repository/mapper/renderer tests |
| 2 Auth | Complete | validation + guard tests |
| 3 Projects | Complete | CRUD flow tests |
| 4 Editor shell + design mode | Complete | reducer + geometry + interaction tests |
| 5 Logic workspace | Complete | graph reducer + behavior linking tests |
| 6 AI assistant mock | Complete | intent + apply/undo tests |
| 7 Deployment | Complete | stepper + history tests |
| 8 Polish | Complete | accessibility + error boundary + empty states |
| PD6 Gate 1 Figma-style layers | Complete | metadata/migration + layer interaction tests |
| PD6 Gate 2 Canvas manipulation + composition | Complete | geometry/reparent/keyboard tests |
| PD6 Gate 3 Logic + node library | Complete | graph/runtime/connection tests |
| PD6 Gate 4 Data workspace + bindings | Complete | repository/CRUD/binding tests |
| PD6 Gate 5 Validation + preview/deploy | Complete | validator/failure-preservation tests |
| PD6 Gate 6 Traceability + acceptance | In progress | final regression suite |

## Backend Swap Seams

- `AuthRepository`
- `ProjectRepository`
- `AppDataRepository`
- `DeploymentRepository`
- `AssistantProposal` generation boundary
- `ValidationReport` producer boundary
- `GeneratedAppManifestDTO` project/schema/runtime handoff boundary

Presentation code consumes these interfaces exclusively. Backend integration should replace
implementations under `src/data` without changing presentation contracts.
