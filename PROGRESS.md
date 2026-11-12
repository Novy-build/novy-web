# Novy Frontend Progress

**Last reviewed:** 2026-11-12

This document inventories frontend capabilities that are implemented in the repository. Novy is
currently a **web app builder**. Native mobile and desktop application generation are outside the
current product scope.

Planned, not yet implemented: a **website** project type with a section library and an
`+ Add section` flow. See `docs/website-projects-plan.md` for the execution contract and
`novy-backend/WEBSITE_PROJECTS_PLAN.md` for the backend half. Website projects are an explicit
scope extension beyond the PD6 baseline, which covers web applications only.

All features marked as implemented below exist in the frontend codebase. Features backed by local
mock repositories or preview-only behavior are identified explicitly and must not be interpreted as
completed production backend integrations.

## 1. Application foundation

- [x] React and TypeScript application with strict type checking.
- [x] Vite development and production build configuration.
- [x] Clean Architecture separation across `domain`, `data`, `presentation`, and `main` layers.
- [x] Dependency injection for authentication, projects, templates, project data, and deployment
  repositories.
- [x] Central Axios client configured with credentialed requests, a JSON content type, and
  automatic `X-CSRF-Token` headers for state-changing requests.
- [x] API-backed authentication repository for the Novy backend, selected when
  `VITE_API_BASE_URL` is configured.
- [x] API-backed React source-export repository, selected by the same backend base URL, with typed
  archive and backend-error handling.
- [x] Local-storage repository implementations with simulated request latency.
- [x] DTO and mapper boundaries between persisted/API-shaped data and domain entities.
- [x] Versioned project payloads with migration coverage for previously saved documents.
- [x] Demo project seeding.
- [x] Mandatory repository workflow for keeping `PROGRESS.md` and `CHANGELOGS.md` synchronized.
- [x] Backend-handoff reading checklist covering product requirements, Project JSON contracts,
  mappers, repositories, validation, migrations, and tests.
- [x] Reciprocal absolute frontend/backend repository locations documented in both projects'
  `AGENTS.md` files, with the backend delivery sequence maintained in `novy-backend/BACKEND_PLAN.md`.

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
- [x] Backend-connected registration, login, session restoration, refresh-on-session-check, and
  logout through HttpOnly cookies when `VITE_API_BASE_URL` is configured.
- [x] Generic invalid-credentials feedback that does not reveal whether an email exists.
- [x] Pending-email-confirmation guidance when Supabase requires confirmation before login.
- [x] Development-only demo-user sign-in shortcut; API-backed auth never exposes it.
- [x] Session provider and protected-route guard.
- [x] Restoration of the originally requested route after authentication.
- [x] Sign-out support.
- [x] Responsive application shell.
- [x] Collapsible sidebar with persisted collapsed state.
- [x] Project-aware links to the editor and deployment screen.
- [x] Light and dark theme toggle with persisted preference and system-theme support.

Authentication uses the Novy backend when `VITE_API_BASE_URL` is set; otherwise it falls back to
the local mock repository so frontend-only development keeps working. The backend owns Supabase
credentials and stores access/refresh tokens only in `HttpOnly` cookies; the browser sends the
readable `novy_csrf` cookie as `X-CSRF-Token` on mutations. Password recovery and a live Supabase
project configuration are not implemented or verified yet.

For the current local workspace, ignored `.env.local` configuration points to the backend's
development-only dummy auth mode. Dummy accounts and sessions are ephemeral, any valid login is
accepted, and submitted passwords are ignored. Production still requires Supabase auth.

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
- [x] Notes CRUD app with list cards, add/detail/edit screens, detail and overflow-menu deletion,
  seeded example records, and fully wired current-record workflows.
- [x] Template gallery with previews.
- [x] Viewport-safe, internally scrollable template modal with a responsive one/two/three-column
  gallery.

Project persistence uses the Novy backend when `VITE_API_BASE_URL` is configured and remains
browser-local otherwise. The dashboard offers an explicit import path for projects that already
exist only in this browser.

## 4. Project model and multiple screens

- [x] A project document can contain multiple screens.
- [x] Add, select, rename, and delete screens.
- [x] Screen tabs in the editor with reserved label spacing for each tab's options control.
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
`src/data/mappers/project.mapper.ts`. Local mode writes this DTO as JSON; remote mode sends the
document to `/api/v1/projects/{projectId}/document` with the current revision in `If-Match`, so
editor components never depend on the persistence backend.

The following representative payload shows two screens, component layout, a nested component, an
event binding, and its referenced logic graph:

```json
{
  "schemaVersion": 13,
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
          "id": "column_main",
          "name": "Main content",
          "type": "column",
          "x": 24,
          "y": 32,
          "w": 342,
          "h": 300,
          "appearance": {
            "borderStyle": "dashed"
          },
          "props": {
            "mainAxisAlignment": "start",
            "crossAxisAlignment": "stretch",
            "gap": 16,
            "padding": { "mode": "all", "top": 16, "right": 16, "bottom": 16, "left": 16 }
          },
          "children": [
            {
              "id": "row_actions",
              "type": "row",
              "x": 0,
              "y": 0,
              "w": 310,
              "h": 48,
              "props": {
                "mainAxisAlignment": "space-between",
                "crossAxisAlignment": "center",
                "gap": 12,
                "padding": { "mode": "all", "top": 0, "right": 0, "bottom": 0, "left": 0 }
              },
              "children": [
                {
                  "id": "button_details",
                  "name": "Open details",
                  "type": "button",
                  "x": 0,
                  "y": 0,
                  "w": 160,
                  "h": 48,
                  "appearance": {
                    "backgroundColor": "#5551f2",
                    "textColor": "#ffffff",
                    "borderRadius": 10,
                    "dark": { "backgroundColor": "#4338ca", "textColor": "#ffffff" }
                  },
                  "responsive": {
                    "tablet": { "w": 200 },
                    "desktop": { "w": 240 }
                  },
                  "props": {
                    "label": "Open details",
                    "variant": "solid",
                    "icon": "arrow-right",
                    "iconPosition": "right"
                  }
                }
              ]
            },
            {
              "id": "listview_notes",
              "type": "listview",
              "x": 0,
              "y": 0,
              "w": 310,
              "h": 200,
              "props": {
                "emptyText": "No notes yet",
                "showDividers": true,
                "scrollDirection": "vertical",
                "crossAxisAlignment": "stretch",
                 "gap": 0,
                 "padding": { "mode": "all", "top": 0, "right": 0, "bottom": 0, "left": 0 },
                 "itemSpacing": 0,
                 "itemBorderRadius": 0,
                 "dataSource": {
                  "kind": "collection",
                  "collectionId": "collection_notes",
                  "displayFieldIds": ["field_title"]
                }
              },
              "children": [
                {
                  "id": "gesture_note_card",
                  "name": "Open note",
                  "type": "gesture-detector",
                  "x": 0,
                  "y": 0,
                  "w": 240,
                  "h": 44,
                  "props": { "semanticLabel": "Open note details" },
                  "children": [
                    {
                      "id": "text_note_title",
                      "type": "text",
                      "x": 0,
                      "y": 0,
                      "w": 240,
                      "h": 44,
                      "bindings": [
                        {
                          "target": "text.content",
                          "value": { "source": "list-item", "fieldId": "field_title" }
                        }
                      ],
                      "props": {
                        "text": "Note title",
                        "level": "body",
                        "fontFamily": "Georgia, serif",
                        "fontSize": 18,
                        "fontWeight": "semibold"
                      }
                    }
                  ]
                },
                {
                  "id": "text_note_description",
                  "type": "text",
                  "x": 0,
                  "y": 44,
                  "w": 240,
                  "h": 44,
                  "bindings": [
                    {
                      "target": "text.content",
                      "value": { "source": "list-item", "fieldId": "field_description" }
                    }
                  ],
                  "props": { "text": "Note description", "level": "body" }
                },
                {
                  "id": "menu_note_actions",
                  "type": "dropdown",
                  "x": 260,
                  "y": 0,
                  "w": 44,
                  "h": 44,
                  "props": {
                    "label": "Note actions",
                    "placeholder": "",
                    "options": ["Edit", "Delete"],
                    "selectedIndex": -1,
                    "presentation": "menu"
                  }
                }
              ]
            },
            {
              "id": "listview_drafts",
              "type": "listview",
              "x": 0,
              "y": 0,
              "w": 310,
              "h": 120,
              "props": {
                "emptyText": "No drafts yet",
                "showDividers": true,
                "scrollDirection": "vertical",
                "crossAxisAlignment": "stretch",
                 "gap": 0,
                 "padding": { "mode": "all", "top": 0, "right": 0, "bottom": 0, "left": 0 },
                 "itemSpacing": 0,
                 "itemBorderRadius": 0,
                 "dataSource": {
                  "kind": "static",
                  "fields": [{ "id": "title", "label": "Title", "type": "text" }],
                  "items": []
                }
              },
              "children": []
            },
            {
              "id": "switch_app_theme",
              "type": "switch",
              "x": 0,
              "y": 0,
              "w": 200,
              "h": 44,
              "props": { "label": "Dark mode", "checked": false, "controlsTheme": true }
            }
          ]
        }
      ],
      "behaviors": [
        {
          "id": "behavior_open_details",
          "name": "On click — Open note",
          "event": "click",
          "graphId": "graph_open_details",
          "targetNodeId": "gesture_note_card"
        },
        {
          "id": "behavior_note_actions",
          "name": "On change — Note actions",
          "event": "change",
          "graphId": "graph_note_actions",
          "targetNodeId": "menu_note_actions"
        }
      ],
      "logicGraphs": [
        {
          "id": "graph_open_details",
          "name": "On click — Open note",
          "sourceNodeId": "gesture_note_card",
          "nodes": [
            {
              "kind": "trigger",
              "id": "trigger_click",
              "event": "click",
              "position": { "x": 80, "y": 160 }
            },
            {
              "kind": "action",
              "id": "action_add_draft",
              "position": { "x": 320, "y": 160 },
              "payload": {
                "type": "add-local-list-item",
                "targetNodeId": "listview_drafts",
                "placement": "append",
                "values": { "title": "Unsaved draft" }
              }
            },
            {
              "kind": "action",
              "id": "action_email",
              "position": { "x": 560, "y": 160 },
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
              "position": { "x": 800, "y": 160 },
              "payload": {
                "type": "navigate",
                "targetScreenId": "screen_details",
                "recordContext": { "collectionId": "collection_notes", "recordId": "" }
              },
              "inputMappings": {
                "$recordId": { "source": "list-item", "fieldId": "$id" }
              }
            }
          ],
          "edges": [
            {
              "id": "edge_click_to_draft",
              "fromNodeId": "trigger_click",
              "fromPort": "next",
              "toNodeId": "action_add_draft",
              "toPort": "in"
            },
            {
              "id": "edge_draft_to_email",
              "fromNodeId": "action_add_draft",
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
        },
        {
          "id": "graph_note_actions",
          "name": "On change — Note actions",
          "sourceNodeId": "menu_note_actions",
          "nodes": [
            { "kind": "trigger", "id": "trigger_note_actions", "event": "change", "position": { "x": 80, "y": 160 } },
            {
              "kind": "condition", "id": "condition_delete", "position": { "x": 320, "y": 160 },
              "left": { "source": "component", "nodeId": "menu_note_actions", "property": "value" },
              "operator": "equals", "compareValue": "Delete"
            },
            {
              "kind": "action", "id": "action_delete_note", "position": { "x": 560, "y": 160 },
              "payload": { "type": "delete-record", "collectionId": "collection_notes", "recordId": "", "confirm": true },
              "inputMappings": { "$recordId": { "source": "list-item", "fieldId": "$id" } }
            }
          ],
          "edges": [
            { "id": "edge_actions_condition", "fromNodeId": "trigger_note_actions", "fromPort": "next", "toNodeId": "condition_delete", "toPort": "in" },
            { "id": "edge_condition_delete", "fromNodeId": "condition_delete", "fromPort": "true", "toNodeId": "action_delete_note", "toPort": "in" }
          ]
        }
      ]
    },
    {
      "id": "screen_details",
      "name": "Details",
      "path": "/notes/:noteId",
      "routeParameters": [
        {
          "name": "noteId",
          "source": {
            "kind": "record-id",
            "collectionId": "collection_notes",
            "identifierKey": "noteId"
          }
        }
      ],
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
  Schema-v10 adds optional `appearance.dark` background/text/border overrides. Blank dark colors
  inherit their base appearance. Optional `borderWidth` values set a non-negative pixel width;
  older documents without these fields keep their previous colors and component border defaults.
- Every appearance color field pairs its labeled hex input with a native color picker. The picker
  normalizes shorthand hex for the swatch, while the text input continues to accept free-form CSS
  color strings; appearance values and DTO shapes are unchanged.
- A Dropdown with `props.presentation: "menu"` renders as an accessible actions menu and emits a
  change event containing the chosen option. Omitted presentation retains the original select.
- A Switch with `props.controlsTheme: true` controls the previewed app's light/dark theme, without
  changing the Novy editor theme. This is preview-session state, not a production theme service.
- `type` selects the renderer/generator component and `props` stores its typed configuration.
- Camera components serialize only labels and `facingMode`; captured media is transient runtime
  state and is never embedded in the project document.
- Optional `name`, `isHidden`, and `isLocked` fields preserve editor-facing layer metadata.
- Container, Gesture Detector, Column, Row, and ListView widgets store nested components in
  `children`.
- Schema v12 adds the transparent, child-bearing Gesture Detector with a persisted semantic action
  label. It can be added from the palette; Enter and Space activate it in Preview.
- Schema v13 adds explicit `routeParameters`. A record-aware detail route maps its named URL segment
  to one collection's backend-generated record identity instead of relying on matching conventions.
- Container keeps free-form child coordinates. Column and Row resolve child placement from their
  main-axis alignment, cross-axis alignment, gap, padding, and child order.
- Column, Row, and the ListView repeated-item frame persist padding as a schema-v11 `PaddingValue`
  with Flutter-style **All**, **Symmetric**, and **Only** display modes. All four sides stay stored so
  switching modes is non-destructive; layout math and renderers consume each side independently.
  Container remains free-form and intentionally has no padding control.
- Container, Column, and Row expose optional `appearance.borderStyle` (`solid`, `dashed`, or `none`)
  in the Inspector. Omitted values preserve the existing shell defaults (Column/Row dashed,
  Container solid); **None** hides both the frame and shell border even if a border color is saved.
  Explicit styles without a saved border color use the theme hairline color.
- Buttons expose an optional curated Lucide `props.icon` and `props.iconPosition` (`left`, `center`,
  or `right`). Center placement creates an icon-only visual while retaining the label as accessible
  screen-reader text. The icon is decorative (`aria-hidden`), inherits the button text color, and
  is omitted from older saved buttons; unknown persisted icon names are ignored by the DTO mapper.
- Text nodes expose optional `props.fontFamily` (a non-empty CSS font-family value),
  `props.fontSize` (positive pixels), and `props.fontWeight` (`normal`, `medium`, `semibold`, or
  `bold`) overrides. Omitted values fall back to the app font and selected `level` preset; custom
  sizes render with a proportional line height. Invalid persisted values are ignored by the DTO
  mapper.
- Text fields retain their serialized `label` and may set optional `props.showLabel: false` to hide
  it visually without losing the accessible name. Omitted `showLabel` values preserve the legacy
  visible-label behavior. Border color, style, width, radius, and dark border color are applied to
  the actual input or textarea in canvas, Preview, thumbnails, and generated layout properties.
- ListView repeats its `children` as one shared free-form item template for structured static items
  or collection records. Direct template children retain explicit responsive `x`, `y`, `w`, and `h`
  geometry; nested Row and Column widgets still provide internal auto-layout. A focused **Edit item
  design** scope reuses the canvas, Layers, history, and autosave paths while showing representative
  item data and the true item cross-axis bounds.
- New palette ListViews start with no static records and no item-template widgets. Their canvas
  shows an accessible **Add item** prompt that opens the focused item-design scope without creating
  a data record.
- ListView item-template children are an editor boundary: they remain visible as repeated output but
  are not directly selectable, nestable, or exposed in screen-level Layers. Widgets can only enter
  or leave that template while its owning ListView item-design scope is active.
- Direct item-template widgets use the same padded free-form geometry boundary for their first
  palette drop, drag, resize, Inspector geometry edits, keyboard nudging, duplication, repeated
  rendering, and reparent finalization. New Row/Column roots now default to half of the padded
  cross-axis (144 px on the default 320 px ListView) instead of 75%, leaving travel room across
  the item frame. In item design the ListView frame is no longer an alignment target, so its
  centre guide no longer snaps or reads as a boundary; sibling alignment remains available.
  The item frame is now a first-class selectable container in item design: it appears as an
  **Item frame** root layer, can be selected from Layers or the canvas background, and exposes a
  frame-only Inspector for Item padding, spacing, border radius, and dividers. Its guide is
  selection-driven, so selecting a widget shows only that widget instead of a competing
  full-width dashed box. Pointer
  placement is retained, and close/reopen does not change responsive geometry. Legacy
  ListView cross-axis/gap fields remain serialized only for schema compatibility and are not applied
  to schema-v9 free-form item children.
- Designed ListViews with no resolved records show editor-only repeated-item outlines after leaving
  item design. The outlines reflect persisted item padding, spacing, radius, direction, and computed
  template extent without creating records; preview/runtime continues to show the configured empty
  state until real items exist. The outer dashed border is the sole item boundary; padding appears
  as shaded per-side inset gutters rather than a second nested outline.
- Optional typed `bindings` resolve current-item fields into Text content, Image source/alt, Button
  labels, Checkbox/Switch state, Progress values, and component visibility while preserving static
  property fallbacks.
- The Inspector derives binding controls from the selected component and current item schema.
  Options show field labels with types, incompatible targets explain which field type to add, and
  the section names the active collection or static source instead of assuming text records.
- Collection-backed ListViews keep an optional **Record label** for menus, sample selection,
  fallback items, and screen-reader text. **None** stores `displayFieldIds: []`; item templates
  render their own content and may be image-only or mixed media.
- Collection-backed ListViews and their focused Item Frame expose an **Item ID name** such as
  `noteId`. This is immutable identifier metadata, not a user-entered field value: the backend
  generates each record ID, and linked Open-current-item routes update when the name changes.
- Component ordering in `nodes` and `children` represents layer/paint ordering.

#### How event bindings are represented

- A screen's `behaviors` array stores the event bindings.
- `targetNodeId` identifies the component that produces the event.
- `event` is currently `click`, `change`, or `load`.
- `graphId` points to the `LogicGraphDTO` that defines what happens after the event.
- The graph contains the trigger, conditions/actions, their canvas positions, and connecting edges.
- Action payloads reference other components, screens, records, or collections by stable ID.
- Optional `inputMappings` resolve named action inputs from literals, component state, the current
  repeated ListView item, session user values, or previous-node outputs.
- For a workflow triggered inside an item template, `{ "source": "list-item", "fieldId": "$id" }`
  resolves the current item's stable ID. For Get Record, `record.values.<field-id>` references a
  returned collection field; the Logic inspector offers field labels for these paths.
- Component-aware Logic entries bind directly to actual screen widgets. A collection-backed
  ListView context adds **Update current item**, **Delete current item**, and **Open current item**
  actions whose collection and record ID mapping are inferred rather than entered manually.
- Current-item navigation persists `recordContext` with collection and record IDs. Preview exposes
  these as `route.collectionId` and `route.recordId`; generated apps can use a destination path such
  as `/notes/:noteId` for refreshable detail URLs.
- `routeParameters` explicitly map `noteId` to the Notes collection's `record-id` source. The Logic
  inspector displays `noteId: Current item ID — Automatic`, and validation rejects missing, stale,
  duplicated, or collection-mismatched mappings.
- Choosing a target screen for a record-aware Navigate action links that screen immediately in the
  same undo entry as the Logic edit. Linking is idempotent, keeps `/` static, preserves unrelated
  dynamic segments, and appends ordered parameters when multiple collections share a detail screen.
  Validation warns about home-route targets, unmapped dynamic segments, and shared multi-collection
  routes. The Inspector's linked-route hint reads persisted mappings rather than a live graph scan.
- A screen targeted by record-aware navigation automatically offers that collection's fields in
  the Inspector's item-data bindings. Preview resolves those bindings from the selected record, so
  detail content follows the exact ListView row that opened it.
- Delete Record may set `confirm: true` to request confirmation before deleting in Preview.
- RAG and Computer Vision actions use provider-agnostic payloads. Their generated runtime inputs may
  reference temporary camera media, while outputs expose document IDs, answers/citations,
  liveness, credential IDs, verification results, confidence, and reason fields.
- Async database and email actions branch through `success` and `error`; synchronous actions use
  `next` and conditions use `true`/`false`.

The IDs form the contract between layout and behavior. The backend generator must validate these
references and input mappings before generating React code. Static action configuration remains in
the typed `payload`; optional `inputMappings` override named fields at runtime.

### Generated-app backend handoff manifest

The Deployment page can export generated-app manifest v2 and generated-layout v2. They contain the complete
`ProjectDTO`, a normalized `GeneratedLayoutDTO` that projects ListView repeated-item frames as
explicit containers, project database and collection schemas, routes, responsive media-query thresholds,
and inferred runtime requirements for authentication, data, email, RAG, Computer Vision, camera
permissions, and deployment. The manifest deliberately excludes app records, secrets, raw camera
captures, and biometric templates. The JSON remains a diagnostics contract. When the backend is
configured, a separate action sends the same manifest to the authenticated static React generator
and downloads the returned source ZIP.

Record identity and routing are explicit in that handoff:

```json
{
  "appData": {
    "collections": [
      {
        "id": "collection_notes",
        "identifier": { "key": "noteId", "type": "string", "generation": "backend" }
      }
    ]
  },
  "layout": {
    "layoutVersion": 2,
    "screens": [
      {
        "screenId": "screen_details",
        "path": "/notes/:noteId",
        "routeParameters": [
          { "name": "noteId", "source": "record-id", "collectionId": "collection_notes", "identifierKey": "noteId" }
        ]
      }
    ]
  },
  "runtime": {
    "routes": [
      {
        "screenId": "screen_details",
        "path": "/notes/:noteId",
        "parameters": [
          { "name": "noteId", "source": "record-id", "collectionId": "collection_notes", "identifierKey": "noteId" }
        ]
      }
    ]
  }
}
```

## 5. Design editor

### Editor shell

- [x] Design, Logic, and Data workspaces.
- [x] Clearly labeled **Exit work** navigation from the editor back to the projects page.
- [x] Inline project renaming.
- [x] Saving, saved, unsaved, and retryable save-failure status feedback.
- [x] Project validation badge.
- [x] Undo and redo controls.
- [x] Preview and Deploy actions.

### Component palette and renderer

- [x] Searchable, categorized component palette with consistent Lucide SVG icons for every asset.
- [x] Drag components from the palette onto the canvas.
- [x] Click-to-add alternative to drag and drop.
- [x] Shared renderer used by canvas, preview, and project thumbnails.
- [x] Typed defaults and inspector controls for supported components.

Implemented component types:

- [x] Button with an optional curated icon and left/center/right icon placement.
- [x] Text with display/title/body presets plus optional font-family, font-size, and font-weight overrides.
- [x] Text field, including text, email, password, number, multiline, optional visible labels, and
  full border color/style/width/radius controls.
- [x] Image.
- [x] Container/frame.
- [x] Gesture Detector transparent interaction wrapper with a semantic label, keyboard activation,
  nested-control click isolation, and palette-based composition.
- [x] Column with vertical child composition and main/cross-axis controls.
- [x] Row with horizontal child composition and main/cross-axis controls.
- [x] ListView with vertical/horizontal scrolling, static or collection data, and composed item
  templates.
- [x] Dedicated ListView item-design scope with scoped canvas/Layers, sample selection,
  schema-driven property binding controls, an optional record label, palette insertion, undo/redo,
  and autosave reuse. Empty item templates show a status message and rely on the component palette
  for the first widget; no quick-start Row/Column/Text actions are presented.
- [x] Designed-empty ListView outlines with persisted item padding, spacing, border radius, and
  vertical/horizontal geometry that real repeated items also consume.
- [x] First-session ListView item geometry normalization for Row/Column drops and all direct
  movement/resize paths, with stable close/reopen behavior and unambiguous padding gutters.
- [x] Free-form ListView item frames with explicit responsive child coordinates, item-sized focused
  canvases, movable intrinsic Row/Column defaults, and schema-v8 flow-layout migration.
- [x] Structured static ListView fields/records and row-specific logic input mappings without
  copying collection records into Project JSON.
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
- [x] Flutter-style All, Symmetric, and Only padding modes for Column/Row layout and ListView item
  frames, with persisted per-side values, non-destructive mode switching, and asymmetric layout
  math, canvas outlines, item-frame guides, and schema-v10 numeric-padding migration. Newly created
  Row, Column, and ListView widgets default to zero padding; existing explicit project and template
  values remain unchanged.
- [x] Solid, dashed, and none border styles for Container, Column, and Row layout nodes, persisted
  through optional `appearance.borderStyle` and rendered consistently in canvas, preview,
  thumbnails, and generated-layout appearance data.
- [x] Text field borders apply color, solid/dashed/none style, non-negative pixel width, and corner
  radius directly to the input/textarea without adding a second outer frame border.
- [x] Optional curated Button icons with left/center/right placement, decorative accessibility behavior,
  persisted `props.icon`/`props.iconPosition`, and backward-compatible label-only defaults.
- [x] Optional Text font-family, font-size, and font-weight overrides with app-font/level-preset
  fallbacks, proportional custom line height, persisted typography values, and invalid-value
  rejection at the DTO boundary.
- [x] Duplicate and delete selected components.
- [x] Bring components forward or send them backward.
- [x] Nest components directly inside Container, Column, and Row widgets; edit ListView template
  children only inside the owning ListView item-design scope.
- [x] Drag components between child-bearing widgets and the screen root while preserving their visual
  position.
- [x] Container-relative child coordinates and computed linear child geometry for Flutter-style
  widgets.
- [x] Locked components ignore direct canvas manipulation.
- [x] Hidden components remain persisted but are excluded from rendering.
- [x] Bounds clamping for movement and resizing, including sibling-aware Row/Column resize limits
  that reserve parent padding, gaps, and visible sibling space for both pointer and Inspector edits.
- [x] Fit-once parent-relative sizing for palette drops, canvas reparenting, and Layers-panel
  nesting. Screen and free-form children are capped to their destination bounds; Row and Column
  children proportionally share the padded main axis after gaps, cap their cross axis, exclude
  hidden siblings, and persist independent mobile/tablet/desktop geometry. Sizes remain concrete
  and manually editable after placement rather than continuously tracking later parent resizes.

### Canvas controls and precision

- [x] Eight-pixel snap grid with a user-controlled snap toggle.
- [x] Zoom in, zoom out, and fit-to-viewport controls.
- [x] Ctrl/Cmd + wheel canvas zoom.
- [x] Non-passive Design and Logic canvas wheel interception prevents browser page zoom while the
  pointer is over a canvas.
- [x] Space-drag and middle-button canvas panning.
- [x] Responsive web viewport presets for mobile, tablet, and desktop widths.
- [x] Independently minimizable Design, Logic, and Data side panels with narrow restore rails,
  including a dedicated Design Inspector header that keeps its collapse control clear of panel
  content such as the ListView item-frame controls.
- [x] Horizontally resizable Design, Logic, and Data side panels with persisted, clamped widths and keyboard-accessible separators.
- [x] Vertically resizable Validation pane in the Design inspector with a persisted height, a
  chevron header that collapses the issue panel, and drag-to-minimize past the minimum height.
- [x] Backspace/Delete removes the selected Design widget or non-trigger Logic node from the keyboard.
- [x] Clicking empty canvas or grid space clears the current selection.
- [x] Mobile/base component geometry with optional tablet and desktop overrides.
- [x] Breakpoint-specific visibility plus a mobile-first cascade for layout and visibility.
- [x] Field-level responsive overrides that preserve inheritance when a breakpoint is edited.
- [x] Breakpoint-aware movement, resizing, addition, duplication, nested bounds, reparenting,
  rendering, preview, thumbnails, and Inspector controls.
- [x] Typed background, text, border, corner-radius, and opacity appearance controls.
- [x] Native color pickers beside the base and dark-theme appearance hex inputs, with shorthand
  normalization and free-form hex editing preserved.
- [x] Automatic refitting when the active viewport preset changes.
- [x] Smart edge and center alignment guides.
- [x] Optional smart snapping to nearby components and the active frame.
- [x] Horizontal and vertical pixel-distance indicators while dragging.
- [x] Nested-component alignment using absolute design-space coordinates.

The viewport presets represent responsive web layouts; they do not generate native applications.

### Layers panel

- [x] Hierarchical component tree with component-type icons and indentation.
- [x] Expand and collapse all nested child-bearing widgets.
- [x] Canvas and Layers selection synchronization.
- [x] Inline layer renaming by double-click or `F2`.
- [x] Visibility and lock controls.
- [x] Theme-safe selected-layer treatment in light and dark mode.
- [x] Hover and keyboard-focus tooltips for visibility, lock, forward, backward, and layer-order controls.
- [x] Bring-forward, send-backward, bring-to-front, and send-to-back controls.
- [x] Compact accessible layer-order menu with boundary-disabled front/back actions.
- [x] `Alt+Shift+↑/↓` keyboard shortcuts for bring-to-front and send-to-back.
- [x] Drag-to-reorder and drag-to-reparent.
- [x] Visual insertion and nesting feedback.
- [x] Keyboard reorder and nesting alternatives using `Alt` plus arrow keys.
- [x] `Row` and `Column` layer children display in layout order (left-to-right /
  top-to-bottom), while free-form stacks remain topmost-first, so the Layers
  panel matches the canvas for auto-layout widgets.
- [x] `Row`/`Column` layer reorder, drag insertion, and palette drops respect
  main-axis order, including pointer-based insertion slots.
### Editing history and shortcuts

- [x] Document-level undo and redo history.
- [x] One history entry per drag or resize gesture.
- [x] Debounced project autosave through the project repository. In-flight saves survive the
  Saving-state rerender; failures clear the busy state and retry; newer edits remain dirty until
  their own snapshot is saved. Remote saves send the current revision in `If-Match`, refresh after
  a stale-revision conflict, and surface the backend message in the save status.
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
- [x] Component-derived trigger entries whose labels follow Design component names and bind to the
  selected component automatically.
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

Click, change, and screen-load behaviors execute in the frontend preview. Collection operations
use isolated state by default, or the configured project-data repository when explicitly enabled.
Production workflow execution remains a generated-app/backend responsibility.

## 7. Logic Builder

- [x] Full Logic workspace with a searchable node library, graph canvas, and configuration
  inspector.
- [x] Independently scrollable Logic node catalog with a non-overlapping minimize control.
- [x] Independently collapsible Logic node groups, including consolidated RAG Nodes and Computer
  Vision sections.
- [x] Pannable and zoomable dotted graph canvas.
- [x] Fit-view and zoom controls.
- [x] Add nodes by clicking or dragging from the node library.
- [x] Clicking an action in the library automatically connects it to the available flow tail;
  drag-to-place remains available for deliberate graph placement.
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
- [x] Get Record, variable names, component-prefill targets, variable/previous-output conditions,
  labeled returned record fields, and current ListView item IDs configurable in the Logic workspace.
- [x] Collection-aware current-item actions infer the enclosing ListView collection and stable row
  ID, hide raw IDs in the common path, offer Yes/No controls for boolean fields, and retain generic
  mappings as advanced value sources.
- [x] Optional confirmation for Delete Record, with cancellation following the error branch.
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
- [x] Navigate to a detail screen with current-record collection/ID context and preview route
  variables.
- [x] Add Local List Item for typed static ListViews, with append/prepend placement, dynamic input
  mappings, created-item node output, and isolated session-only state.

### Data action nodes

- [x] Get Records.
- [x] Insert Record.
- [x] Update Record.
- [x] Delete Record.
- [x] Refresh Collection/refetch effect.

### Local ListView mutation and backend synchronization

- [x] **Add Local List Item** appends or prepends a typed item to generated-app/preview runtime
  state only. It does not mutate Project JSON, replace static seed items, or write to a database.
- [ ] Add complementary local runtime operations only when required, such as Update List Item,
  Remove List Item, and Clear List Items.
- [x] Preview and project-data persistence reconcile successful Insert/Update/Delete operations into
  the collection record map, so all collection-backed ListViews rerender without a separate refresh
  node.
- [x] Generated applications receive canonical Insert/Update/Delete records from `/runtime/v1` and
  reconcile collection caches so every bound ListView rerenders without a page refresh or a
  separate Add Local List Item action.
- [x] Generated-app Refresh Collection remains an explicit refetch tool for external or stale-data
  scenarios, not a mandatory step after normal collection mutations.
- [ ] Consider optimistic Insert Record as a later enhancement with temporary IDs, success
  reconciliation, failure rollback, and visible error feedback.

Do not recommend `Add Local List Item -> Insert Record` for the same collection-bound ListView. That
sequence can duplicate rows and leave local state inconsistent when persistence fails. The normal
persisted flow is `On Click -> Insert Record -> success/error`; the collection cache update drives
the ListView. The local-only flow is `On Click -> Add Local List Item`.

### External action nodes

- [x] Send Email configuration with preview-only simulated delivery in the editor and declared
  action-by-ID execution through the generated-app backend runtime.

### AI and Computer Vision nodes

- [x] Separate granular ingestion and chat workflow purposes.
- [x] Document Loader, Text Splitter, Embedding Model, Vector Store Upsert/Delete, Chat Input,
  Query Embedding, Retriever, Prompt Template, LLM Model, and Chat Output nodes.
- [x] Reranker and Conversation Memory nodes.
- [x] Structured document/chunk/embedding/match/answer/citation outputs with preview-only
  simulation and dynamic node-output mappings.
- [x] Schema-v3 RAG Index/Query/Remove migration into deterministic schema-v4 granular chains.
- [x] Vector Store main node with upsert, delete, and retrieval-tool modes.
- [x] AI Agent main node with attached generic Chat Model, Memory, Vector Store Tool, Prompt,
  Embeddings, and optional Reranker resources.
- [x] CV Liveness, CV Enroll, and CV Verify provider-agnostic payloads.
- [x] Camera media input mapping, consent validation, liveness/verification output mapping, and
  preview-only biometric simulation.

The editor preview continues to simulate safe effects against isolated state. Downloaded React apps
now include a generated client executor for supported browser nodes and call immutable `/runtime/v1`
actions for CRUD/email. AI, RAG, Computer Vision, and generated-app end-user authentication remain
explicitly unsupported in production runtime.

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
- [x] A reserved backend-generated record identity per collection, with an editable public key such
  as `noteId`, collision/format validation, local migration defaults, and manifest serialization.
- [x] Add, remove, and reorder schema fields.
- [x] Record table.
- [x] Create, update, and delete records.
- [x] Confirmation before destructive data operations.
- [x] Loading, empty, and retryable error states.
- [x] ListView-to-collection data binding with an optional record label, multiple display fields
  retained for saved-project compatibility, search/sort metadata, and a repeatable nested item
  template that supports text, image-only, and mixed-media designs.
- [x] Logic variables, component-value actions, typed node outputs, and generalized conditions.
- [x] Composed Input + Button collection writes through Insert Record workflows and component-value
  input mappings.
- [x] Schema-v5 List/Repeater/Form migration to ListView or composed Column widgets, including
  deterministic Insert Record workflows for legacy bound Forms.
- [x] Logic data nodes can target project collections.
- [x] Templates can declare project-data blueprints. Project creation provisions databases,
  collections, fields, and seed records, remaps collection aliases across component and workflow
  references, and rolls back partial projects when provisioning fails.
- [x] When the backend is configured, project creation provisions the template blueprint atomically
  on the server and skips the browser-side provisioning path.
- [x] Project databases, collections, fields, and records persist through
  `/api/v1/projects/{projectId}` when the backend is configured, with backend-generated record IDs
  and canonical record responses.
- [x] The dashboard lists browser-only projects that have not been imported yet and uploads their
  project document plus app data on request. Local data is retained, and imported IDs are marked so
  the same project is not offered twice.
- [x] A local-storage app-data repository remains the fallback when no backend URL is configured.

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
- [x] Add a ListView, including the student-list example.
- [x] Create a click behavior that changes text.

No external AI model or AI SDK is connected.

## 10. Validation

- [x] Pure project validation in the domain layer.
- [x] Errors and warnings grouped by screen, component, logic, data, and deployment context.
- [x] Duplicate screen and component ID detection.
- [x] Component geometry and size validation.
- [x] Parent-container bounds warnings.
- [x] Component-specific property validation.
- [x] Cosmetic component/data labels may be blank without validation noise; interactive controls
  keep accessible fallback names. Image alt text and Gesture Detector semantic labels remain
  accessibility checks.
- [x] An undesigned ListView item template is a blocking component error until at least one item
  widget is added.
- [x] Missing collection and field reference detection.
- [x] Behavior target and graph reference validation.
- [x] Logic trigger-count, edge, cycle, and incoming-connection validation.
- [x] Condition source validation.
- [x] Action target validation for components, screens, records, and collections.
- [x] Screen route, dynamic mapping source, async output-port, Send Email, and Refresh Collection
  validation.
- [x] RAG document/query validation plus Computer Vision media, user, and biometric-consent
  validation.
- [x] Validation badge and issue panel in the editor, with a vertically resizable split pane that
  collapses from its header or by dragging the splitter below the minimum height.
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
- [x] Nested, collection-bound card content and per-item Dropdown actions menus, with keyboard
  navigation and current-record context for edit/delete workflows.
- [x] App-scoped light/dark theme switching from an opted-in Switch and optional per-widget dark
  colors. The preview theme initially matches the editor and is independent for that session.
- [x] Canvas and template thumbnails follow the editor's light/dark shell theme, including component
  dark appearance variants, while Preview retains an independent explicit app-theme selector.
- [x] Isolated preview copies of collection records.
- [x] Simulated get, insert, update, and delete data effects.
- [x] Database actions await validation/repository completion before following success or error
  graph outputs; failed writes do not continue through success navigation.
- [x] Optional **Save data changes** mode writes preview Insert/Update/Delete actions to this
  browser's project-data repository and synchronizes collection-bound ListViews and the Data
  workspace. The mode is off by default.
- [x] `docs/notes-app-workflow.md` documents how to compose and test a basic notes flow using
  the reusable editor, Logic, data-binding, actions-menu, and theme controls.
- [x] Simulated collection refresh/refetch and Send Email success effects.
- [x] Simulated granular document loading, chunking, embeddings, isolated vector indexing/search,
  reranking, prompt compilation, generation, citations, memory, and biometric effects.
- [x] Camera capture remains in isolated preview component state and is never written into Project
  JSON or project collections implicitly.
- [x] Composed inputs and buttons create isolated preview records through normal logic workflows.
- [x] Default Preview state remains isolated. Opt-in saved changes write through the configured
  project-data repository (the backend when configured, browser storage otherwise); Preview does
  not invoke other external services.
- [x] Switching from modified sandbox records to saved project data requests confirmation and
  discards the temporary records rather than implicitly persisting them. Repeated click/menu
  submissions are guarded while the same workflow is running.

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
- [x] Backend-connected **Download React app** action with generating and typed failure states when
  `VITE_API_BASE_URL` is configured; local-only mode explains that a backend is required.

Publishing remains a frontend simulation. Static React/Vite source generation is connected, but
workflow execution, build/deployment orchestration, Vercel API calls, and real live deployments are
not implemented.

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

Verification completed on 2026-11-12:

- `npm run typecheck` — passed.
- `npm test -- --run` — 101 test files and 851 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- Backend generated-app verification also ran the exported runtime's Vitest suite, TypeScript
  check, and production Vite build from a freshly installed archive.
- Representative Project JSON — parsed successfully.
- `git diff --check` — passed.

## 15. Current frontend boundaries and remaining integrations

The following are **not yet implemented** and should not be reported as completed frontend
features:

- Live Supabase project verification (the backend adapter and frontend repository are implemented,
  but no real Supabase credentials are configured in this workspace).
- Live PostgreSQL verification of project/app-data persistence, immutable app versions, and runtime
  CRUD; automated SQLite-backed API/repository coverage passes, but no PostgreSQL test URL is set.
- Live Resend delivery verification with a verified sender and API key; development delivery and
  mocked provider tests pass.
- Generated-app end-user authentication. Session mappings fail explicitly and never reuse builder
  identity.
- AI, RAG, and Computer Vision production execution; these actions return an explicit unsupported
  capability error.
- Actual Vercel deployment and deployment-status polling.
- Real custom domains.
- Real AI model integration.
- Real vector storage, RAG model execution, biometric template storage, and Computer Vision
  processing. Current RAG and biometric behavior is explicit frontend simulation only.
- Live collaboration, multi-user project access, or platform-administration screens.
- Continuous flex sizing modes such as Fill, Hug, or percentage dimensions that automatically
  reflow after a later parent resize. Current Row/Column placement performs a one-time fit and then
  stores concrete responsive pixel geometry.

These integrations must remain behind domain repository and service contracts so the existing
presentation layer does not become coupled to a specific database, deployment provider, or SDK.
