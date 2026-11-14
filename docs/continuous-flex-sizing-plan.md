# DRAFT — Continuous Flex Sizing (Fill / Hug / %) — Frontend Plan

> **Status:** DRAFT for leader review — **not approved, not implemented**.
> **Date:** 2026-11-14
> **Base:** `main` `f855211` (website projects implemented; 105 test files / 870 tests green)
> **Owner:** frontend (`novy-web`) · **Coordination:** `novy-backend` (DTO/schema/generator contract)

This document is a **planning artifact only**. No implementation, schema bump, DTO change, or
production code has been written. Every decision below is provisional until the leader approves it.

---

## 1. Goal

Let a builder declare **how a component gets its size** instead of only storing a frozen pixel
value, so a layout re-flows automatically whenever its parent, siblings, or content change.

| Mode | Rule | Trigger that re-evaluates it |
|---|---|---|
| **Fixed** (today) | `w: 320` px | nothing — stored number |
| **Hug** | `w = children + padding` | child added/removed, text grows |
| **Fill** | `w = parent content box − siblings − gaps` | parent resized, sibling added/removed |
| **Percent** | `w = 50% × parent` | parent resized |

## 2. Problem statement (evidence in current code)

- `PROGRESS.md` §15 lists the gap: *"Continuous flex sizing modes such as Fill, Hug, or percentage
  dimensions that automatically reflow after a later parent resize. Current Row/Column placement
  performs a one-time fit and then stores concrete responsive pixel geometry."*
- `src/domain/layout/autoFit.ts` header: *"Pure placement math for fit-once component drops. The
  editor stores concrete pixel geometry. … They do not implement continuous flex layout; parent
  resizes never re-run this fit."*
- `src/domain/entities/componentNode.ts`: `NodeGeometry` (line 329), `ResponsiveNodeOverrides`
  (357), `geometryAtBreakpoint` (402), and child-geometry computation (591–638) all produce
  **concrete** `x/y/w/h` per breakpoint.
- `src/data/mappers/project.mapper.ts`: `schemaVersion: 13` (45), migrations at `< 9` (66) and
  `< 13` (74). A sizing rule is **document content**, so adding it requires a schema bump +
  migration (unlike `projectType`, which stayed at 13 because it was metadata).
- `src/presentation/editor/state/editorReducer.ts`: `normalizeWebsiteScreen` is applied to website
  screens (line 66) — a **precedent** for "re-measure after every edit", but it still writes
  concrete numbers back.
- Consumers of concrete geometry: `Inspector.tsx` Width/Height (1061/1068), `geometry.ts`
  `clampNodeToBounds`, `projectValidation.ts` `component-size-invalid` (159),
  `generatedLayout.ts` (86–107), canvas / Preview / thumbnails / generated-app manifest.

## 3. Non-goals

- No behaviour change for **existing app projects** (locked decision: byte-for-byte identical).
- No full auto-layout engine rewrite beyond the four modes; no new component type.
- No backend/database/server work in this repository.
- No visual redesign, no admin UI, no new screens.
- No schema bump until the leader and the backend owner approve (see §10).

## 4. Proposed data contract (draft — decisions needed)

```ts
export type SizingMode = 'fixed' | 'hug' | 'fill' | 'percent';
export interface SizingRule {
  mode: SizingMode;
  /** Only for 'percent'; 0 < value <= 100. */
  percent?: number;
}
export interface NodeSizing {
  width: SizingRule;
  height: SizingRule;
}
// NodeBase gains:  sizing?: NodeSizing;   // absent = { fixed, fixed } (legacy)
```

- **`schemaVersion` 13 → 14**, with a migration that maps every legacy node to `fixed` and
  preserves all IDs, bindings, and undo history.
- `ProjectDTO` / `ScreenDTO` / component DTOs gain optional `sizing`; mappers round-trip it;
  **legacy payloads without the field must still parse**.
- Generated-app DTO / manifest: decide whether the rule is resolved to pixels before export or
  carried through (recommend **resolve before export**, so the generated app stays simple).
- ⚠️ Backend Pydantic uses `extra="forbid"` — every new field must land in the same backend change
  or creation/import returns 422.

## 5. Layer mapping (per `AGENTS.md` §2)

| Layer | Responsibility |
|---|---|
| `src/domain` | `SizingRule`, pure `resolveFlexLayout(tree, breakpoint, parentSize)`, measurement helpers, migration helpers, validation. **Zero React/Axios.** |
| `src/data` | DTO fields, mapper emit/read, schema-v14 migration, legacy fixture normalization, generated-layout/manifest resolution. |
| `src/presentation` | Reducer hook (re-resolve after mutations), Inspector controls, canvas resize interactions, Preview/thumbnail resolution. |
| `src/main` | unchanged (no new providers/routes). |

## 6. Phases (strict order — no phase starts until the previous gate passes)

| Phase | Deliverables | Tests | Gate |
|---|---|---|---|
| **0 — Approval** | Leader signs off on scope, naming, schema bump, backend coordination | — | decision recorded |
| **A — Domain** | `SizingRule` types; pure `resolveFlexLayout` that, for a tree + breakpoint + parent size, returns concrete geometry for the whole subtree; handle cycles, min sizes, hidden nodes, padding/gap/alignment | `src/domain/**.test.ts`: each mode, nested trees, hidden children, min-size clamp, determinism | typecheck + focused tests |
| **B — Data contract** | DTO fields, mapper round-trip, schema v14 migration, legacy fixtures; coordinate with backend B-items | mapper/migration tests incl. legacy payload without `sizing` | full frontend gates + backend `pytest` |
| **C — Editor** | One reducer hook that re-resolves after add/delete/duplicate/move/resize/reparent/prop/binding/appearance changes; **one history entry per gesture** (`pushHistory`); Inspector `Fixed / Hug / Fill / %` controls; canvas resize handles | reducer history/reordering tests; Inspector tests; interaction tests | focused + full frontend gates |
| **D — Consumers** | Resolve rules before canvas, Preview, thumbnails, validation, generated layout/manifest, Project JSON export | per-consumer regression tests; **all 870+ existing tests unchanged** | full frontend gates + generated-app `vitest`/`tsc`/`build` |
| **E — Docs & acceptance** | `CHANGELOGS.md` Unreleased entry; `PROGRESS.md` §15 gap line removed + verification summary; `docs/pd6-traceability.md` scope note; `docs/frontend-plan.md` pointer; this plan's status updated | — | full gates + `git diff --check` |

## 7. History / undo policy

`GATE_PLAN.md` §3.3: **one completed user gesture = one undo step**. If resizing a parent reflows
ten children, all ten updates must be produced inside a single `pushHistory` call, and one undo
must restore the previous concrete geometry. Context7 (`/reactjs/react.dev`) confirms the immutable
past/present/future pattern this reducer already uses.

## 8. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Schema bump breaks saved projects | Legacy default `fixed`; migration preserves IDs/bindings; round-trip + legacy fixture tests before UI work |
| Layout loops / unstable sizing | Pure resolver, deterministic order, min-size floor, no mutation during render; fallback to `fixed` + Inspector warning |
| Backend `extra="forbid"` 422 | Enumerate every new DTO field in §4 and land it in the same backend change |
| Regression in app projects | New mode is **opt-in**; all existing app nodes stay `fixed`; 870+ tests must stay green |
| Conflict with `normalizeWebsiteScreen` | Decide in Phase 0: generalize it into the resolver, or keep it for website sections only |
| Performance on large trees | Resolve subtrees lazily; measure before optimizing; no re-resolve on mere selection |
| Hot files (`editorReducer.ts`, `Inspector.tsx`, mappers) | Work on a dedicated branch off `main`, one feature per commit, no push until approved |

## 9. Cross-repo dependencies (`novy-backend`)

| # | Backend item | Blocks |
|---|---|---|
| B1 | `sizing` accepted in project DTO / import / manifest | Phase B |
| B2 | Generated-app template respects resolved geometry (or receives the rule) | Phase D |
| B3 | Backend `SUPPORTED_PROJECT_SCHEMA_VERSION` → 14 | Phase B |

## 10. Open questions for the leader (answer before Phase A)

1. Is this in scope **now**, given website projects just landed?
2. Should sizing apply to **all node types**, or only children of `Row`/`Column` and website sections?
3. Should **width and height** be independently configurable, or one rule per node?
4. Should `percent` be of the **parent content box** (after padding) or the full parent?
5. Who owns the backend schema bump / generator change, and when can it land?
6. Coexist with existing `responsive` overrides, or migrate them into rules?
7. Reuse/generalize `normalizeWebsiteScreen`, or replace it?
8. Is there a Figma/CSS-flex reference behaviour we must match, or is Novy's own model acceptable?
9. Do you want a **spike/prototype** (pure domain resolver only) before committing to the schema bump?
10. Target gate/milestone, and is a **schema bump** acceptable at all right now?

## 11. Acceptance criteria (draft)

1. A node can be set to Fixed / Hug / Fill / % and the choice survives save, reload, import,
   duplicate, and export.
2. Resizing a parent, adding/removing a sibling, or editing text re-flows affected children
   **without manual repositioning**.
3. One gesture produces exactly one undo entry; undo restores prior geometry.
4. All three breakpoints resolve consistently.
5. Canvas, Preview, thumbnails, validation, Project JSON, and generated layout agree on the
   resolved geometry.
6. **Every existing app project behaves byte-for-byte as before**; 870+ existing tests remain green.
7. `CHANGELOGS.md` / `PROGRESS.md` / traceability / frontend-plan updated; `git diff --check` clean.

## 12. Documentation obligations (per `AGENTS.md` §8.7/§9.1 and website plan §12)

Each phase appends a `CHANGELOGS.md` **Unreleased** entry (newest first, current date) and updates
`PROGRESS.md` in the **same task**; §12 also requires the traceability note and frontend-plan
pointer at the end. `PROGRESS.md` is current-state inventory, `CHANGELOGS.md` is append-only
history — both must be updated.

## 13. Effort estimate (rough, for planning only)

| Phase | Size |
|---|---|
| 0 Approval | — |
| A Domain resolver | M |
| B DTO/mapper/migration + backend coordination | M |
| C Reducer + Inspector + canvas | L |
| D Consumers + regression | L |
| E Docs/acceptance | S |

**Overall: L / multi-phase.** Recommended first step after approval: a **pure domain spike**
(Phase A only) to validate the resolver before touching the persisted schema.
