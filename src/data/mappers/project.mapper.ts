import {
  createPadding,
  geometryAtBreakpoint,
  isButtonIconName,
  isAppIconName,
  isChildBearingNode,
  isHiddenAtBreakpoint,
  isTextFontFamily,
  isTextFontWeight,
  normalizePadding,
  resolveEdgeInsets,
  type ColumnNode,
  type ComponentNode,
  type ListViewDataSource,
  type ListViewNode,
  type NodeGeometry,
  type ResponsiveBreakpoint,
  type ResponsiveGeometry,
  type ResponsiveNodeOverrides,
  type TextNode,
} from '@domain/entities/componentNode';
import type { ActionInputMappings, Behavior, LogicEdge, LogicGraph, LogicNode } from '@domain/entities/logic';
import type { Project, ProjectSummary } from '@domain/entities/project';
import type { ProjectDocument, Screen } from '@domain/entities/screen';
import type {
  BehaviorDTO,
  ComponentNodeDTO,
  LegacyFormNodeDTO,
  LogicEdgeDTO,
  LogicGraphDTO,
  LogicNodeDTO,
  ProjectDTO,
  ScreenDTO,
} from '../dto/project.dto';
import { normalizeLogicGraph } from '@domain/logic/graph';
import { ensureWebsiteSectionDarkAppearances } from '@domain/sections/sectionLayout';

/*
 * Domain <-> DTO boundaries. Dates become ISO-8601 strings on the wire; node
 * and logic unions are mapped explicitly so the presentation layer never sees
 * API-shaped fixtures.
 */

export function mapProjectToDto(project: Project): ProjectDTO {
  return {
    schemaVersion: 14,
    id: project.id,
    name: project.name,
    projectType: project.projectType,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    ...(project.document.designSystem ? { designSystem: structuredClone(project.document.designSystem) } : {}),
    screens: project.document.screens.map(mapScreenToDto),
  };
}

export function mapProjectFromDto(dto: ProjectDTO): Project {
  const takenPaths = new Set(dto.screens.flatMap((screen) => screen.path ? [screen.path] : []));
  const mappedDocument: ProjectDocument = {
    ...(dto.designSystem ? { designSystem: structuredClone(dto.designSystem) } : {}),
    screens: dto.screens.map((screen, index) => {
      const mapped = mapScreenFromDto(screen, index);
      if (screen.path) return mapped;
      const path = uniqueMigratedScreenPath(mapped.path, index, takenPaths);
      takenPaths.add(path);
      return path === mapped.path ? mapped : { ...mapped, path };
    }),
  };
  const layoutMigratedDocument = (dto.schemaVersion ?? 0) < 9
    ? {
        screens: mappedDocument.screens.map((screen) => ({
          ...screen,
          nodes: migrateListViewItemsToFreeform(screen.nodes),
        })),
      }
    : mappedDocument;
  const document = (dto.schemaVersion ?? 0) < 13
    ? migrateRecordRouteParameters(layoutMigratedDocument)
    : layoutMigratedDocument;
  const normalizedDocument = normalizeLegacyCvStarter(document);
  const projectType = dto.projectType === 'website' ? 'website' : 'app';
  const migratedDocument = projectType === 'website'
    ? { screens: normalizedDocument.screens.map(ensureWebsiteSectionDarkAppearances) }
    : normalizedDocument;
  return {
    id: dto.id,
    name: dto.name,
    projectType,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
    document: migratedDocument,
  };
}

/**
 * Projects clone starter screens, so changing the template does not update an
 * already-saved Face verification project. Normalize only the starter's known
 * IDs and untouched legacy defaults; authored copy and geometry stay intact.
 */
function normalizeLegacyCvStarter(document: ProjectDocument): ProjectDocument {
  const registration = document.screens.find((screen) => screen.id === 'screen_cv_registration');
  const test = document.screens.find((screen) => screen.id === 'screen_cv_test');
  if (!registration || !test) return document;

  return {
    screens: document.screens.map((screen) => {
      if (screen.id === registration.id) return normalizeCvRegistrationScreen(screen);
      if (screen.id === test.id) return normalizeCvTestScreen(screen);
      return screen;
    }),
  };
}

function normalizeCvRegistrationScreen(screen: Screen): Screen {
  return {
    ...screen,
    nodes: screen.nodes.map((node) => {
      if (node.id === 'cv_registration_camera' && node.type === 'camera'
        && node.props.captureMode === undefined) {
        return {
          ...node,
          props: {
            ...node.props,
            captureMode: 'guided-face',
            captureLabel: node.props.captureLabel === 'Capture face'
              ? 'Capture now'
              : node.props.captureLabel,
          },
        };
      }
      if (node.type !== 'text') return node;
      if (node.id === 'cv_registration_intro'
        && node.props.text === 'Capture a clear face image and grant consent to register the signed-in app user.') {
        return {
          ...node,
          props: { ...node.props, text: 'Capture a clear face image and grant consent. No account or email is required.' },
        };
      }
      if (node.id === 'cv_registration_status'
        && node.props.text === 'Registration status: sign in, capture a face, and grant consent.') {
        return {
          ...node,
          props: { ...node.props, text: 'Registration status: capture a face and grant consent.' },
        };
      }
      return node;
    }),
    logicGraphs: screen.logicGraphs.map((graph) => ({
      ...graph,
      nodes: graph.nodes.map((node) => {
        if (node.kind !== 'action' || node.payload.type !== 'change-text') return node;
        if (node.id === 'cv_registration_graph_enroll_success'
          && node.payload.text === 'Registration status: face registered for the signed-in app user.') {
          return {
            ...node,
            payload: { ...node.payload, text: 'Registration status: face registered on this device.' },
          };
        }
        if (node.id === 'cv_registration_graph_enroll_error'
          && node.payload.text === 'Registration status: sign in, capture a face, and grant consent.') {
          return {
            ...node,
            payload: { ...node.payload, text: 'Registration status: capture a face and grant consent.' },
          };
        }
        return node;
      }),
    })),
  };
}

function normalizeCvTestScreen(screen: Screen): Screen {
  const removeLegacyEmail = screen.nodes.some(isUntouchedLegacyCvEmailNode);
  const migrateAutomaticVerify = screen.nodes.some(isUntouchedLegacyCvVerifyButton)
    && screen.behaviors.some((behavior) => behavior.id === 'cv_test_behavior_verify'
      && behavior.event === 'click'
      && behavior.targetNodeId === 'cv_test_verify'
      && behavior.graphId === 'cv_test_graph_verify')
    && screen.logicGraphs.some((graph) => graph.id === 'cv_test_graph_verify'
      && graph.sourceNodeId === 'cv_test_verify'
      && graph.nodes.some((node) => node.kind === 'trigger'
        && node.id === 'cv_test_verify_trigger'
        && node.event === 'click'));
  return {
    ...screen,
    nodes: screen.nodes
      .filter((node) => (!removeLegacyEmail || node.id !== 'cv_test_email')
        && (!migrateAutomaticVerify || node.id !== 'cv_test_verify'))
      .map((node) => normalizeCvTestNode(node, removeLegacyEmail, migrateAutomaticVerify)),
    behaviors: screen.behaviors.map((behavior) => migrateAutomaticVerify
      && behavior.id === 'cv_test_behavior_verify'
      ? {
          ...behavior,
          name: 'Verify captured face',
          event: 'change',
          targetNodeId: 'cv_test_camera',
        }
      : behavior),
    logicGraphs: screen.logicGraphs.map((graph) => ({
      ...graph,
      ...(migrateAutomaticVerify && graph.id === 'cv_test_graph_verify'
        ? { name: 'Recognize face automatically', sourceNodeId: 'cv_test_camera' }
        : {}),
      nodes: graph.nodes.map((node) => migrateAutomaticVerify
        && node.kind === 'trigger'
        && node.id === 'cv_test_verify_trigger'
        ? { ...node, event: 'change' }
        : normalizeCvTestLogicNode(node)),
    })),
  };
}

function isUntouchedLegacyCvEmailNode(node: ComponentNode): boolean {
  return node.id === 'cv_test_email'
    && node.type === 'input'
    && node.x === 24
    && node.y === 368
    && node.w === 342
    && node.h === 64
    && node.props.label === 'Enrolled account email'
    && node.props.placeholder === 'you@example.com'
    && node.props.inputType === 'email'
    && node.props.multiline === false;
}

function isUntouchedLegacyCvVerifyButton(node: ComponentNode): boolean {
  return node.id === 'cv_test_verify'
    && node.type === 'button'
    && node.x === 24
    && (node.y === 440 || node.y === 504)
    && node.w === 342
    && node.h === 44
    && (node.props.label === 'Recognize face' || node.props.label === 'Unlock with face')
    && node.props.variant === 'solid';
}

function normalizeCvTestNode(
  node: ComponentNode,
  compactLayout: boolean,
  automaticVerify: boolean,
): ComponentNode {
  if (node.id === 'cv_test_camera' && node.type === 'camera'
    && node.props.captureMode === undefined) {
    return {
      ...node,
      props: {
        ...node.props,
        captureMode: 'guided-face',
        captureLabel: node.props.captureLabel === 'Capture face'
          ? 'Capture now'
          : node.props.captureLabel,
      },
    };
  }
  if (node.id === 'cv_test_intro' && node.type === 'text'
    && node.props.text === 'Capture a face and enter the account email used by the enrolled app user.') {
    return {
      ...node,
      props: { ...node.props, text: 'Capture the enrolled face to unlock this app on this device.' },
    };
  }
  if (automaticVerify && node.id === 'cv_test_status' && node.type === 'text') {
    const text = node.props.text === 'Recognition result: not tested yet. Editor preview uses simulation.'
      ? 'Recognition starts automatically after a clear face is captured.'
      : node.props.text;
    return node.y === 504 || node.y === 568
      ? { ...node, y: 448, props: { ...node.props, text } }
      : { ...node, props: { ...node.props, text } };
  }
  if (automaticVerify && node.id === 'cv_test_back' && (node.y === 576 || node.y === 640)) {
    return { ...node, y: 520 };
  }
  if (!compactLayout) return node;
  if (node.id === 'cv_test_liveness' && node.y === 448) return { ...node, y: 384 };
  if (node.id === 'cv_test_status' && node.y === 568) return { ...node, y: 504 };
  if (node.id === 'cv_test_back' && node.y === 640) return { ...node, y: 576 };
  return node;
}

function normalizeCvTestLogicNode(node: LogicNode): LogicNode {
  if (node.kind !== 'action') return node;
  if (node.id === 'cv_test_action_verify' && node.payload.type === 'cv-verify') {
    const { userId: legacyUserId, ...inputMappings } = node.inputMappings ?? {};
    const removeUserId = legacyUserId?.source === 'component'
      && legacyUserId.nodeId === 'cv_test_email'
      && legacyUserId.property === 'value';
    return {
      ...node,
      ...(removeUserId ? { inputMappings } : {}),
    };
  }
  if (node.payload.type !== 'change-text') return node;
  if (node.id === 'cv_test_status_recognized'
    && node.payload.text === 'Recognition result: Face recognized.') {
    return {
      ...node,
      payload: { ...node.payload, text: 'Recognition result: Face recognized. App unlocked.' },
    };
  }
  if (node.id === 'cv_test_status_verify_error'
    && node.payload.text === 'Recognition result: capture a face and enter the enrolled account email.') {
    return {
      ...node,
      payload: { ...node.payload, text: 'Recognition result: enroll on this device, then capture a face.' },
    };
  }
  return node;
}

function migrateRecordRouteParameters(document: ProjectDocument): ProjectDocument {
  const collectionByTarget = new Map<string, string>();
  for (const sourceScreen of document.screens) {
    for (const graph of sourceScreen.logicGraphs) {
      for (const node of graph.nodes) {
        if (node.kind === 'action' && node.payload.type === 'navigate' && node.payload.recordContext) {
          collectionByTarget.set(node.payload.targetScreenId, node.payload.recordContext.collectionId);
        }
      }
    }
  }
  return {
    screens: document.screens.map((screen) => {
      if (screen.routeParameters?.length) return screen;
      const collectionId = collectionByTarget.get(screen.id);
      if (!collectionId) return screen;
      const existingName = [...screen.path.matchAll(/:([A-Za-z][A-Za-z0-9]*)/g)][0]?.[1] ?? 'recordId';
      const path = screen.path.includes(`:${existingName}`)
        ? screen.path
        : `${screen.path === '/' ? '' : screen.path.replace(/\/$/, '')}/:${existingName}`;
      return {
        ...screen,
        path,
        routeParameters: [{
          name: existingName,
          source: { kind: 'record-id', collectionId, identifierKey: existingName },
        }],
      };
    }),
  };
}

/** Schema-v8 and older ListViews laid out direct children as an implicit flow. */
function migrateListViewItemsToFreeform(nodes: readonly ComponentNode[]): ComponentNode[] {
  return nodes.map((node) => {
    if (!isChildBearingNode(node)) return node;
    if (node.type !== 'listview') {
      return { ...node, children: migrateListViewItemsToFreeform(node.children) };
    }

    const mobile = legacyListViewChildGeometries(node, 'mobile');
    const tablet = legacyListViewChildGeometries(node, 'tablet');
    const desktop = legacyListViewChildGeometries(node, 'desktop');
    return {
      ...node,
      children: node.children.map((child) => migrateListViewItemsToFreeform([
        materializeFreeformGeometry(
          child,
          mobile.get(child.id) ?? geometryAtBreakpoint(child, 'mobile'),
          tablet.get(child.id) ?? geometryAtBreakpoint(child, 'tablet'),
          desktop.get(child.id) ?? geometryAtBreakpoint(child, 'desktop'),
        ),
      ])[0]!),
    };
  });
}

function materializeFreeformGeometry(
  node: ComponentNode,
  mobile: NodeGeometry,
  tablet: NodeGeometry,
  desktop: NodeGeometry,
): ComponentNode {
  const responsive = structuredClone(node.responsive ?? {});
  for (const [breakpoint, geometry, inherited] of [
    ['tablet', tablet, mobile],
    ['desktop', desktop, tablet],
  ] as const) {
    const override = { ...(responsive[breakpoint] ?? {}) };
    for (const field of ['x', 'y', 'w', 'h'] as const) {
      if (geometry[field] === inherited[field]) delete override[field];
      else override[field] = geometry[field];
    }
    if (Object.keys(override).length > 0) responsive[breakpoint] = override;
    else delete responsive[breakpoint];
  }
  return {
    ...node,
    ...mobile,
    responsive: Object.keys(responsive).length > 0 ? responsive : undefined,
  };
}

/** Reproduces the schema-v8 direct-child flow before persisting its result. */
function legacyListViewChildGeometries(
  parent: ListViewNode,
  breakpoint: ResponsiveBreakpoint,
): ReadonlyMap<string, NodeGeometry> {
  const parentGeometry = geometryAtBreakpoint(parent, breakpoint);
  const direction = parent.props.scrollDirection === 'horizontal' ? 'horizontal' : 'vertical';
  const padding = resolveEdgeInsets(parent.props.padding);
  const mainStart = direction === 'vertical' ? padding.top : padding.left;
  const crossStart = direction === 'vertical' ? padding.left : padding.top;
  const crossEnd = direction === 'vertical' ? padding.right : padding.bottom;
  const gap = Math.max(0, parent.props.gap);
  const resolved = new Map<string, NodeGeometry>();
  let cursor = mainStart;

  for (const child of parent.children) {
    const geometry = geometryAtBreakpoint(child, breakpoint);
    if (isHiddenAtBreakpoint(child, breakpoint)) {
      resolved.set(child.id, geometry);
      continue;
    }
    const crossSize = direction === 'vertical' ? parentGeometry.w : parentGeometry.h;
    const childCross = direction === 'vertical' ? geometry.w : geometry.h;
    const availableCross = Math.max(0, crossSize - crossStart - crossEnd);
    let crossOffset = crossStart;
    if (parent.props.crossAxisAlignment === 'center') {
      crossOffset += Math.max(0, availableCross - childCross) / 2;
    }
    if (parent.props.crossAxisAlignment === 'end') {
      crossOffset += Math.max(0, availableCross - childCross);
    }
    const stretchedCross = parent.props.crossAxisAlignment === 'stretch' ? availableCross : childCross;
    resolved.set(child.id, direction === 'vertical'
      ? { x: crossOffset, y: cursor, w: stretchedCross, h: geometry.h }
      : { x: cursor, y: crossOffset, w: geometry.w, h: stretchedCross });
    cursor += (direction === 'vertical' ? geometry.h : geometry.w) + gap;
  }
  return resolved;
}

function uniqueMigratedScreenPath(
  candidate: string,
  index: number,
  takenPaths: ReadonlySet<string>,
): string {
  if (!takenPaths.has(candidate)) return candidate;
  const base = candidate === '/' ? `/screen-${index + 1}` : candidate;
  if (!takenPaths.has(base)) return base;
  let suffix = 2;
  while (takenPaths.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

export function mapProjectToSummary(project: Project): ProjectSummary {
  const firstScreen = project.document.screens[0] ?? null;
  return {
    id: project.id,
    name: project.name,
    projectType: project.projectType,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    screenCount: project.document.screens.length,
    previewScreen: firstScreen,
    ...(project.document.designSystem ? { previewDesignSystem: structuredClone(project.document.designSystem) } : {}),
  };
}

export function mapScreenToDto(screen: Screen): ScreenDTO {
  return {
    id: screen.id,
    name: screen.name,
    path: screen.path,
    ...(screen.routeParameters && screen.routeParameters.length > 0
      ? { routeParameters: structuredClone(screen.routeParameters) }
      : {}),
    ...(screen.appearance ? { appearance: structuredClone(screen.appearance) } : {}),
    nodes: screen.nodes.map(mapNodeToDto),
    behaviors: screen.behaviors.map(mapBehaviorToDto),
    logicGraphs: screen.logicGraphs.map(mapLogicGraphToDto),
  };
}

export function mapScreenFromDto(dto: ScreenDTO, index = 0): Screen {
  const legacyFormMigrations = collectLegacyFormMigrations(dto.nodes);
  const behaviors = dto.behaviors.map(mapBehaviorFromDto);
  const logicGraphs = dto.logicGraphs.map(mapLogicGraphFromDto);
  return {
    id: dto.id,
    name: dto.name,
    path: dto.path ?? (index === 0 ? '/' : `/${dto.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `screen-${index + 1}`}`),
    ...(dto.routeParameters && dto.routeParameters.length > 0
      ? { routeParameters: structuredClone(dto.routeParameters) }
      : {}),
    ...(dto.appearance ? { appearance: structuredClone(dto.appearance) } : {}),
    nodes: dto.nodes.map(mapNodeFromDto),
    behaviors: [
      ...behaviors,
      ...legacyFormMigrations
        .map((migration) => migration.behavior)
        .filter((behavior) => !behaviors.some((candidate) => candidate.id === behavior.id)),
    ],
    logicGraphs: [
      ...logicGraphs,
      ...legacyFormMigrations
        .map((migration) => migration.graph)
        .filter((graph) => !logicGraphs.some((candidate) => candidate.id === graph.id)),
    ],
  };
}

function mapNodeToDto(node: ComponentNode): ComponentNodeDTO {
  const editor = mapNodeEditorToDto(node);
  switch (node.type) {
    case 'button':
      return {
        id: node.id,
        ...editor,
        type: 'button',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        props: {
          label: node.props.label,
          variant: node.props.variant,
          ...(node.props.icon ? { icon: node.props.icon } : {}),
          ...(node.props.iconPosition ? { iconPosition: node.props.iconPosition } : {}),
        },
      };
    case 'text':
      return {
        id: node.id,
        ...editor,
        type: 'text',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        props: {
          text: node.props.text,
          level: node.props.level,
          ...(isTextFontFamily(node.props.fontFamily) ? { fontFamily: node.props.fontFamily.trim() } : {}),
          ...(typeof node.props.fontSize === 'number' && Number.isFinite(node.props.fontSize) && node.props.fontSize > 0
            ? { fontSize: node.props.fontSize }
            : {}),
          ...(isTextFontWeight(node.props.fontWeight) ? { fontWeight: node.props.fontWeight } : {}),
          ...(typeof node.props.lineHeight === 'number' && Number.isFinite(node.props.lineHeight) && node.props.lineHeight > 0 ? { lineHeight: node.props.lineHeight } : {}),
          ...(typeof node.props.letterSpacing === 'number' && Number.isFinite(node.props.letterSpacing) ? { letterSpacing: node.props.letterSpacing } : {}),
          ...(node.props.textAlign ? { textAlign: node.props.textAlign } : {}),
          ...(node.props.fontStyle ? { fontStyle: node.props.fontStyle } : {}),
          ...(node.props.textTransform ? { textTransform: node.props.textTransform } : {}),
          ...(typeof node.props.lineClamp === 'number' && Number.isFinite(node.props.lineClamp) && node.props.lineClamp > 0 ? { lineClamp: Math.floor(node.props.lineClamp) } : {}),
        },
      };
    case 'icon':
      return {
        id: node.id,
        ...editor,
        type: 'icon',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        props: { icon: node.props.icon, label: node.props.label, strokeWidth: node.props.strokeWidth },
      };
    case 'input':
      return {
        id: node.id,
        ...editor,
        type: 'input',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        props: {
          label: node.props.label,
          ...(typeof node.props.showLabel === 'boolean' ? { showLabel: node.props.showLabel } : {}),
          placeholder: node.props.placeholder,
          inputType: node.props.inputType,
          multiline: node.props.multiline,
          ...(node.props.fieldStyle ? { fieldStyle: node.props.fieldStyle } : {}),
        },
      };
    case 'checkbox':
      return {
        id: node.id,
        ...editor,
        type: 'checkbox',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        props: { label: node.props.label, checked: node.props.checked, ...(node.props.fieldStyle ? { fieldStyle: node.props.fieldStyle } : {}) },
      };
    case 'radio':
      return {
        id: node.id,
        ...editor,
        type: 'radio',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        props: { label: node.props.label, options: [...node.props.options], selectedIndex: node.props.selectedIndex },
      };
    case 'switch':
      return {
        id: node.id,
        ...editor,
        type: 'switch',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        props: { label: node.props.label, checked: node.props.checked, ...(node.props.controlsTheme ? { controlsTheme: true } : {}), ...(node.props.fieldStyle ? { fieldStyle: node.props.fieldStyle } : {}) },
      };
    case 'dropdown':
      return {
        id: node.id,
        ...editor,
        type: 'dropdown',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        props: { label: node.props.label, placeholder: node.props.placeholder, options: [...node.props.options], selectedIndex: node.props.selectedIndex, ...(node.props.presentation === 'menu' ? { presentation: 'menu' } : {}), ...(node.props.fieldStyle ? { fieldStyle: node.props.fieldStyle } : {}) },
      };
    case 'slider':
      return {
        id: node.id,
        ...editor,
        type: 'slider',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        props: { label: node.props.label, min: node.props.min, max: node.props.max, step: node.props.step, value: node.props.value },
      };
    case 'progress':
      return {
        id: node.id,
        ...editor,
        type: 'progress',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        props: { label: node.props.label, value: node.props.value, indeterminate: node.props.indeterminate },
      };
    case 'divider':
      return {
        id: node.id,
        ...editor,
        type: 'divider',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        props: { orientation: node.props.orientation, thickness: node.props.thickness },
      };
    case 'camera':
      return {
        id: node.id,
        ...editor,
        type: 'camera',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        props: {
          label: node.props.label,
          facingMode: node.props.facingMode,
          captureLabel: node.props.captureLabel,
          ...(node.props.captureMode ? { captureMode: node.props.captureMode } : {}),
        },
      };
    case 'file-input':
      return {
        id: node.id,
        ...editor,
        type: 'file-input',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        props: { label: node.props.label, helperText: node.props.helperText, accept: [...node.props.accept] },
      };
    case 'chat':
      return {
        id: node.id,
        ...editor,
        type: 'chat',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        props: { ...node.props },
      };
    case 'image':
      return {
        id: node.id,
        ...editor,
        type: 'image',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        props: { src: node.props.src, alt: node.props.alt, fit: node.props.fit },
      };
    case 'column':
      return {
        id: node.id,
        ...editor,
        type: 'column',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        props: {
          mainAxisAlignment: node.props.mainAxisAlignment,
          crossAxisAlignment: node.props.crossAxisAlignment,
          gap: node.props.gap,
          padding: node.props.padding,
        },
        children: node.children.map(mapNodeToDto),
      };
    case 'row':
      return {
        id: node.id,
        ...editor,
        type: 'row',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        props: {
          mainAxisAlignment: node.props.mainAxisAlignment,
          crossAxisAlignment: node.props.crossAxisAlignment,
          gap: node.props.gap,
          padding: node.props.padding,
        },
        children: node.children.map(mapNodeToDto),
      };
    case 'listview':
      return {
        id: node.id,
        ...editor,
        type: 'listview',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        props: {
          emptyText: node.props.emptyText,
          showDividers: node.props.showDividers,
          scrollDirection: node.props.scrollDirection,
          crossAxisAlignment: node.props.crossAxisAlignment,
          gap: node.props.gap,
          padding: node.props.padding,
          itemSpacing: node.props.itemSpacing,
          itemBorderRadius: node.props.itemBorderRadius,
          dataSource: structuredClone(node.props.dataSource),
        },
        children: node.children.map(mapNodeToDto),
      };
    case 'container':
      return {
        id: node.id,
        ...editor,
        type: 'container',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        props: {},
        children: node.children.map(mapNodeToDto),
      };
    case 'gesture-detector':
      return {
        id: node.id,
        ...editor,
        type: 'gesture-detector',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        props: { semanticLabel: node.props.semanticLabel },
        children: node.children.map(mapNodeToDto),
      };
  }
}

function mapNodeFromDto(dto: ComponentNodeDTO): ComponentNode {
  const editor = mapNodeEditorFromDto(dto);
  switch (dto.type) {
    case 'button':
      return {
        id: dto.id,
        ...editor,
        type: 'button',
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
        props: {
          label: dto.props.label,
          variant: dto.props.variant,
          ...(isButtonIconName(dto.props.icon) ? { icon: dto.props.icon } : {}),
          ...(dto.props.iconPosition === 'left'
            || dto.props.iconPosition === 'center'
            || dto.props.iconPosition === 'right'
            ? { iconPosition: dto.props.iconPosition }
            : {}),
        },
      };
    case 'text':
      return {
        id: dto.id,
        ...editor,
        ...(dto.props.dataBinding && !dto.bindings?.some((binding) => binding.target === 'text.content')
          ? {
              bindings: [
                ...(dto.bindings ?? []),
                { target: 'text.content' as const, value: { ...dto.props.dataBinding } },
              ],
            }
          : {}),
        type: 'text',
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
        props: {
          text: dto.props.text,
          level: dto.props.level,
          ...(isTextFontFamily(dto.props.fontFamily) ? { fontFamily: dto.props.fontFamily.trim() } : {}),
          ...(typeof dto.props.fontSize === 'number' && Number.isFinite(dto.props.fontSize) && dto.props.fontSize > 0
            ? { fontSize: dto.props.fontSize }
            : {}),
          ...(isTextFontWeight(dto.props.fontWeight) ? { fontWeight: dto.props.fontWeight } : {}),
          ...(typeof dto.props.lineHeight === 'number' && Number.isFinite(dto.props.lineHeight) && dto.props.lineHeight > 0 ? { lineHeight: dto.props.lineHeight } : {}),
          ...(typeof dto.props.letterSpacing === 'number' && Number.isFinite(dto.props.letterSpacing) ? { letterSpacing: dto.props.letterSpacing } : {}),
          ...(dto.props.textAlign ? { textAlign: dto.props.textAlign } : {}),
          ...(dto.props.fontStyle ? { fontStyle: dto.props.fontStyle } : {}),
          ...(dto.props.textTransform ? { textTransform: dto.props.textTransform } : {}),
          ...(typeof dto.props.lineClamp === 'number' && Number.isFinite(dto.props.lineClamp) && dto.props.lineClamp > 0 ? { lineClamp: Math.floor(dto.props.lineClamp) } : {}),
        },
      };
    case 'icon':
      return {
        id: dto.id,
        ...editor,
        type: 'icon',
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
        props: {
          icon: isAppIconName(dto.props.icon) ? dto.props.icon : 'box',
          label: dto.props.label,
          strokeWidth: Number.isFinite(dto.props.strokeWidth) ? Math.max(0.5, dto.props.strokeWidth) : 1.75,
        },
      };
    case 'input':
      return {
        id: dto.id,
        ...editor,
        type: 'input',
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
        props: {
          label: dto.props.label,
          ...(typeof dto.props.showLabel === 'boolean' ? { showLabel: dto.props.showLabel } : {}),
          placeholder: dto.props.placeholder,
          inputType: dto.props.inputType ?? 'text',
          multiline: dto.props.multiline ?? false,
          ...(dto.props.fieldStyle ? { fieldStyle: dto.props.fieldStyle } : {}),
        },
      };
    case 'checkbox':
      return {
        id: dto.id,
        ...editor,
        type: 'checkbox',
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
        props: { label: dto.props.label, checked: dto.props.checked, ...(dto.props.fieldStyle ? { fieldStyle: dto.props.fieldStyle } : {}) },
      };
    case 'radio':
      return {
        id: dto.id,
        ...editor,
        type: 'radio',
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
        props: { label: dto.props.label, options: [...dto.props.options], selectedIndex: dto.props.selectedIndex },
      };
    case 'switch':
      return {
        id: dto.id,
        ...editor,
        type: 'switch',
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
        props: { label: dto.props.label, checked: dto.props.checked, ...(dto.props.controlsTheme ? { controlsTheme: true } : {}), ...(dto.props.fieldStyle ? { fieldStyle: dto.props.fieldStyle } : {}) },
      };
    case 'dropdown':
      return {
        id: dto.id,
        ...editor,
        type: 'dropdown',
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
        props: { label: dto.props.label, placeholder: dto.props.placeholder, options: [...dto.props.options], selectedIndex: dto.props.selectedIndex, ...(dto.props.presentation === 'menu' ? { presentation: 'menu' } : {}), ...(dto.props.fieldStyle ? { fieldStyle: dto.props.fieldStyle } : {}) },
      };
    case 'slider':
      return {
        id: dto.id,
        ...editor,
        type: 'slider',
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
        props: { label: dto.props.label, min: dto.props.min, max: dto.props.max, step: dto.props.step, value: dto.props.value },
      };
    case 'progress':
      return {
        id: dto.id,
        ...editor,
        type: 'progress',
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
        props: { label: dto.props.label, value: dto.props.value, indeterminate: dto.props.indeterminate },
      };
    case 'divider':
      return {
        id: dto.id,
        ...editor,
        type: 'divider',
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
        props: { orientation: dto.props.orientation, thickness: dto.props.thickness },
      };
    case 'camera':
      return {
        id: dto.id,
        ...editor,
        type: 'camera',
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
        props: {
          label: dto.props.label,
          facingMode: dto.props.facingMode,
          captureLabel: dto.props.captureLabel,
          ...(dto.props.captureMode ? { captureMode: dto.props.captureMode } : {}),
        },
      };
    case 'file-input':
      return {
        id: dto.id,
        ...editor,
        type: 'file-input',
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
        props: { label: dto.props.label, helperText: dto.props.helperText, accept: [...dto.props.accept] },
      };
    case 'chat':
      return {
        id: dto.id,
        ...editor,
        type: 'chat',
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
        props: { ...dto.props },
      };
    case 'image':
      return {
        id: dto.id,
        ...editor,
        type: 'image',
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
        props: { src: dto.props.src, alt: dto.props.alt, fit: dto.props.fit },
      };
    case 'list':
      return migrateLegacyListNode(dto, editor);
    case 'repeater':
      return migrateLegacyRepeaterNode(dto, editor);
    case 'column':
      return {
        id: dto.id,
        ...editor,
        type: 'column',
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
        props: {
          mainAxisAlignment: dto.props.mainAxisAlignment,
          crossAxisAlignment: dto.props.crossAxisAlignment,
          gap: dto.props.gap,
          padding: normalizePadding(dto.props.padding),
        },
        children: dto.children.map(mapNodeFromDto),
      };
    case 'row':
      return {
        id: dto.id,
        ...editor,
        type: 'row',
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
        props: {
          mainAxisAlignment: dto.props.mainAxisAlignment,
          crossAxisAlignment: dto.props.crossAxisAlignment,
          gap: dto.props.gap,
          padding: normalizePadding(dto.props.padding),
        },
        children: dto.children.map(mapNodeFromDto),
      };
    case 'listview':
      return {
        id: dto.id,
        ...editor,
        type: 'listview',
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
        props: {
          emptyText: dto.props.emptyText,
          showDividers: dto.props.showDividers,
          scrollDirection: dto.props.scrollDirection,
          crossAxisAlignment: dto.props.crossAxisAlignment,
          gap: dto.props.gap,
          padding: normalizePadding(dto.props.padding),
          itemSpacing: dto.props.itemSpacing ?? 0,
          itemBorderRadius: dto.props.itemBorderRadius ?? 0,
          dataSource: mapListViewDataSourceFromDto(dto.props.dataSource, dto.id),
        },
        children: dto.children.map(mapNodeFromDto),
      };
    case 'container':
      return {
        id: dto.id,
        ...editor,
        type: 'container',
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
        props: {},
        children: dto.children.map(mapNodeFromDto),
      };
    case 'gesture-detector':
      return {
        id: dto.id,
        ...editor,
        type: 'gesture-detector',
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
        props: { semanticLabel: dto.props.semanticLabel || 'Open item' },
        children: dto.children.map(mapNodeFromDto),
      };
    case 'form':
      return migrateLegacyFormNode(dto, editor);
  }
}

type NodeEditorMetadata = Partial<Pick<ComponentNode, 'name' | 'isHidden' | 'isLocked' | 'appearance' | 'responsive' | 'bindings'>>;

function mapListViewDataSourceFromDto(
  source: Extract<ComponentNodeDTO, { type: 'listview' }>['props']['dataSource'],
  listViewId: string,
): ListViewDataSource {
  if (source.kind === 'collection') return structuredClone(source);
  if ('fields' in source) return structuredClone(source);
  return migrateStaticStrings(source.items, listViewId);
}

function migrateStaticStrings(items: readonly string[], listViewId: string): ListViewDataSource {
  return {
    kind: 'static',
    fields: [{ id: 'value', label: 'Value', type: 'text' }],
    items: items.map((value, index) => ({
      id: `${listViewId}__static_${index + 1}`,
      values: { value },
    })),
  };
}

function migrateLegacyListNode(
  dto: Extract<ComponentNodeDTO, { type: 'list' }>,
  editor: NodeEditorMetadata,
): ComponentNode {
  const source: ListViewDataSource = dto.props.dataSource?.kind === 'collection'
    ? {
        kind: 'collection',
        collectionId: dto.props.dataSource.collectionId,
        displayFieldIds: [dto.props.dataSource.displayFieldId],
      }
    : migrateStaticStrings(dto.props.items, dto.id);
  const fieldId = source.kind === 'collection' ? source.displayFieldIds[0] || 'value' : 'value';
  return {
    id: dto.id,
    ...editor,
    type: 'listview',
    x: dto.x,
    y: dto.y,
    w: dto.w,
    h: dto.h,
    props: {
      emptyText: 'No items yet',
      showDividers: dto.props.showDividers ?? true,
      scrollDirection: 'vertical',
      crossAxisAlignment: 'stretch',
      gap: 0,
      padding: createPadding(0),
      itemSpacing: 0,
      itemBorderRadius: 0,
      dataSource: source,
    },
    children: [boundItemText(`${dto.id}__item_text`, fieldId, Math.max(1, dto.w), 44)],
  };
}

function migrateLegacyRepeaterNode(
  dto: Extract<ComponentNodeDTO, { type: 'repeater' }>,
  editor: NodeEditorMetadata,
): ComponentNode {
  const source: ListViewDataSource = dto.props.dataSource?.kind === 'collection'
    ? structuredClone(dto.props.dataSource)
    : migrateStaticStrings(dto.props.dataSource?.items ?? [], dto.id);
  const fieldIds = source.kind === 'collection'
    ? source.displayFieldIds
    : ['title', 'snippet'];
  return {
    id: dto.id,
    ...editor,
    type: 'listview',
    x: dto.x,
    y: dto.y,
    w: dto.w,
    h: dto.h,
    props: {
      emptyText: dto.props.emptyText ?? 'No records yet',
      showDividers: dto.props.showDividers ?? true,
      scrollDirection: 'vertical',
      crossAxisAlignment: 'stretch',
      gap: 0,
      padding: createPadding(0),
      itemSpacing: 0,
      itemBorderRadius: 0,
      dataSource: source,
    },
    children: (fieldIds.length > 0 ? fieldIds : ['value']).map((fieldId, index) =>
      boundItemText(`${dto.id}__item_text_${index}`, fieldId, Math.max(1, dto.w), 24)),
  };
}

function boundItemText(id: string, fieldId: string, width: number, height: number): TextNode {
  return {
    id,
    type: 'text',
    x: 0,
    y: 0,
    w: width,
    h: height,
    props: {
      text: fieldId === 'value' ? 'List item' : fieldId,
      level: 'body',
    },
    bindings: [{ target: 'text.content', value: { source: 'list-item', fieldId } }],
  };
}

function migrateLegacyFormNode(dto: LegacyFormNodeDTO, editor: NodeEditorMetadata): ColumnNode {
  const contentWidth = Math.max(1, dto.w - 32);
  const title: TextNode = {
    id: `${dto.id}__title`,
    type: 'text',
    x: 0,
    y: 0,
    w: contentWidth,
    h: 28,
    props: { text: dto.props.title, level: 'title' },
  };
  const fields: ComponentNode[] = dto.props.fields.map((field, index) => ({
    id: `${dto.id}__field_${index}`,
    type: 'input',
    x: 0,
    y: 0,
    w: contentWidth,
    h: 44,
    props: {
      label: field.label,
      placeholder: field.placeholder,
      inputType: field.type,
      multiline: false,
    },
  }));
  const submit: ComponentNode = {
    id: `${dto.id}__submit`,
    type: 'button',
    x: 0,
    y: 0,
    w: contentWidth,
    h: 44,
    props: { label: dto.props.submitLabel, variant: 'solid' },
  };
  return {
    id: dto.id,
    ...editor,
    type: 'column',
    x: dto.x,
    y: dto.y,
    w: dto.w,
    h: dto.h,
    props: {
      mainAxisAlignment: 'start',
      crossAxisAlignment: 'stretch',
      gap: 12,
      padding: createPadding(16),
    },
    children: [title, ...fields, submit],
  };
}

interface LegacyFormMigration {
  behavior: Behavior;
  graph: LogicGraph;
}

function collectLegacyFormMigrations(nodes: readonly ComponentNodeDTO[]): LegacyFormMigration[] {
  const migrations: LegacyFormMigration[] = [];
  for (const node of nodes) {
    if (node.type === 'form' && node.props.dataBinding) {
      const triggerId = `${node.id}__submit_trigger`;
      const actionId = `${node.id}__submit_action`;
      const graphId = `${node.id}__submit_graph`;
      const submitId = `${node.id}__submit`;
      const inputMappings: ActionInputMappings = {};
      const values: Record<string, string> = {};
      for (const binding of node.props.dataBinding.fields) {
        if (!binding.dataFieldId) continue;
        values[binding.dataFieldId] = '';
        inputMappings[binding.dataFieldId] = {
          source: 'component',
          nodeId: `${node.id}__field_${binding.formFieldIndex}`,
          property: 'value',
        };
      }
      migrations.push({
        behavior: {
          id: `${node.id}__submit_behavior`,
          name: `Submit ${node.props.title}`,
          event: 'click',
          graphId,
          targetNodeId: submitId,
        },
        graph: {
          id: graphId,
          name: `Submit ${node.props.title}`,
          sourceNodeId: submitId,
          nodes: [
            { kind: 'trigger', id: triggerId, event: 'click', position: { x: 80, y: 160 } },
            {
              kind: 'action',
              id: actionId,
              position: { x: 312, y: 160 },
              payload: {
                type: 'insert-record',
                collectionId: node.props.dataBinding.collectionId,
                values,
              },
              inputMappings,
            },
          ],
          edges: [{
            id: `${node.id}__submit_edge`,
            fromNodeId: triggerId,
            fromPort: 'next',
            toNodeId: actionId,
            toPort: 'in',
          }],
        },
      });
    }
    if (node.type === 'container' || node.type === 'column' || node.type === 'row' || node.type === 'listview') {
      migrations.push(...collectLegacyFormMigrations(node.children));
    }
  }
  return migrations;
}

function mapNodeEditorToDto(
  node: ComponentNode,
): Partial<Pick<ComponentNodeDTO, 'name' | 'isHidden' | 'isLocked' | 'styleId' | 'appearance' | 'responsive' | 'bindings'>> {
  return compactEditorMetadata(
    node.name,
    node.isHidden,
    node.isLocked,
    node.styleId,
    node.appearance,
    normalizeResponsiveOverrides(node.responsive),
    node.bindings,
  );
}

function mapNodeEditorFromDto(
  dto: ComponentNodeDTO,
): Partial<Pick<ComponentNode, 'name' | 'isHidden' | 'isLocked' | 'styleId' | 'appearance' | 'responsive' | 'bindings'>> {
  return compactEditorMetadata(
    dto.name,
    dto.isHidden,
    dto.isLocked,
    dto.styleId,
    dto.appearance,
    normalizeResponsiveOverrides(dto.responsive),
    dto.bindings,
  );
}

/**
 * API canonicalization before this migration expanded omitted responsive
 * fields to null. Omission means inheritance in the domain model, so compact
 * null/undefined values and retain only typed geometry/visibility overrides.
 */
function normalizeResponsiveOverrides(value: unknown): ResponsiveGeometry | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const source = value as Record<string, unknown>;
  const normalized: ResponsiveGeometry = {};
  for (const breakpoint of ['tablet', 'desktop'] as const) {
    const candidate = source[breakpoint];
    if (!candidate || typeof candidate !== 'object') continue;
    const raw = candidate as Record<string, unknown>;
    const geometry: Partial<NodeGeometry> = {};
    for (const field of ['x', 'y', 'w', 'h'] as const) {
      const fieldValue = raw[field];
      if (typeof fieldValue === 'number' && Number.isFinite(fieldValue)) {
        geometry[field] = fieldValue;
      }
    }
    const override: ResponsiveNodeOverrides = {
      ...geometry,
      ...(typeof raw.isHidden === 'boolean' ? { isHidden: raw.isHidden } : {}),
      ...(raw.appearance && typeof raw.appearance === 'object'
        ? { appearance: structuredClone(raw.appearance as ResponsiveNodeOverrides['appearance']) }
        : {}),
      ...(raw.textStyle && typeof raw.textStyle === 'object'
        ? { textStyle: structuredClone(raw.textStyle as ResponsiveNodeOverrides['textStyle']) }
        : {}),
    };
    if (Object.keys(override).length > 0) normalized[breakpoint] = override;
  }
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function compactEditorMetadata(
  name: string | undefined,
  isHidden: boolean | undefined,
  isLocked: boolean | undefined,
  styleId: string | undefined,
  appearance: ComponentNode['appearance'],
  responsive: ComponentNode['responsive'],
  bindings: ComponentNode['bindings'],
): { name?: string; isHidden?: boolean; isLocked?: boolean; styleId?: string; appearance?: ComponentNode['appearance']; responsive?: ComponentNode['responsive']; bindings?: ComponentNode['bindings'] } {
  return {
    ...(name !== undefined ? { name } : {}),
    ...(isHidden !== undefined ? { isHidden } : {}),
    ...(isLocked !== undefined ? { isLocked } : {}),
    ...(styleId !== undefined ? { styleId } : {}),
    ...(appearance !== undefined ? { appearance: structuredClone(appearance) } : {}),
    ...(responsive !== undefined ? { responsive: structuredClone(responsive) } : {}),
    ...(bindings !== undefined ? { bindings: structuredClone(bindings) } : {}),
  };
}

function mapBehaviorToDto(behavior: Behavior): BehaviorDTO {
  return {
    id: behavior.id,
    name: behavior.name,
    event: behavior.event,
    graphId: behavior.graphId,
    targetNodeId: behavior.targetNodeId,
  };
}

function mapBehaviorFromDto(dto: BehaviorDTO): Behavior {
  return {
    id: dto.id,
    name: dto.name,
    event: dto.event,
    graphId: dto.graphId,
    targetNodeId: dto.targetNodeId,
  };
}

function mapLogicGraphToDto(graph: LogicGraph): LogicGraphDTO {
  return {
    id: graph.id,
    name: graph.name,
    sourceNodeId: graph.sourceNodeId,
    ...(graph.purpose ? { purpose: graph.purpose } : {}),
    nodes: graph.nodes.map(mapLogicNodeToDto),
    edges: graph.edges.map(mapEdgeToDto),
  };
}

function mapLogicGraphFromDto(dto: LogicGraphDTO): LogicGraph {
  const migratedDto = migrateLegacyRagGraphDto(dto);
  const graph: LogicGraph = {
    id: migratedDto.id,
    name: migratedDto.name,
    sourceNodeId: migratedDto.sourceNodeId,
    ...(migratedDto.purpose ? { purpose: migratedDto.purpose } : {}),
    nodes: migratedDto.nodes.map((node, index) => mapLogicNodeFromDto(node, index)),
    edges: migratedDto.edges.map((edge, index) => mapEdgeFromDto(edge, migratedDto.id, index)),
  };
  const trigger = graph.nodes.find((node) => node.kind === 'trigger');
  return normalizeLogicGraph(graph, trigger?.event ?? 'click');
}

function mapLogicNodeToDto(node: LogicNode): LogicNodeDTO {
  return structuredClone(node);
}

function mapLogicNodeFromDto(dto: LogicNodeDTO, index: number): LogicNode {
  const position = dto.position ?? { x: 80 + index * 232, y: 160 };
  return { ...structuredClone(dto), position } as unknown as LogicNode;
}

function migrateLegacyRagGraphDto(dto: LogicGraphDTO): LogicGraphDTO {
  const replacements = new Map<string, { firstId: string; lastId: string }>();
  const nodes: LogicNodeDTO[] = [];
  const internalEdges: LogicEdgeDTO[] = [];
  let inferredPurpose = dto.purpose;

  for (const node of dto.nodes) {
    if (node.kind !== 'action' || !isLegacyRagType(node.payload.type)) {
      nodes.push(node);
      continue;
    }
    const base = node.position ?? { x: 312, y: 160 };
    const chain = legacyRagReplacementNodes(node, base);
    nodes.push(...chain);
    replacements.set(node.id, { firstId: chain[0]!.id, lastId: chain.at(-1)!.id });
    inferredPurpose = node.payload.type === 'rag-query' ? 'chat' : inferredPurpose ?? 'ingestion';
    for (let index = 0; index < chain.length - 1; index += 1) {
      const current = chain[index]!;
      const next = chain[index + 1]!;
      internalEdges.push({
        id: `edge_${node.id}_migration_${index + 1}`,
        fromNodeId: current.id,
        fromPort: migratedOutputPort(current),
        toNodeId: next.id,
        toPort: 'in',
      });
    }
  }

  if (replacements.size === 0) return dto;
  const edges = dto.edges.map((edge) => ({
    ...edge,
    fromNodeId: replacements.get(edge.fromNodeId)?.lastId ?? edge.fromNodeId,
    toNodeId: replacements.get(edge.toNodeId)?.firstId ?? edge.toNodeId,
  }));
  return { ...dto, purpose: inferredPurpose, nodes, edges: [...edges, ...internalEdges] };
}

function isLegacyRagType(type: string): type is 'rag-index' | 'rag-query' | 'rag-remove' {
  return type === 'rag-index' || type === 'rag-query' || type === 'rag-remove';
}

function legacyRagReplacementNodes(
  node: Extract<LogicNodeDTO, { kind: 'action' }>,
  base: { x: number; y: number },
): Array<Extract<LogicNodeDTO, { kind: 'action' }>> {
  const position = (offset: number) => ({ x: base.x + offset * 232, y: base.y });
  if (node.payload.type === 'rag-index') {
    const splitId = `${node.id}__split`;
    const embeddingId = `${node.id}__embedding`;
    return [
      { kind: 'action', id: node.id, position: position(0), payload: { type: 'document-load', source: 'inline', sourceReference: '', documentId: node.payload.documentId, title: node.payload.title, text: node.payload.content, metadata: {} }, inputMappings: node.inputMappings },
      { kind: 'action', id: splitId, position: position(1), payload: { type: 'text-split', strategy: 'recursive-character', chunkSize: 700, chunkOverlap: 100, separators: ['\n\n', '\n', '. ', ' '] }, inputMappings: { documents: { source: 'node-output', nodeId: node.id, path: 'documents' } } },
      { kind: 'action', id: embeddingId, position: position(2), payload: { type: 'embedding-generate', connectionProfileId: '', model: '', batchSize: 32 }, inputMappings: { chunks: { source: 'node-output', nodeId: splitId, path: 'chunks' } } },
      { kind: 'action', id: `${node.id}__upsert`, position: position(3), payload: { type: 'vector-upsert', connectionProfileId: node.payload.knowledgeBaseId ?? '', indexName: node.payload.knowledgeBaseId ?? '', namespace: '', conflictMode: 'upsert' }, inputMappings: { chunks: { source: 'node-output', nodeId: splitId, path: 'chunks' }, embeddings: { source: 'node-output', nodeId: embeddingId, path: 'embeddings' } } },
    ];
  }
  if (node.payload.type === 'rag-query') {
    const queryEmbeddingId = `${node.id}__query_embedding`;
    const retrieverId = `${node.id}__retriever`;
    const promptId = `${node.id}__prompt`;
    return [
      { kind: 'action', id: node.id, position: position(0), payload: { type: 'chat-input', componentId: '', staticQuestion: node.payload.query }, inputMappings: node.inputMappings?.query ? { question: node.inputMappings.query } : undefined },
      { kind: 'action', id: queryEmbeddingId, position: position(1), payload: { type: 'query-embedding', connectionProfileId: '', model: '' }, inputMappings: { question: { source: 'node-output', nodeId: node.id, path: 'question' } } },
      { kind: 'action', id: retrieverId, position: position(2), payload: { type: 'vector-retrieve', connectionProfileId: node.payload.knowledgeBaseId ?? '', indexName: node.payload.knowledgeBaseId ?? '', namespace: '', topK: node.payload.topK ?? 5, minimumScore: 0, metadataFilter: {} }, inputMappings: { question: { source: 'node-output', nodeId: node.id, path: 'question' }, queryEmbedding: { source: 'node-output', nodeId: queryEmbeddingId, path: 'embeddingReference' } } },
      { kind: 'action', id: promptId, position: position(3), payload: { type: 'prompt-template', template: 'Answer the question using only the supplied context.\n\nContext:\n{context}\n\nQuestion:\n{question}', contextSeparator: '\n\n---\n\n', emptyContextBehavior: 'return-empty' }, inputMappings: { question: { source: 'node-output', nodeId: node.id, path: 'question' }, matches: { source: 'node-output', nodeId: retrieverId, path: 'matches' } } },
      { kind: 'action', id: `${node.id}__llm`, position: position(4), payload: { type: 'llm-generate', connectionProfileId: '', model: '', systemPrompt: '', temperature: 0.2, maxTokens: 800 }, inputMappings: { prompt: { source: 'node-output', nodeId: promptId, path: 'prompt' }, matches: { source: 'node-output', nodeId: retrieverId, path: 'matches' } } },
    ];
  }
  if (node.payload.type === 'rag-remove') {
    return [{ kind: 'action', id: node.id, position: position(0), payload: { type: 'vector-delete', connectionProfileId: node.payload.knowledgeBaseId ?? '', indexName: node.payload.knowledgeBaseId ?? '', namespace: '', documentId: node.payload.documentId }, inputMappings: node.inputMappings }];
  }
  throw new Error(`Unsupported legacy RAG payload in node ${node.id}.`);
}

function migratedOutputPort(node: Extract<LogicNodeDTO, { kind: 'action' }>): 'next' | 'success' {
  return node.payload.type === 'text-split' || node.payload.type === 'chat-input' || node.payload.type === 'prompt-template'
    ? 'next'
    : 'success';
}

function mapEdgeToDto(edge: LogicEdge): LogicEdgeDTO {
  return { ...edge };
}

function mapEdgeFromDto(dto: LogicEdgeDTO, graphId: string, index: number): LogicEdge {
  return {
    id: dto.id ?? `edge_${graphId}_${index + 1}`,
    fromNodeId: dto.fromNodeId,
    fromPort: dto.fromPort ?? 'next',
    toNodeId: dto.toNodeId,
    toPort: dto.toPort ?? 'in',
    ...(dto.kind || (dto.toPort && dto.toPort !== 'in')
      ? { kind: dto.kind ?? 'resource' as const }
      : {}),
  };
}
