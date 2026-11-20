# Novy Frontend Progress

**Last reviewed:** 2026-11-20

This document inventories frontend capabilities that are implemented in the repository. Novy is
currently a **web app and website builder**. Native mobile and desktop application generation are
outside the current product scope.

Novy now supports both fixed-viewport **web app** projects and scrolling **website** projects.
Website projects are an explicit scope extension beyond the PD6 baseline, which covers web
applications only. See `docs/website-projects-plan.md` and the backend companion
`novy-backend/WEBSITE_PROJECTS_PLAN.md`.

All features marked as implemented below exist in the frontend codebase. Features backed by local
mock repositories or preview-only behavior are identified explicitly and must not be interpreted as
completed production backend integrations.

## 1. Application foundation

- [x] React and TypeScript application with strict type checking.
- [x] Vite development and production build configuration.
- [x] Lazy-loaded projects, editor, and deployment route chunks; login remains eager for immediate
  credential-form rendering.
- [x] Clean Architecture separation across `domain`, `data`, `presentation`, and `main` layers.
- [x] Dependency injection for authentication, projects, templates, project data, deployment, and
  builder-assistant repositories.
- [x] Central Axios client configured with credentialed requests, a JSON content type, and
  automatic `X-CSRF-Token` headers for state-changing requests.
- [x] API-backed authentication repository for the Novy backend, selected when
  `VITE_API_BASE_URL` is configured.
- [x] API-backed React source-export repository, selected by the same backend base URL, with typed
  archive and backend-error handling.
- [x] API-backed Run App repository with immutable preview preparation, resettable scoped CRUD,
  passwordless runtime sessions/CSRF, bounded CV multipart execution, email, and RAG actions.
- [x] API-backed deployment repository for configured Vercel/Netlify providers, remote history,
  asynchronous publish submission, and terminal-status polling.
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
- [x] `/published` — protected owner-wide published applications overview.
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
- [x] Protected-route data requests start in parallel with session restoration; backend cookies and
  authorization still decide access before protected data is returned.
- [x] Restoration of the originally requested route after authentication.
- [x] Sign-out support.
- [x] Responsive application shell.
- [x] Collapsible sidebar with persisted collapsed state.
- [x] **Published** sidebar entry linking to the owner-wide published applications overview.
- [x] Project-aware links to the editor and deployment screen.
- [x] Light and dark theme toggle with persisted preference and system-theme support.
- [x] Desktop login brand panel with a code-split, interactive isometric Three.js illustration of
  the build -> wire -> publish flow; Novy purple in both themes, decorative/aria-hidden, lazy
  mounted behind a CSS poster, reduced-motion safe, with WebGL detection and error fallback.
- [x] Clickable 3D stages with real DOM description cards, keyboard-accessible stage chips, and
  idle ambient motion (auto-orbit + sequential stage spotlight) that pauses on interaction.
- [x] Brand panel relies on the illustration only; the static headline, bullet steps, footer copy,
  stage chips, floating card and hint were removed. WebGL is probed once per mount with context
  release, and a failed context retries before falling back to the poster.
- [x] 3D-anchored dashed leader lines and handwritten stage labels (self-hosted Caveat via
  `--font-hand`); hovering or focusing a stage focuses the camera on it and reveals its description
  under the title, with keyboard focus and reduced-motion support. A single `CameraRig` owns drag
  orbit, bounded idle sway and hover focus so motion never fights or snaps.
- [x] Focused 3D stages zoom to 1.18x at the camera, scale to 1.14x, and ease upward/toward the
  viewer while the shared connector stays in place, creating a deliberate detached focus state.
- [x] Safe scene framing: the orthographic camera fits the stations and their anchored DOM labels
  with pixel padding rather than the platform geometry alone, and a `calculatePosition` clamp keeps
  every label box inside the canvas so no stage or description is cropped on short or narrow panels.
  The scene canvas fills the whole brand panel (the wordmark floats above it) instead of being
  confined to the panel's padded inner box.
- [x] Token-based ambient login backdrops on both panels: a soft indigo CSS glow and a quiet
  canvas-rendered 64px grid. Only the 180px area under the pointer brightens and bends, keeping the
  rest of the composition calm. A `TechCursor` replaces the native pointer on the auth page with a
  precise white dot and a high-layer outlined ring that follows with easing and enlarges over
  controls. Both are decorative and pointer-event transparent; real mouse/pen events activate the
  effect while direct touch input is ignored.

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
- [x] Choose **Web app** or **Website** before selecting a type-filtered starter template; the
  project type persists locally and through the backend and is shown on dashboard cards.
- [x] Open an existing project in the editor.
- [x] Short-lived project/list navigation cache with hover/focus document preloading and in-flight
  request deduplication.
- [x] API repositories deduplicate concurrent StrictMode reads for auth, projects, app data, and
  deployments instead of sending duplicate backend requests during development mounts.
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
  seeded example records, fully wired current-record workflows, semantic tokens, serif display
  typography, reusable elevated cards, and a glowing floating action.
- [x] Creative media workspace and learning dashboard proof templates with standalone icons,
  reusable styles, semantic themes, typed effects, and mobile/desktop responsive layouts.
- [x] Two-screen Face verification starter: Biometric Registration provides Camera capture, explicit
  enrollment consent, and account-free CV Enroll; Recognition Test provides a separate Camera, CV
  Liveness, and a condition-driven recognized/not-recognized result. Guided or fallback manual
  capture emits Camera `change` and starts CV Verify automatically; its If/Else checks the `verified`
  output rather than treating request success as a biometric match. A durable same-browser/device
  binding identifies the opaque enrolled user without email; verification credentials and thresholds
  stay backend-controlled.
- [x] Existing Project v13 documents cloned from the previous Face verification starter are safely
  normalized by known IDs and unchanged defaults to remove the legacy email field/mapping and update
  account-free copy/layout without overwriting customized content. Its known Camera IDs also adopt
  guided automatic face capture when the legacy document omitted a capture mode. Untouched external
  verify buttons/click graphs migrate to automatic Camera-change verification; customized flows stay
  unchanged.
- [x] Template gallery with previews.
- [x] Viewport-safe, internally scrollable template modal with a responsive one/two/three-column
  gallery.
- [x] Website starters for Blank canvas, Landing page, Portfolio, Agency, and Coming soon. Blank
  canvas creates one empty Home page; the other starters use reusable responsive sections.

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
- Project type (`app` or `website`) as backward-compatible project metadata; legacy payloads
  default to `app`. Current output is Project schema v14; strict v13 documents remain compatible.
- Project-level light/dark semantic colors, typography/radius tokens, reusable named component
  styles, and per-screen surfaces.
- Responsive DTO mapping compacts legacy/backend `null` override members back to omitted inherited
  fields, preventing false geometry and visibility validation errors.
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
  "schemaVersion": 14,
  "id": "project_notes",
  "name": "Notes App",
  "projectType": "app",
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
  Dark overrides inherit omitted base fields. Schema v14 adds typed linear gradients, multiple
  shadows/glow, backdrop blur, content clipping, and breakpoint-specific appearance. Optional
  `borderWidth` values set a non-negative pixel width; older documents keep previous defaults.
- Every appearance color field pairs its labeled hex input with a native color picker. The picker
  normalizes shorthand hex for the swatch, while the text input continues to accept free-form CSS
  color strings; appearance values and DTO shapes are unchanged.
- A Dropdown with `props.presentation: "menu"` renders as an accessible actions menu and emits a
  change event containing the chosen option. Omitted presentation retains the original select.
- A Switch with `props.controlsTheme: true` provides a simple off=Light/on=Dark app control without
  changing the Novy editor theme. Preview also has a Light/Dark/System selector, and generated apps
  persist their preference locally while System follows operating-system color-scheme changes.
- `type` selects the renderer/generator component and `props` stores its typed configuration.
- Camera components serialize labels, `facingMode`, and an optional `captureMode` of `manual` or
  `guided-face`; captured media remains transient runtime state and is never embedded in the project
  document. Omitted legacy capture mode behaves manually except for known Face starter migration.
- Optional `name`, `isHidden`, and `isLocked` fields preserve editor-facing layer metadata.
- Container, Gesture Detector, Column, Row, and ListView widgets store nested components in
  `children`.
- Schema v12 adds the transparent, child-bearing Gesture Detector with a persisted semantic action
  label. It can be added from the palette; Enter and Space activate it in Preview.
- Schema v13 adds explicit `routeParameters`. A record-aware detail route maps its named URL segment
  to one collection's backend-generated record identity instead of relying on matching conventions.
- Schema v14 adds the project design system, screen surfaces, reusable `styleId` references,
  standalone Icon nodes, expanded typography, and responsive appearance/text styles.
- Set Theme logic serializes as `{ "type": "set-theme", "theme": "light" | "dark" | "system" |
  "toggle" }` inside a normal action node; it is a browser-only effect in Preview and generated apps.
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
- Standalone Icon nodes provide decorative or labelled symbols from a curated Lucide vocabulary,
  inherit appearance colors, and preserve accessible names only when the authored label is nonempty.
- Text nodes expose optional `props.fontFamily` (a non-empty CSS font-family value),
  `props.fontSize`, weight, line height, letter spacing, alignment, italic style, transform, and line
  clamp. Typography can vary at tablet/desktop breakpoints and reusable Text styles; omitted values
  fall back to the design-system font and selected level preset.
- Text and design-system font families use a keyboard-accessible curated picker with a live preview.
  Bundled Inter and JetBrains Mono include normal and italic variable faces in both Novy and
  generated apps; legacy custom stacks are preserved until the builder selects a curated option.
- An authored appearance Text color consistently overrides readable text inside every widget while
  unconfigured widgets retain semantic primary, muted, and contrast-safe defaults.
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
  labels, Input/Dropdown values, Checkbox/Switch state, Progress values, and component visibility
  while preserving static property fallbacks. Route-record detail forms therefore prefill editable
  controls without duplicating read-only field components.
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
Schema-v14 design tokens, reusable styles, screen surfaces, icons, effects, and responsive typography
are carried compatibly in these v2 envelopes and render identically in generated React.

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
- [x] Text with display/title/body presets plus font family, size, weight, line height, letter spacing,
  alignment, italic, transform, line clamp, and responsive typography.
- [x] Standalone accessible Icon with a curated symbol vocabulary and configurable stroke width.
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
- [x] Camera Capture with explicit permission, capture/retake states, and no Project JSON image
  persistence. Optional guided-face mode uses browser-local MediaPipe landmarks plus face-region
  lighting, contrast, sharpness, position, angle, and stability checks to capture automatically;
  manual capture remains available as a keyboard-accessible fallback.
- [x] File input for transient published-app document selection; file bytes never enter Project JSON
  or persistent browser storage.
- [x] Chat transcript/composer with user and assistant message roles plus optional citations.
  Submissions render optimistically, show an accessible reduced-motion-aware assistant-thinking
  bubble during asynchronous workflows, prevent duplicate authored user messages, auto-scroll, and
  retain the submitted message if execution fails. The behavior is shared by isolated Preview, Run
  App, and generated/published applications.

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
- [x] Solid, dashed, and none border styles for every component type, persisted
  through optional `appearance.borderStyle` and rendered consistently in canvas, preview,
  thumbnails, and generated-layout appearance data.
- [x] Text field borders apply color, solid/dashed/none style, non-negative pixel width, and corner
  radius directly to the input/textarea without adding a second outer frame border.
- [x] Optional curated Button icons with left/center/right placement, decorative accessibility behavior,
  persisted `props.icon`/`props.iconPosition`, and backward-compatible label-only defaults.
- [x] Project-wide semantic light/dark colors, body/heading fonts, radius presets, screen surfaces,
  and reusable component styles with create/apply/update/detach Inspector actions.
- [x] Typed gradients, layered shadow/glow, backdrop blur, clipping, opacity, and mobile-first
  responsive appearance and typography controls with editor/Preview/thumbnail/export parity.
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
- [x] Website pages grow beyond one viewport, fit to width rather than shrinking to full-page
  height, and scroll in the editor and Preview while web app screens remain fixed-height.
- [x] Canva-style **Add section** control that inserts one selected, full-width blank canvas with
  no child widgets; builders then add normal components from Assets.
- [x] Root website sections are responsive Column trees with automatic height/position
  normalization, one-step undo, Layers ordering, and explicit Move up/Move down controls.
- [x] Website starter templates still use internal Hero, Features, Logo strip, Stats,
  Testimonials, Pricing, CTA, and Footer presets, while those presets are intentionally omitted
  from the user-facing Assets panel.
- [x] The Design Inspector properties region retains a usable minimum height; Validation and the
  large website Layers tree remain independently scrollable without hiding selected-widget fields.
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
- [x] Website starter and blank sections ship with explicit dark appearance variants, keeping text
  legible on section surfaces in the editor, Preview, thumbnails, and generated applications.
- [x] Existing website documents without section dark colors receive backward-compatible fallback
  appearances during DTO mapping and persist the repaired values on the next autosave.
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
- [x] Set Theme with Light, Dark, System, and Toggle modes, executed entirely in Preview and the
  generated browser runtime.
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
- [x] Camera media input mapping, required dynamic enrollment-consent mapping,
  liveness/verification output mapping, and preview-only editor simulation.
- [x] Generated Camera captures remain in-memory `Blob`s and call the protected backend's challenged
  multipart CV endpoint. Verification credentials and thresholds are intentionally not configurable
  by generated clients.

The editor preview continues to simulate safe effects against isolated state. Downloaded React apps
call immutable `/runtime/v1` actions for CRUD/email, provider-neutral CV, and generated-app RAG,
including separate passwordless/biometric app sessions. Real production biometric processing
remains blocked until a production provider is explicitly selected and implemented.

### Generated-app RAG configuration

- [x] RAG connection profiles are selected from the list the backend offers. The inspector never
  accepts a free-text profile ID, and the model control offers only the allowed models of the
  selected profile.
- [x] Profile locality, cost warnings, availability, and usage notes are surfaced so a builder can
  see that a remote profile sends prompts off the Novy backend.
- [x] A saved profile that the backend no longer offers is preserved in the document and reported as
  an actionable warning instead of being silently dropped.
- [x] Project-scoped document sources are uploaded, listed, and deleted from the Data workspace. The
  returned source identifier is what a Document Loader node references.
- [x] Document Loader collection sources declare their content, title, and document-ID fields.
- [x] Conversation Memory nodes require a connection profile, and user-scoped memory explains the
  signed-in application user requirement.
- [x] Generated applications keep structured node outputs and render answers with canonical
  citations.
- [x] Published-app `document-upload` and browser-owned `chat-message` actions, including a
  two-screen **Chat with a document** starter that indexes the selected file before navigating to
  `/chat`. It uses the explicit `postgres-vector`, `ollama-embedding`, and `ollama-chat` profiles.

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
- [x] API-backed Data workspace loads databases, collections, and records from one owner-scoped
  snapshot endpoint instead of a sequential request waterfall.
- [x] Project-scoped RAG document sources with upload, list, and delete. Uploaded binaries are
  extracted and stored by the backend and are never persisted in the browser.
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

## 9. Selectable AI assistant providers

- [x] Single right-edge rail with the Inspector tab above the AI Assistant tab in design mode
  (assistant only in logic/data) and keyboard-accessible slide-over conversation UI; the floating
  bottom-right button was removed.
- [x] API-backed complete-app proposals through FastAPI with an editor-session provider selector for
  restricted OpenCode, local Ollama testing, and optional direct OpenRouter. Credentials and model
  URLs remain backend-only, and provider failures never fall back automatically.
- [x] Capability-aware image attachment for PNG/JPEG/GIF/WebP with provider locality, availability,
  image support, and potential-cost disclosure in the composer.
- [x] Session-only OpenCode model selection between backend-allowlisted Nemotron 3.5 Super VL,
  GPT-6.1 Terra, and GPT-6.1 Terra Fast, with explicit plan/API usage disclosure and quota-specific
  errors.
- [x] Conversational Build-mode greetings without proposal cards, plus synchronous duplicate-request
  suppression and clearer validation recovery guidance.
- [x] Every field in the design, logic, and data editors has a compact `?` affordance. Hover or
  keyboard focus reveals a portaled tooltip with a short explanation and an **Ask Novy about this**
  action that opens the assistant in help mode with a prepared documentation question. A central
  field-help registry supplies curated copy for common fields and generic fallback copy elsewhere;
  the affordance is suppressed outside the editor.
- [x] Assistant generation/help requests use a dedicated five-minute browser timeout rather than the
  shared 30-second API limit, allowing remote structured generation and repair to finish while
  retaining provider-neutral timeout feedback.
- [x] Backend model deadlines map to that timeout feedback, while final invalid proposals display the
  first sanitized responsive/contract validation issue returned after the bounded repair loop.
- [x] Route-bound proposal blueprints preserve dynamic route parameters and record fields through
  preview and explicit Apply, with proposal-integrity errors distinct from model validation errors.
- [x] Versioned `AppBlueprintV1` proposals for screens, components, event-condition-action workflows,
  and collection schemas rather than model-authored Project JSON or manifests.
- [x] Blueprint proposals preserve a strict allowlisted visual direction (style, palette, typography,
  radius, and density) selected using the backend Design Skill Pack. The frontend validates and
  round-trips it through refinement and Apply while the backend alone compiles real Project v14
  light/dark tokens and reusable styles. Compiled tokens are parsed from proposal previews and
  adopted from accepted project responses, so generated drafts render with their intended palette,
  typography, radii, and reusable component styles.
- [x] Interactive form controls expose an allowlisted Field style (Outline, Underline, Filled) in the
  Inspector and preserve it through DTO mapping, proposal refinement, and Apply. Per-side border
  overrides are available in the Appearance panel and render on the actual control element in both
  editor previews and generated applications.
- [x] Provider-neutral backend Builder Skill Pack selects compact collection, form, and landing-page
  recipes for the request. Approved examples are shared across selected providers without exposing
  source, records, credentials, or triggering fallback.
- [x] Deterministic backend completion and request-aware quality gates supply commonly omitted create
  flows, form feedback, hero hierarchy, navigation reachability, required mappings, and valid route
  record context before the proposal reaches preview.
- [x] Build app automatically compiles, checks, repairs, and retests each responsive proposal across
  390x780 mobile, 768x1024 tablet, and 1200x800 desktop before returning it. Contract, overflow,
  breakpoint, route, behavior, and workflow failures stay inside the bounded Build repair loop.
- [x] Complete CRUD proposals support route-record-prefilled Input/Dropdown controls, native date
  inputs, and chained required-field conditions. Duplicate read-only detail fields are removed so a
  six-field inventory edit screen remains inside the responsive verification viewport.
- [x] Completed drafts lead with the compiled home-screen title, plain-language summary, and an
  actual rendered thumbnail. **What’s included** collapses screen routes, component/workflow counts,
  and collection schemas; **Check details** collapses individual verification stages and repair
  attempts while clarifying that automated design/workflow checks are not live deployment tests.
- [x] Failed reports keep actionable issues visible and block acceptance in the UI and conversation
  controller. No separate Test/Fix assistant mode was introduced.
- [x] Exhausted responsive repairs show one concise split/simplify recovery message instead of raw
  per-component duplicates. Other validation feedback is whitespace-normalized, sentence-deduplicated,
  and length-bounded; coordinated backend repair diagnostics remain grouped and fail-closed.
- [x] **Preview app** opens the existing renderer with local navigation, a screen selector, and
  simulated workflows/data changes using proposal-only schemas. Draft previews do not load saved
  records, call another model, accept the proposal, or receive persistence/protected-runtime access.
- [x] Persistent **Use this app**, **Make changes**, and quieter **Discard draft** actions sit outside
  the conversation scroller. Refinement focuses the composer without submitting; existing projects
  require explicit confirmation before replacing screens/workflows and adding proposal collections.
  The confirmation explains that existing saved records are not deleted, focuses Cancel, and handles
  Escape without closing the sheet. Short viewports use a compact action row.
- [x] Applying, building/refining, and documentation search have distinct status feedback and busy
  guards. Applied drafts offer **Continue editing**, and discarded/superseded drafts stay compact.
- [x] A compact spinner plus short verb (**Thinking…**, **Refining…**, **Searching docs…**) replaces
  long sentence-length working status; **Applying…** stays on the draft action bar as the single live
  apply status.
- [x] A VS Code-style **Agent / Ask** chip in the composer replaces the mode tab bar. Its popover
  menu offers radio-checked mode items and **Model settings…**, with arrow-key navigation, Enter/Space
  selection, Escape limited to the menu, click-outside dismissal, focus return, and a busy guard.
  There is no persistent Model settings row; provider/model controls open as a popover from the menu
  item or the composer shield control.
- [x] The composer uses a single bordered container with an auto-growing multiline textarea and a
  compact control row (attach, mode chip, model settings, circular Send). Enter sends and Shift+Enter
  adds a newline; attached images render as a chip inside the container.
- [x] Draft Preview suspends the assistant modal and makes its controls inert, then restores focus
  to the preview opener on close. Shared dialog focus skips inert and collapsed-detail controls.
  Model settings collapse during review without hiding provider cost disclosure.
- [x] Pending autosave blocks proposal generation/acceptance so backend project revision remains
  authoritative; stale acceptance is reported without changing project or app data.
- [x] Accepted proposals adopt the backend Project v14 response as clean editor state and refresh the
  project data snapshot. Project document and declared collection schemas are committed atomically by
  the backend.
- [x] Validation, bindings, routes, and item-template previews consume that refreshed project-data
  snapshot immediately after Apply; empty collection templates show typed field-label samples rather
  than generated field IDs.
- [x] Apply persistence failures are distinct from backend connectivity failures, produce one
  accurate conversation message, and leave the pending project document unchanged.
- [x] Conversation state survives sheet close/reopen for the current editor session.
- [x] Build mode sends bounded conversation and the latest validated pending blueprint so follow-up
  instructions refine the preview without persistence; older pending previews are marked superseded.
- [x] Ask Novy mode is separate from app generation, does not wait for autosave, and displays
  backend-validated citations from the approved local documentation index.
- [x] Unavailable providers remain disabled and visible instead of falling back to static keyword
  responses or silently invoking a different provider.

Implemented demo requests include:

- [x] Add a button.
- [x] Add text or a heading.
- [x] Add a ListView, including the student-list example.
- [x] Create a click behavior that changes text.

Remote inference is available only through an explicitly selected OpenCode or configured OpenRouter
provider. Ollama remains the local generation/testing and embedding runtime.

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
- [x] Validation uses the editor's live project-data collection state, including assistant-created
  schemas refreshed after Apply, rather than retaining a separate one-time collection snapshot.
- [x] Behavior target and graph reference validation.
- [x] Logic trigger-count, edge, cycle, and incoming-connection validation.
- [x] Condition source validation.
- [x] Action target validation for components, screens, records, and collections.
- [x] Screen route, dynamic mapping source, async output-port, Send Email, and Refresh Collection
  validation.
- [x] RAG document/query validation plus Computer Vision media and biometric-consent validation.
- [x] Validation badge and issue panel in the editor, with a vertically resizable split pane that
  collapses from its header or by dragging the splitter below the minimum height.
- [x] Preview and deployment blocking when project validation contains errors.

## 11. Interactive preview

- [x] Modal preview using the same component renderer as the editor.
- [x] Preview starts on the active screen.
- [x] Responsive web viewport switching.
- [x] Preview zoom in, zoom out, and fit controls.
- [x] Automatic fitting on open, viewport change, and browser resize.
- [x] Website Preview uses the complete page height and width-based fitting so long pages remain
  readable and vertically scrollable.
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
- [x] Explicit **Run App** mode prepares the current manifest as a validated immutable backend app
  version and executes real generated-app RAG actions through `/runtime/v1`; **Stop** returns to the
  isolated simulator.
- [x] Real Run App document selection stays transient, uses the bounded multipart runtime upload,
  and supports upload → real indexing → navigation → grounded answer/citations in the shared
  Preview renderer. The exact **Chat with a document** template chain has regression coverage after
  project-template ID remapping, and local provider failures explain that Ollama must be started
  before retrying.
- [x] A running immutable preview is marked **Changes pending** when the editor manifest changes;
  **Apply changes** prepares the updated version. Backend-assigned `novy-preview-*` vector namespaces
  keep preview embeddings separate from published-app indexes.
- [x] RAG chat messages appear immediately before the awaited backend response. The composer locks
  for one in-flight submission, exposes an accessible assistant-thinking status, reconciles the
  authored user-message action without duplication, and recovers cleanly on provider failure.
- [x] Camera capture remains in isolated preview component state and is never written into Project
  JSON or project collections implicitly. Guided face analysis runs locally against live frames and
  retains only the final accepted transient JPEG.
- [x] Composed inputs and buttons create isolated preview records through normal logic workflows.
- [x] Default Preview state remains isolated. Opt-in saved changes write through the configured
  project-data repository (the backend when configured, browser storage otherwise). External RAG
  services are invoked only after the builder explicitly starts **Run App**.
- [x] Switching from modified sandbox records to saved project data requests confirmation and
  discards the temporary records rather than implicitly persisting them. Repeated click/menu
  submissions are guarded while the same workflow is running.

## 12. Deployment experience

- [x] Per-project deployment page.
- [x] Preview and Production environment selection.
- [x] Backend-reported deployment-provider selection (Vercel, Netlify, or local development).
- [x] Deployment readiness panel reports the connected hosting providers or that none are
  configured, instead of a static backend-required label.
- [x] Project validation before publishing.
- [x] Build, Optimize, Provision, and Live progress driven by repository submission/status polling.
- [x] Publishing progress uses theme-aware brand surfaces and readable state colors in light and
  dark mode.
- [x] Real provider URLs in API mode and generated mock `novy.app` URLs in local-only mode.
- [x] Publish success modal and URL copy action.
- [x] Owner-scoped backend deployment history in API mode and persisted mock history locally.
- [x] Published applications overview with Active/Inactive derived from live deployment URLs,
  All/Active/Inactive filters, live-app and deployment-settings links, and loading/empty/error states.
- [x] View and Redeploy actions.
- [x] Failure feedback that states the previous successful deployment remains live.
- [x] Loading, not-found, and retryable error states.
- [x] Disabled custom-domain control labeled as coming soon.
- [x] Backend handoff readiness panel with inferred runtime capability requirements.
- [x] Downloadable provider-agnostic handoff manifest containing Project JSON and app-data schemas.
- [x] Backend-connected **Download React app** action with generating and typed failure states when
  `VITE_API_BASE_URL` is configured; local-only mode explains that a backend is required.

When `VITE_API_BASE_URL` is configured, publishing uses the Novy backend's provider-neutral
deployment endpoints. The backend uploads source to Vercel for provider-side Vite builds or creates
a constrained local production build for Netlify static upload, then the frontend polls until live
or failed. Local-only mode retains the side-effect-free simulated pipeline. Live provider calls have
not been verified in this workspace because platform credentials are not configured.

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

Verified on 2026-11-20 for smooth off-centre focus and cursor-away release:

- `npm run typecheck` — passed.
- Focused suites — 39 tests passed, including cursor-away focus release coverage.
- `npm run build` — passed.

Verified on 2026-11-20 for the eased zoom curve:

- `npm run typecheck` — passed.
- Focused suites — 38 tests passed, including frame-by-frame zoom easing checks.
- `npm run build` — passed.

Verified on 2026-11-20 for the poster overlap fix:

- `npm run typecheck` — passed.
- Focused suites — 35 tests passed.
- `npm run build` — passed.

Verified on 2026-11-20 for latched hover and slower zoom:

- `npm run typecheck` — passed.
- Focused suites — 35 tests passed.
- `npm run build` — passed.

Verified on 2026-11-20 for smooth hover:

- `npm run typecheck` — passed.
- Focused suites — 35 tests passed, including a hover-flicker regression case.
- `npm run build` — passed.

Verified on 2026-11-20 for direct manipulation under reduced motion:

- `npm run typecheck` — passed.
- Focused suites — 38 tests passed, including new `CameraRig.interaction.test.tsx` drag checks.
- `npm run build` — passed.

Verified on 2026-11-20 for drag-to-orbit restoration:

- `npm run typecheck` — passed.
- Focused illustration/auth suites — 33 tests passed.

Verified on 2026-11-20 for ambient motion and smooth hover focus:

- `npm run typecheck` — passed.
- Focused illustration/auth suites — 36 tests passed, including orbit math and rig interaction.
- `npm run build` — passed; the scene chunk is slightly smaller after removing `OrbitControls`.

Verified on 2026-11-20 for portal-mounted labels:

- `npm run typecheck` — passed.
- Focused illustration/auth suites — 30 tests passed.

Verified on 2026-11-20 for stage labels above the canvas:

- `npm run typecheck` — passed.
- Focused illustration/auth suites — 30 tests passed, including a regression check that all labels
  use the high z-index range.

Verified on 2026-11-20 for the build-label visibility fix:

- `npm run typecheck` — passed.
- Focused illustration/auth suites — 30 tests passed.

Verified on 2026-11-20 for annotated stages and hover focus:

- `npm run typecheck` — passed.
- Focused scene/auth suites — 37 tests passed, covering dashed labels, hover/focus reveal, camera
  rig state, auto-orbit pause, reduced motion and the removed overlay controls.
- `npm test -- --run --maxWorkers=2 --testTimeout=20000` — 126 files / 1,044 tests passed; nine
  unrelated route-loading tests timed out under heavy concurrent load and all passed in isolation.
- `npm run build` — passed; the scene remains a separate chunk and the handwriting font is bundled.

Verified on 2026-11-20 for the canvas stability fix and copy removal:

- `npm run typecheck` — passed.
- Focused scene/auth suites — 31 tests passed, including single WebGL probe, probe-context release,
  and canvas retry coverage.
- `npm test -- --run --maxWorkers=2 --testTimeout=20000` — 126 files / 1,051 tests passed; three
  unrelated route-loading tests timed out in the concurrent run and all passed in isolation.
- `npm run build` — passed; the scene remains a separate chunk.

Verified on 2026-11-20 for interactive stages and idle motion:

- `npm run typecheck` — passed.
- `npm test -- --run --maxWorkers=2` — 129 test files and 1,053 tests passed.
- `npm run build` — passed; the scene stays in its own `NovyFlowScene` chunk.
- New tests: `useSceneIdle.test.ts`, `stationCopy.test.ts`, scene idle/selection cases, and
  `AuthPage` cases for 3D-click descriptions, closing, and accessible chip selection.

Verified on 2026-11-20 for the 3D login brand scene:

- `npm run typecheck` — passed.
- `npm test -- --run --maxWorkers=2` — 127 test files and 1,041 tests passed.
- `npm run build` — passed; the 3D scene is a separate `NovyFlowScene` chunk (945.51 kB raw,
  250.20 kB gzip) and does not inflate the eager login entry chunk.
- New tests: `usePrefersReducedMotion.test.ts`, `NovyFlowScene.test.tsx`,
  `FlowStations.test.tsx`, plus an `AuthPage` regression case for the brand copy.
- The scene loads from a module-level dynamic import consumed in an effect. `React.lazy` was
  removed because suspending during the post-redirect `/login` render dropped the route tree.

Verified on 2026-11-20 for the scene/label clipping fix:

- `npm run typecheck` — passed.
- Focused illustration/auth suites — 44 tests passed, including new `labelPosition.test.ts` clamp
  coverage.
- `npm test` — 1,064 tests passed; three unrelated route/editor tests timed out in the concurrent
  run and all passed when rerun in isolation.
- `npm run build` — passed; the scene remains a separate `NovyFlowScene` chunk.

Verified on 2026-11-20 for the full-bleed scene container:

- `npm run typecheck` — passed.
- Focused auth/illustration suites — 58 tests passed.
- `npm run build` — passed; the scene remains a separate `NovyFlowScene` chunk.

Verified on 2026-11-20 for ambient login backdrops and the pointer reticle:

- `npm run typecheck` — passed.
- Focused auth/UI/illustration suites — 63 tests passed, including five new `TechCursor` cases.
- `npm test` — 1,059 tests passed; 13 unrelated route/editor tests timed out in the concurrent run
  and all passed when rerun in isolation.
- `npm run build` — passed.

Verified on 2026-11-20 for the node-trail cursor upgrade:

- `npm run typecheck` — passed.
- Focused auth/UI/illustration suites — 64 tests passed, including trail, hover and ripple cases.
- `npm test -- --maxWorkers=2 --testTimeout=20000` — 133 files / 1,073 tests passed.
- `npm run build` — passed.

Verified on 2026-11-20 for the warped grid and dot/ring cursor:

- `npm run typecheck` — passed.
- Focused auth/UI suites — 36 tests passed, including grid displacement and reduced-motion cases.
- `npm test -- --maxWorkers=2 --testTimeout=20000` — 134 files / 1,076 tests passed.
- `npm run build` — passed.

Verified on 2026-11-20 for warp visibility:

- `npm run typecheck` — passed; focused auth/UI suites — 36 tests passed.
- `npm test -- --maxWorkers=2 --testTimeout=20000` — 134 files / 1,076 tests passed.
- `npm run build` — passed; new `--novy-warp-*` tokens confirmed in the built CSS.

Verified on 2026-11-20 for the subtle local warp and reliable custom cursor:

- `npm run typecheck` — passed; focused auth/UI suites — 35 tests passed.
- `npm test -- --maxWorkers=2 --testTimeout=20000` — 134 files / 1,075 tests passed.
- `npm run build` — passed.

Verified on 2026-11-20 for lifted 3D stage focus:

- `npm run typecheck` — passed; focused illustration/auth suites — 59 tests passed.
- `npm test -- --maxWorkers=2 --testTimeout=20000` — 134 files / 1,076 tests passed.
- `npm run build` — passed.

Verified on 2026-11-20 for per-field editor help:

- `npm run typecheck` — passed.
- `npm run build` — passed.
- `npx vitest run --testTimeout=20000 --pool=forks --fileParallelism=false` — 124 test files and
  1,028 tests; 1,025 passed in the full run and the three `EditorPage` route-loading timeouts all
  passed when that file was run in isolation (12/12).
- New tests: `FieldHelp.test.tsx` (hover, focus, Escape, assistant handoff, fallback copy),
  `fieldHelpContent.test.ts` (registry lookups), an `AssistantSheet` help-request case, and a
  `DesignSystemInspector` case covering the app-styles fields shown in the handoff screenshot.

Verified on 2026-11-19 for the assistant visual-direction contract:

- `npm run typecheck` — passed.
- `npm test -- --run --maxWorkers=4` — 122 test files and 1,012 tests passed.
- `npm run build` — passed.
- The seven unrelated loading/timeout failures seen under unrestricted worker concurrency passed
  together in isolation (6 files / 41 tests).

Verified on 2026-11-19 for the assistant UI and concise validation feedback:

- `npm run typecheck` — passed.
- `npm test -- --maxWorkers=2` — 122 test files and 1012 tests passed with normal per-test timeouts.
- `npm run build` — passed.
- Coordinated backend grouping keeps responsive checks fail-closed while avoiding duplicate repair
  diagnostics; the public endpoint and proposal contracts were unchanged.

Previously verified on 2026-11-18 for visual assistant drafts and safer review actions:

- `npm run typecheck` — passed.
- `npm test -- --run --maxWorkers=2` — 122 test files and 1003 tests passed with normal per-test
  timeouts. The full run took about five minutes; a four-minute shell timeout was insufficient.
- `npm run build` — passed.
- Temporary external Playwright/Microsoft Edge fixture: 1440×900, 768×1024, 390×844, 320×568,
  and 844×390 layouts passed checks for horizontal overflow, visible persistent actions, local
  navigation, replacement cancellation, refinement focus, preview/sheet Escape and focus restoration,
  and body scroll unlocking. Dark-mode applied, failed-check, and retryable-error states also passed.
  Browser fixture uses simulated proposals/acceptance; no live model, deployment, or saved-data
  execution is implied, and no browser-test dependency was added to the repository.
- `git diff --check` — passed; Git only reported the workspace's existing LF/CRLF conversion warnings.
- Frontend-only changes retain Project schema v14 and generated manifest/layout v2. Backend code
  and API contracts were unchanged; prior coordinated backend results remain recorded below.

Verified on 2026-11-18 for reliable fonts, app themes, and widget text colors:

- `npm run typecheck` — passed.
- `npm test -- --run --maxWorkers=2` — 118 test files and 986 tests passed with the normal five-second
  test timeout. Unrestricted parallel runs hit project/template-test timing limits; reducing workers
  avoided contention without changing repository test assertions or configuration.
- `npm run build` — passed and emitted normal/italic Inter and JetBrains Mono assets.
- Coordinated backend verification: 342 passed, 5 optional integration skips; Ruff check/format,
  application mypy, Alembic check, generated runtime tests, and React/Vite build coverage passed.

Verified on 2026-11-18 for the full project design system:

- `npm run typecheck` — passed.
- `npm test -- --run` — 114 test files and 960 tests passed.
- `npm run build` — passed.
- Coordinated backend verification: 336 passed, 5 optional integration skips; Ruff check/format,
  application mypy, and schema-v14 generated React/Vite production-build coverage passed.

Verified on 2026-11-18 for complete CRUD assistant detail forms:

- `npm run typecheck` — passed.
- `npm test -- --run` — 114 test files and 954 tests passed.
- `npm run build` — passed.
- Coordinated backend verification: 333 passed, 5 optional integration skips; Ruff formatting/checks,
  strict mypy, `alembic check`, and generated React/Vite runtime test/typecheck/build coverage passed.

The repository includes automated coverage for:

- [x] Domain factories, component-tree operations, graph rules, runtime behavior, validation, AI
  proposals, and deployment URLs.
- [x] DTO mapping, migration, local repositories, storage behavior, and templates.
- [x] Authentication, routing, providers, projects, editor state, autosave, keyboard shortcuts,
  canvas interactions, alignment, layers, inspector, logic, data, preview, deployment, and shared
  UI components.

Verification completed on 2026-11-17:

- `npm run typecheck` — passed.
- `npm test -- --run` — 114 test files and 950 tests passed.
- `npm run build` — passed.
- Guided face capture verification covers pure framing/pose/clarity decisions, stable automatic
  capture, manual fallback, Face starter migration, manifest generation, and lazy MediaPipe bundle
  splitting. Camera-change verification coverage confirms capture automatically runs CV Verify while
  preserving distinct match/non-match/error branches. The vision SDK is not part of the initial
  editor chunk.
- Backend account-free biometric verification: 327 passed, 5 optional integration skips; Ruff,
  formatting, strict mypy, `alembic check`, cookie security assertions, and generated React/Vite
  typecheck/build coverage passed.
- Backend deployment verification: 151 passed, 2 skipped; provider REST adapters use mocked
  transports because live Vercel/Netlify credentials are not configured in this workspace.
- Backend generated-app verification also ran the exported runtime's Vitest suite, TypeScript
  check, and production Vite build from a freshly installed archive.
- Backend provider-neutral CV verification: 236 passed, 4 PostgreSQL-only skips; Ruff, formatting,
  mypy, challenged multipart media, credential revocation, and generated CV build coverage passed.
- Representative Project JSON — parsed successfully.
- `git diff --check` — passed.
- Backend assistant verification: 222 passed, 4 skipped; Ruff, formatting, and mypy passed. The
  PostgreSQL-only assistant ordering/rollback and profile tests require `TEST_DATABASE_URL`. Ollama
  live model/structured-output, Project v13 compilation, 5-source/92-chunk index, and citation tests
  passed.
- Unified responsive Build app verification: strict frontend typecheck, 114 test files / 950 tests,
  and production build passed; coordinated backend verification passed 329 tests with 5 optional
  integration skips plus Ruff, formatting, strict mypy, and `alembic check`.

## 15. Current frontend boundaries and remaining integrations

The following are **not yet implemented** and should not be reported as completed frontend
features:

- Per-proposal execution of an exported React/Vite project in a browser test sandbox. Build app
  currently verifies the compiled Project contract, responsive geometry, navigation, behavior
  wiring, and workflow reachability; representative generated projects remain covered by the
  repository-wide generated-source typecheck/test/build suite.

- Live Supabase project verification (the backend adapter and frontend repository are implemented,
  but no real Supabase credentials are configured in this workspace).
- Live PostgreSQL verification of project/app-data persistence, immutable app versions, and runtime
  CRUD; automated SQLite-backed API/repository coverage passes, but no PostgreSQL test URL is set.
- Live Resend delivery remains unverified. Resend mode and an API key are configured locally, and
  mocked provider tests pass; the default `onboarding@resend.dev` sender can deliver only to the
  Resend account owner's email until a sender/domain is verified.
- A production Computer Vision provider. Generated-app passwordless identity and challenged
  liveness/enrollment/verification contracts are implemented, but deterministic development
  simulation is rejected in production and never reuses builder identity.
- Production validation of generated-app RAG with a remotely hosted model/provider. Runtime RAG is
  implemented for explicitly selected Ollama/OpenRouter profiles with no automatic fallback, and
  local Run App execution uses the same contracts.
- Live Vercel/Netlify verification with real platform credentials. Provider adapters, API contracts,
  persistence, mocked transport tests, and frontend polling are implemented.
- Real custom domains.
- A sandboxed generated-app iframe, Preview runtime console, and automatic cleanup/TTL for immutable
  preview versions and preview vector data. The first Run App milestone uses the shared renderer.
- Production provider-side biometric template storage and Computer Vision processing.
- Live collaboration, multi-user project access, or platform-administration screens.
- Continuous flex sizing modes such as Fill, Hug, or percentage dimensions that automatically
  reflow after a later parent resize. Current Row/Column placement performs a one-time fit and then
  stores concrete responsive pixel geometry.

These integrations must remain behind domain repository and service contracts so the existing
presentation layer does not become coupled to a specific database, deployment provider, or SDK.
