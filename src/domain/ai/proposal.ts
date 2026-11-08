import type { ComponentNode } from '../entities/componentNode';
import type { ProjectDocument, Screen } from '../entities/screen';
import { createComponentNode } from '../factories/componentNode';
import { createBehaviorBundle } from '../factories/logic';
import { appendAction } from '../logic/graph';
import type { AssistantProposal } from './assistant';
import { findNodeById } from './nodeSearch';

/**
 * Applies one assistant proposal to the active screen as a pure document
 * transform. The reducer wraps this in a single history entry, so Keep/Undo
 * ride the same command stack as manual edits. Unappliable proposals return
 * the original document reference (the reducer turns that into a no-op).
 */
export function applyAssistantProposal(
  document: ProjectDocument,
  screenId: string,
  proposal: AssistantProposal,
): ProjectDocument {
  const screen = document.screens.find((candidate) => candidate.id === screenId);
  if (!screen) {
    return document;
  }
  const nextScreen = applyToScreen(screen, proposal);
  if (nextScreen === screen) {
    return document;
  }
  return {
    screens: document.screens.map((candidate) => (candidate.id === screenId ? nextScreen : candidate)),
  };
}

/** Human summary shown on the proposal card in the assistant sheet. */
export function describeProposal(proposal: AssistantProposal): string {
  switch (proposal.kind) {
    case 'add-button':
      return `Add a button “${proposal.label}”`;
    case 'add-text':
      return `Add text “${proposal.text}”`;
    case 'add-list':
      return `Add a ListView with ${proposal.items.length} items`;
    case 'change-text-on-click':
      return `On click, change the text to “${proposal.text}”`;
    default: {
      const exhaustive: never = proposal;
      void exhaustive;
      return '';
    }
  }
}

function applyToScreen(screen: Screen, proposal: AssistantProposal): Screen {
  switch (proposal.kind) {
    case 'add-button':
    case 'add-text':
    case 'add-list':
      return appendConfiguredNode(screen, proposal);
    case 'change-text-on-click': {
      const button = findNodeById(screen.nodes, proposal.buttonNodeId);
      if (!button || button.type !== 'button') {
        return screen;
      }
      const payload = {
        type: 'change-text' as const,
        targetNodeId: proposal.textNodeId,
        text: proposal.text,
      };

      // Reuse an existing click binding on this button instead of duplicating it.
      const existing = screen.behaviors.find(
        (behavior) => behavior.event === 'click' && behavior.targetNodeId === button.id,
      );
      if (existing) {
        const graph = screen.logicGraphs.find((candidate) => candidate.id === existing.graphId);
        if (!graph) {
          return screen;
        }
        const nextGraph = appendAction(graph, payload);
        return {
          ...screen,
          logicGraphs: screen.logicGraphs.map((candidate) =>
            candidate.id === graph.id ? nextGraph : candidate,
          ),
        };
      }

      const bundle = createBehaviorBundle(`On click — ${button.props.label}`, button.id, 'click');
      const graph = appendAction(bundle.graph, payload);
      return {
        ...screen,
        behaviors: [...screen.behaviors, bundle.behavior],
        logicGraphs: [...screen.logicGraphs, graph],
      };
    }
    default: {
      const exhaustive: never = proposal;
      void exhaustive;
      return screen;
    }
  }
}

/** New nodes stack below the lowest existing node so they stay visible. */
function appendConfiguredNode(
  screen: Screen,
  proposal: Extract<AssistantProposal, { kind: 'add-button' | 'add-text' | 'add-list' }>,
): Screen {
  const node = createConfiguredNode(proposal);
  const bottom = screen.nodes.reduce((max, current) => Math.max(max, current.y + current.h), 0);
  return {
    ...screen,
    nodes: [...screen.nodes, { ...node, x: 24, y: bottom + 16 }],
  };
}

function createConfiguredNode(
  proposal: Extract<AssistantProposal, { kind: 'add-button' | 'add-text' | 'add-list' }>,
): ComponentNode {
  switch (proposal.kind) {
    case 'add-button': {
      const node = createComponentNode('button');
      return node.type === 'button'
        ? { ...node, props: { ...node.props, label: proposal.label } }
        : node;
    }
    case 'add-text': {
      const node = createComponentNode('text');
      return node.type === 'text' ? { ...node, props: { ...node.props, text: proposal.text } } : node;
    }
    case 'add-list': {
      const node = createComponentNode('listview');
      return node.type === 'listview'
        ? {
            ...node,
            props: {
              ...node.props,
              dataSource: {
                kind: 'static',
                fields: [{ id: 'value', label: 'Value', type: 'text' }],
                items: proposal.items.map((value, index) => ({ id: `${node.id}__static_${index + 1}`, values: { value } })),
              },
            },
          }
        : node;
    }
    default: {
      const exhaustive: never = proposal;
      void exhaustive;
      return createComponentNode('text');
    }
  }
}
