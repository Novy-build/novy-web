import { describe, expect, it } from 'vitest';
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

    expect(added.x + added.w).toBeLessThanOrEqual(390);
    expect(added.y + added.h).toBeLessThanOrEqual(780);
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
    const overshoot = editorReducer(stateAt(), { type: 'node/move', nodeId: 'node_text', x: 900, y: 900 });
    expect(findNodeInScreen(getActiveScreen(overshoot), 'node_text')?.x).toBe(390 - 200);

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

  it('tracks and clears the drop indicator', () => {
    const positioned = editorReducer(stateAt(), { type: 'canvas/dropIndicator', position: { x: 96, y: 24 } });
    expect(positioned.dropIndicator).toEqual({ x: 96, y: 24 });

    const cleared = editorReducer(positioned, { type: 'canvas/dropIndicator', position: null });
    expect(cleared.dropIndicator).toBeNull();
  });
});
