# Novy Website Projects — Frontend Implementation Plan

**Status:** Planned — **not implemented**. This document is the execution contract for the
website-project work in `novy-web`.

**Last reviewed:** 2026-11-12

**Companion document:** `C:\Users\Calexx\Desktop\novy-backend\WEBSITE_PROJECTS_PLAN.md`
The backend must land the `projectType` persistence and the generated-app template changes
described there before website projects can be published.

**Owner:** frontend (`novy-web`) · **Coordination:** `novy-backend` contract + generator template.

---

## 1. Goal

Add a **Website** project type to Novy alongside the existing **Web app** type, and give website
projects a Canva-style **"+ Add section"** flow backed by a library of ready-made sections, so a
builder can assemble a landing page or a small marketing site without hand-positioning every
widget.

Two deliverables:

1. **Project type at creation.** The builder picks *Web app* or *Website* when creating a project.
   The choice is persisted and survives reload, import, duplication, and publication.
2. **Add section.** Website projects get a section library and an **"+ Add section"** button that
   inserts a pre-designed band (Hero, Features, Pricing, …) into the page.

## 2. Why this is more than a new button

Novy today is a **fixed-viewport app builder**. Every screen is one device-sized box:

| Concern | Location | Current behaviour |
| --- | --- | --- |
| Viewport presets | `src/presentation/editor/renderer/ScreenFrame.tsx:17` | mobile `390×780`, tablet `768×1024`, desktop `1200×800` |
| Frame rendering | `src/presentation/editor/renderer/ScreenFrame.tsx:88` | `overflow-hidden` at exactly that size |
| Bounds clamping | `src/presentation/editor/state/geometry.ts:30` | every component is clamped inside the viewport box |
| Preview | `src/presentation/editor/workspace/PreviewOverlay.tsx:70` | renders the same fixed viewport |
| Published app | `novy-backend/generator_template/generated-app/src/runtime/responsive.ts:24` | `DESIGN_SIZES` — every screen is a fixed viewport |

Consequence: **a landing page can currently only be one viewport tall.** A hero can be faked;
Hero → Features → Pricing → Footer cannot be stacked. The fixed viewport — not the missing button —
is the actual blocker, and it is why this work is split into four phases.

### Website vs. web app in Novy terms

| | Web app (current) | Website (new) |
| --- | --- | --- |
| Unit of composition | Screen = one viewport + route | Page = one long scrolling document |
| Layout | Absolute, clamped to the viewport | Vertical flow; the page grows with its content |
| Authoring | Widgets + data + logic | **Sections** stacked top → bottom |
| Navigation | Routes between screens | In-page anchors + optional multi-page routes |
| Editor tooling | Palette / Logic / Data | Palette + **Section library** + **Add section** |
| Data & logic | First-class | Optional; still fully supported |

A website project may still contain multiple screens (Home, About, Contact). Each screen in a
website project is a long page rather than a fixed viewport.

### Scope note — this extends the canonical baseline

`project_information/PD6_A-04.pdf` describes Novy as a builder for **"web applications"**. It
contains no website, marketing, landing-page, or section concept. This work is a deliberate scope
extension, not a baseline requirement. Record it as such in `PROGRESS.md`; do not present it as
PD6 compliance.

## 3. Locked scope decisions

These were decided with the product owner and must not be re-litigated during implementation:

| Decision | Choice |
| --- | --- |
| Project type persistence | **Persisted server-side.** Requires the backend change in `novy-backend` (`projects.project_type` column + migration + contract/response fields). |
| Published websites | **The generated-app template change ships in this slice.** Website pages must render as scrolling pages, not clipped fixed viewports. |
| Section library breadth | **Core 8 presets**: Hero, Features, Logo strip, Stats, Testimonials, Pricing, CTA, Footer. |
| Website templates in the gallery | 4: Landing page, Portfolio, Agency, Coming soon. |
| Project schema version | **Stays at 13.** `projectType` is project metadata, not document content, so the screens document shape is unchanged. |
| Existing app projects | **Zero behavioural change.** Every app project, template, and test must behave exactly as before. |

## 4. Terminology

- **Project type** — `'app' | 'website'`, stored on the project.
- **Page** — one screen of a website project; renders as a long scrolling document.
- **Section** — a root-level `Column` node in a website page. The screen root *is* the ordered
  section list. There is no separate "section" component type.
- **Preset** — a named builder function that returns a ready-made section tree.

## 5. Data contract (frontend side)

`projectType` is **project metadata**, deliberately *not* part of the project document. That keeps
`schemaVersion` at 13, leaves the autosave payload (`{ schemaVersion, screens }`) unchanged, and
keeps the backend's `SUPPORTED_PROJECT_SCHEMA_VERSION = 13` valid.

```ts
// src/domain/entities/project.ts
export type ProjectType = 'app' | 'website';

export interface Project {
  id: string;
  name: string;
  /** Persisted project type. Legacy projects without the field load as 'app'. */
  projectType: ProjectType;
  createdAt: Date;
  updatedAt: Date;
  document: ProjectDocument;
}

export interface ProjectSummary {
  id: string;
  name: string;
  projectType: ProjectType;
  createdAt: Date;
  updatedAt: Date;
  screenCount: number;
  previewScreen: ProjectDocument['screens'][number] | null;
}
```

```ts
// src/domain/entities/template.ts
export interface Template {
  id: string;
  name: string;
  description: string;
  /** Which project type this starter creates. */
  projectType: ProjectType;
  screens: Screen[];
  data?: TemplateDataBlueprint;
}
```

```ts
// src/data/dto/project.dto.ts
export interface ProjectDTO {
  schemaVersion?: number;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  screens: ScreenDTO[];
  /** Omitted means 'app' — backward compatible with legacy localStorage and backend rows. */
  projectType?: 'app' | 'website';
}
```

```ts
// src/data/dto/template.dto.ts
export interface TemplateDTO {
  id: string;
  name: string;
  description: string;
  projectType: 'app' | 'website';
  screens: ScreenDTO[];
  data?: TemplateDataBlueprintDTO;
}
```

`createProject(name, template)` **keeps its current signature.** The project type rides on the
template, so `src/domain/repositories/project.repository.ts` needs no change and both repository
implementations stay symmetrical. The backend receives it through `TemplateDTO.projectType`.

Wire shape the backend must return (see the backend plan):

```jsonc
// GET /api/v1/projects
{ "projects": [{ "id": "...", "name": "...", "projectType": "website", "createdAt": "...", "updatedAt": "...", "screenCount": 1, "previewScreen": { } }] }

// GET /api/v1/projects/{id}
{ "schemaVersion": 13, "id": "...", "name": "...", "projectType": "website", "createdAt": "...", "updatedAt": "...", "screens": [], "revision": 3 }
```

## 6. Phase 1 — Project type at creation

### 6.1 Domain

- `src/domain/entities/project.ts` — add `ProjectType`, `Project.projectType`,
  `ProjectSummary.projectType`.
- `src/domain/entities/template.ts` — add `Template.projectType`.

### 6.2 Data layer

- `src/data/dto/project.dto.ts` — add optional `projectType` to `ProjectDTO`.
- `src/data/dto/projectApi.dto.ts` — add `projectType` to `ProjectSummaryDTO` and
  `ProjectResponseDTO`.
- `src/data/dto/template.dto.ts` — add required `projectType` to `TemplateDTO`.
- `src/data/mappers/project.mapper.ts`
  - `mapProjectToDto` — emit `projectType: project.projectType`.
  - `mapProjectFromDto` — read `dto.projectType ?? 'app'`. **Legacy payloads must keep working.**
  - `mapProjectToSummary` — pass `project.projectType` through.
- `src/data/mappers/template.mapper.ts` — emit `projectType`.
- `src/data/repositories/api/ApiProjectRepository.ts`
  - `parseProjectResponse` — read `projectType` (default `'app'` when the field is absent, so an
    older backend does not break the editor).
  - `mapSummary` — read `projectType`.
  - `createProject` — body unchanged; the type travels inside `mapTemplateToDto(template)`.
- `src/data/repositories/local/LocalStorageProjectRepository.ts`
  - `createProject` — `createProjectFromTemplate` stamps `template.projectType`.
  - `duplicateProject` — the DTO clone already carries the field.
- `src/domain/factories/screen.ts` — `createProjectFromTemplate` sets
  `projectType: template.projectType`.

### 6.3 Template catalog

`src/data/templates/templateCatalog.ts` becomes two exported lists plus a combined list:

```ts
export const APP_TEMPLATES: readonly Template[] = [ /* ... */ ];
export const WEBSITE_TEMPLATES: readonly Template[] = [ /* ... */ ];
export const TEMPLATE_CATALOG: readonly Template[] = [...APP_TEMPLATES, ...WEBSITE_TEMPLATES];
```

| Group | id | Name | Notes |
| --- | --- | --- | --- |
| app | `template_blank` | Blank | unchanged; referenced by `src/data/seeding/demoSeed.ts` |
| app | `template_landing` | Landing screen | the current single-viewport landing page, renamed |
| app | `template_login` | Login form | unchanged |
| app | `template_students` | Student list | unchanged |
| app | `template_notes` | Notes CRUD | unchanged (`src/data/templates/notesTemplate.ts`) |
| website | `template_site_landing` | Landing page | Hero + Features + CTA + Footer, one long page |
| website | `template_site_portfolio` | Portfolio | Hero + Gallery + CTA + Footer |
| website | `template_site_agency` | Agency | Hero + Services + Stats + Testimonials + Contact + Footer |
| website | `template_site_coming_soon` | Coming soon | Hero + Newsletter + Footer |

Templates are copied at project-creation time, so regrouping never mutates an existing project.

### 6.4 Presentation

- `src/presentation/pages/projects/dialogs/NewProjectDialog.tsx` **(new)** — two-step dialog:
  1. "What do you want to build?" → two selectable cards, **Web app** and **Website**, each with a
     one-line explanation.
  2. The template gallery filtered to the chosen type + the project name field + **Create
     project**.
- `src/presentation/pages/projects/TemplateGalleryModal.tsx` — keep as the reusable template-grid
  step; it gains a `projectType` filter prop. Existing tests stay valid.
- `src/presentation/pages/projects/ProjectsPage.tsx` — open `NewProjectDialog` instead of
  `TemplateGalleryModal`; pass the chosen type into `createProject`.
- `src/presentation/pages/projects/useProjects.ts` — `createProject(name, template)` keeps its
  signature; the type comes from the template.
- `src/presentation/pages/projects/ProjectCard.tsx` — a small **Website** / **App** badge.
- `src/presentation/hooks/useCreateProject.ts` — unchanged signature.

### 6.5 Editor awareness

- `src/presentation/editor/workspace/EditorWorkspace.tsx` — derive
  `const isWebsite = project.projectType === 'website'` and pass it to the canvas, palette, and
  preview. `project` is already a prop, so no new plumbing is needed.

## 7. Phase 2 — Section system

### 7.1 New domain module `src/domain/sections/`

Zero React / UI imports (per `AGENTS.md` §2.A).

**`sectionTypes.ts`**

```ts
export type SectionPresetId =
  | 'hero' | 'features' | 'logos' | 'stats'
  | 'testimonials' | 'pricing' | 'cta' | 'footer';

export interface SectionPreset {
  id: SectionPresetId;
  name: string;
  description: string;
  /** Builds the section (a Column node) with its children. */
  build: (options: { width: number }) => ComponentNode;
}
```

Preset icons are a **presentation** concern — map `SectionPresetId → LucideIcon` in
`src/presentation/editor/sections/sectionPresetIcons.ts`.

**`sectionPresets.ts`** — the 8 preset builders. Each returns a `Column` node (the section) whose
children are the section content. Content per preset:

| Preset | Section content |
| --- | --- |
| Hero | Column[ Text(display, headline), Text(body, sub-headline), Row[ Button(solid, primary CTA), Button(outline, secondary CTA) ] ] |
| Features | Column[ Text(title, "Features"), Row[ Column x3 -> Text(title) + Text(body) ] ] |
| Logo strip | Column[ Text(body, caption), Row[ Text x4 (placeholder logo names) ] ] |
| Stats | Column[ Row[ Column x3 -> Text(display, number) + Text(body, label) ] ] |
| Testimonials | Column[ Text(body, quote), Text(body, attribution), Row[ Button(outline) ] ] |
| Pricing | Column[ Text(title, "Pricing"), Row[ Column x3 -> Text(title, plan) + Text(body, price) + Button ] ] |
| CTA | Column[ Text(title, headline), Text(body, supporting line), Button(solid, CTA) ] |
| Footer | Column[ Row[ Column x3 -> Text(body, link labels) ], Divider, Text(body, copyright) ] |

All presets use `createPadding` / `createSymmetricPadding` from
`src/domain/entities/componentNode.ts` and `generateId` from `src/domain/ids.ts`.

**`sectionLayout.ts`** — pure measurement helpers:

```ts
export function measureColumnHeight(column: ColumnNode, breakpoint: ResponsiveBreakpoint): number;
export function measureSectionHeight(section: ComponentNode, breakpoint: ResponsiveBreakpoint): number;
export function nextSectionOffset(sections: readonly ComponentNode[], breakpoint: ResponsiveBreakpoint): number;
```

`measureColumnHeight` = `padding.top + sum(child heights) + gap x (n - 1) + padding.bottom`, recursing
into nested columns. `nextSectionOffset` = the bottom edge of the lowest section plus the section
gap, used to place a newly inserted section.

**`sectionTree.ts`** — root-level section helpers: list the sections of a screen, insert a section
at the end, move a section up/down among root nodes.

### 7.2 Section = a root-level `Column` node

This is the key modelling decision and it buys a lot:

- **No new component type**, therefore **no DTO change, no schema bump, no backend contract
  change** for sections.
- `Column` already auto-layouts its children (`childGeometriesAtBreakpoint` in
  `src/domain/entities/componentNode.ts`), so a section's content stacks correctly.
- In a website page, the **screen root is the ordered section list**. Reordering and deleting
  ride the existing Layers panel (`src/presentation/editor/workspace/LayersPanel.tsx`) and its
  drag-to-reorder support.
- The Layers panel already shows `Column` children in layout order.

### 7.3 Auto-height sections (highest-risk piece)

Without it, editing a headline inside a section would let the text overflow into the next band.

**Rule:** after any structural or property change inside a website screen, re-measure every
root-level `Column` and write the result into the node geometry — base `h` (mobile) plus
`responsive.tablet.h` and `responsive.desktop.h`.

Implementation notes:

- Implement as a **pure** function in `src/domain/sections/sectionLayout.ts`, e.g.
  `normalizeSectionHeights(screen: Screen): Screen`.
- Invoke it from the editor reducer on the paths that can change a section's content height:
  node add / delete / duplicate / move / resize / reparent / layer-move / prop updates / bindings /
  appearance. The reducer already centralises mutation through `updateNode` and `pushHistory`
  (`src/presentation/editor/state/editorReducer.ts`), so a single normalisation hook there covers
  the paths without touching each case.
- The normalisation must run **inside** the same history entry as the edit, so one undo restores
  the previous heights.
- Existing app projects are unaffected: the normalisation only runs for website screens.

**Fallback if measurement proves unreliable:** ship fixed-height sections and surface a
"Section content is taller than the section" warning in the Inspector instead of auto-resizing.
Do not silently ship clipping.

### 7.4 Editor actions

`src/presentation/editor/state/editorState.ts` — new actions:

```ts
| { type: 'section/add'; presetId: SectionPresetId }
| { type: 'section/move'; nodeId: string; direction: 'up' | 'down' }
```

`src/presentation/editor/state/editorReducer.ts`:

- `section/add` — build the preset, place it at `nextSectionOffset(...)`, insert it into the
  screen root, **push exactly one history entry**, and select the new section.
- `section/move` — swap the section with its sibling in the root array, re-lay out the section
  offsets, one history entry.

### 7.5 New presentation components

- `src/presentation/editor/sections/SectionLibraryModal.tsx` **(new)** — a modal grid of preset
  cards. Each card shows a **live thumbnail** rendered with the existing renderer
  (`ScreenFrame mode="thumbnail"`) over a synthetic single-section screen, plus the preset name and
  description. Keyboard accessible; `role="dialog"` with focus handling consistent with
  `src/presentation/components/system/Modal.tsx`.
- `src/presentation/editor/sections/AddSectionButton.tsx` **(new)** — the Canva-style control: a
  full-width bordered pill reading **"+ Add section"** with a `Plus` icon, placed below the last
  section inside the page frame. Opens the section library.
- `src/presentation/editor/workspace/ComponentsPalette.tsx` — add a **Sections** category, shown
  **only for website projects**, listing the 8 presets for people who prefer the left rail.

### 7.6 Inspector

`src/presentation/editor/workspace/Inspector.tsx` — for a selected section:

- Show the section name (editable, already supported by `node/layer-rename`).
- Show the measured height as the effective height.
- Allow the section background colour / padding to be edited like any other `Column`.

## 8. Phase 3 — Long-page canvas

Without this, a website project cannot exceed one viewport.

### 8.1 Frame height

`src/presentation/editor/workspace/EditorCanvas.tsx`:

- Compute the page content height for the active breakpoint:
  `max(rootNode.y + rootNode.h) + CANVAS_PAD_PX`.
- Frame height = `isWebsite ? Math.max(bounds.height, contentHeight) : bounds.height`.
- Pass the taller `size` to `ScreenFrame` (it already accepts a `size` prop).
- The existing scroll container (`canvas-viewport`) then scrolls the page naturally.

### 8.2 Bounds clamping

`src/presentation/editor/state/geometry.ts` and the reducer's `childGeometryBounds` /
`resolveNodeGeometryBounds` currently clamp a node's `y` to `bounds.height - h`. For website
screens the root bounds must grow with the content, otherwise a section can never be placed below
the fold.

- Introduce a website-aware root bounds height (content height, effectively unbounded) and use it
  wherever the active screen is a website page.
- Keep the current behaviour byte-for-byte for app screens.

### 8.3 Fit zoom

`computeFitZoom` in `src/presentation/editor/state/geometry.ts` fits both axes. For a long page
that would shrink the canvas to an unreadable scale. For website screens, fit **width only** and
keep the vertical scroll.

### 8.4 Preview

`src/presentation/editor/workspace/PreviewOverlay.tsx`:

- Render a website screen at its page height and let the preview panel scroll.
- Keep the current fixed-viewport behaviour for app screens.

### 8.5 Thumbnails

`src/presentation/pages/projects/ProjectCard.tsx` uses `ScreenFrame mode="thumbnail"`, which
crops to the viewport. Website thumbnails should show the **top** of the page at the standard
preview height — cropping the top is the current behaviour and remains acceptable. Do not grow the
thumbnail to the full page height.

### 8.6 Validation

No change is required. The only out-of-frame rule
(`src/domain/validation/projectValidation.ts:182`) applies to `container` / `gesture-detector`
parents, not to the screen root, so root-level sections never raise it.

## 9. Phase 4 — Published websites

### 9.1 Frontend part

`buildGeneratedAppManifest` (`src/data/generation/generatedAppManifest.ts`) already embeds
`mapProjectToDto(project)` in `manifest.project`. Once `ProjectDTO` carries `projectType`, the
manifest carries it automatically — **no manifest code change is required**, only the DTO change
from Phase 1.

Verify that `src/data/dto/generatedApp.dto.ts` and the manifest builder still typecheck with the
new field and that `src/data/generation/generatedAppManifest.test.ts` covers it.

### 9.2 Backend part (owned by `novy-backend`)

The generated-app template must render a website page as a scrolling page:

- `novy-backend/generator_template/generated-app/src/runtime/types.ts` — add
  `projectType?: 'app' | 'website'` to `RuntimeProject`.
- `novy-backend/generator_template/generated-app/src/runtime/ScreenRenderer.tsx` — for website
  projects use `minHeight: size.height; height: 'auto'` instead of the fixed `height: size.height`.
- `novy-backend/generator_template/generated-app/src/styles.css` — add website modifiers so
  `.novy-screen` / `.novy-screen-content` stop clipping.

App projects must keep their current fixed-viewport rendering exactly.

## 10. Testing matrix

`AGENTS.md` §6 requires tests for every feature, hook, mapper, domain function, and component.

| Area | File(s) | Coverage |
| --- | --- | --- |
| Domain | `src/domain/sections/*.test.ts` | preset builders produce valid trees; measurement maths; next-offset maths; section tree helpers; auto-height normalisation |
| Mappers | `src/data/mappers/project.mapper.test.ts` | `projectType` round-trips; **legacy DTO without the field loads as `'app'`**; summary carries the type |
| Repositories | `src/data/repositories/local/LocalStorageProjectRepository.test.ts`, `src/data/repositories/api/ApiProjectRepository.test.ts` | create/duplicate/import preserve the type; a response without the field defaults to `'app'` |
| Templates | `src/data/templates/templateCatalog.test.ts` | every template declares a valid `projectType`; both groups are non-empty; ids are unique |
| Reducer | `src/presentation/editor/state/editorReducer.test.ts` | `section/add` inserts one section in one history entry and selects it; `section/move` reorders; auto-height updates `h` and the tablet/desktop overrides |
| Canvas | `src/presentation/editor/workspace/EditorCanvas.test.tsx` | website frame grows with content; app frame stays fixed; the Add-section button renders only for website projects |
| Dialog | `src/presentation/pages/projects/dialogs/NewProjectDialog.test.tsx` | type selection filters templates; name validation; create passes the chosen type |
| Library | `src/presentation/editor/sections/SectionLibraryModal.test.tsx` | renders the 8 presets; selecting one inserts it |
| Button | `src/presentation/editor/sections/AddSectionButton.test.tsx` | renders, is keyboard reachable, opens the library |
| Regression | existing suites | **every existing app-project test must still pass unchanged** |

## 11. Acceptance criteria

1. The New Project flow offers **Web app** and **Website**; each shows only its own templates.
2. A website project reloads (local mode and backend mode) and keeps its type and its badge.
3. A website project's canvas grows past one viewport and scrolls; an app project does not change.
4. **"+ Add section"** appears below the last section of a website page and opens a library of the
   8 presets.
5. Inserting a preset produces one undo entry and selects the new section.
6. Sections can be renamed, reordered, and deleted from the Layers panel.
7. Editing copy inside a section never lets content overlap the next section.
8. Preview renders the full page and scrolls.
9. A published website project renders as a scrolling page, not a clipped viewport.
10. Every existing app-project behaviour, template, and test is unchanged.

## 12. Documentation obligations

Per `AGENTS.md` §7 and §9.1, in the **same task** as each phase:

- `CHANGELOGS.md` — append an **Unreleased** entry (newest first) describing the user-visible and
  technical effect of the change.
- `PROGRESS.md` — update the inventory to match the implementation, and keep the
  "not yet implemented" list honest. Record the website-project extension as an explicit scope
  decision relative to the PD6 baseline.
- `docs/pd6-traceability.md` — add a short note that website projects are **beyond** the PD6 use
  cases, so the traceability table is not read as covering them.
- `docs/frontend-plan.md` — add a pointer to this document.

## 13. Risks

| Risk | Mitigation |
| --- | --- |
| **Auto-height measurement loops or fights the user.** | Keep it a pure function plus one normalisation hook in the reducer. Ship the fixed-height fallback if it misbehaves. Do not let it run for app projects. |
| **Backend strictness.** Pydantic models use `extra="forbid"`; an unknown field is a hard 422. | Every new field is enumerated in §5 and lands in the same backend change. |
| **Backend not deployed yet.** | The frontend must default a missing `projectType` to `'app'` on read, so an older backend never breaks the editor. |
| **Generator drift.** The exported app must typecheck against its own `RuntimeProject`. | Phase 4 includes the generator template change and the generated app's own `vitest` / `tsc` / `build` gates. |
| **Regression in app projects.** | Every website behaviour is gated behind `projectType === 'website'`; the existing 101-file / 851-test suite must stay green. |

## 14. Cross-repo dependency list

The frontend work needs these backend items. Full detail is in
`novy-backend/WEBSITE_PROJECTS_PLAN.md`.

| # | Backend item | Blocks |
| --- | --- | --- |
| B1 | `projects.project_type` column + Alembic migration | Persisting the type on remote projects |
| B2 | `TemplatePayload.projectType` | Sending the type at creation |
| B3 | `ProjectResponse.projectType`, `ProjectSummaryResponse.projectType` | Reading the type back |
| B4 | `Project` contract accepts `projectType` (manifest + import) | Exporting and importing website projects |
| B5 | Generated-app template renders website pages as scrolling pages | Publishing a website project |

**B1-B4 are required before a website project can be created against the backend.**
**B5 is required before a website project can be published correctly.**

## 15. Implementation order and gates

Execute strictly in this order. Do not start a phase until the previous gate passes.

| Phase | Content | Gate |
| --- | --- | --- |
| 1 | Project type end to end | `npm run typecheck`, `npm test -- --run`, `npm run build`; backend `pytest` green |
| 2 | Section domain module, presets, reducer actions, library UI | focused tests + full frontend gates |
| 3 | Long-page canvas, bounds, fit zoom, preview | focused tests + full frontend gates |
| 4 | Manifest check + backend generator template change | frontend gates + backend `pytest` + generated-app `vitest` / `tsc` / `build` |

Run `git diff --check` before each commit.
