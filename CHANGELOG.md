# Changelog

All notable changes to the Novy frontend are documented here.

The project is pre-release (`0.0.0`), so work is grouped under **Unreleased** until a version is cut.
Review-ready, per-task changelogs live in [`docs/changelogs/`](docs/changelogs/):

- [Task 1 — Canvas rulers and smart alignment guides](docs/changelogs/task-1-canvas-rulers-guides.md)
- [Task 2 — Preset-adaptive editor chrome and content centering](docs/changelogs/task-2-preset-adaptive-editor.md)

## [Unreleased] — 2026-11-06

### Added — Canvas rulers and smart alignment guides (Task 1)

- Committed as `aa02420 feat(editor): canvas rulers and smart alignment guides`.
- Canva-style horizontal/vertical rulers on the canvas frame: zoom-aware "nice number" tick
  ladder, labelled major ticks, toggleable with the **Rulers** button in the zoom pill.
- Smart alignment guides during drag/resize: edge and center snapping against sibling
  nodes, drawn with the new `--color-guide` design token.
- Pure, framework-free math in `state/ruler.ts` and `state/alignment.ts`, consumed by
  `CanvasRulers`, `Ruler`, `AlignmentGuides`, and `EditorCanvas`.

### Added — Preset-adaptive editor chrome and content centering (Task 2)

- Uncommitted working-tree changes; proposed branch `feature/preset-adaptive-editor`.
- Editor chrome follows the **canvas device preset**, not the browser window width:
  `usesCompactEditorChrome()` in `state/geometry.ts` is the single breakpoint rule.
- **Mobile / Tablet** presets collapse the Layers and Inspector rails into a "preset panel
  bar" with accessible drawers (scrim, Escape to close, focus trap via `useDialogFocus`).
  **Desktop** keeps both rails inline and closes any open drawer.
- Changing a preset re-centers top-level canvas content horizontally as a group via the pure
  `centerNodesForViewport()` helper (`state/presetLayout.ts`). Relative composition and
  vertical anchors are preserved; hidden nodes move with the group but do not affect the
  bounding box; content wider than the frame is left-aligned rather than clipped.
- `device/set` pushes exactly one undoable history entry and marks the document unsaved
  only when content actually moves. Re-selecting the current preset is a no-op.

### Scope decisions

- Browser-width responsive shell/modal/page edits (`AppShell`, `Modal`, `ProjectsPage`,
  `DeploymentPage`, `AuthPage`) were **reverted** after clarification. No viewport-driven
  breakpoints, new screens, admin UI, backend endpoints, or external SDKs were added.
- Everything remains frontend-only with `localStorage` mock repositories, consistent with
  `AGENTS.md` Clean Architecture rules (domain stays React/Axios-free; Axios is not called
  from presentation).

### Verification (current working tree)

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npm.cmd run typecheck` | ✅ pass |
| Tests | `npm.cmd test` | ✅ 512 passed / 68 files |
| Build | `npm.cmd run build` | ✅ pass |
| Manual browser | Desktop → Tablet → Mobile | ✅ group centers and re-centers |

### Open decisions for the leader

- Centering is **horizontal and group-based**; vertical positions stay anchored.
  Confirm whether vertical centering or per-element centering was intended.
- Preview overlay renders the (already centered) saved document; it does not mutate it.
