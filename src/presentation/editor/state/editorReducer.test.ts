import { describe, expect, it } from 'vitest';
import { createBehaviorBundle } from '@domain/factories/logic';
import { appendAction } from '@domain/logic/graph';
import type { Behavior, LogicGraph } from '@domain/entities/logic';
import type { ProjectDocument, Screen } from '@domain/entities/screen';
import { editorReducer } from './editorReducer';
import { createEditorState, findNodeInScreen, getActiveScreen, type EditorState } from './editorState';

const SCREEN: Screen = {
  id: 'screen_1',
  name: 'Home',
  nodes: [
    {
      id: 'node_text',
      type: 'text',
      x: 88,
      y: 96,
      w: 200,
      h: 36,
      props: { text: 'Hello, World!', level: 'display' },
    },
    {
      id: 'node_button',
      type: 'button',
      x: 120,
      y: 560,
      w: 160,
      h: 44,
      props: { label: 'Click me', variant: 'solid' },
    },
  ],
  behaviors: [],
  logicGraphs: [],
};

const DOCUMENT: ProjectDocument = { screens: [SCREEN] };

/** Convenience: build state fresh per reducer step (no cross-test leakage). */
function stateAt(pastCount = 0): ReturnType<typeof createEditorState> {
  return { ...createEditorState(DOCUMENT), past: Array.from({ length: pastCount }, () => structuredClone(DOCUMENT)) };
}

describe('load', () => {
  it('selects the first screen and starts empty-handed', () => {
    const state = createEditorState(DOCUMENT);
    expect(state.activeScreenId).toBe('screen_1');
    expect(state.selectedNodeId).toBeNull();
    expect(state.past).toHaveLength(0);
    expect(state.hasUnsavedChanges).toBe(false);
  });
});

describe('screens', () => {
  it('adds a screen and makes it active', () => {
    const next = editorReducer(stateAt(), { type: 'screen/add' });

    expect(next.document.screens).toHaveLength(2);
    expect(next.activeScreenId).not.toBe('screen_1');
    expect(getActiveScreen(next).nodes).toEqual([]);
    expect(next.past).toHaveLength(1);
  });

  it('renames a screen into history', () => {
    const next = editorReducer(stateAt(), { type: 'screen/rename', screenId: 'screen_1', name: 'Overview ' });

    expect(next.document.screens[0].name).toBe('Overview');
    expect(next.past).toHaveLength(1);
  });

  it('ignores blank renames', () => {
    const state = stateAt();
    const next = editorReducer(state, { type: 'screen/rename', screenId: 'screen_1', name: '   ' });

    expect(next).toBe(state);
  });

  it('deletes a non-first screen and keeps the active screen', () => {
    const withSecond = editorReducer(stateAt(), { type: 'screen/add' });
    const secondScreenId = withSecond.activeScreenId;

    const rebuilt = editorReducer({ ...withSecond, activeScreenId: 'screen_1' }, { type: 'screen/select', screenId: 'screen_1' });
    const afterDelete = editorReducer(rebuilt, { type: 'screen/delete', screenId: secondScreenId });

    expect(afterDelete.document.screens).toHaveLength(1);
    expect(afterDelete.document.screens[0].id).toBe('screen_1');
    expect(afterDelete.activeScreenId).toBe('screen_1');
  });

  it('deleting the active screen selects the first remaining one', () => {
    const withSecond = editorReducer(stateAt(), { type: 'screen/add' });
    const secondScreenId = withSecond.activeScreenId;

    const afterDelete = editorReducer(withSecond, { type: 'screen/delete', screenId: secondScreenId });

    expect(afterDelete.activeScreenId).toBe('screen_1');
  });

  it('refuses to delete the last screen', () => {
    const state = stateAt();
    const next = editorReducer(state, { type: 'screen/delete', screenId: 'screen_1' });

    expect(next).toBe(state);
  });
});

describe('node add / drag', () => {
  it('drops a new node centered on the cursor, snapped and clamped, and selects it', () => {
    const next = editorReducer(stateAt(), { type: 'node/add', nodeType: 'button', x: 200, y: 300 });

    const screen = getActiveScreen(next);
    const added = screen.nodes[screen.nodes.length - 1];
    expect(added.type).toBe('button');
    // button default 160x44 -> centered at (200,300), snapped to the grid
    expect(added.x).toBe(120);
    expect(added.y).toBe(280);
    expect(next.selectedNodeId).toBe(added.id);
    expect(next.hasUnsavedChanges).toBe(true);
    expect(next.past).toHaveLength(1);
  });

  it('clamps drops outside the device bounds back inside', () => {
    const next = editorReducer(stateAt(), { type: 'node/add', nodeType: 'container', x: 2000, y: 2000 });
    const screen = getActiveScreen(next);
    const added = screen.nodes[screen.nodes.length - 1];

    expect(added.x + added.w).toBeLessThanOrEqual(1200);
    expect(added.y + added.h).toBeLessThanOrEqual(800);
  });

  it('moves nodes with snap applied in the canvas-provided coordinates', () => {
    const next = editorReducer(stateAt(), { type: 'node/move', nodeId: 'node_text', x: 101.4, y: 200 });

    const moved = findNodeInScreen(getActiveScreen(next), 'node_text');
    expect(moved?.x).toBe(101);
    expect(moved?.y).toBe(200);
    expect(next.hasUnsavedChanges).toBe(true);
    expect(next.past).toHaveLength(0); // moves do not push history
  });

  it('keeps moved nodes inside the device frame', () => {
    const overshoot = editorReducer(stateAt(), { type: 'node/move', nodeId: 'node_text', x: 1500, y: 900 });
    expect(findNodeInScreen(getActiveScreen(overshoot), 'node_text')?.x).toBe(1200 - 200);

    const undershoot = editorReducer(stateAt(), { type: 'node/move', nodeId: 'node_text', x: -50, y: -50 });
    expect(findNodeInScreen(getActiveScreen(undershoot), 'node_text')?.x).toBe(0);
  });
});

describe('node resize / props', () => {
  it('applies resize geometry from the canvas drag math', () => {
    const next = editorReducer(stateAt(), {
      type: 'node/resize',
      nodeId: 'node_button',
      geometry: { x: 96, y: 560, w: 224, h: 52 },
    });

    const resized = findNodeInScreen(getActiveScreen(next), 'node_button');
    expect(resized).toMatchObject({ x: 96, y: 560, w: 224, h: 52 });
  });

  it('merges typed prop patches for the matching node type', () => {
    const next = editorReducer(stateAt(), {
      type: 'node/props-button',
      nodeId: 'node_button',
      props: { label: 'Get started' },
    });

    const node = findNodeInScreen(getActiveScreen(next), 'node_button');
    expect(node?.type === 'button' && node.props.label).toBe('Get started');
    expect(node?.type === 'button' && node.props.variant).toBe('solid');
  });

  it('ignores prop patches aimed at mismatched types', () => {
    const state = stateAt();
    const next = editorReducer(state, {
      type: 'node/props-button',
      nodeId: 'node_text',
      props: { label: 'nope' },
    });

    const node = findNodeInScreen(getActiveScreen(next), 'node_text');
    expect(node?.type !== 'button').toBe(true);
    expect(next.past).toHaveLength(state.past.length);
  });
});

describe('duplicate & delete', () => {
  it('duplicates with fresh ids, offset by 16px, selecting the copy', () => {
    const next = editorReducer(stateAt(), { type: 'node/duplicate', nodeId: 'node_text' });

    const screen = getActiveScreen(next);
    const copy = findNodeInScreen(screen, next.selectedNodeId ?? '');
    const original = findNodeInScreen(screen, 'node_text');
    expect(copy).toBeDefined();
    expect(copy?.id).not.toBe('node_text');
    expect(copy?.x).toBe(original!.x + 16);
    expect(screen.nodes).toHaveLength(3);
    expect(next.selectedNodeId).toBe(copy?.id);
  });

  it('duplicates nested nodes inside their own container', () => {
    let state = stateAt();
    state = editorReducer(state, { type: 'node/add', nodeType: 'container', x: 200, y: 120 });
    const container = getActiveScreen(state).nodes.find((node) => node.type === 'container');

    expect(container?.type === 'container').toBe(true);

    const nestedText: Screen['nodes'][number] = {
      id: 'nested_text',
      type: 'text',
      x: 8,
      y: 8,
      w: 120,
      h: 24,
      props: { text: 'inner', level: 'body' },
    };
    state = {
      ...state,
      document: {
        screens: state.document.screens.map((screen) => ({
          ...screen,
          nodes: screen.nodes.map((node) =>
            node.id === container!.id && node.type === 'container'
              ? { ...node, children: [...node.children, nestedText] }
              : node,
          ),
        })),
      },
    };

    const next = editorReducer(state, { type: 'node/duplicate', nodeId: 'nested_text' });
    const holder = getActiveScreen(next).nodes.find((node) => node.type === 'container');
    expect(holder?.type === 'container' && holder.children).toHaveLength(2);
    expect(next.selectedNodeId).not.toBe('nested_text');
  });

  it('deletes nodes and deselects', () => {
    const selectFirst = editorReducer({ ...stateAt(), selectedNodeId: null }, { type: 'node/select', nodeId: 'node_text' });
    const next = editorReducer(selectFirst, { type: 'node/delete', nodeId: 'node_text' });

    expect(findNodeInScreen(getActiveScreen(next), 'node_text')).toBeUndefined();
    expect(next.selectedNodeId).toBeNull();
    expect(next.past).toHaveLength(1);
  });

  it('supports undo after deletion', () => {
    let state = editorReducer(stateAt(), { type: 'node/delete', nodeId: 'node_text' });
    state = editorReducer(state, { type: 'history/undo' });

    expect(findNodeInScreen(getActiveScreen(state), 'node_text')).toBeDefined();
  });
});

describe('history', () => {
  it('undo restores the previous document and redo walks forward', () => {
    let state = stateAt();
    state = editorReducer(state, { type: 'screen/add' });
    expect(state.document.screens).toHaveLength(2);

    state = editorReducer(state, { type: 'history/undo' });
    expect(state.document.screens).toHaveLength(1);
    expect(state.future).toHaveLength(1);

    state = editorReducer(state, { type: 'history/redo' });
    expect(state.document.screens).toHaveLength(2);
    expect(state.future).toHaveLength(0);
  });

  it('undo of an undoable but empty past is a no-op', () => {
    const state = stateAt();
    const next = editorReducer(state, { type: 'history/undo' });

    expect(next).toBe(state);
    expect(next.future).toHaveLength(0);
  });

  it('clears redo stack on a new mutation', () => {
    let state = editorReducer(stateAt(), { type: 'screen/add' });
    state = editorReducer(state, { type: 'history/undo' });
    expect(state.future).toHaveLength(1);

    state = editorReducer(state, { type: 'node/add', nodeType: 'text', x: 120, y: 120 });
    expect(state.future).toHaveLength(0);
  });

  it('keeps selection across undo when the node still exists', () => {
    let state = editorReducer(stateAt(), { type: 'node/select', nodeId: 'node_text' });
    state = editorReducer(state, { type: 'node/props-button', nodeId: 'node_button', props: { label: 'X' } });
    state = editorReducer(state, { type: 'history/undo' });

    expect(state.selectedNodeId).toBe('node_text');
  });

  it('keeps selection on undo when the node never left the document', () => {
    let state = editorReducer(stateAt(), { type: 'node/select', nodeId: 'node_text' });
    state = editorReducer(state, { type: 'node/delete', nodeId: 'node_text' });
    state = editorReducer(state, { type: 'node/select', nodeId: 'node_button' });
    state = editorReducer(state, { type: 'history/undo' });

    // The restored document still contains node_button, so selection survives.
    expect(findNodeInScreen(getActiveScreen(state), 'node_text')).toBeDefined();
    expect(state.selectedNodeId).toBe('node_button');
  });
});

describe('nudge', () => {
  it('nudges the selected node by deltas and keeps it in bounds', () => {
    const state = stateAt();
    const nudged = editorReducer(state, { type: 'node/nudge', nodeId: 'node_text', dx: 8, dy: -8 });

    const node = findNodeInScreen(getActiveScreen(nudged), 'node_text');
    expect(node?.x).toBe(96);
    expect(node?.y).toBe(88);
    expect(nudged.past).toHaveLength(1); // nudges are undoable discrete steps

    const toTheEdge = editorReducer(state, { type: 'node/nudge', nodeId: 'node_text', dx: -900, dy: 0 });
    expect(findNodeInScreen(getActiveScreen(toTheEdge), 'node_text')?.x).toBe(0);
  });

  it('ignores nudges aimed at missing nodes', () => {
    const state = stateAt();
    const next = editorReducer(state, { type: 'node/nudge', nodeId: 'missing', dx: 8, dy: 0 });

    expect(next).toBe(state);
  });
});

describe('z-order', () => {
  function orderedState(): EditorState {
    return {
      ...stateAt(),
      document: {
        screens: [
          {
            ...SCREEN,
            nodes: [
              SCREEN.nodes[0],
              SCREEN.nodes[1],
              {
                id: 'node_image',
                type: 'image',
                x: 24,
                y: 24,
                w: 100,
                h: 80,
                props: { src: '', alt: 'Photo', fit: 'cover' },
              },
            ],
          },
        ],
      },
    };
  }

  function orderOf(state: EditorState): string[] {
    return getActiveScreen(state).nodes.map((node) => node.id);
  }

  it('brings a middle node forward', () => {
    const state = orderedState();
    const next = editorReducer(state, { type: 'node/order', nodeId: 'node_image', direction: 'backward' });

    expect(orderOf(next)).toEqual(['node_text', 'node_image', 'node_button']);
    expect(next.past).toHaveLength(1);
  });

  it('runs forward/backward at the boundaries without changing order', () => {
    const atTop = orderedState();
    const next = editorReducer(atTop, { type: 'node/order', nodeId: 'node_image', direction: 'forward' });

    expect(next).toBe(atTop); // boundary no-op: neither order nor history moves

    const atBottom = editorReducer(orderedState(), { type: 'node/order', nodeId: 'node_text', direction: 'backward' });
    expect(next).toBe(atTop);
    expect(orderOf(atBottom)).toEqual(orderOf(orderedState()));
  });
});

describe('layer metadata and hierarchy', () => {
  it('renames, hides, and locks layers as undoable document mutations', () => {
    let state = editorReducer(stateAt(), {
      type: 'node/layer-rename',
      nodeId: 'node_text',
      name: 'Hero title',
    });
    expect(findNodeInScreen(getActiveScreen(state), 'node_text')).toMatchObject({ name: 'Hero title' });
    expect(state.past).toHaveLength(1);

    state = editorReducer(state, { type: 'node/layer-visibility', nodeId: 'node_text' });
    state = editorReducer(state, { type: 'node/layer-lock', nodeId: 'node_text' });
    expect(findNodeInScreen(getActiveScreen(state), 'node_text')).toMatchObject({
      isHidden: true,
      isLocked: true,
    });
    expect(state.past).toHaveLength(3);

    const undone = editorReducer(state, { type: 'history/undo' });
    expect(findNodeInScreen(getActiveScreen(undone), 'node_text')?.isLocked).toBeUndefined();
    expect(findNodeInScreen(getActiveScreen(undone), 'node_text')?.isHidden).toBe(true);
  });

  it('reparents a layer into a frame in one history step', () => {
    const frame = {
      id: 'node_frame',
      type: 'container' as const,
      x: 16,
      y: 24,
      w: 320,
      h: 240,
      props: {},
      children: [],
    };
    const document: ProjectDocument = {
      screens: [{ ...SCREEN, nodes: [...SCREEN.nodes, frame] }],
    };
    const state = createEditorState(document);

    const moved = editorReducer(state, {
      type: 'node/layer-move',
      nodeId: 'node_text',
      targetId: 'node_frame',
      position: 'inside',
    });

    const nextFrame = getActiveScreen(moved).nodes.find((node) => node.id === 'node_frame');
    expect(nextFrame?.type === 'container' ? nextFrame.children[0]?.id : null).toBe('node_text');
    expect(moved.selectedNodeId).toBe('node_text');
    expect(moved.past).toHaveLength(1);

    const undone = editorReducer(moved, { type: 'history/undo' });
    expect(getActiveScreen(undone).nodes.some((node) => node.id === 'node_text')).toBe(true);
  });

  it('drops a palette component into a frame using frame-relative coordinates', () => {
    const frame = {
      id: 'node_frame',
      type: 'container' as const,
      x: 40,
      y: 50,
      w: 300,
      h: 220,
      props: {},
      children: [],
    };
    const state = createEditorState({ screens: [{ ...SCREEN, nodes: [frame] }] });

    const dropped = editorReducer(state, {
      type: 'canvas/dropAt',
      nodeType: 'button',
      x: 160,
      y: 150,
      parentId: 'node_frame',
    });

    const nextFrame = getActiveScreen(dropped).nodes[0]!;
    expect(nextFrame.type === 'container' ? nextFrame.children[0] : null).toMatchObject({
      type: 'button',
      x: 40,
      y: 80,
    });
    expect(dropped.past).toHaveLength(1);
  });

  it('keeps direct drag plus canvas reparenting as one undo step', () => {
    const frame = {
      id: 'node_frame',
      type: 'container' as const,
      x: 16,
      y: 24,
      w: 320,
      h: 240,
      props: {},
      children: [],
    };
    let state = createEditorState({ screens: [{ ...SCREEN, nodes: [...SCREEN.nodes, frame] }] });
    state = editorReducer(state, { type: 'node/dragStart' });
    state = editorReducer(state, { type: 'node/move', nodeId: 'node_text', x: 120, y: 130 });
    state = editorReducer(state, { type: 'node/reparent', nodeId: 'node_text', parentId: 'node_frame' });

    const nextFrame = getActiveScreen(state).nodes.find((node) => node.id === 'node_frame');
    expect(nextFrame?.type === 'container' ? nextFrame.children[0]?.id : null).toBe('node_text');
    expect(state.past).toHaveLength(1);

    const undone = editorReducer(state, { type: 'history/undo' });
    expect(getActiveScreen(undone).nodes.some((node) => node.id === 'node_text')).toBe(true);
  });

  it('clamps nested movement and resizing to the parent frame', () => {
    const child = { ...SCREEN.nodes[0]!, id: 'child', x: 20, y: 20, w: 100, h: 40 };
    const frame = {
      id: 'node_frame',
      type: 'container' as const,
      x: 40,
      y: 50,
      w: 220,
      h: 160,
      props: {},
      children: [child],
    };
    let state = createEditorState({ screens: [{ ...SCREEN, nodes: [frame] }] });

    state = editorReducer(state, { type: 'node/move', nodeId: 'child', x: 999, y: 999 });
    expect(findNodeInScreen(getActiveScreen(state), 'child')).toMatchObject({ x: 120, y: 120 });

    state = editorReducer(state, {
      type: 'node/resize',
      nodeId: 'child',
      geometry: { x: 0, y: 0, w: 999, h: 999 },
    });
    expect(findNodeInScreen(getActiveScreen(state), 'child')).toMatchObject({
      x: 0,
      y: 0,
      w: 220,
      h: 160,
    });
  });

  it('records Inspector layout and property commits in undo history', () => {
    let state = editorReducer(stateAt(), {
      type: 'node/layout-position',
      nodeId: 'node_text',
      x: 48,
      y: 64,
    });
    state = editorReducer(state, {
      type: 'node/props-text',
      nodeId: 'node_text',
      props: { text: 'Updated heading' },
    });

    expect(state.past).toHaveLength(2);
    expect(findNodeInScreen(getActiveScreen(state), 'node_text')).toMatchObject({
      x: 48,
      y: 64,
      props: { text: 'Updated heading' },
    });

    const undone = editorReducer(state, { type: 'history/undo' });
    expect(findNodeInScreen(getActiveScreen(undone), 'node_text')).toMatchObject({
      props: { text: 'Hello, World!' },
    });
  });
});

describe('autosave + chrome', () => {
  it('tracks saving lifecycle and clears the unsaved flag', () => {
    let state = editorReducer(stateAt(), { type: 'node/add', nodeType: 'text', x: 120, y: 200 });
    expect(state.hasUnsavedChanges).toBe(true);
    state = editorReducer(state, { type: 'autosave/begin' });
    expect(state.isSaving).toBe(true);

    state = editorReducer(state, { type: 'autosave/end', savedAt: new Date('2026-01-01T10:00:00Z') });
    expect(state.isSaving).toBe(false);
    expect(state.hasUnsavedChanges).toBe(false);
    expect(state.lastSavedAt?.getTime()).toBe(new Date('2026-01-01T10:00:00Z').getTime());
  });

  it('clamps zoom into limits', () => {
    const low = editorReducer(stateAt(), { type: 'zoom/set', zoom: 0.1 });
    expect(low.zoom).toBe(0.5);

    const high = editorReducer(stateAt(), { type: 'zoom/set', zoom: 99 });
    expect(high.zoom).toBe(2);
  });

  it('toggles snap and resets selection on device change', () => {
    let state = editorReducer(stateAt(), { type: 'node/select', nodeId: 'node_text' });
    state = editorReducer(state, { type: 'snap/toggle' });
    expect(state.isSnapEnabled).toBe(false);

    state = editorReducer(state, { type: 'device/set', device: 'tablet' });
    expect(state.device).toBe('tablet');
    expect(state.selectedNodeId).toBeNull();
  });

  it('re-centers screen content when the device preset changes', () => {
    const state = editorReducer(stateAt(), { type: 'device/set', device: 'mobile' });
    const nodes = getActiveScreen(state).nodes;

    // Node group spans 88..288 (200 wide) inside the 390px mobile frame.
    expect(nodes[0]).toMatchObject({ id: 'node_text', x: 95, y: 96 });
    expect(nodes[1]).toMatchObject({ id: 'node_button', x: 127, y: 560 });
    expect(state.device).toBe('mobile');
    expect(state.past).toHaveLength(1);
    expect(state.hasUnsavedChanges).toBe(true);
  });

  it('does not add history when the preset is already applied', () => {
    let state = editorReducer(stateAt(), { type: 'device/set', device: 'mobile' });
    const centeredMobile = getActiveScreen(state).nodes;

    state = editorReducer(state, { type: 'device/set', device: 'mobile' });

    expect(getActiveScreen(state).nodes).toEqual(centeredMobile);
    expect(state.past).toHaveLength(1);
  });

  it('tracks and clears the drop indicator', () => {
    const positioned = editorReducer(stateAt(), { type: 'canvas/dropIndicator', position: { x: 96, y: 24 } });
    expect(positioned.dropIndicator).toEqual({ x: 96, y: 24 });

    const cleared = editorReducer(positioned, { type: 'canvas/dropIndicator', position: null });
    expect(cleared.dropIndicator).toBeNull();
  });
});

describe('logic workspace', () => {
  it('creates a workflow directly from a trigger node and configures its binding', () => {
    let state = editorReducer(stateAt(), {
      type: 'workflow/create',
      event: 'click',
      position: { x: 120, y: 96 },
    });
    const behavior = getActiveScreen(state).behaviors[0]!;
    expect(behavior).toMatchObject({ targetNodeId: '', name: 'On click workflow' });
    expect(firstGraph(state).nodes[0]).toMatchObject({
      kind: 'trigger',
      event: 'click',
      position: { x: 120, y: 96 },
    });

    state = editorReducer(state, {
      type: 'workflow/trigger-update',
      behaviorId: behavior.id,
      targetNodeId: 'node_button',
      event: 'change',
    });
    expect(getActiveScreen(state).behaviors[0]).toMatchObject({
      targetNodeId: 'node_button',
      event: 'change',
      name: 'On change — Click me',
    });
    expect(firstGraph(state).nodes[0]).toMatchObject({ kind: 'trigger', event: 'change' });
  });

  it('adds specifically named flow and database nodes at requested positions', () => {
    let state = addClickBehavior(stateAt());
    const graphId = firstGraph(state).id;
    state = editorReducer(state, {
      type: 'graph/node-add',
      graphId,
      node: { kind: 'condition' },
      position: { x: 400, y: 120 },
    });
    state = editorReducer(state, {
      type: 'graph/node-add',
      graphId,
      node: {
        kind: 'action',
        payload: { type: 'insert-record', collectionId: '', values: {} },
      },
      position: { x: 640, y: 120 },
    });

    expect(firstGraph(state).nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'condition', position: { x: 400, y: 120 } }),
      expect.objectContaining({
        kind: 'action',
        position: { x: 640, y: 120 },
        payload: { type: 'insert-record', collectionId: '', values: {} },
      }),
    ]));
    expect(firstGraph(state).edges).toHaveLength(0);
  });

  function firstBehavior(state: EditorState): Behavior {
    return getActiveScreen(state).behaviors[0]!;
  }
  function firstGraph(state: EditorState): LogicGraph {
    return getActiveScreen(state).logicGraphs[0]!;
  }
  function addClickBehavior(state: EditorState): EditorState {
    return editorReducer(state, { type: 'behavior/create', targetNodeId: 'node_button', event: 'click' });
  }

  it('creates a behavior with a trigger-only graph and opens its tab', () => {
    const created = addClickBehavior(stateAt());
    const behavior = firstBehavior(created);
    const graph = firstGraph(created);

    expect(created.activeBehaviorId).toBe(behavior.id);
    expect(behavior.name).toBe('On click — Click me');
    expect(behavior.event).toBe('click');
    expect(behavior.graphId).toBe(graph.id);
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0]).toMatchObject({ kind: 'trigger', event: 'click' });
    expect(graph.edges).toEqual([]);
    expect(created.past).toHaveLength(1);
  });

  it('rejects a duplicate binding of the same component and event', () => {
    const created = addClickBehavior(stateAt());
    const again = editorReducer(created, { type: 'behavior/create', targetNodeId: 'node_button', event: 'click' });

    expect(again).toBe(created);
  });

  it('binds additional events to the same component', () => {
    const clickBehavior = addClickBehavior(stateAt());
    const changed = editorReducer(clickBehavior, { type: 'behavior/create', targetNodeId: 'node_button', event: 'change' });

    expect(getActiveScreen(changed).behaviors).toHaveLength(2);
    expect(changed.activeBehaviorId).not.toBe(clickBehavior.activeBehaviorId);
  });

  it('selects a tab and ignores ids that do not exist', () => {
    const clickBehavior = addClickBehavior(stateAt());
    const changed = editorReducer(clickBehavior, { type: 'behavior/create', targetNodeId: 'node_button', event: 'change' });
    const second = getActiveScreen(changed).behaviors[1]!.id;

    const selected = editorReducer(changed, { type: 'behavior/select', behaviorId: second });
    expect(selected.activeBehaviorId).toBe(second);
    expect(editorReducer(selected, { type: 'behavior/select', behaviorId: 'ghost' })).toBe(selected);
  });

  it('appends an action step wired to the current chain tail', () => {
    const created = addClickBehavior(stateAt());
    const graphId = firstGraph(created).id;

    const withStep = editorReducer(created, { type: 'graph/action-add', graphId });
    const graph = firstGraph(withStep);

    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toEqual([
      expect.objectContaining({
        fromNodeId: graph.nodes[0]!.id,
        fromPort: 'next',
        toNodeId: graph.nodes[1]!.id,
        toPort: 'in',
      }),
    ]);
    expect(withStep.past).toHaveLength(created.past.length + 1);
  });

  it('updates a step payload inline without a history entry', () => {
    const created = addClickBehavior(stateAt());
    const withStep = editorReducer(created, { type: 'graph/action-add', graphId: firstGraph(created).id });
    const graph = firstGraph(withStep);
    const stepId = graph.nodes[1]!.id;

    const updated = editorReducer(withStep, {
      type: 'graph/action-update',
      graphId: graph.id,
      nodeId: stepId,
      payload: { type: 'change-text', targetNodeId: 'node_text', text: 'New text' },
    });
    const updatedStep = firstGraph(updated).nodes[1]!;
    expect(updatedStep.kind === 'action' ? updatedStep.payload : undefined).toEqual({
      type: 'change-text',
      targetNodeId: 'node_text',
      text: 'New text',
    });
    expect(updated.past).toHaveLength(withStep.past.length + 1);
    expect(updated.hasUnsavedChanges).toBe(true);

    const same = editorReducer(updated, {
      type: 'graph/action-update',
      graphId: graph.id,
      nodeId: stepId,
      payload: { type: 'change-text', targetNodeId: 'node_text', text: 'New text' },
    });
    expect(same).toBe(updated);
  });

  it('removes a step and its incident edges', () => {
    let state = addClickBehavior(stateAt());
    const graphId = firstGraph(state).id;
    state = editorReducer(state, { type: 'graph/action-add', graphId });
    state = editorReducer(state, { type: 'graph/action-add', graphId });
    const firstStepId = firstGraph(state).nodes[1]!.id;

    const pruned = editorReducer(state, { type: 'graph/action-delete', graphId, nodeId: firstStepId });
    const graph = firstGraph(pruned);

    expect(graph.nodes).toHaveLength(2); // trigger + remaining step
    expect(graph.edges.some((edge) => edge.toNodeId === firstStepId)).toBe(false);
    expect(pruned.past).toHaveLength(state.past.length + 1);
  });

  it('connects cards with validation, branching from the trigger only to actions', () => {
    let state = addClickBehavior(stateAt());
    const graphId = firstGraph(state).id;
    state = editorReducer(state, { type: 'graph/action-add', graphId });
    state = editorReducer(state, { type: 'graph/action-add', graphId });
    const graph = firstGraph(state);
    const triggerId = graph.nodes[0]!.id;
    const firstStepId = graph.nodes[1]!.id;
    const secondStepId = graph.nodes[2]!.id;

    // Invalid: a typed output port can drive only one deterministic branch.
    const branched = editorReducer(state, { type: 'graph/connect', graphId, fromNodeId: triggerId, toNodeId: secondStepId });
    expect(branched).toBe(state);

    // Invalid: self-link, targeting the trigger, and duplicating the new edge.
    expect(editorReducer(branched, { type: 'graph/connect', graphId, fromNodeId: firstStepId, toNodeId: firstStepId })).toBe(branched);
    expect(editorReducer(branched, { type: 'graph/connect', graphId, fromNodeId: firstStepId, toNodeId: triggerId })).toBe(branched);
    expect(editorReducer(branched, { type: 'graph/connect', graphId, fromNodeId: triggerId, toNodeId: secondStepId })).toBe(branched);
  });

  it('unlinks an existing edge but ignores unknown ones', () => {
    let state = addClickBehavior(stateAt());
    const graphId = firstGraph(state).id;
    state = editorReducer(state, { type: 'graph/action-add', graphId });
    const graph = firstGraph(state);
    const triggerId = graph.nodes[0]!.id;
    const stepId = graph.nodes[1]!.id;

    const unlinked = editorReducer(state, { type: 'graph/disconnect', graphId, fromNodeId: triggerId, toNodeId: stepId });
    expect(firstGraph(unlinked).edges).toHaveLength(0);
    expect(unlinked.past).toHaveLength(state.past.length + 1);

    expect(editorReducer(unlinked, { type: 'graph/disconnect', graphId, fromNodeId: triggerId, toNodeId: stepId })).toBe(unlinked);
  });

  it('adds/configures a condition and connects both typed branches', () => {
    let state = addClickBehavior(stateAt());
    const graphId = firstGraph(state).id;
    state = editorReducer(state, { type: 'graph/condition-add', graphId });
    const condition = firstGraph(state).nodes[1]!;
    state = editorReducer(state, {
      type: 'graph/condition-update',
      graphId,
      nodeId: condition.id,
      patch: {
        left: { source: 'component', nodeId: 'node_text', property: 'text' },
        operator: 'contains',
        compareValue: 'Hello',
      },
    });
    state = editorReducer(state, { type: 'graph/action-add', graphId });
    const yesId = firstGraph(state).nodes[2]!.id;
    state = editorReducer(state, { type: 'graph/action-add', graphId });
    const noId = firstGraph(state).nodes[3]!.id;

    // The append helper wires condition.true and then yes.next; disconnect the
    // latter so the condition's false output can own the final action.
    const yesToNo = firstGraph(state).edges.find(
      (edge) => edge.fromNodeId === yesId && edge.toNodeId === noId,
    )!;
    state = editorReducer(state, { type: 'graph/edge-delete', graphId, edgeId: yesToNo.id });
    state = editorReducer(state, {
      type: 'graph/connect-ports',
      graphId,
      fromNodeId: condition.id,
      fromPort: 'false',
      toNodeId: noId,
    });

    const graph = firstGraph(state);
    expect(graph.nodes.find((node) => node.id === condition.id)).toMatchObject({
      kind: 'condition',
      operator: 'contains',
      compareValue: 'Hello',
    });
    expect(graph.edges.some((edge) => edge.fromNodeId === condition.id && edge.fromPort === 'true')).toBe(true);
    expect(graph.edges.some((edge) => edge.fromNodeId === condition.id && edge.fromPort === 'false')).toBe(true);
  });

  it('moves graph nodes with one drag history entry', () => {
    let state = addClickBehavior(stateAt());
    const graph = firstGraph(state);
    const triggerId = graph.nodes[0]!.id;
    state = editorReducer(state, { type: 'graph/node-dragStart' });
    state = editorReducer(state, { type: 'graph/node-move', graphId: graph.id, nodeId: triggerId, x: 180, y: 96 });
    state = editorReducer(state, { type: 'graph/node-move', graphId: graph.id, nodeId: triggerId, x: 220, y: 112 });

    expect(firstGraph(state).nodes[0]!.position).toEqual({ x: 220, y: 112 });
    expect(state.past).toHaveLength(2); // behavior creation + one graph drag
  });

  it('deleting a component drops its behaviors and graphs', () => {
    let state = addClickBehavior(stateAt());
    state = editorReducer(state, { type: 'behavior/create', targetNodeId: 'node_text', event: 'load' });
    const clickBehavior = getActiveScreen(state).behaviors[0]!;
    const loadBehaviorId = getActiveScreen(state).behaviors[1]!.id;

    const deleted = editorReducer(state, { type: 'node/delete', nodeId: clickBehavior.targetNodeId });
    expect(getActiveScreen(deleted).behaviors).toHaveLength(1); // only the text behavior survives
    expect(getActiveScreen(deleted).logicGraphs).toHaveLength(1);
    expect(deleted.activeBehaviorId).toBe(loadBehaviorId); // its tab stays active
    expect(deleted.past).toHaveLength(state.past.length + 1);

    // Deleting the active tab's own component clears the selection instead.
    const cleared = editorReducer(state, { type: 'behavior/select', behaviorId: clickBehavior.id });
    const deletedActive = editorReducer(cleared, { type: 'node/delete', nodeId: clickBehavior.targetNodeId });
    expect(deletedActive.activeBehaviorId).toBeNull();
  });

  it('deleting a screen prunes navigate steps that pointed at it', () => {
    const homeBundle = createBehaviorBundle('On click — Click me', 'node_button', 'click');
    const homeGraph = appendAction(homeBundle.graph, { type: 'navigate', targetScreenId: 'screen_2' });
    const home: Screen = {
      ...SCREEN,
      behaviors: [homeBundle.behavior],
      logicGraphs: [homeGraph],
    };
    const about: Screen = {
      id: 'screen_2',
      name: 'About',
      nodes: [{ ...SCREEN.nodes[1]! }],
      behaviors: [],
      logicGraphs: [],
    };
    const state = {
      ...createEditorState({ screens: [home, about] }),
      activeBehaviorId: homeBundle.behavior.id,
    };

    const deleted = editorReducer(state, { type: 'screen/delete', screenId: 'screen_2' });

    expect(deleted.document.screens).toHaveLength(1);
    expect(deleted.activeBehaviorId).toBe(homeBundle.behavior.id);
    const graph = getActiveScreen(deleted).logicGraphs[0]!;
    // The dead navigate step is pruned; the trigger survives.
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes.some((node) => node.kind === 'action' && node.payload.type === 'navigate')).toBe(false);
    expect(deleted.past).toHaveLength(1);
  });

  it('undo keeps an existing tab active and clears a vanished one', () => {
    let state = addClickBehavior(stateAt());
    state = editorReducer(state, { type: 'behavior/create', targetNodeId: 'node_text', event: 'load' });
    const clickBehaviorId = getActiveScreen(state).behaviors[0]!.id;

    // Select the first tab, delete it, then undo: previous document restores BOTH behaviors.
    const selected = editorReducer(state, { type: 'behavior/select', behaviorId: clickBehaviorId });
    const deleted = editorReducer(selected, { type: 'behavior/delete', behaviorId: clickBehaviorId });
    expect(deleted.activeBehaviorId).toBe(getActiveScreen(deleted).behaviors[0]!.id);

    const undone = editorReducer(deleted, { type: 'history/undo' });
    expect(getActiveScreen(undone).behaviors).toHaveLength(2);
    expect(undone.activeBehaviorId).toBe(getActiveScreen(undone).behaviors[1]!.id);
  });
});

describe('AI assistant', () => {
  it('applies a node proposal as one undoable history step', () => {
    const applied = editorReducer(stateAt(), {
      type: 'assistant/apply',
      proposal: { kind: 'add-button', label: 'Sign up' },
    });

    const nodes = getActiveScreen(applied).nodes;
    expect(nodes).toHaveLength(SCREEN.nodes.length + 1);
    expect(nodes[nodes.length - 1]).toMatchObject({ type: 'button', props: { label: 'Sign up' } });
    expect(applied.past).toHaveLength(1);

    const undone = editorReducer(applied, { type: 'history/undo' });
    expect(getActiveScreen(undone).nodes).toHaveLength(SCREEN.nodes.length);
  });

  it('applies a behavior proposal as one step and ignores impossible proposals', () => {
    const applied = editorReducer(stateAt(), {
      type: 'assistant/apply',
      proposal: {
        kind: 'change-text-on-click',
        buttonNodeId: 'node_button',
        textNodeId: 'node_text',
        text: 'Changed!',
      },
    });

    const screen = getActiveScreen(applied);
    expect(screen.behaviors).toHaveLength(1);
    expect(screen.logicGraphs[0]!.nodes).toHaveLength(2);
    expect(applied.past).toHaveLength(1);

    const impossible = editorReducer(applied, {
      type: 'assistant/apply',
      proposal: {
        kind: 'change-text-on-click',
        buttonNodeId: 'node_ghost',
        textNodeId: 'node_text',
        text: 'Nope',
      },
    });
    expect(impossible).toBe(applied);
  });
});
