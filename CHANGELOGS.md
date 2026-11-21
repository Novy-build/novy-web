# Changelogs

All notable repository changes are recorded here. Add new entries under **Unreleased**, newest
first, and retain previous entries as project history.

## Unreleased

### 2026-11-21 — Custom SVG icons for Logic nodes

#### Added
- Every Logic node now has a distinct Lucide icon instead of a plain text glyph. The same icon
  component is used by the node library palette and by nodes on the Logic graph canvas.
- Icons are rendered with the same plain, muted style as the component palette — no tinted or
  gradient container — so the icon language stays consistent across the editor.
- Dynamic contextual nodes (component triggers, current-item actions) resolve to the matching icon
  with a neutral fallback for unknown ids.

#### Verification
- Strict TypeScript typecheck and production build passed.
- Full suite passed (141 files / 1,125 tests with `--maxWorkers=2 --testTimeout=20000`);
  focused Logic node library and graph canvas suites passed (2 files / 21 tests).

### 2026-11-21 — Editor Home navigation and brand header

#### Changed
- Replaced the editor top bar's **Exit work** button with the Novy logo, keeping the project name and
  save status as the header's primary context.
- Added a persistent **Home** action at the bottom of the editor activity rail. It is now the single
  explicit way to leave the editor for the Projects dashboard, separated from Screens, Layers,
  Assets, Logic, and Data workspace controls.

#### Verification
- Strict TypeScript typecheck and production build passed.
- Full suite passed (141 files / 1,123 tests with `--maxWorkers=2 --testTimeout=20000`);
  focused top-bar, activity-rail, and editor route suites passed (3 files / 30 tests).

### 2026-11-21 — Focused deployment screen

#### Changed
- Moved `/project/:projectId/deploy` out of the global application shell. Deployment now uses its own
  full-width project header and no longer shows the Projects/Published/Templates sidebar, account
  controls, or new-project shortcut while a user is publishing the current project.
- Removed unreachable project-specific Editor/Deployments rows from the global sidebar. Deployment
  retains both its back arrow and explicit **Return to editor** action.

#### Verification
- Strict TypeScript typecheck and production build passed.
- Full suite passed (141 files / 1,120 tests with `--maxWorkers=2 --testTimeout=20000`);
  focused application-shell, sidebar, and deployment suites passed (3 files / 20 tests).

### 2026-11-21 — Empty editor welcome surface and Novy logo

#### Added
- A VS Code-inspired empty editor surface appears after all screen tabs are closed. It uses a subtle
  Novy logo watermark and provides direct actions to open the Screens sidebar, create a screen, or
  open the Novy assistant; the route bar and canvas stay hidden until a screen is reopened.
- The user-provided transparent Novy logo is now a source-controlled presentation asset, copied from
  `dist/novy-logo/novy-logo-no-bg.png` so production builds cannot remove the source file.

#### Changed
- Replaced the letter `N` badge in the primary application sidebar with the supplied Novy logo while
  preserving the existing compact and expanded sidebar layouts.

#### Verification
- Strict TypeScript typecheck and production build passed.
- Full suite passed (141 files / 1,121 tests with `--maxWorkers=2 --testTimeout=20000`);
  focused empty-editor, editor integration, and application-sidebar suites passed (3 files / 27 tests).

### 2026-11-21 — VS Code-style screen tabs

#### Changed
- Interchanged the screen-row and tab controls: canvas tabs now use an `×` close action, while sidebar
  screen rows use a `⋮` management menu containing Rename and Delete.
- Closing a canvas tab only removes it from the current editor tab strip. It does not mutate or delete
  the project screen. Selecting that screen from the searchable sidebar reopens its tab and focuses it.
- Closing the active tab focuses an adjacent open tab when available; newly created screens open
  automatically. Actual deletion remains explicit and protected in the sidebar menu.

#### Verification
- Strict TypeScript typecheck and production build passed.
- Full suite passed (140 files / 1,118 tests with `--maxWorkers=2 --testTimeout=20000`);
  focused screen-tab, screen-sidebar, and editor integration suites passed (3 files / 25 tests).

### 2026-11-21 — Remove duplicate editor navigation and panels

#### Changed
- The left activity rail is now the single navigation for Screens, Layers, Assets, Logic, and Data;
  the duplicate Design/Logic/Data top switch and nested Layers/Assets tabs were removed.
- Screens, Layers, and Assets now render as mutually exclusive sidebar views instead of stacking the
  Screens list above another selected view.
- Removed the duplicate Layers tree from the bottom of the Inspector. Layers remain available in the
  dedicated left-rail view, while Inspector properties and Validation retain the right panel.
- Removed the design sidebar's collapse/restore column, which duplicated the persistent activity rail.
  The right-edge Inspector label is also hidden while the Inspector is open and appears only as a
  restore control when it is collapsed.
- The selected design sidebar can now be collapsed with the chevron in its header or by clicking its
  active Screens/Layers/Assets rail item again. Repeating the rail click restores the same view without
  introducing a minimized-sidebar column.

#### Verification
- Strict TypeScript typecheck and production build passed.
- Full suite passed (140 files / 1,120 tests with `--maxWorkers=2 --testTimeout=20000`);
  focused sidebar and editor integration suites passed (3 files / 24 tests).

### 2026-11-21 — IDE × Figma editor layout refresh

#### Added
- A far-left activity rail with Screens, Layers, and Assets sections plus Logic and Data modes, using
  existing editor actions only.
- A searchable Screens section above the Layers/Assets views in the editor sidebar. It selects, adds,
  renames, and deletes screens through the same actions as the canvas tab strip, which remains in place
  and stays in sync.
- Compact, collapsible Figma-style inspector sections (Style, Position, Layout, Appearance, Behavior,
  and the app-style sections). Every existing field, label, name, and dispatch action is unchanged.

#### Changed
- Inspector labels now share the `inspector-section-label` token class; section spacing and dividers
  come from existing hairline/ink tokens. The current visual theme is unchanged.

#### Verification
- Strict TypeScript typecheck and production build passed.
- Full suite passed (139 files / 1,118 tests with `--maxWorkers=2 --testTimeout=20000`).
  New tests cover the activity rail, sidebar screen list, and inspector section behavior; the
  EditorPage integration query was updated for the screen name appearing in both views.

### 2026-11-21 — Dropdown choices in field help

#### Added
- The `?` tooltip for dropdown fields now lists every available choice with a plain-language use case,
  in a scrollable **Choices** section. Native selects are read from their associated label (wrapping,
  `htmlFor`, or `fieldset`), so new options appear automatically; custom font pickers pass their choices
  explicitly.
- A shared option-help dictionary covers all static dropdown labels used by the editors, with
  category-level copy for dynamic values (collections, components, fields, fonts). Dynamic pickers show
  up to five current values with a "+N more" hint.
- Curated notes were added for ambiguous fields such as Data source, Input type, and action input
  mappings, and label keys were normalized so multi-word field lookups resolve correctly.

#### Verification
- Strict TypeScript typecheck and production build passed.
- Full suite passed (137 files / 1,102 tests with `--maxWorkers=2 --testTimeout=20000`); focused
  editor/UI suites (42 files / 317 tests) passed. New tests cover option discovery, curated and
  fallback option copy, dynamic value capping, and the ListView Data source help case.

### 2026-11-20 — Published applications section

#### Added
- A **Published** sidebar entry and guarded `/published` page list every project with deployment
  history. Each card shows Active or Inactive derived from live deployment URLs, the latest attempt
  status, provider/environment, last-published time, publish count, and links to the live app and
  deployment settings. All, Active, and Inactive filters plus loading, empty, and retryable error
  states are included.
- `listPublishedApplications()` on the deployment repository port with typed DTO/mapper boundaries.
  The API implementation calls `GET /api/v1/deployments/published` with in-flight deduplication;
  localStorage mode derives the same summary from local deployment history and project names.

#### Verification
- Strict TypeScript typecheck, full suite (137 files / 1,093 tests with `--maxWorkers=2
  --testTimeout=20000`), and production build passed.

### 2026-11-20 — Lift and isolate the focused 3D stage

#### Changed
- Increased hover camera zoom from 1.12x to 1.18x and station scale from 1.08x to 1.14x.
- A focused Build, Wire or Ship platform now eases 0.34 world units upward and 0.18 units toward the
  camera. The shared connector remains at rest, leaving a deliberate gap that makes the selected
  stage feel detached and focused; it eases back into the flow when hover/focus ends.
- Raised the camera focus target to follow the lifted platform instead of looking at its old resting
  position.

#### Verification
- Strict TypeScript typecheck, focused illustration/auth suites (59 tests), production build and
  the full suite (134 files / 1,076 tests with `--maxWorkers=2 --testTimeout=20000`) all passed.

### 2026-11-20 — Subtle local warp and reliable custom cursor

#### Fixed
- Replaced the overpowering full-page grid with a 64px grid at 5.5% baseline opacity. Only the
  180px region around the pointer brightens and bends, so the scene and auth card remain dominant.
- Removed the unreliable `(pointer: fine)` and reduced-motion mount gates from the direct pointer
  interaction. The dot/ring now activates from real mouse or pen events, ignores touch, sits above
  all Three.js/DOM layers, and replaces the native cursor on the auth page.
- The ring now initializes at the pointer on first movement instead of travelling from off-screen;
  subsequent movements use the intended lag.

#### Verification
- Strict TypeScript typecheck, focused auth/UI suites (35 tests), production build and the full
  suite (134 files / 1,075 tests with `--maxWorkers=2 --testTimeout=20000`) all passed.

### 2026-11-20 — Make the warp actually visible

#### Fixed
- The grid was drawn with the old ambient tokens at roughly 5.5% / 9% alpha, so the distortion was
  technically running but imperceptible. Added dedicated `--novy-warp-*` tokens at 14-22% alpha and
  raised the displacement radius/strength (240px / 60px). A faint radial glow now marks the
  displaced area so the interaction reads clearly.
- The canvas now re-measures on the frame after mount as well as through `ResizeObserver`, covering
  panels that have no dimensions when the effect first runs.

#### Verification
- Strict TypeScript typecheck, focused auth/UI suites (36 tests), production build and the full
  suite (134 files / 1,076 tests) all passed.

### 2026-11-20 — Pointer-reactive warped grid and dot/ring cursor

#### Changed
- Replaced the decorative crosshair/node-trail cursor with the requested effect: a precise dot at
  the pointer and an outlined ring that follows with easing. Hovering an interactive control still
  enlarges the ring.
- Replaced the static CSS grid on both login panels with a canvas-rendered `WarpGrid` whose lines
  bend away from the pointer within a 190px radius. It redraws only on pointer movement or resize,
  uses the existing colour tokens, and draws an unwarped grid when reduced motion is requested.
  The CSS backdrops now only supply the soft colour glow.

#### Verification
- Strict TypeScript typecheck, focused auth/UI suites (36 tests), production build and the full
  suite (134 files / 1,076 tests with `--maxWorkers=2 --testTimeout=20000`) all passed.

### 2026-11-20 — Node-trail cursor micro-interactions

#### Changed
- Upgraded the auth-page `TechCursor` from a lone reticle into a techy cursor system: six linked
  nodes trail the pointer along a wire, with the reticle, hover and click feedback sharing one
  animation loop. All animation uses transform/attribute writes, not per-frame React renders.
- Hovering an interactive control brightens and widens the reticle, wire and nodes; pressing
  anywhere emits a short expanding ripple.

#### Verification
- Strict TypeScript typecheck, focused auth/UI/illustration suites (64 tests) and production build
  passed; full suite passed 1,073 tests with `--maxWorkers=2 --testTimeout=20000`.

### 2026-11-20 — Ambient login backdrops and pointer reticle

#### Added
- Faint 48px grid plus a soft indigo glow on both login panels, driven by new `--color-auth-*`
  tokens. The 3D scene and the auth card remain the only focal points.
- Decorative `TechCursor` crosshair on the auth page that trails the pointer, pulses subtly and
  brightens over interactive controls. It renders only for fine pointers without reduced motion and
  never hides the native cursor.

#### Verification
- Strict TypeScript typecheck, focused auth/UI/illustration suites (63 tests, including five new
  `TechCursor` tests) and production build passed. Full suite: 1,059 passed; 13 unrelated
  route/editor tests timed out under concurrent load and all passed in isolation.

### 2026-11-20 — Full-bleed login scene container

#### Fixed
- The 3D scene was mounted inside the brand panel's padded flex box, so the WebGL canvas was
  confined to a smaller rectangle than the panel itself. The outer stations and labels were clipped
  at that inner edge even though the rest of the panel was empty. The scene now fills the entire
  panel (`absolute inset-0`, `overflow-hidden`) with the Novy wordmark floated above it, so the
  camera framing uses all available space.

#### Verification
- Strict TypeScript typecheck, focused auth/illustration suites (58 tests) and production build
  passed.

### 2026-11-20 — Scene and label clipping fix

#### Fixed
- The login 3D scene framed only the platform geometry (`width / 10.5`, `height / 5.2`), so on short
  or narrow brand panels the outer stations and the top "Build it" label were cropped at the canvas
  edge. The orthographic camera now frames the stations together with their anchored DOM labels,
  with explicit pixel padding, and the overview look-at target is raised slightly to centre the
  vertical label spread.
- drei `Html` stage labels could drift past the panel edge and be clipped at its boundary while the
  camera swayed or when a description expanded. A `calculatePosition` clamp keeps each centred
  label box fully inside the canvas.

#### Verification
- Strict TypeScript typecheck, focused illustration/auth suites (44 tests), full suite (1,064
  passed; three unrelated route/editor tests timed out under concurrent load and all passed in
  isolation) and production build passed. New `labelPosition.test.ts` covers the label clamp.

### 2026-11-20 — Smooth focus for outer stages and cursor-away release

#### Fixed
- Hovering Build or Publish looked instantaneous because the camera's look-at target snapped to the
  off-centre station while only position/zoom were tweened (Wire is centred, hiding the issue). The
  look-at target is now interpolated alongside position and zoom through the same eased curve.
- Hover stayed latched after the cursor moved away. The rig now projects the focused station to
  screen space and releases focus once the pointer is more than 240 px away; leaving the scene
  wrapper still releases immediately.

#### Verification
- Strict TypeScript typecheck, focused suites (39 tests) and production build passed. New tests
  cover cursor-away release and gradual zoom.

### 2026-11-20 — Eased zoom curve

#### Changed
- Replaced exponential per-frame damping for hover focus with a timed `easeInOutCubic` tween on
  camera position and orthographic zoom (0.9 s in, 1.1 s out; 0.25 s when reduced motion is
  requested). Drag and idle sway keep their own damping so interaction stays responsive.
- Starting a drag cancels an in-flight focus tween so the two never fight.

#### Verification
- Strict TypeScript typecheck, focused suites (38 tests) and production build passed. New tests
  cover the easing curve and assert the zoom changes gradually across frames instead of snapping.

### 2026-11-20 — Removed the translucent box over the scene

#### Fixed
- The CSS poster was rendered permanently underneath the transparent WebGL canvas, so its decorative
  tiles and divider showed through as a translucent box and obscured parts of the 3D scene. The
  poster is now shown only while the scene chunk loads; once mounted, `NovyFlowScene` owns its own
  WebGL-unavailable fallback.

#### Verification
- Strict TypeScript typecheck, focused suites (35 tests) and production build passed.

### 2026-11-20 — Latched hover and medium-speed zoom

#### Changed
- Hover is now latched: raycast `pointerout` events from the moving camera are ignored entirely, and
  focus releases only when the pointer leaves the scene wrapper or the label loses keyboard focus.
  This removes the temporary zoom-in/zoom-out pulse on hover.
- Camera damping slowed from 3.5 to 2 for a gentler, medium-speed zoom transition.

#### Verification
- Strict TypeScript typecheck, focused suites (35 tests) and production build passed.

### 2026-11-20 — Smooth hover without twitching

#### Fixed
- Hovering a station could flicker rapidly: the camera zoom moved the mesh (and its anchored label)
  out from under a stationary cursor, firing `pointerout`, which sent the camera back and repeated.
  Hover now has a short release grace period so brief raycast losses are ignored.
- Froze the ambient group sway while a stage is emphasized, and reduced the focus camera movement
  (radius 13, zoom 1.12×) so geometry drifts far less during hover.

#### Verification
- Strict TypeScript typecheck, focused suites (35 tests) and production build passed. The hover test
  now simulates repeated pointer-out/pointer-in events and asserts the focus survives them.

### 2026-11-20 — Camera rig always responds to direct manipulation

#### Fixed
- A `prefers-reduced-motion` request disabled the camera rig entirely, which also killed drag and
  hover focus. Direct manipulation is now always available; reduced motion only suppresses the
  automatic sway, floating and wire pulses.
- Removed the `camera instanceof OrthographicCamera` guard, which could silently disable the rig if
  Vite resolved two copies of `three`.

#### Verification
- Strict TypeScript typecheck, focused suites (38 tests) and production build passed. New
  `CameraRig.interaction.test.tsx` verifies that dragging moves the camera, including with reduced
  motion enabled.

### 2026-11-20 — Drag-to-orbit restoration

#### Fixed
- Dragging the 3D scene did nothing because starting a drag marked the scene active, which switched
  the camera rig off before it could apply the new orbit angles. The rig now stays enabled whenever
  motion is allowed; only the ambient sway is suppressed while dragging or returning from focus.

#### Verification
- Strict TypeScript typecheck and focused illustration/auth tests passed (33 tests).

### 2026-11-20 — Continuous ambient motion and smooth hover focus

#### Fixed
- The scene could appear completely static: drei's `OrbitControls` calls `update()` every frame and
  overwrote the camera position set by the animation rig, and its `autoRotate` stopped permanently
  once it reached the clamped azimuth. `OrbitControls` was removed; `CameraRig` is now the single
  owner of the camera and provides bounded idle sway, drag-to-orbit and hover focus through one
  damped path, eliminating the snapping on hover.
- Added a continuous ambient sway/bob to the whole flow group and sped up the travelling wire
  pulses. Removed the duplicate CSS scale on labels so only the 3D station emphasis animates.

#### Verification
- Strict TypeScript typecheck and production Vite build passed.
- Focused illustration/auth suites passed (36 tests), including new orbit-position math tests.

### 2026-11-20 — Portal stage labels out of the canvas container

#### Fixed
- The Build label was still invisible because drei `Html` mounted into React Three Fiber's
  `overflow: hidden` canvas container, so the outer label was clipped. Labels now render through a
  portal into the unclipped brand-panel wrapper, with a mount-time re-render to make the portal ref
  available on the first frame.

#### Verification
- Strict TypeScript typecheck and focused illustration/auth tests passed (30 tests).

### 2026-11-20 — Stage labels raised above the WebGL canvas

#### Fixed
- "Build it" was still hidden where it overlapped the light 3D component block: drei's default
  `Html` z-index range put labels at or below the canvas stacking level, so opaque WebGL pixels
  painted over the text. Labels now use an explicitly high `zIndexRange` of `[1000, 900]` and the
  Build anchor was moved further up and left for clearance.

#### Verification
- Strict TypeScript typecheck and focused illustration/auth tests passed (30 tests).

### 2026-11-20 — Build label visibility fix

#### Fixed
- The handwritten "Build it" label was anchored over the white floating component block and was
  effectively invisible. Its anchor and dashed leader now sit above and to the left of the block,
  and all stage titles have a stronger dark drop shadow for contrast over light 3D geometry.

#### Verification
- Strict TypeScript typecheck and focused illustration/auth tests passed (30 tests).

### 2026-11-20 — Annotated 3D stages with hover focus

#### Added
- Each 3D stage now has a 3D-anchored dashed leader line pointing to a handwritten feature name
  (`Build it`, `Wire it`, `Ship it`), using a self-hosted Caveat font exposed as `--font-hand`.
- Hovering or focusing a station (or its label) smoothly moves the camera toward it, raises its
  zoom slightly, and reveals the feature description directly beneath the handwritten title.
  Keyboard focus is an equivalent interaction; auto-orbit pauses while a stage is focused and
  resumes after the camera glides back to the overview.
- New `CameraRig` damps camera position, orbit target and zoom; it stays inactive while the user is
  actively dragging so it never fights OrbitControls. Reduced motion skips the camera move.

#### Removed
- The Build/Wire/Publish chips, the floating description card, its close button, and the hint text.
  The stage labels now live inside the scene itself.

#### Verification
- Strict TypeScript typecheck and production Vite build passed.
- Focused scene/auth suites passed. The full concurrent suite had nine unrelated route-loading
  timeout failures under heavy load; all affected files passed in isolation.

### 2026-11-20 — Removed static brand copy and stabilized the 3D canvas

#### Fixed
- The WebGL capability probe ran on every scene render. Idle re-renders opened a new WebGL context
  each time until browsers hit their context limit, leaving a blank/white canvas or forcing the
  poster fallback. The probe now runs once per mount and explicitly releases its probe context.
- A failed WebGL context no longer permanently strands the poster: the scene retries up to twice
  with a fresh boundary and canvas before giving up.
- The canvas is forced transparent (`alpha`, transparent clear color and CSS background) so a
  stalled frame shows the purple panel instead of a white rectangle.

#### Removed
- The static brand-panel copy — headline, three bullet steps, and "A course project build." The
  illustration and its interactive stage cards now carry the story alone.

#### Verification
- Strict TypeScript typecheck and production Vite build passed.
- Focused scene/auth suites passed (31 tests). The full suite had three unrelated route-loading
  timeout failures under heavy concurrent load; all three files passed when run in isolation.

### 2026-11-20 — Clickable 3D stages and idle motion on the login scene

#### Added
- Each 3D stage (Build, Wire, Publish) is now clickable: selecting one smoothly emphasizes it and
  opens a real DOM description card in the brand panel with its title, explanation, and a close
  button. Clicking empty canvas clears the selection.
- Three small stage chips above the card provide a keyboard-accessible equivalent of the 3D click.
  The hint text invites exploration when nothing is selected.
- Idle animation: after a short period without interaction the scene slowly resumes orbiting and
  spotlights each stage in turn; dragging stops both immediately. Floating blocks and travelling
  wire pulses continue to animate, and reduced motion still freezes all of it.

#### Changed
- Stage copy and emphasis priority live in a shared `stationCopy` module; the description is no
  longer baked into WebGL, so it remains selectable and announced via `aria-live`.

#### Verification
- Strict TypeScript typecheck passed.
- All 129 test files / 1,053 tests passed with two Vitest workers.
- Production Vite build passed; the scene remains a separate chunk.

### 2026-11-20 — 3D Novy flow illustration on the login brand panel

#### Added
- The desktop login brand panel now shows an interactive isometric 3D illustration of the Novy
  workflow: a drag-and-drop canvas, a logic node graph with travelling light pulses, and a publish
  node. Users can gently orbit the scene by dragging; the panel stays Novy purple in both themes.
- Three.js / React Three Fiber / drei are loaded in their own `NovyFlowScene` chunk, separate from
  the eager login bundle, and mounted behind a branded CSS poster so the credential form renders
  immediately. WebGL capability detection, a Canvas fallback, and an error boundary keep the poster
  in place when 3D is unavailable.
- `prefers-reduced-motion` stops auto-rotation, floating, pulse animation, and live shadow updates.
  The decorative canvas is `aria-hidden`; the headline and three bullet steps remain real text.
- New tests cover the reduced-motion hook, scene fallback/error handling, motion state, station
  animation, and the preserved brand-panel copy.

#### Changed
- The code-split scene is loaded via a module-level import promise consumed in an effect rather than
  `React.lazy`. A lazy component suspended during the post-redirect `/login` render and could drop
  the whole route tree in tests; the poster now covers the async gap without suspending React.

#### Verification
- Strict TypeScript typecheck passed.
- All 127 test files / 1,041 tests passed with two Vitest workers.
- Production Vite build passed; the 3D scene is emitted as a separate `NovyFlowScene` chunk
  (945.51 kB raw / 250.20 kB gzip) and is absent from the main entry chunk.

### 2026-11-20 — Per-field editor help tooltips

#### Added
- Every field in the design, logic, and data editors now has a small lucide `CircleHelp` icon beside
  its label. Hovering or focusing it opens a tooltip explaining what the field controls, with an
  **Ask Novy about this** action that opens the assistant in help mode with a prepared documentation
  question. The tooltip is keyboard accessible (Escape to dismiss) and centered near the trigger.
- A central field-help registry provides curated copy for common app-style, Inspector, logic, and data
  fields and generates generic fallback copy for unmapped fields, so every editor field is covered.
- `AssistantSheet` accepts a help request and pre-fills the assistant's help composer instead of
  silently sending a remote request; ordinary assistant opening still starts with an empty composer.

#### Verification
- Strict TypeScript typecheck and production Vite build passed.
- New component tests cover tooltip hover/focus/Escape behavior, curated and fallback help copy, and
  the assistant help-request handoff. Existing editor integration suites continue to pass.

### 2026-11-19 — Customizable form field styling

#### Added
- Text fields, dropdowns, checkboxes, switches, and chat inputs have a **Field style** control with
  Outline, Underline, and Filled presets. AI-generated drafts inherit the style from the design
  preset, while builders can override it per component in the Inspector.
- Advanced per-side border widths let any component use an underline (bottom edge only) or other
  asymmetric borders. Styles render identically in the editor and in exported applications.

#### Verification
- Strict TypeScript typecheck and production build passed.
- All 122 test files / 1,017 tests passed with four Vitest workers.

### 2026-11-19 — Assistant visual-direction contract

### 2026-11-19 — Assistant visual-direction contract

#### Added
- `AppBlueprintV1` now includes the backend-selected allowlisted design direction: style, palette,
  typography, radius, and density. The API boundary validates every value and preserves the block
  through draft refinement and explicit Apply, so proposal integrity hashes remain stable.
+- Assistant previews and accepted projects carry compiled light/dark design tokens, so draft previews
+  and the editor canvas render with the generated visual system instead of editor defaults.

#### Verification
- Strict TypeScript typecheck and production build passed.
- All 122 test files / 1,012 tests passed with four Vitest workers. The seven unrelated tests that
  timed out under unrestricted worker concurrency also passed together in isolation (41/41).

### 2026-11-19 — Compact assistant activity and VS Code-style mode selector

#### Changed
- The assistant no longer shows long sentence-length working status. A small spinner and short verb
  (**Thinking…**, **Refining…**, **Searching docs…**) indicate what the agent is doing; **Applying…**
  remains on the draft action bar so only one live status is announced at a time.
- The **Build app / Ask Novy** tab bar was replaced by a VS Code-style **Agent / Ask** chip in the
  composer with an anchored popover menu. It supports arrow-key navigation, Enter/Space selection,
  Escape that closes only the menu, click-outside dismissal, and focus return. **Model settings…**
  expands the existing provider/model settings without adding a new capability. The persistent
  **Model settings** row was removed as redundant; provider/model controls now open as a compact
  popover from the mode menu item or the shield control in the composer, with Escape and outside
  dismissal that leave the assistant open. Switching modes is disabled while a request is in flight.
- The composer is now a single VS Code-style bordered box with an auto-growing multiline textarea
  and a compact bottom row (attach, mode chip, model settings, circular Send). Enter sends; Shift+Enter
  inserts a newline. Attached images appear as a chip inside the box, and the header badge, cost note,
  and refine hint stay outside it.
- The floating bottom-right AI assistant button was removed. One right-edge rail now holds the
  **Inspector** tab above the **AI Assistant** tab in design mode (assistant only in logic/data); both
  icons and vertical labels open their respective panel. Clicking the collapsed Inspector label expands
  the inspector.

#### Fixed
- The model settings popover was anchored to the mid-row shield control and overflowed the assistant
  sheet's left edge. It is now anchored to the full composer box, so its heading and provider/model
  selects stay fully visible inside the sheet.
- Responsive generation failures no longer render a large bubble containing the same viewport error
  for every component. Coordinated backend diagnostics are grouped by screen/viewport, while the
  frontend presents one concise recovery message suggesting a split form or simpler layout. Legacy
  and other provider validation text is deduplicated and capped defensively.

#### Verification
- Strict TypeScript, the assistant/editor suites, the full suite with
  `npm test -- --maxWorkers=2` (122 files / 1012 tests), and the production build passed.

### 2026-11-18 — Visual assistant drafts and safer review actions

#### Added
- Completed app drafts lead with their screen title, plain-language summary, and a rendered thumbnail.
  Preview opens the existing interactive renderer with local, in-memory workflow simulation and a
  screen selector, without accepting the draft, requesting another generation, or loading saved data.
- Persistent **Use this app**, **Make changes**, and **Discard draft** actions remain outside the
  conversation scroller. Existing projects require explicit screen/workflow replacement confirmation;
  Cancel receives focus and Escape returns to the original action without closing the assistant.
- Applied drafts offer **Continue editing**; discarded and superseded drafts use compact summaries.

#### Changed
- Screen routes, component/workflow counts, individual checks, and repair attempts are collapsed
  under **What’s included** and **Check details**. Actionable issues remain visible, and failed
  verification blocks acceptance in both the UI and conversation controller.
- Build, documentation-search, and apply operations have distinct feedback and synchronous busy
  guards. Refinement focuses the composer without submitting or changing the saved project.
- Draft Preview actively ignores persistence and protected runtime services. The assistant becomes
  inert while Preview owns focus; returning restores the preview opener and modal scroll lock.
- Model settings collapse during draft review while provider cost disclosure remains visible. Short
  viewports use a compact action row; shared dialog focus excludes inert and collapsed controls.

#### Verification
- Strict TypeScript, all 122 test files / 1003 tests (`--maxWorkers=2`, normal test timeouts), and the
  production build passed. Browser checks used a temporary external fixture with Microsoft Edge at
  1440×900, 768×1024, 390×844, 320×568, and 844×390, plus dark applied/failed/error states.
- Browser checks covered local preview navigation, persistent actions, replacement cancellation,
  refinement focus, nested Escape/focus restoration, and scroll unlocking. These were simulated
  draft interactions, not live deployment or provider tests. Backend contracts were unchanged.

### 2026-11-18 — Reliable fonts, app themes, and widget text colors

#### Added
- Font-family fields now use an accessible curated picker whose options preview Inter, JetBrains
  Mono, and system font stacks. Keyboard navigation, type-ahead, Escape, focus return, and outside
  dismissal are supported; existing custom saved stacks remain intact until replaced.
- Logic mode includes a browser-only Set Theme node with Light, Dark, System, and Toggle modes;
  Preview also exposes a direct app-theme selector.

#### Fixed
- Inter and JetBrains Mono italic faces are bundled explicitly, so the existing italic Text setting
  now renders in the editor, Preview, and exported React applications.
- Authored Text color now reaches widget labels, values, helper text, buttons, menus, controls, chat,
  file, camera, and empty states instead of being overridden by inner semantic-color classes.
- Portal-rendered action menus retain project theme tokens and authored text colors. Text-only
  appearance changes no longer clear a solid widget background or override its default radius.
- Theme-control Switches now use clear off=Light/on=Dark semantics without exposing a conflicting
  default-on setting.

#### Verification
- Strict TypeScript, all 118 test files / 986 tests (`--maxWorkers=2` with the normal timeout), and
  the production build passed. Backend verification passed 342 tests with 5 optional skips plus
  Ruff, application mypy, Alembic check, generated-runtime tests, and generated production builds.

### 2026-11-18 — Full project design system and showcase templates

#### Added
- Project schema v14 now persists semantic light/dark color tokens, body/heading font stacks,
  radius presets, reusable named component styles, and per-screen surfaces.
- Components support typed gradients, multiple shadows and glow, backdrop blur, clipping, richer
  typography, and responsive appearance/text overrides. A standalone accessible Icon component uses
  a curated Lucide vocabulary throughout the palette, canvas, Preview, thumbnails, and export.
- Creative media workspace and learning dashboard starters demonstrate responsive navigation,
  dashboard cards, effects, tokens, and reusable styles. The Notes starter now demonstrates a serif
  heading, themed cards, elevation, and floating-action glow.

#### Changed
- The App Styles Inspector edits project tokens and screen surfaces; selected components can create,
  apply, update, and detach reusable styles. Appearance controls now apply to every component type.
- Generated manifest/layout v2 compatibly carry schema-v14 design data while preserving strict
  schema-v13 loading. Generated React now matches editor styling, including border width, font
  family, hidden field labels, standalone icons, and responsive effects/typography.

#### Fixed
- Record-route identifier synchronization no longer leaks the browser `document` object into editor
  history while preserving project-level design-system data.

#### Verification
- Strict TypeScript, all 114 test files / 960 tests, and the production build passed. Coordinated
  backend verification passed 336 tests with 5 optional integration skips; Ruff check/format,
  application mypy, and representative schema-v14 generated React/Vite production builds passed.

### 2026-11-18 — Complete CRUD assistant detail forms

#### Fixed
- Assistant-built detail screens can prefill Input and Dropdown controls from the active route record.
  Native date inputs are preserved through Project DTOs, the editor renderer, Inspector controls, and
  generated-app contracts instead of being downgraded to generic text fields.
- Bound dropdowns follow route-record changes while preserving user edits in preview. New binding
  targets are available in the Inspector with schema-compatible field guidance.
- Backend generation deadlines now map to the existing timeout state, and invalid repaired proposals
  show the first sanitized Novy validation issue instead of only a generic failure message.

#### Verification
- Strict TypeScript, all 114 test files / 954 tests, and the production build passed. Coordinated
  backend verification passed 333 tests with 5 optional integration skips plus Ruff, strict mypy,
  `alembic check`, and generated React/Vite runtime test/typecheck/build coverage.

### 2026-11-17 — Assistant build timeout alignment

#### Fixed
- Build app and Ask Novy requests now allow up to five minutes for remote structured generation,
  instead of inheriting the shared 30-second API timeout while the backend continued processing.
- Timeout feedback no longer incorrectly calls every selected provider a local assistant.

#### Verification
- Focused assistant repository and conversation tests, strict TypeScript, and the production build
  pass.

### 2026-11-17 — Verified responsive assistant builds

#### Changed
- The existing **Build app** flow now explains that Novy builds, checks, repairs, and retests
  responsive web apps instead of presenting unchecked or mobile-only proposals. No separate test
  mode was added; **Ask Novy** remains the only other assistant mode.
- Proposal cards show the backend verification result, Project/route/workflow stages, mobile
  390x780, tablet 768x1024, and desktop 1200x800 checks, plus any automatic repair count. Apply is
  disabled for a failed report and the explicit preview-before-Apply interaction is preserved.
- API proposal parsing now strictly validates the structured verification report before exposing it
  to the editor.

#### Verification
- Strict TypeScript, all 114 test files / 950 tests, and the production build pass. Coordinated
  backend verification passes with 329 tests and 5 optional integration skips; Ruff, mypy, and
  `alembic check` also pass.

### 2026-11-17 — Automatic face verification after capture

#### Changed
- Recognition Test no longer requires an external **Unlock with face** click. A completed guided or
  manual Camera capture emits its normal `change` event, which now starts CV Verify automatically.
- The verification If/Else remains mandatory: CV Verify `success` means the server request completed,
  while the `verified` node output distinguishes a recognized face from a valid non-match response.
  Separate recognized, not-recognized, and runtime-error text branches are preserved.
- Known existing Face starter projects migrate from the untouched verify button/click graph to the
  Camera change graph, remove the redundant button, and compact the status/back controls. Customized
  verify buttons or graphs are left unchanged.

#### Verification
- Template behavior, simulation outcomes, and migration coverage pass. Strict TypeScript, all 114
  test files / 950 tests, and the production build pass. Coordinated backend verification passes
  with 328 tests and 5 optional integration skips; the generated vision project installs,
  typechecks, tests, and builds.

### 2026-11-17 — Guided automatic face capture

#### Added
- Camera components now support an optional **Guided face (automatic)** capture mode. MediaPipe Face
  Landmarker runs in the browser to require one centered, suitably sized, frontal face and checks
  face-region lighting, contrast, sharpness, and short-term stability before capturing automatically.
- Guided cameras provide an oval positioning mask, plain-language live instructions, capture
  progress, reduced-motion behavior, and a keyboard-accessible **Capture now** fallback when the
  model is unavailable or automatic checks are unsuitable.

#### Changed
- Both cameras in the **Face verification** starter use guided capture. Known existing starter
  camera IDs migrate from omitted legacy capture mode to guided capture without changing Project
  schema v13; unrelated Camera components remain manual.
- Camera DTO props may now include `captureMode: "manual" | "guided-face"`. Only the final accepted
  JPEG enters the existing transient in-memory media path; analyzed video frames are not persisted
  or sent to MediaPipe.

#### Verification
- Added pure face-quality, automatic-capture, template, mapper migration, and generated-source/build
  coverage. Strict TypeScript, all 114 test files / 950 tests, and the production build pass. The
  MediaPipe SDK is lazy-loaded into a separate chunk only after guided camera activation. Coordinated
  backend verification passes with 328 tests and 5 optional integration skips; freshly generated
  vision projects typecheck and build.

### 2026-11-17 — Account-free same-device face unlock

#### Changed
- The **Face verification** starter no longer asks for an email or generated-app sign-in. Enrollment
  explains the device-local binding and Recognition Test now offers **Unlock with face**.
- CV actions infer Computer Vision only, not authentication. Successful face verification reconciles
  the backend-issued runtime session and anonymous biometric users are labeled **Unlocked with
  face** instead of exposing their synthetic identity.
- The Project v13 mapper safely normalizes existing projects cloned from the old starter by matching
  known screen/node/action IDs and unchanged legacy defaults. Customized content and inputs are
  preserved; no Project schema bump is required.

#### Verification
- Added starter, manifest, API repository, Preview, and existing-project migration coverage. Strict
  TypeScript, the focused 53-test compatibility suite, all 113 test files / 946 tests, and the
  production build pass. Coordinated backend verification passes with 327 tests and 5 optional
  integration skips; generated React/Vite biometric projects typecheck and build.

### 2026-11-17 — RAG template upload recovery

#### Fixed
- The **Chat with a document** template now has end-to-end regression coverage for its real Run App
  upload → vector indexing → Chat navigation chain, including fresh ID remapping when a project is
  created from the template.
- Run App now gives actionable feedback when a local RAG provider is unavailable, explicitly asking
  the builder to start Ollama and retry instead of only reporting a generic provider failure.

#### Verification
- Strict TypeScript, all 113 test files / 944 tests, and the production build pass. The regression
  suite executes the freshly cloned template workflow through upload, indexing, and navigation.
  Coordinated backend verification passes with 325 tests and 5 optional integration skips.

### 2026-11-17 — Immediate RAG chat feedback

#### Changed
- Chat submissions now append the user's message immediately in isolated Preview, Run App, and
  generated/published applications instead of waiting for the RAG workflow to finish.
- Chat composers show an accessible animated assistant-thinking bubble, scroll to the newest
  transcript item, and remain disabled while a response is pending. Reduced-motion preferences are
  respected.
- Browser-owned optimistic messages are reconciled with authored `chat-message` actions without
  duplicates. A failed workflow keeps the submitted message, clears the pending state, re-enables
  the composer, and reports the error.

#### Verification
- Deferred success and failure tests verify immediate rendering, pending accessibility, transcript
  deduplication, and recovery. Strict TypeScript, all 113 test files / 942 tests, and the production
  build pass. Coordinated backend verification passes with 324 tests and 5 optional integration
  skips; freshly generated React/Vite applications typecheck and build.

### 2026-11-17 — Full Run App server-action parity

#### Added
- Run App now executes CRUD, Send Email, CV Liveness/Enroll/Verify, document upload, and RAG through
  immutable backend action IDs. CRUD responses reconcile canonical backend records into the shared
  editor renderer, while writes stay in the backend's resettable preview-data sandbox.
- Added **Reset preview data**, explicit sandbox/backend-service badges, generated-app passwordless
  sign-in and sign-out controls, and automatic sign-in prompting for protected workflows.
- Camera capture now emits a transient in-memory JPEG `File` used by the bounded multipart vision
  endpoint; raw camera bytes remain outside Project JSON and browser persistence.

#### Changed
- The project-data persistence toggle is shown only in isolated simulation. Run App always uses its
  preview sandbox for CRUD and labels real email/CV/RAG behavior explicitly.
- The runtime-preview repository now owns passwordless identity, runtime CSRF state, vision
  challenges/media execution, and sandbox reset contracts. Credentialed calls remain separate from
  public credential-omitting action calls.

#### Verification
- Strict TypeScript, 113 test files / 939 tests, and the production build pass. Coordinated backend
  verification passes with 323 tests and 5 optional integration skips; generated React/Vite apps
  typecheck, test, and build.

### 2026-11-17 — Real Preview Run App mode

#### Added
- Added explicit **Run App**, **Stop**, and **Apply changes** controls to Preview. Run App prepares
  the current generated manifest as an immutable backend app version and marks it **Changes pending**
  when subsequent editor edits require a new version.
- Added a runtime-preview repository boundary, authenticated preparation client, and separate public
  runtime client. Real RAG control actions use the same immutable action IDs and `/runtime/v1`
  contracts as published apps while navigation and Chat transcript updates remain browser-owned.
- Added transient `File` propagation through the shared renderer and multipart document upload.
  Selected bytes stay in memory and are released after a successful upload; they never enter the
  project document or browser persistence.

#### Changed
- Isolated Preview remains the default fast mode. In Run App mode, document upload, indexing,
  pgvector retrieval, and configured AI responses are real; vector data uses backend-assigned
  `novy-preview-*` namespaces rather than published-app namespaces.

#### Current limits
- Run App uses the shared editor renderer rather than a generated-app iframe. There is no runtime
  console or automatic preview-version cleanup yet.

### 2026-11-17 — Chat with a document starter

#### Added
- Added dedicated **File input** and **Chat** assets across domain contracts, DTOs, mappers,
  factories, palette, Layers, Inspector, canvas, preview, validation, and generated manifests.
- Added `document-upload` and browser-owned `chat-message` Logic actions. Chat owns its transcript
  and composer state, while selected files use the same transient media-reference pattern as Camera.
- Added the two-screen **Chat with a document** app starter. Selecting a text, Markdown, HTML, or PDF
  file starts upload and indexing with `postgres-vector` and `ollama-embedding`; success navigates
  to `/chat`, where `ollama-chat` answers through the existing restricted retrieval agent.
- Added catalog, validation, component interaction, and cross-repository generated-build coverage.

#### Security and UX
- The starter is anonymous by design. File bytes are not written to Project JSON, browser storage,
  or generated bundles, and the UI explains accepted types and the backend extraction boundary.
- File and Chat controls stay inert on the editor canvas and become interactive only in Preview or
  the generated application.

#### Verification
- `npm run typecheck`, 110 test files / 928 tests, and `npm run build` passed. Coordinated backend
  verification passed with 304 tests and 5 optional integration skips.

### 2026-11-16 — Generated-app RAG configuration

#### Added
- Added backend-owned RAG connection profiles to the Logic node inspector. Embedding, chat,
  reranking, vector-store, and memory nodes now select a profile from the list the backend offers
  instead of accepting a free-text profile ID, and the model control offers only the models the
  selected profile allows.
- Added a project-scoped **Document sources** panel to the Data workspace. Builders upload text,
  Markdown, HTML, or PDF files, list them, and delete them. The returned source identifier is what a
  Document Loader node references.
- Added a `RagRepository` seam with API and local implementations. The local implementation
  deliberately reports every profile as unavailable so the editor never implies that browser-side
  inference is available.
- Added profile and file-source DTOs, mappers, and repository coverage.

#### Changed
- Document Loader collection sources now declare their content, title, and document-ID fields, and the
  Logic workspace warns when a saved profile is no longer offered by the backend.
- Conversation Memory nodes require a connection profile, and user-scoped memory explains that a
  signed-in application user is required at runtime.
- Generated applications keep structured node outputs and render answers with canonical citations.

#### Verification
- `npm run typecheck`, 110 test files / 925 tests, and `npm run build` passed.

### 2026-11-16 — Face verification starter template

#### Added
- Added a two-screen web-app starter: **Biometric Registration** contains its own Camera, unchecked
  biometric-consent Checkbox, and CV Enroll flow; **Recognition Test** contains a separate Camera,
  verification email, CV Liveness, and CV Verify controls.
- The screens have forward/back navigation, and CV Verify feeds a condition that changes visible text
  to **Face recognized** or **Face not recognized**. Camera media is mapped from the in-memory Camera
  value without exposing credential or threshold controls.
- Editor Preview now converts the Checkbox runtime value into explicit enrollment consent and uses
  the authenticated preview user as the enrollment subject.

#### Tests
- Added catalog validation for both screens, navigation, all three CV actions, required mappings, and
  recognition branches, plus runtime coverage for recognized and unrecognized results.

#### Verification
- `npm run typecheck`, 107 test files / 906 tests, `npm run build`, and `git diff --check` passed.

### 2026-11-15 — Secure generated-app Computer Vision handoff

#### Changed
- CV Enroll now requires a dynamic runtime consent mapping and explains that builder-saved consent is
  not evidence of generated-app user consent.
- CV Verify no longer exposes credential-ID or threshold controls; the protected backend resolves the
  credential and enforces its threshold.
- Generated Camera captures are passed as in-memory `Blob`s to one-time challenged multipart runtime
  requests instead of entering project/runtime JSON or persistent browser storage.

#### Integration status
- Generated-app passwordless identity, biometric session issuance, and credential revocation are now
  backed by the provider-neutral backend runtime. Real production biometric processing remains gated
  on an explicitly selected provider; editor preview simulation is still labeled as simulation.

#### Verification
- `npm run typecheck`, 107 test files / 903 tests, and `npm run build` passed; coordinated backend
  verification passed with 236 tests and 4 PostgreSQL-only skips.

### 2026-11-15 — Higher-quality assistant app proposals

#### Improved
- Every selected OpenCode, Ollama, or OpenRouter model now receives the backend's same curated,
  request-relevant Novy composition recipes without provider fallback or browser-exposed source,
  records, or credentials.
- Deterministic backend completion and quality gates recover omitted collection create flows, form
  feedback, hero hierarchy, navigation reachability, required mappings, and route record context
  before a proposal reaches the existing preview and atomic Apply workflow.
- Generated proposals receive stronger typography, two-field ListView item hierarchy, and responsive
  website section structure from the deterministic compiler rather than model-authored raw layout.

#### Verification
- Live local Ollama benchmarks produced validation-clean Notes and agency/contact proposals without
  fallback; coordinated backend coverage increased to 233 passed with 4 PostgreSQL-only skips.

### 2026-11-15 — Collection-backed assistant apps resolve immediately

#### Fixed
- Accepted assistant proposals now validate against the editor's refreshed project-data collections,
  eliminating stale missing-collection, missing-field, route, and record-context errors after Apply.
- Empty collection-backed ListView templates now render typed samples from field labels, such as
  `Title`, instead of exposing internal generated field IDs.

#### Tests
- Added an editor-route regression that applies a collection-backed proposal, waits for persistence
  and app-data refresh, verifies a valid project, and checks the friendly item-template sample.

#### Verification
- `npm run typecheck`, 107 test files / 902 tests, and `npm run build` passed.

### 2026-11-15 — Accurate assistant Apply failures

#### Fixed
- Assistant Apply now distinguishes the backend's stable proposal-persistence failure from a network
  outage and reports once that the proposal was not applied and the project was not changed.

#### Tests
- Added repository mapping coverage for HTTP 500 `assistant_acceptance_failed` responses and hook
  coverage proving a failed Apply emits one message without adopting or changing the project.

#### Verification
- `npm run typecheck`, 107 test files / 901 tests, and `npm run build` passed.
- Coordinated backend: 222 passed, 4 skipped; Ruff, formatting, and mypy passed.

### 2026-11-15 — Route-bound assistant proposals apply safely

#### Fixed
- Assistant proposal mapping now preserves `routeParameters` and `recordFields`, so dynamic detail
  screens survive the preview-to-apply round trip without changing the backend proposal hash.
- Proposal-integrity rejection is reported as a changed preview rather than incorrectly blaming the
  selected model's generated output.

#### Tests
- Added a route-bound notes proposal regression covering preview parsing and the exact Apply payload,
  plus proposal-integrity error mapping and conversation messaging.

#### Verification
- `npm run typecheck`, 107 test files / 899 tests run serially, and `npm run build` passed.
- Coordinated backend: 221 passed, 2 skipped; Ruff and mypy passed.

### 2026-11-15 — Reliable assistant conversations

#### Fixed
- Build-mode greetings render as ordinary assistant messages instead of trivial app proposal cards.
- A synchronous in-flight guard prevents duplicate requests and duplicate validation errors before
  React has rerendered the disabled composer state.
- Invalid model output now recommends rephrasing or choosing another model instead of incorrectly
  assuming that every validation failure was caused by request size.

#### Verification
- `npm run typecheck`, 107 test files / 896 tests run serially, and `npm run build` passed.
- Coordinated backend: 221 passed, 2 skipped; Ruff, formatting, and mypy passed.

### 2026-11-15 — OpenCode model selector

#### Added
- A session-only model selector under OpenCode for Nemotron 3.5 Super VL and GPT-6.1 Terra, including
  availability, image support, remote-processing, and OpenAI account-usage disclosure.

#### Fixed
- Exhausted model quota is now explained separately from provider and backend connectivity failures.
- Model selection is sent as a backend-defined alias and never triggers automatic fallback.

#### Verification
- `npm run typecheck`, 107 test files / 893 tests run serially, and `npm run build` passed.
- Coordinated backend: 220 passed, 2 skipped; Ruff, formatting, and mypy passed.

### 2026-11-15 — Assistant provider selector and image input

#### Added
- A composer provider selector for OpenCode, Ollama, and optional OpenRouter with disabled unavailable
  choices, local/remote labels, image capability, and potential-cost warnings.
- One validated PNG/JPEG/GIF/WebP attachment per assistant request with preview/removal controls.

#### Changed
- Proposal and grounded-help requests carry an explicit provider alias and never request automatic
  fallback. Provider model IDs, URLs, and credentials remain backend-controlled.

#### Verification
- `npm run typecheck`, 107 test files / 890 tests run serially, and `npm run build` passed.
- Coordinated backend: 218 passed, 2 skipped; Ruff, formatting, and mypy passed.

### 2026-11-15 — Honest route validation

#### Changed
- An unmapped dynamic route segment is now an editor error rather than a warning, so a detail
  route that can never receive a record cannot present as valid.

#### Tests
- Updated the route-segment validation expectation to assert the error severity.

#### Verification
- `npm run typecheck`, 107 test files / 887 tests, and `npm run build` passed.
- Backend: 213 passed, 2 skipped; Ruff, formatting, and mypy passed.

### 2026-11-15 — Accurate assistant connection errors

#### Fixed
- Assistant errors now distinguish a reachable backend with unavailable Ollama from an actual
  frontend-to-backend network failure, including failures while applying a proposal.

#### Tests
- Added repository error-mapping coverage for provider versus backend network failures.

#### Verification
- `npm run typecheck` and 107 test files / 887 tests passed.

### 2026-11-15 — Local builder agent and grounded help

#### Added
- Explicit **Build app** and **Ask Novy** assistant modes. Build mode can refine the latest pending
  blueprint through bounded conversation context; help mode renders backend-validated documentation
  citations and insufficient-context answers.

#### Changed
- Replaced OpenRouter branding and cloud-provider errors with local Ollama status and guidance. No
  model credentials or project record values are exposed to the browser.

#### Tests
- Added local-mode UI, help citation, repository mapping, pending-refinement, and autosave-independent
  help coverage.

#### Verification
- `npm run typecheck`, 107 test files / 886 tests, and `npm run build` passed.
- Backend: 192 passed, 2 skipped; Ruff, formatting, mypy, and PostgreSQL migration `0008` passed.
- Ollama 0.40.16 passed strict-output, full blueprint compilation, 5-source/92-chunk indexing, and
  grounded citation verification with the pinned local models.

### 2026-11-15 — OpenRouter assistant provider

#### Changed
- Replaced AgentRouter branding and unavailable-provider guidance with OpenRouter. The structured app
  preview and explicit Apply/Reject workflow are unchanged, and credentials remain exclusively in
  FastAPI.

#### Verification
- `npm run typecheck`, 107 test files / 882 tests, and `npm run build` passed.
- Backend: 185 passed, 2 skipped; Ruff, formatting, and mypy passed. Live OpenRouter verification
  remains pending a configured key and pinned model.

### 2026-11-15 — AgentRouter app assistant

#### Added
- API-backed assistant repository and strict `AppBlueprintV1` proposal boundary for complete screens,
  components, event-condition-action workflows, and collection schemas.
- A structured app preview with screen/component/workflow/data counts and explicit **Apply app** and
  **Reject** controls before any saved project changes.

#### Changed
- The editor no longer uses the static keyword demo at runtime. Assistant conversation state now
  survives sheet close/reopen for the editor session, waits for autosave, and adopts the accepted
  backend project revision plus refreshed app data.
- Local-only mode fails clearly instead of pretending to run AI; AgentRouter credentials remain
  exclusively in FastAPI and are never exposed through Vite configuration.

#### Tests
- Added API proposal/acceptance mapping, autosave gating and accepted-document orchestration, and
  accessible preview/apply/reject sheet coverage.

#### Verification
- `npm run typecheck`, 107 test files / 882 tests, and `npm run build` passed.
- Backend: 182 passed, 2 skipped; Ruff, formatting, and mypy passed. Live AgentRouter verification
  remains pending a configured key and model.

### 2026-11-14 — Dark publishing progress

#### Fixed
- The deployment progress stepper now uses theme-aware translucent brand surfaces, borders, text,
  and connectors instead of a light-only background that appeared white in dark mode.

#### Tests
- Added deployment-page coverage preventing the light-only progress background from returning.

#### Verification
- `npm run typecheck`, 105 test files / 882 tests, and `npm run build` passed.

### 2026-11-14 — Faster navigation and editor data loading

#### Changed
- Session restoration and protected-page data loading now start in parallel instead of serializing
  every screen behind `/auth/session`; backend authorization remains authoritative.
- Project dashboard, editor, and deployment routes are code-split with `React.lazy`; the small login
  route stays eager so credential forms render immediately.
- Project lists and loaded documents use a 30-second navigation cache. Hovering or focusing a project
  card preloads its document, and the editor load deduplicates against that in-flight request.
- Concurrent StrictMode loads for session restoration, project lists/documents, app-data snapshots,
  collection/record lists, deployment providers, and deployment history share one in-flight request.
- The Data workspace loads databases, collections, and records through one app-data snapshot request
  instead of a databases → collections → per-collection records waterfall.

#### Tests
- Added API repository coverage for app-data snapshot validation, navigation caching, and concurrent
  auth, project, app-data, and deployment request deduplication.

#### Verification
- `npm run typecheck`, 105 test files / 882 tests, and `npm run build` passed; production output now
  contains separate Projects, Deployment, and Editor route chunks.


### 2026-11-14 — Real Vercel and Netlify publishing

#### Added
- An API-backed deployment repository now loads backend-enabled providers, submits generated-app
  manifest v2 to owner-scoped project deployment endpoints, polls building releases, and maps remote
  history into domain entities.
- The deployment page now selects Vercel, Netlify, or the backend development provider and shows the
  provider for every publish attempt while preserving Preview/Production selection, live links,
  redeploy, and copy-URL flows.

#### Changed
- Build/Optimize/Provision/Live progress is driven by the deployment repository. API mode uses real
  backend/provider state; local-only development retains the existing side-effect-free simulation.
- Failed API publishes refresh remote history and continue to explain that the previous successful
  deployment remains live.
- The deployment history now follows provider status while a release is still building, so a page
  reload no longer leaves a release looking pending.
- The backend handoff panel reports the configured hosting providers instead of a static
  "Backend required" label, and the environment copy describes reviewable and live releases.
- A publish that outlasts the client polling window explains that the release may still finish
  rather than reporting a hard timeout.
- The API client now allows 30 seconds per request, because a backend with a remote database can
  legitimately take several seconds to answer.
- A request that exceeds the client timeout reports that the backend was too slow instead of
  claiming it could not be reached, so the two failures stay distinguishable.

#### Tests
- Added API deployment repository coverage for provider discovery, publish payloads, polling, DTO
  mapping, and stage progress; deployment-page coverage for the provider readiness badge; and hook
  coverage for refreshing history while a release is building.

#### Verification
- `npm run typecheck` — passed.
- `npm test -- --run` — 105 test files and 874 tests passed.
- `npm run build` — passed with the existing non-blocking large-chunk advisory.
- Backend: 151 passed, 2 skipped; Ruff, formatting, and mypy passed. Live hosting-provider calls
  remain unverified because platform credentials are not configured in this workspace.

### 2026-11-14 — Blank website starter

#### Added
- Website project creation now offers **Blank canvas** as the first/default starter. It creates one
  empty Home page with no sections or widgets, ready for manual section and component insertion.

#### Tests
- Added catalog, repository, hook, and creation-dialog coverage for the empty website starter.

#### Verification
- `npm run typecheck` — passed.
- `npm test -- --run` — 104 test files and 868 tests passed.
- `npm run build` — passed with the existing non-blocking large-chunk advisory.

### 2026-11-14 — Dark-theme contrast fixes

#### Fixed
- Light website sections now include explicit dark surface, text, and border variants, preventing
  dark-theme text tokens from rendering nearly white over white or pale section backgrounds across
  canvas, Preview, thumbnails, and generated applications.
- Newly added blank website sections also receive a contrasting dark surface before widgets are
  placed inside them.
- Existing saved website sections without dark colors are upgraded at the DTO boundary when the
  project is reopened, so the fix is not limited to newly created templates.
- Selected Preview/Production environment cards now use theme-safe translucent brand surfaces
  instead of a fixed pale background paired with dark-theme white text.

#### Tests
- Added rendered dark website-section contrast coverage and selected deployment-environment token
  assertions.

#### Verification
- `npm run typecheck` — passed.
- `npm test -- --run` — 104 test files and 867 tests passed.
- `npm run build` — passed with the existing non-blocking large-chunk advisory.

### 2026-11-14 — Blank section workflow and Inspector sizing

#### Changed
- **Add section** now immediately creates and selects a full-width, 360px blank canvas with no
  child widgets, matching the Canva-style workflow. The previous preset-selection modal and the
  Sections group in Assets were removed; normal widgets are added manually from Assets.
- Internal section presets remain available only to compose the four website starter templates.

#### Fixed
- Large website layer trees and an expanded Validation panel no longer shrink the selected
  component's Inspector fields to zero height. Properties, Validation, and Layers now use bounded,
  independently scrollable regions.
- Empty sections preserve their authored height during responsive website normalization instead of
  collapsing to the minimum content height.

#### Tests
- Added blank-section factory/height/history coverage, confirmed Assets omits Sections, and added
  Inspector-region sizing and accessible Add-section control regressions.

#### Verification
- `npm run typecheck` — passed.
- `npm test -- --run` — 104 test files and 866 tests passed.
- `npm run build` — passed with the existing non-blocking large-chunk advisory.
- `git diff --check` — passed (line-ending conversion warnings only).

### 2026-11-14 — Website projects and reusable page sections

#### Added
- Project creation now starts with a **Web app** or **Website** choice, filters the starter gallery
  to that type, persists the choice locally and through the API, and labels dashboard cards.
- Four website starters (Landing page, Portfolio, Agency, and Coming soon) are composed from an
  accessible section library containing Hero, Features, Logo strip, Stats, Testimonials, Pricing,
  CTA, and Footer presets.
- Website pages provide a Canva-style **Add section** control, section thumbnails, automatic
  responsive height/position normalization, Layers ordering, one-step undo, and explicit Move
  up/Move down controls.
- Long website pages grow and scroll in the editor and Preview with width-based fitting, while
  existing web app projects retain fixed-viewport behavior.

#### Changed
- `ProjectDTO` and template/API DTOs carry backward-compatible `projectType` metadata without a
  Project schema bump; legacy payloads default to `app`.
- The generated-app manifest now carries the type for the backend React generator.

#### Fixed
- Backend-canonicalized responsive overrides containing `null` geometry or visibility fields are
  compacted at the DTO boundary. Existing affected projects now inherit omitted breakpoint values
  correctly instead of reporting two validation errors per responsive override.

#### Tests
- Added domain section-layout/preset tests, project-type mapper/repository coverage, project-creation
  dialog tests, section-library controls, reducer history/reordering tests, and long-page canvas
  coverage.

#### Verification
- `npm run typecheck` — passed.
- `npm test -- --run` — 104 test files and 866 tests passed.
- `npm run build` — passed with the existing non-blocking large-chunk advisory.
- `git diff --check` — passed (line-ending conversion warnings only).

### 2026-11-12 — Website projects implementation plan

#### Added
- `docs/website-projects-plan.md` documents the planned website-project work: a persisted
  `app` / `website` project type chosen at creation, a Canva-style `+ Add section` button
  with an eight-preset section library, a long scrolling page canvas for website screens, and the
  generated-app changes required to publish a website project.
- The plan records that a website project is a deliberate scope extension beyond the PD6
  baseline, which covers web applications only.

#### Notes
- This entry records a plan only. No website-project behaviour is implemented in this repository
  yet, and the Project schema version stays at 13 because `projectType` is project metadata
  rather than document content.

### 2026-11-12 — Focused validation and Text field presentation controls

#### Added
- Text fields now persist a **Show field label** option. Hiding a label is non-destructive and keeps
  its accessible name, while older projects continue to show labels by default.
- Text field borders now support color, solid/dashed/none style, non-negative pixel width, and
  corner radius on the actual input or textarea across canvas, Preview, thumbnails, Project JSON,
  and generated-layout output.

#### Changed
- Blank cosmetic labels and empty Text content no longer add validation warnings for Buttons, Text,
  Text fields, selection controls, sliders, or data-field display names. Interactive controls use
  accessible fallback names when needed; image alt text and Gesture Detector semantic labels remain
  validated.
- Empty ListView item templates now produce the blocking error **No items are designed for this
  ListView.**
- Removed the **Wrap with Gesture Detector** shortcut from the Inspector while preserving the
  Gesture Detector palette component and existing saved wrappers.

#### Tests
- Added validation, Inspector, renderer, mapper, generated-layout, accessibility-fallback, and
  Data-workspace integration coverage for the new behavior.

#### Verification
- `npm run typecheck` — passed.
- Focused feature tests — 6 test files and 135 tests passed.
- `npm test -- --run` — 101 test files and 851 tests passed.
- `npm run build` — passed with the existing non-blocking large-chunk advisory.
- `git diff --check` — passed.

### 2026-11-12 — Screen-tab options spacing

#### Changed
- Screen tabs now reserve dedicated space between the screen name and its three-dot options control,
  preventing short labels such as **Home** from visually colliding with the menu trigger.

#### Tests
- Added focused Screen Tabs coverage for the label padding and fixed options-control width.

#### Verification
- `npm run typecheck` — passed.
- Focused Screen Tabs test — 1 test file and 7 tests passed.
- `npm test -- --run` — 101 test files and 842 tests passed.
- `npm run build` — passed with the existing non-blocking large-chunk advisory.

### 2026-11-12 — Text font-family overrides

#### Added
- Text widgets now accept an optional font-family override from the Inspector and render it
  consistently on the editor canvas, in Preview, and in project thumbnails.
- Project DTOs and generated-layout component properties preserve non-empty `fontFamily` values;
  older projects continue using the app font stack, and invalid blank values are discarded at the
  mapper boundary.

#### Tests
- Added domain validation, Inspector interaction, renderer styling, and mapper round-trip coverage
  for font-family overrides and their fallback behavior.

#### Verification
- `npm run typecheck` — passed.
- Focused typography tests — 4 test files and 115 tests passed.
- `npm test -- --run` — 101 test files and 842 tests passed.
- `npm run build` — passed with the existing non-blocking large-chunk advisory.

### 2026-11-12 — Explicit editor exit label

#### Changed
- Replaced the editor's icon-only back control with a visible **Exit work** button that keeps the
  existing navigation to the projects page.

#### Tests
- Updated editor top-bar coverage to locate and activate the exit action by its visible label.

#### Verification
- `npm run typecheck` — passed.
- Focused editor top-bar test — 1 test file and 8 tests passed.
- `npm test -- --run` — 101 test files and 840 tests passed.
- `npm run build` — passed with the existing non-blocking large-chunk advisory.

### 2026-11-12 — Asset palette icons

#### Changed
- Every component in the editor Assets palette now has a consistent Lucide SVG icon beside its
  visible label, improving visual scanning without using emoji or changing click-and-drag behavior.
- Asset icons are decorative for assistive technology because each palette control retains its
  explicit accessible name and visible text label.

#### Tests
- Added palette coverage verifying that every available asset renders a decorative SVG icon.

#### Verification
- `npm run typecheck` — passed.
- Focused component-palette test — 1 test file and 6 tests passed.
- `npm test -- --run` — 101 test files and 840 tests passed.
- `npm run build` — passed with the existing non-blocking large-chunk advisory.

### 2026-11-11 — Generated non-AI runtime handoff

#### Changed
- Deployment handoff copy now explains that downloaded React projects include executable client
  workflows and the secure Novy runtime client, and that separately hosted apps must configure the
  runtime backend base URL for CRUD and email actions.
- Runtime-readiness coverage verifies the updated generated-app boundary while manifest v2 remains
  record- and secret-free.

#### Verification
- `npm run typecheck` — passed.
- `npm test -- --run` — 101 test files and 839 tests passed.
- `npm run build` — passed with the existing non-blocking large-chunk advisory.

### 2026-11-11 — Remote project and app-data integration

#### Added
- `ApiProjectRepository`, which lists, creates, loads, renames, duplicates, deletes, and autosaves
  projects through `/api/v1/projects`. Saves send the quoted backend revision in `If-Match`, adopt
  returned revisions, refresh after a `stale_revision` conflict, and surface typed `ProjectError`
  codes for validation, not-found, conflict, session, rate-limit, and network failures.
- `ApiAppDataRepository`, which manages databases, collections, fields, and records through the
  project-scoped backend routes and reads a complete `AppDataStore` for import/export.
- `ApiProjectImportRepository` plus a dashboard **Projects saved in this browser** panel that lists
  browser-only projects, imports the project document and app data into the authenticated account,
  keeps the local copy, and records imported IDs in `novy.imported-projects.v1` so they are not
  offered twice.
- Template DTO/mapper support so starter screens and data blueprints travel with project creation,
  and tests for API project/app-data repositories, import uploads, template mapping, and the import
  panel.

#### Changed
- Repository composition switches projects, app data, and local-project import to the API when
  `VITE_API_BASE_URL` is configured; explicit `projectClient: null` keeps the browser-local stack.
- Template instantiation skips browser-side database provisioning when the repository reports
  `provisionsTemplateData`, because the backend creates the template data atomically with the
  project.
- Demo-project seeding is skipped for remote repositories so an authenticated account starts empty
  and browser demo data is never uploaded automatically.
- `AppDataRepository` now exposes `exportProjectData`, and local app-data storage implements it for
  explicit import.

#### Verification
- `npm run typecheck` — passed.
- `npm test -- --run` — 101 test files and 839 tests passed.
- `npm run build` — passed (Vite reported only its existing non-blocking large-chunk advisory).

### 2026-11-10 — Local dummy-backend authentication setup

#### Changed
- Local `.env.local` now points this workspace at `http://localhost:8000/api/v1`, allowing the normal
  Login and Register forms to use the backend's development-only dummy auth mode without Supabase.
- Repository-composition tests now explicitly disable both API auth and API export when asserting
  the frontend-only fallback, so developer environment files cannot change test intent.

#### Verification
- `npm run typecheck` and `npm run build` — passed.
- `npm test -- --run` — 96 test files and 815 tests passed.

### 2026-11-10 — Downloadable React/Vite source export

#### Added
- `ReactExportRepository` with unavailable-local and API-backed implementations. The API adapter
  posts manifest v2 to `/exports/react`, downloads an array-buffer ZIP, validates its filename, and
  maps the backend error envelope to typed export failures.
- A deployment-screen **Download React app** action with generating state and actionable validation,
  generation, timeout, rate-limit, expired-session, unavailable-backend, and network feedback.
- Data and presentation tests for export repository composition, archive responses, backend error
  mapping, progress/error rendering, and the frontend-only unavailable-backend fallback.

#### Changed
- The provider-agnostic JSON handoff remains available as a separate diagnostics action rather than
  being replaced by source export.
- Repository composition enables both API authentication and React export when
  `VITE_API_BASE_URL` is configured; projects, app data, and deployment history remain local.

#### Verification
- `npm run typecheck` — passed.
- Focused React-export repository, download hook, and deployment tests — 5 files and 15 tests passed.
- `npm test -- --run` — 96 test files and 815 tests passed.
- `npm run build` — passed (Vite reported only its existing non-blocking large-chunk advisory).

### 2026-11-10 — Backend authentication integration

#### Added
- `ApiAuthRepository`, which connects registration, login, session restoration, and logout to the
  Novy backend and maps the stable error envelope to typed `AuthError` codes.
- Runtime validation for API user payloads so malformed responses cannot reach the domain layer.
- CSRF helpers and a request interceptor that mirrors the readable `novy_csrf` cookie into
  `X-CSRF-Token` for `POST`, `PUT`, `PATCH`, and `DELETE` requests.
- Repository composition that swaps only authentication to the API when `VITE_API_BASE_URL` is set;
  project, template, deployment, and app-data repositories remain local for now.
- `.env.example` documenting the backend API base URL and the `localhost` cookie requirement.

#### Changed
- The Axios client now sends credentials with every request.
- Auth failures use one generic `invalid-credentials` code instead of revealing whether an email
  exists or a password was wrong, matching the backend response.
- Registration handles pending Supabase email confirmation as an informational notice rather than a
  failed sign-in.
- The demo-user shortcut is shown only in development and only for repositories that support it.
- Sign-out keeps the current screen when the server session cannot be cleared, instead of raising an
  unhandled rejection.
- `.gitignore` now excludes real `.env` files while keeping `.env.example`.

#### Tests
- Added coverage for CSRF cookie parsing/header attachment, Axios credential defaults, API auth
  success and error mapping, pending email confirmation, malformed payload rejection, user-payload
  parsing, demo visibility rules, and repository composition.
- Updated local auth and route tests for the generic credentials error and demo visibility.

#### Verification
- `npm run typecheck` — passed.
- `npm test -- --run` — 94 test files and 807 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).

### 2026-11-10 — Frontend/backend repository cross-reference

#### Changed
- `AGENTS.md` now records the absolute Novy frontend and backend repository locations so agents and
  contributors can coordinate DTO, API, generation, and runtime contract work in the correct
  project without mixing frontend and backend responsibilities.
- `PROGRESS.md` now inventories the reciprocal repository documentation and the backend plan
  location.

#### Verification
- Documentation paths were checked against the current workspace directories.
- No application source changed, so frontend typecheck, tests, and build were not rerun.

### 2026-11-10 — Safer automatic record-route linking

#### Changed
- Selecting a detail screen for a record-aware Navigate action now updates that screen's route and
  route-parameter mapping in the same undo entry as the Logic edit, so target selection is one
  reversible step instead of two.
- Route linking is idempotent: re-selecting the same target, re-running an identifier sync, or
  replaying a no-op update no longer creates empty history entries.
- The home route stays static. Record-aware navigation to `/` is reported by validation instead of
  silently rewriting the path to `/:recordId`.
- Unrelated dynamic segments are preserved. A route such as `/blog/:slug` receives an appended
  `/:noteId` rather than having `:slug` renamed.
- A screen opened by multiple collections keeps both ordered parameters, for example
  `/detail/:taskId/:noteId`, and validation warns that the order should be verified.
- A record-aware Navigate action that targets its own list screen no longer converts that list route
  into a record route.
- The Inspector's linked-route hint now reads persisted `routeParameters`, so it survives action
  deletion, undo, and redo.
- The Logic inspector now explains when a record-aware Navigate action targets a screen without a
  record ID route, instead of displaying a generic record-ID label.

#### Tests
- Added reducer coverage for atomic target linking, no-op history, home-route protection, unrelated
  dynamic segments, and multi-collection parameters.
- Added validation coverage for unmapped dynamic segments, home-route record navigation, and
  multi-collection detail screens.
- `npm run typecheck` — passed.
- `npm test -- --run` — 88 test files and 757 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- Representative Project JSON — parsed successfully.
- `git diff --check` — passed (line-ending conversion notices only).

### 2026-11-10 — Explicit record identifiers and route bindings

#### Added
- Collection schemas now carry a backend-generated, immutable record identifier contract such as
  `noteId`. New and migrated local collections receive a derived default, while the Data schema,
  collection-backed ListView Inspector, and focused Item Frame Inspector expose the name directly.
- Record-aware detail screens now persist explicit route-parameter bindings connecting a dynamic
  segment such as `:noteId` to the Notes collection record identity. Renaming the Item ID updates
  every detail route targeted by **Open current item** workflows.
- Logic configuration now shows the resolved detail route and an automatic `Current item ID`
  parameter badge instead of leaving the route/record relationship implicit.
- Generated-app manifest v2 and generated-layout v2 export collection identifier metadata,
  repeated-item `recordIdentity`, and runtime route parameter mappings for backend routing and
  schema generation.

#### Changed
- Project serialization now writes schema v13. Older record-aware navigation is migrated by
  deriving route-parameter metadata from the existing dynamic path and navigation collection.
- Dynamic route parameter casing is preserved when editing screen paths, while static path segments
  continue to normalize to lowercase URL slugs.
- The Notes CRUD template explicitly provisions `noteId`, maps `/notes/:noteId`, and remaps its
  collection reference during template instantiation.

#### Tests
- Added repository validation, Inspector, Data workspace, route reducer, project migration/mapper,
  generated layout/manifest, Logic workspace, template instantiation, and project validation
  coverage for record identifier naming and explicit routing contracts.
- `npm run typecheck` — passed.
- `npm test -- --run` — 88 test files and 748 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- Representative Project JSON — parsed successfully.
- `git diff --check` — passed (line-ending conversion notices only).

### 2026-11-10 — Parent-safe nested resizing

#### Fixed
- Resizing a child inside a Row or Column now accounts for the parent's padding, configured gaps,
  and the main-axis space occupied by visible siblings. Pointer resizing can no longer grow a child
  beyond the parent's trailing content edge.
- Inspector width/height edits use the same constraint, including cross-axis limits. Free-form
  containers, ListView item frames, screen bounds, responsive overrides, and minimum widget sizes
  retain their existing clamping behavior.

#### Tests
- Added Row pointer-resize and Column Inspector-resize regressions that verify rendered child edges
  remain within padded parent bounds and Inspector edits keep one undo entry.
- `npm run typecheck` — passed.
- `npm test -- --run` — 88 test files and 739 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- `git diff --check` — passed (line-ending conversion notices only).

### 2026-11-10 — Centered button icons

#### Added
- Button icon placement now supports **Center** alongside **Left** and **Right** in the Inspector.
- Center placement renders an icon-only visual in canvas, preview, thumbnails, and serialized
  project output while retaining the button label as screen-reader-only text and the native
  button's accessible name.
- The domain and DTO contracts now persist `iconPosition: "center"`; older label-only and
  left/right buttons remain unchanged.

#### Tests
- Added centered-icon renderer accessibility, Inspector dispatch, and mapper round-trip coverage.
- `npm run typecheck` — passed.
- `npm test -- --run` — 88 test files and 737 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- `git diff --check` — passed (line-ending conversion notices only).

### 2026-11-10 — Zero default layout padding

#### Changed
- Newly created Row, Column, and ListView widgets now start with `0` padding on every side.
  Containers already use a zero-inset free-form content area. Existing saved widgets and templates
  with explicit padding retain their configured values.

#### Tests
- Added component-factory coverage for zero-padding Row, Column, and ListView defaults.
- `npm run typecheck` — passed.
- `npm test -- --run` — 88 test files and 736 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- `git diff --check` — passed (line-ending conversion notices only).

### 2026-11-10 — Parent-relative widget drop fitting

#### Fixed
- Palette widgets now fit inside the screen, free-form frames, Gesture Detectors, and padded
  ListView item frames when their default dimensions exceed the destination parent.
- Dropping or reparenting a widget into a Row or Column now proportionally shrinks visible siblings
  along the main axis, accounts for padding and gaps, and caps the cross axis so controls no longer
  render beyond the parent boundary. Hidden siblings retain their saved geometry.
- Fit-once geometry is calculated independently for mobile, tablet, and desktop. The resulting pixel
  dimensions remain manually editable and do not introduce continuous flex or percentage sizing.
- Canvas reparenting and Layers-panel **move inside** use the same fitting path while preserving the
  existing single-history-entry behavior.

#### Tests
- Added pure auto-fit math coverage and reducer regressions for Row, Column, Container, Gesture
  Detector, ListView item-frame, responsive, hidden-child, reparenting, layer-move, and undo cases.
- `npm run typecheck` — passed.
- `npm test -- --run` — 88 test files and 735 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- `git diff --check` — passed (line-ending conversion notices only).

### 2026-11-10 — Collapsible Validation dock

#### Changed
- The Design inspector's Validation section now has a chevron disclosure indicator, and its header
  toggles the issue panel while staying visible when collapsed.
- Dragging the Validation splitter down past its minimum height now collapses the dock, so the
  section can be minimized directly from the divider. Keyboard resizing, the persisted height, and
  the clamped split-pane behavior are unchanged.

#### Tests
- Added Validation dock coverage for header toggling, issue selection, drag-to-minimize, and the
  no-collapse threshold, plus resizable-pane coverage for requesting collapse past the minimum.
- `npm run typecheck` — passed.
- `npm test -- --run` — 87 test files and 718 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- `git diff --check` — passed.

### 2026-11-10 — Schema-driven ListView inspector

#### Changed
- ListView item bindings are now described by the selected component property and data type.
  Dropdowns use property-specific fallbacks (`Fixed text`, `Fixed image`, `Fixed label`,
  `Fixed state`, `Fixed value`, `Always visible`) and show typed field options such as
  `Name (Text)` and `Pinned (Yes/No)` instead of one generic static option.
- Binding targets with no compatible field now render as read-only rows with a short explanation
  of the field type to add, rather than an empty or unusable dropdown.
- The binding section names the active source (`Item data · Students` or `Item data · Static
  items`) so the inspector no longer assumes a Notes-style text record.
- Replaced the mandatory-looking **Primary display field** with an optional **Record label**.
  Choosing **None** persists `displayFieldIds: []`; new collection bindings still default to the
  first text, number, or date field. The label is optional metadata for menus, sample selection,
  fallback items, and screen-reader text, never a requirement for rendering item content.
- ListView item templates can now be image-only or mixed media. Fallback items and preview
  accessibility labels use `Item N` when no record label is configured.

#### Tests
- Added schema-driven binding coverage, boolean visibility binding coverage, optional record-label
  coverage, no-collections guidance, and an image-only ListView item-template test.
- `npm run typecheck` — passed.
- `npm test -- --run` — 86 test files and 713 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- `git diff --check` — passed.

### 2026-11-10 — Design canvas follows the editor theme

#### Fixed
- Design canvases and template thumbnails now follow Novy's light/dark shell theme instead of being
  forced into a light app theme. Dark mode renders a dark canvas frame, dark screen backgrounds,
  light text tokens, and each component's dark appearance variant.
- The effective app theme now drives both the CSS token scope and per-component appearance
  resolution, and each app-theme scope sets its inherited text color. Dark canvases and explicit
  light previews can no longer combine shell-inherited text with mismatched hard-coded card fills.
- Preview keeps its explicit light/dark app-theme selector and stays independent from the editor
  shell.

#### Tests
- Added shell-theme observation coverage and ScreenFrame coverage for dark canvases, dark appearance
  variants, and explicit preview theme isolation.
- `npm run typecheck` — passed.
- `npm test -- --run` — 86 test files and 708 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- `git diff --check` — passed.

### 2026-11-09 — Notes CRUD starter template

#### Added
- Added a focused mobile Notes CRUD starter with list cards, Add Note, Note Detail, and Edit Note
  screens. Cards open their current record, detail provides Edit/Delete actions, and each card has
  an accessible three-dot Delete menu without an app sidebar.
- Added template data blueprints and transactional project instantiation. Selecting the Notes
  template now creates a Notes Database, a typed Notes collection, three seed records, and remaps
  collection aliases throughout components and node workflows.
- Added complete insert, record-aware navigation, prefill, update, detail-delete, and per-card
  delete workflows, including destructive-action confirmation and keyboard-operable card/menu
  interactions.

#### Fixed
- Fixed local database deletion so records belonging to cascaded collections are removed before
  collection metadata is discarded. Failed template provisioning now removes both partial app data
  and the partial project.
- Isolated editor canvases and template thumbnails from Novy's shell theme. Built-app frames now
  default to their light theme, so dark-editor text tokens no longer render white text on the Notes
  cards' light backgrounds.
- Refined the Notes starter palette with a soft gray/lavender app background and lightly tinted
  cards, matching the supplied mobile reference instead of presenting a pure-white surface.

#### Tests
- Added template-instantiation, rollback, data-cascade, creation-hook, catalog, and end-to-end
  Preview CRUD coverage for the Notes starter.
- `npm run typecheck` — passed.
- `npm test -- --run` — 85 test files and 704 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- `git diff --check` — passed.

### 2026-11-09 — Component-aware current-item Logic flows and Gesture Detector

#### Added
- Added a persisted, child-bearing **Gesture Detector** component with a semantic action label,
  palette/Layers/Inspector support, one-click wrapping for existing components, schema-v12 DTO
  round trips, validation, keyboard activation, and nested-control click isolation.
- Added component-derived trigger entries to the Logic node library. Entries use current Design
  labels and bind their click/change event directly to the chosen component.
- Added context-derived **Update current item**, **Delete current item**, and **Open current item**
  nodes for workflows inside collection-backed ListViews. These nodes automatically map the
  enclosing row's stable ID and collection rather than exposing raw IDs.
- Added current-record navigation context. Preview carries the resolved collection/record IDs into
  `route.collectionId` and `route.recordId`, resolves destination-screen record bindings against
  the selected record, supports paths such as `/notes/:noteId`, and generated-app manifests infer
  the database runtime requirement for record-aware detail navigation.

#### Changed
- Clicking an action in the Logic library now connects it to the available workflow tail; dragging
  a node still preserves explicit canvas placement.
- Current-item configuration shows an automatic context badge, hides record/collection IDs for the
  common path, offers Yes/No controls for boolean fields, and uses simpler advanced source labels.
- Preview only wires click execution for components with explicit click behaviors. Nested actions
  stop propagation so a check/delete button does not also activate its surrounding Gesture
  Detector.
- Project serialization now writes schema version 12 while continuing to load older documents.

#### Tests
- Added reducer, mapper, renderer, runtime, Logic workspace, validation, and generated-manifest
  coverage for wrapping, round trips, keyboard/nested click behavior, dynamic nodes, current-row
  updates, record-aware navigation, and runtime capability inference.
- `npm run typecheck` — passed.
- `npm test -- --run` — 82 test files and 698 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- `git diff --check` — passed.

### 2026-11-09 — Layers panel ordering for Row and Column

#### Fixed
- The Layers panel now shows `Row` and `Column` children in their layout order
  (left-to-right / top-to-bottom) instead of the reversed z-order used for
  free-form stacks. The canvas and Layers panel now agree for auto-layout
  widgets.
- `moveLayerInTree` inserts a layer before its target under `Row`/`Column`
  parents instead of after it, so drag-to-reorder and keyboard nesting land in
  the expected position.
- Layers ordering controls (arrows, `Alt+↑/↓`, layer-order menu, and shortcuts)
  now move `Row`/`Column` children along the layout axis, with wording that
  reflects start/end rather than z-order.

#### Added
- Palette drops into a `Row` or `Column` now insert at the pointer position
  instead of always appending to the end.
- Added `isMainAxisLayoutNode` and `findMainAxisInsertIndex` domain helpers
  plus tests for layout-order insertion and pointer-based slot selection.

#### Tests
- Added domain, Layers panel, and reducer coverage for Row/Column layer order,
  reorder actions, menu wording, and palette drop insertion.
- `npm run typecheck` — passed.
- `npm test -- --run` — 690 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- `git diff --check` — passed.

### 2026-11-09 — Design Inspector collapse control

#### Fixed
- Moved the Design Inspector collapse control out of an absolute overlay and into a dedicated panel
  header. Item-frame controls and other Inspector content now begin below the header, so the
  chevron no longer overlaps the panel content in the ListView item-design editor.

#### Tests
- Extended the design Inspector integration test to assert the collapse control remains in the
  header flow rather than absolutely covering content, while preserving its collapse/restore
  behavior.
- `npm run typecheck` — passed.
- `npm test -- --run` — 82 test files and 682 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- `git diff --check` — passed.

### 2026-11-09 — ListView item-design empty state simplified

#### Changed
- Removed the **Start with Row**, **Start with Column**, and **Start with Text** quick-start buttons
  from the ListView item-design empty state. The "This item template is empty." status message
  remains, and item widgets are added through the component palette as usual.

#### Tests
- Updated the ListView editor flow test to insert Text through the palette's **Add Text** action and
  continue verifying item-content binding and static-item outlines.
- `npm run typecheck` — passed.
- `npm test -- --run` — 82 test files and 682 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- `git diff --check` — passed.

### 2026-11-09 — Inspector color pickers

#### Added
- Added native color pickers beside the **Background**, **Text color**, **Border color**, **Dark
  background**, **Dark text color**, and **Dark border color** Inspector fields. The existing
  labeled hex inputs remain, so users can type any CSS color or choose one visually.
- Color swatches normalize shorthand hex (`#abc` → `#aabbcc`) and use a safe fallback for values the
  native picker cannot represent. Stored appearance data and schema compatibility are unchanged.

#### Tests
- Added ColorField coverage for labeled text input, native picker output, shorthand
  normalization, unsupported-value fallback, and free-form hex editing; added Inspector coverage
  for base and dark-theme picker updates.
- `npm run typecheck` — passed.
- `npm test -- --run` — 82 test files and 682 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- `git diff --check` — passed.

### 2026-11-09 — Text font size and weight overrides

#### Added
- Added optional **Font size (px)** and **Font weight** controls to the Text Inspector. Four weight
  choices mirror the level presets: Normal, Medium, Semibold, and Bold.
- Text nodes persist optional `props.fontSize` and `props.fontWeight`. Blank controls clear the
  overrides, so display, title, and body levels keep their existing preset typography.
- Custom sizes render with a proportional line height to avoid clipping larger text in the canvas,
  preview, thumbnails, and generated-layout payloads.

#### Tests
- Added renderer coverage for overridden and preset typography, Inspector coverage for setting and
  clearing both properties, mapper round-trip and invalid-value rejection, and domain weight-guard
  coverage.
- `npm run typecheck` — passed.
- `npm test -- --run` — 81 test files and 677 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- `git diff --check` — passed.

### 2026-11-09 — Button icons

#### Added
- Added a curated Lucide icon picker and **Left**/**Right** placement control to the Button
  Inspector. The decorative icon inherits the button text color and renders beside the label in the
  canvas, preview, thumbnails, and generated-layout payloads.
- Persisted optional `props.icon` and `props.iconPosition` on Button nodes. Buttons saved before
  icons keep their label-only rendering, and unknown persisted icon names are dropped at the DTO
  boundary.

#### Tests
- Added renderer coverage for left/right decorative icons and static thumbnail rendering, Inspector
  coverage for icon selection, placement, and removal, mapper round-trip and unknown-icon
  validation, and domain guard coverage.
- `npm run typecheck` — passed.
- `npm test -- --run` — 81 test files and 672 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- `git diff --check` — passed.

### 2026-11-09 — Layout border style controls

#### Added
- Added **Solid**, **Dashed**, and **None** border styles for Container, Column, and Row layout nodes
  in the Inspector. The component frame and layout shell render the selected style consistently in
  the canvas, preview, thumbnails, and generated-layout appearance data.
- Border style is persisted as optional `appearance.borderStyle`, so older projects without the
  field keep their existing solid/dashed layout defaults.

#### Changed
- Choosing **None** suppresses the layout border even when a border color remains saved.
- Border styles without a saved border color use the theme hairline color, keeping dashed and solid
  outlines visible in light and dark themes without changing stored colors.

#### Tests
- Added renderer coverage for solid/dashed/none layout frames and shells, legacy border-color-only
  appearance, and Container shells; added Inspector coverage for layout-only controls and defaults;
  added mapper round-trip coverage for border-style appearance values.
- `npm run typecheck` — passed.
- `npm test -- --run` — 81 test files and 665 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- `git diff --check` — passed.

### 2026-11-09 — Flutter-style per-side padding controls

#### Added
- Added **All**, **Symmetric**, and **Only** padding modes to the Inspector for Column and Row
  layout padding and ListView repeated-item padding. All four sides stay stored, so switching modes
  never discards values.
- Column and Row child layout, ListView item extent, focused item-design bounds, repeated-item
  outlines, and the item-frame padding guide now resolve top/right/bottom/left independently.

#### Changed
- Project DTO schema is now version 11. Column, Row, and ListView padding serialize as
  `{ mode, top, right, bottom, left }`; schema-v10 and older numeric padding migrates to
  `mode: "all"` without changing saved geometry. Container remains free-form without a padding
  control.
- Generated-layout repeated-item padding now uses the same per-side transport shape.

#### Tests
- Added focused coverage for padding helpers, all three Inspector modes and non-destructive mode
  switching, asymmetric Column/Row layout, asymmetric ListView extents and outlines, item-frame
  guides, reducer bounds, validation, mapper round-trips, and schema-v10 migration.
- `npm run typecheck` — passed.
- `npm test -- --run` — 81 test files and 658 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- `git diff --check` — passed.

### 2026-11-08 — Autosave no longer remains stuck on Saving

#### Fixed
- Fixed the autosave effect cancelling its own completion callback when `onBegin` changed the UI
  to **Saving…**. Completed repository writes now transition to the saved state.
- Save failures now exit the busy state, retain the dirty document, show an accessible
  **Save failed — retrying…** message, and re-arm the debounced retry.
- Autosave completion now identifies the exact document snapshot that was written. Edits made
  while an older snapshot is saving remain unsaved and trigger a follow-up save instead of being
  incorrectly cleared.
- Stale save results from a previous project or an unmounted editor no longer update the active
  editor state.

#### Tests
- Added regression coverage for the Saving-state rerender, failure recovery and retry, preserving
  newer edits during an in-flight save, and accessible failure status.
- `npm run typecheck` — passed.
- `npm test -- --run` — 80 test files and 641 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- `git diff --check` — passed.

### 2026-11-08 — Reusable notes-app builder flows

#### Added
- Added a reusable **Actions menu** presentation for Dropdown widgets. Its options emit change
  events and retain the current ListView item's context, so card-specific workflows can act on
  the selected record. Menu interactions support keyboard navigation, Escape, and focus return.
- Exposed **Get Record**, variable names and defaults, component-prefill targets, variable and
  previous-output conditions, labeled record fields, and the current item ID in the Logic editor.
- Added optional Delete Record confirmation and keyboard access to repeated ListView items.
- Added a Switch option for preview-app light/dark theme control and optional dark-theme component
  colors, scoped independently from Novy's own editor theme.
- Added a multi-screen notes workflow test covering two bound card fields, local persistence,
  create, edit/prefill, update, confirmed delete, theme switching, failures, and duplicate saves.

#### Changed
- Project DTO schema is now version 10. Existing dropdowns, switches, appearances, and delete
  actions without the new optional fields retain their previous behavior.
- Preview asks before discarding sandbox record changes when persistence is enabled, prevents
  repeated submissions of the same workflow, and avoids stale collection snapshots after writes.
- Fixed newline editing of Dropdown options and made preview workflow errors accessible alerts.
- The existing advanced notes starter was not replaced or automatically provisioned; this change
  improves reusable builder capabilities rather than adding a ready-made basic notes template.

#### Verification
- `npm run typecheck` — passed.
- `npm test -- --run` — 80 test files and 636 tests passed at completion of that change.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- Representative Project JSON — parsed and behavior graph references checked.
- `git diff --check` — passed.

### 2026-11-08 — Preview database persistence and truthful workflow branching

#### Added
- Added an explicit **Save data changes** option to Editor Preview. It is off by default; when
  enabled, Insert, Update, and Delete Record actions write through the project data repository to
  this browser's local project database.
- Added preview record validation and user-facing database error feedback.

#### Fixed
- Database workflow nodes now await the actual preview operation before following their `success`
  or `error` output, so failed inserts no longer navigate through the success path.
- Get Record now returns the requested record instead of falling through to delete behavior.
- Successful preview writes immediately refresh collection-bound ListViews and, in persistence
  mode, the Data workspace's record state.

#### Tests
- Added domain runtime coverage for resolved and rejected database branches.
- Added Preview coverage for opt-in persistence, required-field failure, blocked success
  navigation, and asynchronous behavior effects.
- `npm run typecheck` — passed.
- `npm test -- --run` — 78 test files and 620 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).

### 2026-11-08 — Layer send-to-front and send-to-back controls

#### Added
- Added **Bring to front** and **Send to back** layer ordering for Design widgets.
- Added a compact per-layer **Layer order** menu with accessible menu semantics and
  disabled states at the front/back boundaries.
- Added `Alt+Shift+↑/↓` shortcuts for sending the focused layer to the front or back.
- Extended `node/order` to support `'front'` and `'back'` in addition to forward/backward.

#### Changed
- Layer z-order still uses sibling array order; front moves a node to the end of its
  sibling list and back moves it to the beginning.
- The item-frame guard and boundary no-op behavior remain in place for all four order
  directions.

#### Tests
- `npm run typecheck` — passed.
- `npm test -- --run` — 78 test files and 616 tests passed.
- `npm run build` — passed.

### 2026-11-08 — Resizable split panes and canvas selection improvements

#### Added
- Added `useResizablePane` and `ResizeHandle` primitives for accessible, pointer- and
  keyboard-driven split panes.
- Added horizontal drag resizing to the Design, Logic, and Data side panels.
- Added a vertical drag resize handle for the Validation pane in the Design inspector.
- Added Backspace/Delete removal for selected Logic graph nodes, and made the trigger node
  protected from accidental deletion.
- Added click-away deselection when clicking the dotted Design grid or empty Logic graph
  space.

#### Changed
- Replaced fixed sidebar widths with persisted, clamped resizable widths.
- Removed the lightning glyph from the Behavior action in the Design selection toolbar.
- Scoped Design keyboard shortcuts to Design mode so they no longer fire in Logic/Data mode.
- Made Logic node and edge selection mutually exclusive for clearer keyboard deletion.

#### Tests
- `npm run typecheck` — passed.
- `npm test -- --run` — 78 test files and 608 tests passed.
- `npm run build` — passed.

### 2026-11-08 — Generated layout item-frame container projection

#### Added
- Added `GeneratedLayoutDTO`, `GeneratedLayoutNodeDTO`, and `GeneratedItemFrameDTO` to the
  generated-app handoff contract.
- Added `mapProjectToGeneratedLayout`, which projects screens and components into a normalized
  layout where each ListView's repeated item frame is an explicit `container` with `role:
  repeated-item`, stable ID, constraints, padding, spacing, radius, dividers, and template children.
- Added `layout` to `GeneratedAppManifestDTO`, populated by `buildGeneratedAppManifest`.

#### Changed
- In the generated layout projection, ListView template children move into `itemFrame.children`;
  the persisted Project DTO still keeps its existing `children` array and schema version 9.

#### Tests
- `npm run typecheck` — passed.
- `npm test -- --run` — 77 test files and 599 tests passed.
- `npm run build` — passed.

### 2026-11-08 — Figma-like selectable item frame

#### Changed
- The repeated item frame is now a first-class selectable container in item design. It appears
  as an **Item frame** root layer, can be selected from the canvas background or Layers, and
  shows its own frame-only Inspector with `Item padding`, `Item spacing`, `Item border radius`,
  and `Show dividers`.
- The item-frame guide is now selection-driven: it appears only when the item frame is selected.
  Selecting a widget shows only that widget's outline, removing the competing full-width dashed
  box.
- Opening item design now selects the item frame first. Escape steps from a widget to the frame,
  then exits item design.

#### Fixed
- Prevented delete, duplicate, move, resize, nudge, reorder, rename, and lock actions on the
  item frame, whose size is derived from the ListView and its content.

#### Tests
- `npm run typecheck` — passed.
- `npm test -- --run` — 75 test files and 596 tests passed.
- `npm run build` — passed.

### 2026-11-08 — ListView item frame controls in item design

#### Changed
- Moved `Item padding`, `Item spacing`, `Item border radius`, and `Show dividers` out of the
  ListView inspector and into an always-visible **Item frame** section shown while item design
  is open (including when no child is selected). The ListView inspector now keeps data source,
  primary field, empty text, and scroll direction.
- Added a live item-frame overlay to the item-design canvas: the repeated item's padded,
  rounded container plus a ghost of the next item (including its divider) so padding, spacing,
  radius, and dividers can be tuned in place.

#### Technical
- Extracted `listViewItemExtent` / `listViewItemExtentAtBreakpoint` into the domain layer and
  reused them in `ComponentRenderer` and the editor to keep the overlay and the rendered extent
  consistent.

#### Tests
- `npm run typecheck` — passed.
- `npm test -- --run` — 75 test files and 590 tests passed.
- `npm run build` — passed.

### 2026-11-08 — ListView item drag past centre

#### Fixed
- Removed frame-centre smart alignment in item design. The ListView frame is no longer an
  alignment target there, so its centre line no longer snaps or draws as a boundary while
  dragging direct item-template widgets; sibling alignment is preserved.
- Changed the default size of a new direct item-template Row/Column root from 75% to half of the
  padded cross-axis (floored to the 8 px grid), giving enough horizontal travel to move past the
  frame centre. Existing saved rows keep their geometry.
- Cleared stale alignment guides and distance indicators on pointer-down, window blur/cancel,
  and selection, bounds, or device changes.
- Replaced the canvas frame's 1 px CSS border with an inset ring so the rendered surface and
  interaction layer share the same origin.

#### Changed
- Item-design Row/Column defaults now use half-width (144 px on the default 320 px ListView) instead
  of 75% (224 px). Resize existing wide rows manually to gain travel.

#### Tests
- Updated item-frame default-size expectations to the new half-width geometry.
- `npm run typecheck` — passed.
- `npm test -- --run` — 73 test files and 585 tests passed.

### 2026-11-08 — Free-form ListView item frames

#### Fixed
- Replaced the conflicting ListView item flow/render paths with one free-form item coordinate
  system. Direct template widgets now retain and render their persisted `x`, `y`, `w`, and `h`
  values in item design, repeated canvas output, preview, and generated Project JSON.
- Sized the focused item-design canvas to the real repeated-item cross axis instead of the full
  device viewport, eliminating the misleading empty area that appeared movable but was outside the
  ListView item.
- New Row and Column roots use an intrinsic 75% cross-axis size, leaving immediate placement room
  after a palette drop instead of filling the complete item width or height.
- Removed the now-misleading ListView **Cross axis alignment** and **Template widget gap** controls;
  Row and Column widgets retain their own internal auto-layout controls.

#### Migration
- Raised Project DTO output to schema version 9. Schema-v8 and older ListView flow positions are
  materialized into equivalent mobile, tablet, and desktop free-form child geometry during load so
  existing templates do not overlap or change appearance.

#### Tests
- Added schema-v8 vertical, horizontal, and responsive migration coverage; focused item-frame bound
  coverage; free-form repeated rendering assertions; and first-session Row/Column movement
  regressions.
- `npm run typecheck` — passed.
- `npm test -- --run` — 73 test files and 585 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- Representative Project JSON in `PROGRESS.md` — parsed successfully.
- `git diff --check` — passed (line-ending conversion notices only).

### 2026-11-08 — First-drop ListView item geometry

#### Fixed
- Normalized direct ListView item-template children against one padded geometry boundary during
  palette insertion, dragging, Inspector position/size edits, resizing, keyboard nudging,
  duplication, and reparent finalization.
- Row and Column drops now fit the ListView item cross-axis immediately while retaining their
  pointer position on the repeated item's content-driven axis. Widgets can therefore be moved in
  the first item-design session without exiting and reopening it.
- Preserved the resolved item-child geometry across closing and reopening item design, including
  vertical and horizontal ListViews and responsive breakpoint overrides.
- Removed the inner dotted rectangle from designed-empty ListView placeholders. The outer dashed
  border is now the sole item outline, and item padding is represented by a subtle shaded inset
  gutter instead of a second boundary.

#### Tests
- Added reducer regressions for first-session Row and Column drops, immediate movement,
  close/reopen stability, smaller-widget pointer placement, horizontal ListViews, and padded
  geometry mutations.
- Updated renderer coverage to require one item boundary with a shaded padding gutter.
- `npm run typecheck` — passed.
- `npm test -- --run` — 73 test files and 583 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- Representative Project JSON in `PROGRESS.md` — parsed successfully.
- `git diff --check` — passed (line-ending conversion notices only).

### 2026-11-08 — Designed-empty ListView item outlines

#### Added
- Added editor-only repeated-item outlines for ListViews that have an accepted item design but no
  resolved static or collection records. The outlines fill the available scroll direction and show
  the configured item bounds, padding inset, spacing, and corner radius without creating fake data.
- Added explicit **Item spacing** and **Item border radius** Inspector controls; the existing padding
  control is now labeled **Item padding**, while the internal root-widget gap is labeled
  **Template widget gap**.

#### Changed
- Real repeated items now use the same persisted spacing and border-radius values shown by the
  canvas outlines, including radius-based clipping. Preview/runtime empty-state text remains
  unchanged and replaces outlines outside the design canvas.
- Raised Project DTO output to schema version 8. Older ListViews migrate with zero item spacing and
  radius to preserve their prior appearance; newly created ListViews default to 12px item padding,
  8px item spacing, and an 8px item radius.

#### Tests
- Added factory, mapper/migration, validation, renderer, Inspector, and routed editor integration
  coverage for item-layout persistence, outline geometry, horizontal layout, runtime replacement,
  and legacy defaults.
- `npm run typecheck` — passed.
- `npm test -- --run` — 73 test files and 578 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- Representative Project JSON in `PROGRESS.md` — parsed successfully.
- `git diff --check` — passed (line-ending conversion notices only).

### 2026-11-08 — Empty-by-default ListView item design

#### Changed
- New palette ListViews now start with no static records and no item-template widgets instead of
  creating a sample record and bound Text widget.
- Added an accessible canvas **Add item** prompt that explains the shared item design and opens the
  existing focused item-design editor without creating runtime or persisted data.
- Isolated ListView templates from normal screen editing: template widgets are no longer exposed as
  screen-canvas interaction targets or normal Layers descendants, and ListViews no longer accept
  palette drops, direct reparenting, or Layers nesting outside their own item-design scope.
- Preserved existing saved, migrated, and catalog ListView records and item templates unchanged.

#### Tests
- Added factory, component-tree, reducer, renderer, canvas, Layers, prompt accessibility, and route
  integration coverage for empty defaults, item-design navigation, and template-boundary rules.
- `npm run typecheck` — passed.
- `npm test -- --run` — 73 test files and 574 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- Representative Project JSON in `PROGRESS.md` — parsed successfully.
- `git diff --check` — passed (line-ending conversion notices only).

### 2026-11-08 — Add Local List Item runtime action

#### Added
- Added a synchronous **Add Local List Item** Logic node for static ListViews, with explicit
  append/prepend placement, schema-driven typed values, and dynamic input mappings.
- Added created-item node output (`item.id`, `item.listViewId`, and `item.values`) for downstream
  workflow steps.
- Added isolated preview/runtime additions keyed by ListView ID. Additions layer around persisted
  static seeds or existing component-value JSON replacements without mutating either source.
- Kept generated-app capability inference client-only for this action; it does not require a
  database runtime binding.

#### Validation and UX
- Restricted targets to existing static ListViews and added field existence and static-value type
  validation; collection-bound ListViews continue to use Insert/Update/Delete Record.
- Labeled the action as session-only and non-persistent in the Logic inspector, while preserving
  normal synchronous `next` control flow.

#### Tests
- Added registry, configuration, mapper, runtime-output, renderer-merge, preview-integration, and
  project-validation coverage for local ListView additions.
- `npm run typecheck` — passed.
- `npm test -- --run` — 72 test files and 564 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- Representative Project JSON in `PROGRESS.md` — parsed successfully.
- `git diff --check` — passed (line-ending conversion notices only).

### 2026-11-08 — ListView mutation and backend synchronization decision

#### Documented
- Defined the planned **Add List Item** logic node as a local/generated-runtime action for
  static ListViews only; it will not mutate Project JSON or persist records.
- Defined the production collection flow as `On Click -> Insert Record -> success/error`, with the
  backend returning the canonical record and the frontend updating or invalidating its collection
  cache so bound ListViews rerender without a page refresh.
- Reserved explicit Refresh Collection for external or stale-data refetches and documented
  optimistic insertion, ID reconciliation, and rollback as later enhancements.
- Warned against chaining Add List Item before Insert Record for the same collection-bound ListView
  because it can duplicate rows and diverge from backend state.

#### Verification
- Representative Project JSON in `PROGRESS.md` — parsed successfully.
- `git diff --check` — passed (line-ending conversion notices only).

### 2026-11-07 — ListView item-template design and typed bindings

#### Added
- Added a dedicated ListView item-design scope with a scoped canvas and Layers tree, sample-item
  selection, template-root palette insertion, accessible enter/exit controls, and shared
  undo/redo/autosave behavior.
- Added typed component property bindings for Text, Image, Button, Checkbox, Switch, Progress, and
  visibility, with static values retained as runtime fallbacks.
- Added structured static ListView schemas and records plus current-row logic expressions and event
  context for record-specific nested actions.

#### Changed
- Raised Project DTO output to schema version 7. Schema-v6 Text bindings and static string items
  migrate deterministically while preserving component IDs, responsive metadata, and logic.
- Generalized ListView rendering and validation around a provider-neutral `ListItemContext` and
  nearest-ancestor ListView semantics.

#### Tests
- Added binding resolver and item-design reducer coverage, extended migration/runtime/renderer
  tests, and updated schema-v7 mapper and generated-manifest expectations.
- `npm run typecheck` — passed.
- `npm test -- --run` — 72 test files and 555 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- Representative Project JSON in `PROGRESS.md` — parsed successfully.
- `git diff --check` — passed (line-ending conversion notices only).

### 2026-11-07 — Flutter-style web widget composition

#### Added
- Added nestable Column and Row widgets with Flutter-style main-axis and cross-axis alignment,
  gap, padding, responsive geometry, Layers integration, and Inspector controls.
- Added a scrollable ListView widget with vertical or horizontal direction, static and collection
  sources, search/sort metadata, dividers, empty states, and repeatable nested item templates.
- Added ListView item-field bindings for Text widgets so collection records can populate composed
  rows such as note cards.

#### Changed
- Removed List, Repeater, and Form from the live component union, palette, renderer, Inspector,
  templates, generated-app capability detection, and AI proposal output.
- Raised Project DTO output to schema version 6 and generalized component-tree recursion,
  hit-testing, layer nesting, validation, runtime lookup, and duplication across Container, Column,
  Row, and ListView children.
- Reworked starter student, notes, and citation collections to use ListView.
- Kept generated output scoped to responsive web applications; Flutter is the composition model,
  not a native runtime target.

#### Migration
- Added safe schema-v5 List and Repeater conversion to ListView item templates.
- Added Form conversion to Column + Text/Input/Button composition. Collection-bound Forms also
  receive deterministic click/Insert Record workflows and component input mappings so saved data
  entry behavior is retained.

#### Tests
- Added focused factory, mapper, migration, tree, renderer, palette, Inspector, preview, template,
  validation, assistant, and RAG-target coverage for the new widget model.
- `npm run typecheck` — passed.
- `npm test -- --run` — 71 test files and 543 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- Representative Project JSON in `PROGRESS.md` — parsed successfully.
- `git diff --check` — passed.

### 2026-11-07 — Collapsible Logic node groups

#### Changed
- Turned every Logic node category into an independently collapsible, keyboard-accessible group
  with an expanded state, directional indicator, and visible node count.
- Consolidated document, model, vector, chat, agent, prompt, and memory tools under **RAG Nodes**.
- Consolidated biometric liveness, enrollment, and verification tools under **Computer Vision**.

#### Tests
- Added group-name, default-expanded, independent collapse, and restore coverage for the node
  library.
- `npm run typecheck` — passed.
- `npm test -- --run` — 71 test files and 542 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- `git diff --check` — passed (only LF/CRLF warnings).

### 2026-11-07 — Logic Nodes sidebar scrolling and header layout

#### Fixed
- Moved the Logic Nodes minimize control into the header layout so it no longer covers the node
  search field.
- Restored the sidebar's bounded full-height flex layout so the node catalog scrolls independently
  when its categories exceed the available workspace height.

#### Tests
- Added focused coverage for the non-overlapping header structure and scroll-container constraints.
- `npm run typecheck` — passed.
- `npm test -- --run` — 71 test files and 542 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- `git diff --check` — passed (only LF/CRLF warnings).

### 2026-11-07 — Canvas trackpad zoom interception

#### Fixed
- Replaced React wheel handlers with native non-passive listeners on the Design and Logic canvases
  so Ctrl/Cmd + mouse-wheel or trackpad gestures zoom the canvas instead of the browser page.
- Preserved ordinary unmodified wheel scrolling by cancelling only modifier-assisted zoom gestures.

#### Tests
- Added regression assertions that canvas zoom wheel events are cancelled while normal wheel events
  remain available to the scroll container.
- `npm run typecheck` — passed.
- `npm test -- --run` — 71 test files and 541 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- `git diff --check` — passed (only LF/CRLF warnings).

### 2026-11-07 — Minimizable editor side panels

#### Added
- Added independent collapse and restore controls for the Design Assets/Layers and Inspector rails,
  Logic Nodes and Details rails, and Data Collections rail.
- Added narrow labeled restore rails so minimized panels remain discoverable and keyboard
  accessible while giving more space to the active canvas or data view.

#### Tests
- Added focused coverage for minimizing and restoring all five side panels.
- `npm run typecheck` — passed.
- `npm test -- --run` — 71 test files and 541 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- `git diff --check` — passed (only LF/CRLF warnings).

### 2026-11-07 — Canvas selection toolbar clearance

#### Fixed
- Prevented the floating Duplicate/Delete/Behavior toolbar from wrapping onto two lines and
  intruding into the selected canvas component.
- Replaced the toolbar's approximate offset with an explicit height and gap so it remains fully
  outside the selection border and flips below components near the frame's top edge.

#### Tests
- Added Selection overlay coverage for single-line toolbar sizing and component clearance.
- `npm run typecheck` — passed.
- `npm test -- --run` — 71 test files and 537 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- `git diff --check` — passed (only LF/CRLF warnings).

### 2026-11-07 — Logic resource-port label spacing

#### Fixed
- Prevented resource-port labels from overlapping by widening multi-port Logic nodes as needed and
  centering every label in its own fixed-width slot.
- Kept long port names bounded with truncation and a full-name tooltip instead of allowing them to
  paint over adjacent labels.

#### Tests
- Added Logic canvas coverage for the four resource labels on an AI Agent node.
- `npm run typecheck` — passed.
- `npm test -- --run` — 71 test files and 536 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- `git diff --check` — passed (only LF/CRLF warnings).

### 2026-11-07 — Schema v5 n8n-style AI resources and write-through indexing

#### Added
- Added typed resource ports and dashed resource edges alongside existing solid control-flow edges.
- Added one configurable Vector Store node for upsert, delete, and retrieval-tool operations.
- Added an AI Agent node that composes generic Chat Model, Memory, Vector Store Tool, Prompt
  Template, Embedding Model, and optional Reranker resources.
- Added compact resource-node rendering, typed connection validation, resource-port labels, and
  dashed connection paths in the Logic canvas.
- Added note create/update write-through vector indexing and note-delete vector cleanup workflows.
- Added isolated preview execution for Agent tool retrieval, memory, citations, and previous-record
  document mapping.

#### Changed
- Raised Project DTO output to `schemaVersion: 5` and added resource-edge transport metadata.
- Reworked the Note template ingestion and chatbot graphs around primary Vector Store and AI Agent
  nodes rather than long linear model/retrieval chains.
- Kept providers generic through backend-owned connection profile IDs.

#### Tests
- Added resource connection, dashed-canvas edge, AI Agent composition, and database-to-vector
  write-through runtime coverage.
- `npm run typecheck` — passed.
- `npm test -- --run` — 71 test files and 535 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- `git diff --check` — passed (only LF/CRLF warnings).

### 2026-11-07 — Schema v4 granular RAG pipelines

#### Added
- Added Document Loader, Text Splitter, Embedding Model, Vector Store Upsert/Delete, Chat Input,
  Query Embedding, Retriever, Prompt Template, LLM Model, Chat Output, Reranker, and Conversation
  Memory nodes.
- Added provider-neutral configuration inspectors and structured input mappings for documents,
  chunks, embeddings, matches, prompts, answers, citations, and messages.
- Added deterministic preview execution for chunking, opaque embedding references, isolated vector
  indexing/search, reranking, prompt compilation, answer generation, citation rendering, and memory.
- Added separate editable ingestion and chat workflows to the Note taking app's Ask Notes screen.

#### Changed
- Raised Project DTO output to `schemaVersion: 4`.
- Removed monolithic RAG nodes from the node palette and current domain action union.
- Added backward-compatible schema-v3 migration that expands RAG Index/Query/Remove nodes into
  deterministic granular chains while preserving incoming/outgoing connections and positions.
- Kept provider credentials behind connection-profile IDs and the backend handoff boundary.

#### Tests
- Added schema migration, structured runtime-chain, granular Inspector, node-library, and Note
  template coverage.
- `npm run typecheck` — passed.
- `npm test -- --run` — 71 test files and 530 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- `git diff --check` — passed (only LF/CRLF warnings).

### 2026-11-07 — Template modal and editor dark-mode UI fixes

#### Fixed
- Constrained all modal panels to the viewport and enabled contained scrolling so the template
  gallery heading, choices, project-name field, and actions remain reachable.
- Expanded the template gallery to a responsive one/two/three-column layout with shorter previews,
  preventing the fifth template from pushing form actions below the viewport.
- Replaced the selected Layers row's light-only background with a translucent, theme-safe brand
  state.
- Added theme-safe backgrounds and hover/focus states to Validation issue cards.

#### Added
- Added visible tooltips on hover and keyboard focus for layer visibility, locking, forward, and
  backward icon controls while preserving descriptive accessible names.
- Added focused Modal, template gallery, Layers, and Validation tests.

#### Tests
- `npm run typecheck` — passed.
- `npm test -- --run` — 70 test files and 526 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- `git diff --check` — passed (only LF/CRLF warnings).

### 2026-11-07 — Milestone 6 frontend backend-handoff contract

#### Added
- Added a versioned generated-app handoff manifest containing Project JSON, database/collection
  schemas, routes, responsive thresholds, and inferred runtime capabilities.
- Added capability detection for authentication, database, email, RAG, Computer Vision, camera
  permission, and deployment requirements.
- Added a Deployment-page readiness panel and JSON handoff export.
- Added security exclusions proving that records, secrets, camera captures, and biometric templates
  are not exported.

#### Changed
- Documented the backend boundary explicitly: this frontend repository exports validated contracts
  but does not implement persistence services, provider secrets, React generation, or real cloud
  deployment.
- Updated PD6 traceability and backend handoff documentation.

#### Tests
- Added manifest generation and readiness-panel coverage.
- Focused generation/deployment tests — passed.
- `npm run typecheck` — passed.
- `npm test -- --run` — 69 test files and 523 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- `git diff --check` — passed (only LF/CRLF warnings).

### 2026-11-07 — Note-app milestone 5: Computer Vision and biometric unlock

#### Added
- Added a Camera component with explicit permission, live preview, capture, retake, error, and
  cleanup states.
- Added provider-agnostic CV Liveness, CV Enroll, and CV Verify payloads, DTOs, Logic nodes,
  Inspector controls, dynamic input mappings, validation, runtime outputs, and preview simulation.
- Added biometric consent, liveness, enrollment, verification, rejection, error, and standard
  sign-in fallback workflows to the Note taking app template.
- Added focused factory, mapper, renderer, node-library, runtime, template, and navigation-remapping
  tests.

#### Changed
- Remapped template Navigate targets when projects receive fresh screen IDs.
- Kept captured images in isolated preview component state; Project JSON stores only camera
  configuration and never raw camera images or biometric templates.

#### Tests
- `npm run typecheck` — passed.
- `npm test -- --run` — 67 test files and 520 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- `git diff --check` — passed (only LF/CRLF warnings).

### 2026-11-07 — Note-app milestone 4: RAG logic nodes

#### Added
- Added RAG index, query, and remove action payloads and DTOs.
- Added an AI category with RAG node definitions in the Logic library.
- Added RAG inspector configuration and Logic canvas details.
- Added simulated RAG preview effects and resolver support.

#### Changed
- Updated validation, runtime, and preview handling for RAG actions.

#### Tests
- `npm run typecheck` — passed.
- `npm test -- --run` — 67 test files and 513 tests passed.
- `npm run build` — passed.

### 2026-11-07 — Note-app milestone 3: wired note template

#### Added
- Added note create/open/save/delete/cancel/prefill logic graphs to the Note taking app template.
- Added repeater search and sort support.
- Added RepeaterProps and DTO support for search/sort fields.

#### Changed
- Updated the template catalog note app to include wired CRUD flows.

#### Tests
- `npm run typecheck` — passed.
- `npm test -- --run` — 67 test files and 513 tests passed.
- `npm run build` — passed.

### 2026-11-07 — Note-app milestone 2: note-taking starter template

#### Added
- Added a Note taking app starter template with Notes and Note Editor screens.
- Added get-record logic payload for loading a selected note into the editor.
- Added preview data resolution for get-record effects.

#### Changed
- Updated starter template tests for the new catalog entry.

#### Tests
- `npm run typecheck` — passed.
- `npm test -- --run` — 67 test files and 513 tests passed.
- `npm run build` — passed.

### 2026-11-07 — Note-app milestone 1: data repeater and logic primitives

#### Added
- Added a Repeater component for rendering database records with multiple display fields.
- Added set-variable and set-component-value logic actions with runtime effects and preview handling.
- Generalized logic conditions to use typed value expressions.
- Added runtime node outputs and variable context for downstream logic.
- Added controlled input values for component-value bindings.

#### Changed
- Updated DTOs, mappers, validation, renderer, preview, and logic configuration for the new primitives.

#### Tests
- `npm run typecheck` — passed.
- `npm test -- --run` — 67 test files and 513 tests passed.
- `npm run build` — passed.

### 2026-11-07 — Per-project databases for app data

#### Added

- Added a `ProjectDatabase` domain entity and repository lifecycle methods for creating, listing,
  renaming, and deleting project databases.
- Added a database gate to the Data workspace: collections can be created only after a project
  database exists.
- Added `databaseId` to data collections and DTOs, with backward-compatible migration that creates
  one database for legacy projects that already contain collections.
- Added database identity display in the Data workspace header.

#### Changed

- Updated local app-data storage to persist databases alongside collections and records.
- Updated project data loading to expose the active database and database list.
- Updated existing app-data tests for the explicit database creation flow.

#### Tests

- `npm run typecheck` — passed.
- `npm test -- --run` — 67 test files and 513 tests passed.
- `npm run build` — passed.
- `git diff --check` — passed.

### 2026-11-07 — Mobile-first responsive cascade and breakpoint visibility

#### Added

- Added cascading responsive geometry resolution: Tablet inherits Mobile and Desktop inherits the
  resolved Tablet layout, including field-level overrides.
- Added breakpoint-specific visibility through `isHidden` overrides and effective-visibility
  resolution for rendering, canvas interaction, Layers, and validation.
- Added field-level compaction for responsive overrides so unchanged properties keep inheriting
  lower-breakpoint edits.
- Added explicit breakpoint propagation through `ScreenFrame`, canvas, preview, and thumbnails.
- Preserved selection when switching responsive devices.

#### Changed

- Updated responsive reset to remove only the active breakpoint override while preserving other
  breakpoint overrides.
- Updated Layers visibility controls to reflect and toggle effective visibility for the active
  breakpoint.
- Updated validation to check responsive override geometry and visibility values.
- Updated responsive documentation to describe the mobile-first cascade, visibility, media-query
  thresholds, and canvas preview sizes.

#### Tests

- Updated responsive reducer coverage for compacted overrides and preserved selection.
- `npm run typecheck` — passed.
- `npm test -- --run` — 67 test files and 513 tests passed.
- `npm run build` — passed.
- `git diff --check` — passed (only LF/CRLF warnings).

### 2026-11-07 — Schema v3 logic, routes, and responsive web layout

#### Added

- Added serializable action input mappings for literal, component, session-user, and prior-node
  output values, plus an accessible mapping editor in the Logic inspector.
- Added Send Email configuration and Refresh Collection/refetch actions. Preview simulates email
  success and collection refresh without invoking production side effects.
- Added async `success`/`error` graph ports for database and email actions; preview follows the
  simulated success branch.
- Added explicit, editable, validated screen route paths for generated web applications.
- Added typed component appearance controls for background, text, border, corner radius, and
  opacity.
- Added mobile/base geometry with optional tablet and desktop overrides across editor movement,
  resizing, addition, nested bounds, rendering, preview, thumbnails, and Inspector controls.
- Added frontend preview execution for `change` and screen `load` behaviors alongside click chains.

#### Changed

- Raised Project DTO output to `schemaVersion: 3` and documented the updated generated-project JSON
  contract in `PROGRESS.md` and `CONVO_DEEPSEEK.md`.
- Added backward-compatible migration for missing routes, repeated legacy route candidates,
  positionless graph nodes, untyped edges, and legacy async `next` edges.
- Expanded project validation for routes, mapping references, async ports, Send Email, and Refresh
  Collection.
- Kept real email delivery, protected data access, generated-app runtime execution, code generation,
  and deployment behind the future backend boundary.

#### Tests

- Added focused domain, mapper, reducer, renderer, Logic workspace, Inspector, route editor, input
  mapping editor, and preview coverage for the schema-v3 capabilities.
- `npm run typecheck` — passed.
- `npm test -- --run` — 67 test files and 513 tests passed.
- `npm run build` — passed (Vite reported only its non-blocking large-chunk advisory).
- `git diff --check` — passed.

### 2026-11-07 — Progress and backend handoff governance

#### Changed

- Added an `AGENTS.md` rule requiring every repository task to update `PROGRESS.md` alongside the
  append-only `CHANGELOGS.md` history.
- Required progress updates to distinguish implemented, mocked, preview-only, deferred, and
  production-integrated behavior and to keep the generated Project JSON contract current.
- Added a mandatory backend-handoff reading checklist covering the product baseline, progress
  inventory, DTOs, mappers, domain contracts, validation, migrations, and tests.
- Defined conflict priority and backward-compatibility expectations for future backend contract
  changes.
- Updated `PROGRESS.md` to record the new maintenance and backend-handoff workflow.

#### Tests

- `npm run typecheck` — passed.
- `npm test -- --run` — 65 test files and 488 tests passed.
- `npm run build` — passed.
- `git diff --check -- AGENTS.md PROGRESS.md CHANGELOGS.md` — passed.

### 2026-11-07 — Project JSON structure documentation

#### Added

- Expanded `PROGRESS.md` with a representative versioned `ProjectDTO` containing multiple screens,
  nested component geometry, an event binding, and its referenced logic graph.
- Documented how screen layout, container-relative hierarchy, layer ordering, behavior references,
  graph nodes, edges, and action payloads are represented for the future backend handoff.
- Clarified that the current model stores typed action payloads and does not yet implement generic
  event input mapping.

#### Tests

- `npm test -- --run` — 65 test files and 488 tests passed.
- `git diff --check -- PROGRESS.md CHANGELOGS.md` — passed.

### 2026-11-07 — Frontend implementation inventory

#### Added

- Added `PROGRESS.md` with a code-audited inventory of implemented frontend features across
  authentication, projects, the multi-screen editor, component layout, event bindings, logic,
  project data, preview, validation, AI assistance, deployment simulation, and accessibility.
- Documented local/mock boundaries separately from completed behavior to avoid presenting backend
  persistence, React generation, production workflow execution, or Vercel deployment as complete.

#### Tests

- `npm run typecheck` — passed.
- `npm test -- --run` — 65 test files and 488 tests passed.
- `npm run build` — passed.
- `git diff --check -- PROGRESS.md CHANGELOGS.md` — passed.

### 2026-11-07 — Preview behavior execution boundary

#### Changed

- Clarified in `CONVO_DEEPSEEK.md` that the frontend may simulate behavior chains during preview
  using isolated local data while no backend is available.
- Distinguished safe preview simulation from production logic and prohibited real external side
  effects, protected-service calls, secret exposure, and provider-specific deployment operations.

#### Tests

- `npm test -- --run` — 488 tests passed.

### 2026-11-06 — Web-only product scope terminology

#### Changed

- Updated `CONVO_DEEPSEEK.md` to describe Novy exclusively as a web app builder.
- Removed out-of-scope native application language and replaced the vendor-specific persistence
  wording with a backend-agnostic integration boundary.
- Preserved mobile, tablet, and desktop viewport terminology used for responsive web previews.

#### Tests

- `npm test -- --run` — 488 tests passed.

### 2026-11-06 — Smart alignment guides and pixel-distance indicators

#### Added

- Added pure, design-space alignment calculations in
  `src/presentation/editor/state/alignment.ts`.
- Added zoom-aware edge and center matching on both axes with a default 6 px alignment
  threshold.
- Added optional snapping while continuing to report visual guides when snapping is disabled.
- Added alignment against other components and the active device frame.
- Added deduplicated alignment lines that span the moving and matched component rectangles.
- Added nearest-gap calculations for horizontal and vertical component spacing. Measurements are
  shown only when the components overlap on the perpendicular axis, producing direct edge-to-edge
  distances.
- Added `AlignmentGuides`, a non-interactive canvas overlay for edge and center guide lines.
- Added `DistanceIndicators`, a non-interactive canvas overlay with endpoint markers and rounded
  pixel labels such as `168 px`.
- Added semantic `guide` and `guide-ink` color tokens for light and dark themes.

#### Changed

- Updated `EditorCanvas` drag handling to:
  - Build alignment targets from visible, unlocked components while excluding the moving subtree.
  - Work in absolute design-space coordinates for nested components.
  - Apply zoom-aware smart snapping during component movement.
  - Include the device frame as an alignment target but exclude it from component-distance labels.
  - Render only the nearest measurable gap on each axis to avoid visual clutter.
  - Clear guides and measurements after pointer release or cancellation.
  - Preserve the snapped absolute position when reparenting a dragged component.
- Ported only the alignment functionality from `feature/editor-enhancements`; canvas rulers,
  ruler controls, branch documentation, and unrelated editor changes were not merged or copied.

#### Tests

- Added unit coverage for edge, center, threshold, snap-disabled, frame, deduplication, and invalid
  target alignment behavior.
- Added unit coverage for horizontal and vertical distance calculations, nearest-target selection,
  overlap rules, and degenerate targets.
- Added component coverage for guide placement, distance placement, zoom scaling, and pixel-label
  rendering.
- Added editor integration coverage for snapping, active drag feedback, distance labels, and
  cleanup after release.
- Verification completed successfully:
  - `npm run typecheck`
  - `npm test -- --run` — 488 tests passed
  - `npm run build`
  - `git diff --check`

### 2026-11-06 — Repository workflow documentation

#### Added

- Added this root `CHANGELOGS.md` as the required history for repository changes.
- Added an `AGENTS.md` rule requiring every addition, update, fix, removal, configuration change,
  test change, and documentation change to append a matching changelog entry before completion.
- Added `AGENTS.md` rules requiring Repomix for repository analysis and Context7 for current
  external library, framework, SDK, API, CLI, and cloud-service documentation.
