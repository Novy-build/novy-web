# Novy Frontend Plan (frontend-only phase)

> Status: frontend phases 0–8 complete; PD6 interaction redesign Gates 1–6 complete — Tailwind v4, react-router, useReducer + Context state, localStorage mock repos, width-switchable device frame.

## 1 · Ground rules

- **Clean Architecture per `AGENTS.md`** stays the skeleton:
  - `src/domain/` — pure entities + repository interfaces (zero React/Axios imports)
  - `src/data/` — DTOs, mappers, mock repository implementations (`data/repositories/local/*`)
  - `src/presentation/` — pages, editor, UI kit, hooks
  - `src/main/` — bootstrap, dependency injection, router
- **API readiness without API work:** every domain repository interface gets a `localStorage`-backed implementation with simulated latency. DTOs + mappers are written now against the shape the future FastAPI/Supabase backend will return — when backend integration starts, only `data/` implementations change (wire `axiosClient`), presentation layer never changes.
- **No axios in components/hooks.** `data/api/axiosClient.ts` stays untouched this phase.
- **Testing gate after every phase:** `npm test` (zero failures), `npm run typecheck`; final phase also `npm run build`.

**New dependencies:** `react-router`, `tailwindcss` + `@tailwindcss/vite`. Everything else (drag, canvas, undo/redo, node graph) is hand-built with pointer events + pure reducers — no dnd-kit, no Zustand, no react-flow.

## 2 · Routing

```
/login              AuthPage (login <-> register toggle)
/projects           ProjectsPage   <- guarded
/project/:id        redirect -> /project/:id/editor
/project/:id/editor EditorPage     (Design|Logic modes inside)
/project/:id/deploy DeploymentPage
```

## 3 · Phase 0 — Foundations (S)

1. Path aliases `@domain/*`, `@data/*`, `@presentation/*`, `@main/*` in `tsconfig.app.json` + `vite.config.ts`.
2. Tailwind v4 setup with a design-token layer (`@theme` in CSS): indigo accent ramp, neutral gray ramp, 8px spacing scale, radius + typography scales. One accent color, used consistently (the draft's random amber/purple/green headers are replaced).
3. Router skeleton with the routes above + auth guard.
4. `main/providers/AuthProvider` with a demo session so the guard and every route are reachable (the real mock auth session lands in Phase 2 — implemented there as **SessionProvider**, backed by the mock `AuthRepository`).
5. Seed demo data (1 sample project with the "Hello World" screen from the draft) so screens are never empty during development. `main/providers/RepositoriesProvider` moves to Phase 1 alongside the mock repositories it injects — there is nothing to provide until they exist.

**Gate:** router smoke tests green.

## 4 · Phase 1 — Domain + mock data layer + shared renderer (M)

**Entities** (pure, no React):
- `User`, `Project`, `ProjectDocument { screens[] }`, `Screen`
- `ComponentNode { id, type, x, y, w, h, props, children }`
- `ComponentType` string union: `'button' | 'text' | 'input' | 'image' | 'container' | 'column' | 'row' | 'listview' | ...`
- `LogicGraph { nodes, edges }`, `Behavior { event, graphId }`, `Template`, `DeploymentRecord`

**Repository interfaces:** `AuthRepository`, `ProjectRepository` (list / create / rename / duplicate / delete / get + save document with debounced autosave), `TemplateRepository` (static JSON), `DeploymentRepository`.

**Shared renderer (core piece):** one `ComponentRenderer` maps a `ComponentNode` tree to rendered React.
- canvas mode: interactive (selection events, outlines)
- preview mode: clean, no chrome
- thumbnail mode: CSS-scaled (powers project cards)

Built once, reused everywhere.

**Tests:** repository CRUD + localStorage round-trips, mappers, ComponentRenderer smoke tests.

## 5 · Phase 2–3 — Auth + Projects (S / M)

**Auth:** split layout (form left, brand panel right), login/register toggle, client-side validation (email format, password rules), explicit loading/error/empty states, mock session storing only a mock profile (no tokens), *Continue as demo user* shortcut so all screens are reachable in one click. Guard redirects to `/login` otherwise.

**Projects:** grid of cards with real live thumbnails (scaled renderer), name / screen count / "Edited 3m ago", hover actions (Open, Rename, Duplicate, Delete-with-confirm), search, empty state with CTA. **New Project** opens a template gallery modal — Blank / Landing page / Login form / "Student list" demo (matches SRS acceptance criteria) — each as a mini live preview; Create jumps into the editor.

## 6 · Phase 4–6 — The Editor redesign (XL, split 4a/4b; then L; then M)

Draft (Image 1) problems -> redesign:

| Draft problem | Redesign |
|---|---|
| Logic crammed in a ~290px bottom drawer | **Logic becomes a full-screen workspace** behind the Design/Logic toggle; node graph gets real space, pan/zoom, snap grid |
| Properties + AI chat stacked in one narrow panel | Right panel is a **single-purpose Inspector**; AI assistant moves to a slide-over sheet opened from a floating chip |
| Ambiguous floating "phone card", no zoom/pan/grid | Device-framed canvas (390/768/1200 presets) + bottom-left zoom pill (%, fit, snap-grid toggle), dotted grid |
| Weak selection (1px dashed, no handles) | Solid accent outline + 8 resize handles + **floating mini-toolbar** (Duplicate · Delete · "Add behavior" lightning action) |
| Palette = 6 unlabeled boxes, no drag affordance | Searchable, categorized palette (Layout / Basic / Data) with icons + drag ghost + drop indicator; click-to-add fallback |
| No undo/redo, no shortcuts | Full command stack in the reducer (Cmd/Ctrl+Z / Shift+Z, Del, Cmd/Ctrl+D, arrow-nudge) with visible undo/redo buttons |
| Pages buried in a breadcrumb | **Screen tabs strip** above the canvas (Home, +, rename via menu) |
| Publish button mid-screen with no context | Top bar: back to Projects - inline-editable app name + "Saved 3m ago" autosave status - Preview (ghost) - **Deploy (primary)** |

**Structure:**

```
TopBar ----------------------------------- Design|Logic ----- undo redo - Preview - Deploy
Left rail: [Search] Components palette   |  Screen tabs strip   | Inspector
           Layers tree (reorder, eye/lock)|  Device frame canvas| (Content/Layout/
           (+ Data panel stub)            |  zoom pill bottom-left| Appearance/Behavior)
Floating chip bottom-right -> AI Assistant slide-over sheet
```

- **Design mode:** palette drag onto canvas, selection/resize, inspector edits props (label, placeholder, widths incl. Fill, colors via token picker), Behavior section lists bound events.
- **Logic mode:** node palette (Triggers: Click/Change/Load -> Actions: Change text, Show message, Navigate to screen), bezier-connected cards, per-behavior graph tabs, node config inline. "Add behavior" from canvas drops here pre-targeted.
- **AI Assistant (honest mock):** rule-based intents ("add a button", "make the text change when clicked", "create a list of students") return a structured proposed change with **Keep / Undo** wired to the same command stack, plus a visible "Demo responses — real AI arrives with the backend" badge.
- **Positioning model:** free-form absolute (x/y/w/h) with 8px snap for screen, Container, and
  ListView item-template children; Column and Row compute nested placement from child order and
  axis-layout properties.
- **Autosave:** debounced `saveDocument` via repository; Saving/Saved indicator. State = pure `useReducer` with past/present/future stacks (unit-testable undo/redo).

## 7 · Phase 7 — Deployment screen (M)

Per-project page: environment selector (Preview/Production mock), **Publish** -> animated stepper (Build -> Optimize -> Provision -> Live) simulated by the mock repository, success modal with fake URL (`{slug}.novy.app`) + copy button, deployment history table (version, date, status badges, View/Redeploy), disabled custom-domain stub labeled "Coming soon" so nothing is a dead end.

## 8 · Phase order & gates

| # | Phase | Size | Gate | Status |
|---|---|---|---|---|
| 0 | Foundations (aliases, tokens, router, DI, seed) | S | router smoke tests green | ✅ done |
| 1 | Domain entities + mock repos + shared renderer | M | repo/mapper/renderer tests | ✅ done |
| 2 | Auth screens | S | validation + guard tests | ✅ done (typecheck + 111 tests + build green) |
| 3 | Projects dashboard + template modal | M | CRUD flows tested | ✅ done (typecheck + 145 tests + build green) |
| 4 | Editor shell + Design mode (4a shell/canvas, 4b inspector/layers/undo) | XL | reducer + geometry + interaction tests | ✅ done (typecheck + 266 tests + build green) |
| 5 | Logic mode workspace | L | graph reducer + behavior linking tests | ✅ done (typecheck + 310 tests + build green) |
| 6 | AI assistant mock | M | intent + apply/undo tests | ✅ done (typecheck + 333 tests + build green) |
| 7 | Deployment | M | stepper + history tests | ✅ done (typecheck + 342 tests + build green) |
| 8 | Polish: a11y, focus traps, error boundaries, empty states, final build | M | `npm test` + `build` all green | ✅ done (typecheck + 349 tests + build green) |

## 9 · Deferred (noted in code/docs)

- Additional responsive layout constraints beyond Column, Row, and ListView
- Live collaboration
- Real AI / Vercel / Supabase wiring (backend phase)
- Multi-user

## 10 · PD6 Interaction Redesign (Figma / n8n references)

The builder-facing requirements in `project_information/PD6_A-04.pdf` are the functional baseline.
Figma and n8n are interaction references only; Novy keeps its own visual identity. Administration
is excluded while Novy remains a single-builder product.

| Gate | Scope | Gate | Status |
|---|---|---|---|
| 1 | Figma-style editor shell + hierarchical Layers | metadata/migration + layer interaction tests | ✅ done (typecheck + 364 tests + build green) |
| 2 | Direct canvas manipulation + nested composition | geometry/reparent/keyboard tests | ✅ done (typecheck + 380 tests + build green) |
| 3 | n8n-style Logic Builder + conditions/typed ports + searchable node library | graph/runtime/connection tests | ✅ done (typecheck + 404 tests + build green) |
| 4 | Project Data workspace + schema/record CRUD | repository + CRUD + binding tests | ✅ done (typecheck + 419 tests + build green) |
| 5 | Project validation + preview/deploy integration | validator + failure-preservation tests | ✅ done (typecheck + 423 tests + build green) |
| 6 | PD6 traceability + final accessibility/regression | full test + build gate | ✅ done (typecheck + 425 tests + build green) |
| 7 | Flutter-inspired component expansion (Checkbox, Radio, Switch, Dropdown, Slider, Progress, Divider + TextField/ListView/Button upgrades) | mapper/default/validation/palette tests | ✅ done (typecheck + 433 tests + build green) |
| 8 | Preview overlay fit: content-hugging window, device/zoom controls, always fits the viewport (fit-on-open, refit on device change and resize, manual zoom scrolls instead of overflowing) | zoom/fit/device/runtime tests | ✅ done (typecheck + 436 tests + build green) |
