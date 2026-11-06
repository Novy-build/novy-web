# Changelog — Task 1: Canvas Rulers and Smart Alignment Guides

- **Date:** 2026-11-06
- **Status:** ✅ Committed on `master` as `aa02420 feat(editor): canvas rulers and smart alignment guides`
- **Scope:** Frontend only, editor Design workspace. No backend, no new screens, no new dependencies.
- **Reference:** Canva-style canvas rulers (interaction reference only; Novy tokens/visual identity kept).

## What changed

Two independent, pure math modules back the UI. All coordinates are **design-space pixels**;
zoom conversion happens in the canvas wrapper, so the math stays testable and framework-free.

### Rulers

- `state/ruler.ts` — `RULER_THICKNESS` (24px), `RULER_STEPS` nice-number ladder
  (`1, 2, 5, 10, 20, 50, 100, 200, 500`), minimum minor-tick gap (8px screen) and labelled
  major-tick gap (40px screen). Tick spacing stays legible at every zoom level.
- `workspace/Ruler.tsx` — horizontal/vertical tick strip renderer.
- `workspace/CanvasRulers.tsx` — wraps the canvas frame with both rulers and corner box.
- `workspace/ZoomPill.tsx` — new **Rulers** toggle next to the existing **Snap** toggle.
- `src/presentation/styles.css` — new `--color-guide` token for guide/ruler accents.

### Smart alignment guides

- `state/alignment.ts` — `AlignmentRect`, `AlignmentGuide` (`edge` / `center`, `x` / `y`),
  `AlignmentOptions` (threshold, snap), `AlignmentResult`. Pure functions return a possibly
  snapped origin plus the guide lines for the current gesture.
- `workspace/AlignmentGuides.tsx` — renders the active guide lines over the canvas.
- `workspace/EditorCanvas.tsx` — feeds design-space rectangles into the alignment helpers
  during node drag/resize and renders the returned guides.

## How to trigger it

1. `npm.cmd run dev`
2. Open the demo project → **Edit**.
3. Click **Rulers** in the bottom-left zoom pill to show/hide the rulers.
4. Drag or resize a node near another node's edge or center; magenta-style alignment guides
   appear and the moving node snaps into alignment.

## Files

| File | Change |
|---|---|
| `src/presentation/editor/state/alignment.ts` | New pure alignment math |
| `src/presentation/editor/state/ruler.ts` | New pure ruler tick math |
| `src/presentation/editor/workspace/AlignmentGuides.tsx` | New guide overlay |
| `src/presentation/editor/workspace/CanvasRulers.tsx` | New ruler wrapper |
| `src/presentation/editor/workspace/Ruler.tsx` | New tick strip |
| `src/presentation/editor/workspace/EditorCanvas.tsx` | Wires guides into drag/resize |
| `src/presentation/editor/workspace/ZoomPill.tsx` | Adds Rulers toggle |
| `src/presentation/styles.css` | Adds `--color-guide` |

## Tests

| Test file | Covers |
|---|---|
| `state/alignment.test.ts` | edge/center snapping, thresholds, snap-off, guide extents |
| `state/ruler.test.ts` | nice-number steps, major/minor ticks, zoom legibility |
| `workspace/AlignmentGuides.test.tsx` | guide rendering for x/y, edge/center |
| `workspace/CanvasRulers.test.tsx` | ruler mounting, visibility, dimensions |
| `workspace/Ruler.test.tsx` | tick/label rendering |
| `workspace/EditorCanvas.test.tsx` | integration in the canvas, toggle behavior |

Commit diff: 14 files, +1045 / −6 lines.

## Gates

- `npm.cmd run typecheck` ✅
- `npm.cmd test` ✅ 502 passed / 67 files (at task completion; 512 after Task 2)
- `npm.cmd run build` ✅
- Manual browser verification of rulers + guides on the demo project ✅

## Architecture compliance

- New math lives in `presentation/editor/state` as pure TypeScript (no React/Axios), matching
  the existing `geometry.ts` / `geometry.test.ts` pattern.
- Components remain presentational; no API calls or DTOs in the UI layer.
- No `any`, no `@ts-ignore`, named exports only, strict TypeScript unchanged.
