# Changelog — Task 2: Preset-Adaptive Editor Chrome and Content Centering

- **Date:** 2026-11-06
- **Status:** ⏳ Implemented, **uncommitted** working-tree changes (proposed branch
  `feature/preset-adaptive-editor`).
- **Scope:** Frontend only, editor Design workspace. No backend, no new screens, no admin UI,
  no viewport-driven responsive shell.
- **References:** "media query for the presets" → clarified as **editor chrome adapts per
  preset**, then **objects/elements inside the workspace also center when presets change**.

## Requirement history

| Step | Interpretation | Outcome |
|---|---|---|
| 1 | CSS `@media` / window breakpoints | Rejected. Browser-width edits reverted with `git restore`. |
| 2 | Editor chrome adapts per preset | Implemented (compact presets → drawers). |
| 3 | Workspace content centers when presets change | Implemented (group centering on `device/set`). |

Reverted files (no diff remaining): `AppShell.tsx`, `Modal.tsx`, `ProjectsPage.tsx`,
`DeploymentPage.tsx`, `AuthPage.tsx`.

## Part A — Preset-driven editor chrome

**Rule:** `usesCompactEditorChrome(device)` in `state/geometry.ts` — `true` for
`mobile` / `tablet`, `false` for `desktop`. This is the single preset breakpoint; the browser
window width is never consulted.

- **Desktop** — Layers rail (left) and Inspector/Layers rail (right) stay inline as before.
- **Mobile / Tablet** — both rails are hidden. A `data-testid="preset-panel-bar"` toolbar
  appears above the screen tabs with the active preset label plus **Layers** and **Inspector**
  toggles (`Toggle layers panel` / `Toggle inspector panel`).
- Toggling opens a `CompactPanelDrawer` (`role="dialog"`, `aria-modal="true"`) with a scrim;
  the shared `useDialogFocus` hook traps focus, closes on **Escape**, and restores the opener.
- Switching back to **Desktop**, or leaving Design mode, closes any open drawer.
- `main` carries `data-editor-preset={state.device}` for styling/testing hooks.

## Part B — Content centering on preset change

**Rule:** `centerNodesForViewport(nodes, viewport)` in `state/presetLayout.ts` (new pure
module). `device/set` applies it to **every screen** in the document.

- Measures the bounding box of visible **top-level** nodes, then shifts all top-level nodes
  by one shared offset so the group is horizontally centered in the target frame.
- Relative composition is preserved (a left-aligned cluster stays left-aligned, just centered
  as a group). **Vertical positions are intentionally untouched** — pages stay anchored to
  the top as frame height changes.
- Nested container children keep their parent-relative coordinates; only the container's `x`
  moves.
- Hidden nodes are excluded from the bounding box but still move with the group, so revealing
  them later keeps the composition intact.
- Content wider than the frame is left-aligned at `x = 0` instead of being clipped off the
  leading edge.
- Empty screens and already-centered content return the original array (no allocation).
- A preset change pushes **one** undoable history entry and sets `hasUnsavedChanges` only
  when content actually moves. Re-selecting the current preset is a no-op.

### Verified numbers (clean demo seed, browser)

The seeded group spans `x 80..310` (230px wide):

| Preset | Frame width | Group span | Title / body / button `x` |
|---|---|---|---|
| Desktop (initial) | 1200 | 80..310 | 95 / 90 / 80 |
| Tablet | 768 | 269..499 (centered) | 284 / 279 / 269 |
| Mobile | 390 | 80..310 (centered, `(390−230)/2 = 80`) | 95 / 90 / 80 |

## Files

| File | Change |
|---|---|
| `state/geometry.ts` / `geometry.test.ts` | New `usesCompactEditorChrome` + tests |
| `state/presetLayout.ts` / `presetLayout.test.ts` | New pure centering math + 7 tests |
| `state/editorReducer.ts` / `editorReducer.test.ts` | `device/set` centers all screens, history/unsaved policy, 2 tests |
| `workspace/EditorWorkspace.tsx` | Compact bar, drawers, inline/drawer switching, preset data attribute |
| `workspace/EditorLeftPanel.tsx` | `h-full` so the rail fills the drawer |
| `pages/editor/EditorPage.test.tsx` | 2 integration tests (chrome flow, content centering) |

Diff: 7 modified files (+329 / −57) and 2 new files.

## Tests added / updated

| Test file | New coverage |
|---|---|
| `state/presetLayout.test.ts` | centering, wider frame, idempotence, overflow, hidden nodes, containers, empty screen |
| `state/geometry.test.ts` | compact chrome rule for mobile/tablet vs desktop |
| `state/editorReducer.test.ts` | `device/set` re-centers, pushes history, is idempotent for same preset |
| `pages/editor/EditorPage.test.tsx` | desktop → mobile → Layers drawer → Escape → Inspector → desktop; Tablet shifts all demo nodes by +189 |

## Gates (current working tree)

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npm.cmd run typecheck` | ✅ pass |
| Tests | `npm.cmd test` | ✅ 512 passed / 68 files |
| Build | `npm.cmd run build` | ✅ pass |
| Browser | Desktop → Tablet → Mobile | ✅ group centers / re-centers; drawers verified |

## How to try it

1. `npm.cmd run dev` → open the URL it prints (e.g. `http://localhost:5173`).
2. **Continue as demo user** → open the demo project → **Edit**.
3. Bottom-right device toggle: **Desktop → Tablet / Mobile**.
   - The side rails collapse into the **Layers / Inspector** bar.
   - Canvas content visibly shifts to the center of the new frame.
4. Click **Layers** or **Inspector** to open the drawer; press **Escape** to close.
5. Switch back to **Desktop** — inline rails return and content re-centers for the wide frame.

## Open decisions for the leader

- Centering is **horizontal, group-based**. Vertical centering and per-element centering were
  not specified; confirm if either was intended.
- The Preview overlay renders the saved (already centered) document and does not mutate it
  when its own device toggle changes. Confirm whether preview should also re-center live.
- Centering on a preset change is a persisted document mutation (undoable, autosaved).
  Confirm whether it should instead be a view-only transform.

## Suggested commit

```powershell
git switch -c feature/preset-adaptive-editor
git add CHANGELOG.md docs/changelogs docs/frontend-plan.md `
        src/presentation/editor/state/geometry.ts `
        src/presentation/editor/state/geometry.test.ts `
        src/presentation/editor/state/presetLayout.ts `
        src/presentation/editor/state/presetLayout.test.ts `
        src/presentation/editor/state/editorReducer.ts `
        src/presentation/editor/state/editorReducer.test.ts `
        src/presentation/editor/workspace/EditorWorkspace.tsx `
        src/presentation/editor/workspace/EditorLeftPanel.tsx `
        src/presentation/pages/editor/EditorPage.test.tsx
git commit -m "feat(editor): adapt chrome and center content per device preset"
```
