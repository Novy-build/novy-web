import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PreviewEffect } from '@domain/logic/runtime';
import type { Screen } from '@domain/entities/screen';
import { createActionNode, createBehaviorBundle } from '@domain/factories/logic';
import { appendAction, appendCondition, connectLogicPorts, updateCondition } from '@domain/logic/graph';
import { makeButton, makeForm, makeList, makeScreen, makeText } from '@test/editorFixtures';
import type { DataCollection } from '@domain/entities/appData';
import { PreviewOverlay } from './PreviewOverlay';

beforeEach(() => {
  window.localStorage.clear();
});

/** Home + About, where clicking "Click me" runs the given extra chain steps. */
function buildScreens(steps: PreviewEffect[]): Screen[] {
  const home = makeScreen('screen_home', [
    makeText('node_text', { x: 24, y: 24, w: 200, h: 36 }),
    makeButton('node_button', { x: 24, y: 80, w: 160, h: 44 }),
  ]);
  const about = makeScreen(
    'screen_about',
    [makeText('node_arrival', { x: 24, y: 200, w: 200, h: 24, props: { text: 'You made it!', level: 'body' } })],
    'About',
  );
  const bundle = createBehaviorBundle('On click — Click me', 'node_button', 'click');
  const payloadFor = (effect: PreviewEffect) => {
    switch (effect.kind) {
      case 'change-text':
        return { type: 'change-text' as const, targetNodeId: effect.nodeId, text: effect.text };
      case 'show-message':
        return { type: 'show-message' as const, message: effect.message };
      case 'navigate':
        return { type: 'navigate' as const, targetScreenId: effect.screenId };
    }
  };
  const graph = steps.reduce(
    (current, effect) => appendAction(current, payloadFor(effect)),
    bundle.graph,
  );

  return [
    { ...home, behaviors: [{ ...bundle.behavior, graphId: graph.id }], logicGraphs: [graph] },
    about,
  ];
}

function renderPreview(onClose = vi.fn(), screens: Screen[] = buildScreens([])) {
  render(<PreviewOverlay initialDevice="mobile" onClose={onClose} projectName="My App" screens={screens} />);
  return onClose;
}

describe('PreviewOverlay', () => {
  it('previews the first screen at full size', () => {
    renderPreview();

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Previewing My App' })).toBeInTheDocument();
    expect(within(dialog).getByText(/390×780/)).toBeInTheDocument();
    expect(within(dialog).getByText('Hello, World!')).toBeInTheDocument();
  });

  it('closes on Escape', () => {
    const onClose = renderPreview();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('provides a visible close control', () => {
    const onClose = renderPreview();

    fireEvent.click(screen.getByRole('button', { name: 'Close preview' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('runs click chains step by step: text change, then toast', async () => {
    vi.useFakeTimers();
    try {
      renderPreview(
        vi.fn(),
        buildScreens([
          { kind: 'change-text', nodeId: 'node_text', text: 'Changed!' },
          { kind: 'show-message', message: 'Saved!' },
        ]),
      );

      const dialog = screen.getByRole('dialog');
      fireEvent.click(within(dialog).getByRole('button', { name: 'Click me' }));

      expect(within(dialog).getByText('Changed!')).toBeInTheDocument();
      expect(screen.getByTestId('preview-toast')).toHaveTextContent('Saved!');

      // The toast self-dismisses after its runtime window; the text stays.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2400);
      });
      expect(screen.queryByTestId('preview-toast')).not.toBeInTheDocument();
      expect(within(dialog).getByText('Changed!')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('navigates to the target screen and resets runtime overrides', () => {
    renderPreview(
      vi.fn(),
      buildScreens([
        { kind: 'change-text', nodeId: 'node_text', text: 'Changed!' },
        { kind: 'navigate', screenId: 'screen_about' },
      ]),
    );

    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Click me' }));

    expect(within(dialog).getByText('You made it!')).toBeInTheDocument();
    expect(within(dialog).queryByText('Changed!')).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Click me' })).not.toBeInTheDocument();
  });

  it('does not run chains for components without a bound behavior', () => {
    renderPreview(vi.fn(), [makeScreen('screen_home', [makeButton('node_button')])]);

    fireEvent.click(screen.getByRole('button', { name: 'Click me' }));

    expect(screen.queryByTestId('preview-toast')).not.toBeInTheDocument();
  });

  it('announces the behavior events that execute in the preview', () => {
    renderPreview();

    expect(within(screen.getByRole('dialog')).getByText(/Click, change, and screen-load behaviors/)).toBeInTheDocument();
  });

  it('runs change behaviors with the updated preview value', () => {
    const home = makeScreen('screen_home', [
      {
        id: 'node_input',
        type: 'input',
        x: 24,
        y: 24,
        w: 220,
        h: 56,
        props: { label: 'Answer', placeholder: 'Type', inputType: 'text', multiline: false },
      },
    ]);
    const bundle = createBehaviorBundle('On change — Answer', 'node_input', 'change');
    const graph = appendAction(bundle.graph, { type: 'show-message', message: 'Value changed' });
    renderPreview(vi.fn(), [{ ...home, behaviors: [bundle.behavior], logicGraphs: [graph] }]);

    fireEvent.change(screen.getByLabelText('Answer'), { target: { value: 'yes' } });
    expect(screen.getByTestId('preview-toast')).toHaveTextContent('Value changed');
  });

  it('runs screen-load behaviors when a screen is entered', () => {
    const home = makeScreen('screen_home', [makeText('node_text')]);
    const bundle = createBehaviorBundle('On load — Home', 'node_text', 'load');
    const graph = appendAction(bundle.graph, { type: 'show-message', message: 'Screen loaded' });
    renderPreview(vi.fn(), [{ ...home, behaviors: [bundle.behavior], logicGraphs: [graph] }]);

    expect(screen.getByTestId('preview-toast')).toHaveTextContent('Screen loaded');
  });

  it('captures preview input values and follows condition branches', () => {
    const home = makeScreen('screen_home', [
      {
        id: 'node_input',
        type: 'input',
        x: 24,
        y: 24,
        w: 220,
        h: 56,
        props: { label: 'Answer', placeholder: 'yes or no', inputType: 'text', multiline: false },
      },
      makeButton('node_button', { x: 24, y: 100 }),
    ]);
    const bundle = createBehaviorBundle('On click — Click me', 'node_button', 'click');
    let graph = appendCondition(bundle.graph);
    const condition = graph.nodes[1]!;
    graph = updateCondition(graph, condition.id, {
      left: { source: 'component', nodeId: 'node_input', property: 'value' },
      operator: 'equals',
      compareValue: 'yes',
    });
    const yes = createActionNode({ type: 'show-message', message: 'Accepted' }, { x: 544, y: 100 });
    const no = createActionNode({ type: 'show-message', message: 'Try again' }, { x: 544, y: 260 });
    graph = { ...graph, nodes: [...graph.nodes, yes, no] };
    graph = connectLogicPorts(graph, condition.id, 'true', yes.id)!;
    graph = connectLogicPorts(graph, condition.id, 'false', no.id)!;
    const screenWithLogic = {
      ...home,
      behaviors: [bundle.behavior],
      logicGraphs: [graph],
    };
    renderPreview(vi.fn(), [screenWithLogic]);

    fireEvent.change(screen.getByLabelText('Answer'), { target: { value: 'yes' } });
    fireEvent.click(screen.getByRole('button', { name: 'Click me' }));
    expect(screen.getByTestId('preview-toast')).toHaveTextContent('Accepted');

    fireEvent.change(screen.getByLabelText('Answer'), { target: { value: 'no' } });
    fireEvent.click(screen.getByRole('button', { name: 'Click me' }));
    expect(screen.getByTestId('preview-toast')).toHaveTextContent('Try again');
  });

  it('keeps Form-created records in isolated preview data and refreshes bound Lists', () => {
    const collection: DataCollection = {
      id: 'students',
      projectId: 'project',
      databaseId: 'database',
      name: 'Students',
      fields: [
        { id: 'name', key: 'name', label: 'Name', type: 'text', required: true },
        { id: 'email', key: 'email', label: 'Email', type: 'text', required: false },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const list = makeList('list', {
      props: {
        items: [],
        scrollable: true,
        showDividers: true,
        dataSource: { kind: 'collection', collectionId: 'students', displayFieldId: 'name' },
      },
      y: 400,
    });
    const form = makeForm('form', {
      props: {
        title: 'Add student',
        fields: [
          { label: 'Name', placeholder: 'Name', type: 'text' },
          { label: 'Email', placeholder: 'Email', type: 'email' },
        ],
        submitLabel: 'Create student',
        dataBinding: {
          collectionId: 'students',
          fields: [
            { formFieldIndex: 0, dataFieldId: 'name' },
            { formFieldIndex: 1, dataFieldId: 'email' },
          ],
        },
      },
    });
    render(
      <PreviewOverlay
        collections={[collection]}
        initialDevice="mobile"
        onClose={vi.fn()}
        projectName="Students"
        recordsByCollection={new Map([['students', []]])}
        screens={[makeScreen('home', [form, list])]}
      />,
    );

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ada' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create student' }));

    expect(screen.getByTestId('preview-toast')).toHaveTextContent('Form created a preview record.');
    expect(screen.getByText('Ada')).toBeInTheDocument();
  });

  it('applies database-node effects to isolated preview records', () => {
    const collection: DataCollection = {
      id: 'students', projectId: 'project', databaseId: 'database', name: 'Students',
      fields: [{ id: 'name', key: 'name', label: 'Name', type: 'text', required: true }],
      createdAt: new Date(), updatedAt: new Date(),
    };
    const button = makeButton('button', { x: 24, y: 24 });
    const list = makeList('list', {
      y: 100,
      props: { items: [], scrollable: true, showDividers: true, dataSource: { kind: 'collection', collectionId: 'students', displayFieldId: 'name' } },
    });
    const base = makeScreen('home', [button, list]);
    const bundle = createBehaviorBundle('On click — Click me', 'button', 'click');
    const graph = appendAction(bundle.graph, {
      type: 'insert-record', collectionId: 'students', values: { name: 'Grace Hopper' },
    });
    render(
      <PreviewOverlay
        collections={[collection]}
        initialDevice="mobile"
        onClose={vi.fn()}
        projectName="Students"
        recordsByCollection={new Map([['students', []]])}
        screens={[{ ...base, behaviors: [bundle.behavior], logicGraphs: [graph] }]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Click me' }));
    expect(screen.getByTestId('preview-toast')).toHaveTextContent('Preview record inserted.');
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
  });
});

describe('PreviewOverlay zoom', () => {
  it('zooms in and out from the toolbar controls', () => {
    render(<PreviewOverlay initialDevice="mobile" onClose={vi.fn()} projectName="My App" screens={buildScreens([])} />);

    const dialog = screen.getByRole('dialog');
    const readPercent = () =>
      Number((within(dialog).getByTestId('preview-zoom-value').textContent ?? '0%').replace('%', ''));
    const initial = readPercent();

    fireEvent.click(within(dialog).getByLabelText('Zoom in preview'));
    expect(readPercent()).toBe(initial + 25);

    fireEvent.click(within(dialog).getByLabelText('Zoom out preview'));
    expect(readPercent()).toBe(initial);
  });

  it('fits the preview back to the stage', () => {
    render(<PreviewOverlay initialDevice="mobile" onClose={vi.fn()} projectName="My App" screens={buildScreens([])} />);

    const dialog = screen.getByRole('dialog');
    const readPercent = () =>
      Number((within(dialog).getByTestId('preview-zoom-value').textContent ?? '0%').replace('%', ''));
    const initial = readPercent();

    fireEvent.click(within(dialog).getByLabelText('Zoom in preview'));
    expect(readPercent()).toBe(initial + 25);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Fit' }));
    expect(readPercent()).toBe(initial);
  });

  it('opens on the requested screen', () => {
    const screens = buildScreens([]);
    const second = makeScreen('screen_second', [makeText('node_second', { props: { text: 'Second screen', level: 'body' } })], 'Second');
    render(
      <PreviewOverlay
        initialDevice="mobile"
        initialScreenId="screen_second"
        onClose={vi.fn()}
        projectName="My App"
        screens={[...screens, second]}
      />,
    );

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Second screen')).toBeInTheDocument();
    expect(within(dialog).queryByText('Hello, World!')).not.toBeInTheDocument();
  });
});

describe('PreviewOverlay device modes', () => {
  it('opens at desktop by default', () => {
    render(<PreviewOverlay onClose={vi.fn()} projectName="My App" screens={buildScreens([])} />);

    expect(screen.getByText(/1200×800/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desktop' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('switches preview device independently', () => {
    render(<PreviewOverlay initialDevice="desktop" onClose={vi.fn()} projectName="My App" screens={buildScreens([])} />);

    fireEvent.click(screen.getByRole('button', { name: 'Mobile' }));

    expect(screen.getByText(/390×780/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mobile' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Desktop' })).toHaveAttribute('aria-pressed', 'false');
  });
});
