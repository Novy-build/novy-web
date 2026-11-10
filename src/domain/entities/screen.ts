import type { ComponentNode } from './componentNode';
import type { Behavior, LogicGraph } from './logic';

export interface RecordRouteParameter {
  name: string;
  source: {
    kind: 'record-id';
    collectionId: string;
    identifierKey: string;
  };
}

/**
 * A screen ("page" in the draft) of the app being built, plus the logic
 * attached to its components.
 */
export interface Screen {
  id: string;
  name: string;
  /** Generated-app route, unique within the project (for example `/` or `/settings`). */
  path: string;
  /** Explicit generated-runtime mapping for dynamic route segments such as :noteId. */
  routeParameters?: RecordRouteParameter[];
  nodes: ComponentNode[];
  behaviors: Behavior[];
  logicGraphs: LogicGraph[];
}

/** Everything about a project that persists across editing sessions. */
export interface ProjectDocument {
  screens: Screen[];
}
