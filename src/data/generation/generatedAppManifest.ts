import type { DataCollection, ProjectDatabase } from '@domain/entities/appData';
import { isChildBearingNode, type ComponentNode } from '@domain/entities/componentNode';
import type { ActionPayload, ValueExpression } from '@domain/entities/logic';
import type { Project } from '@domain/entities/project';
import type {
  GeneratedAppManifestDTO,
  RuntimeCapabilityId,
  RuntimeRequirementDTO,
} from '../dto/generatedApp.dto';
import { mapCollectionToDto, mapDatabaseToDto } from '../mappers/appData.mapper';
import { mapProjectToDto } from '../mappers/project.mapper';
import { mapProjectToGeneratedLayout } from './generatedLayout';

interface CapabilityDefinition {
  configurationOwner: RuntimeRequirementDTO['configurationOwner'];
  requiredBinding: string;
}

const CAPABILITY_DEFINITIONS: Readonly<Record<RuntimeCapabilityId, CapabilityDefinition>> = {
  authentication: { configurationOwner: 'backend', requiredBinding: 'auth.session' },
  database: { configurationOwner: 'backend', requiredBinding: 'data.repository' },
  email: { configurationOwner: 'backend', requiredBinding: 'email.delivery' },
  rag: { configurationOwner: 'backend', requiredBinding: 'rag.knowledge-index' },
  'computer-vision': { configurationOwner: 'backend', requiredBinding: 'vision.biometrics' },
  camera: { configurationOwner: 'browser', requiredBinding: 'browser.camera-permission' },
  deployment: { configurationOwner: 'backend', requiredBinding: 'deployment.provider' },
};

export function buildGeneratedAppManifest(
  project: Project,
  database: ProjectDatabase | null,
  collections: readonly DataCollection[],
  generatedAt = new Date(),
): GeneratedAppManifestDTO {
  const sources = new Map<RuntimeCapabilityId, Set<string>>();
  const requireCapability = (capability: RuntimeCapabilityId, source: string): void => {
    const current = sources.get(capability) ?? new Set<string>();
    current.add(source);
    sources.set(capability, current);
  };

  requireCapability('deployment', project.id);
  if (database || collections.length > 0) requireCapability('database', database?.id ?? project.id);

  for (const screen of project.document.screens) {
    for (const node of flattenNodes(screen.nodes)) {
      detectNodeCapabilities(node, requireCapability);
    }
    for (const graph of screen.logicGraphs) {
      for (const node of graph.nodes) {
        if (node.kind === 'condition') detectExpressionCapability(node.left, node.id, requireCapability);
        if (node.kind !== 'action') continue;
        detectActionCapabilities(node.payload, node.id, requireCapability);
        for (const expression of Object.values(node.inputMappings ?? {})) {
          detectExpressionCapability(expression, node.id, requireCapability);
        }
      }
    }
  }

  const requirements = [...sources.entries()]
    .map(([capability, requiredBy]): RuntimeRequirementDTO => ({
      capability,
      ...CAPABILITY_DEFINITIONS[capability],
      requiredBy: [...requiredBy].sort(),
    }))
    .sort((left, right) => left.capability.localeCompare(right.capability));

  return {
    manifestVersion: 1,
    generatedAt: generatedAt.toISOString(),
    project: mapProjectToDto(project),
    layout: mapProjectToGeneratedLayout(project),
    appData: {
      database: database ? mapDatabaseToDto(database) : null,
      collections: collections.map(mapCollectionToDto),
      recordsIncluded: false,
    },
    runtime: {
      requirements,
      routes: project.document.screens.map((screen) => ({ screenId: screen.id, path: screen.path })),
      responsiveBreakpoints: { tabletMinWidth: 768, desktopMinWidth: 1024 },
    },
    security: {
      secretsIncluded: false,
      rawMediaIncluded: false,
      biometricTemplatesIncluded: false,
    },
  };
}

export function generatedAppManifestFilename(projectName: string): string {
  const slug = projectName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug || 'novy-project'}-handoff.json`;
}

function flattenNodes(nodes: readonly ComponentNode[]): ComponentNode[] {
  return nodes.flatMap((node) => isChildBearingNode(node)
    ? [node, ...flattenNodes(node.children)]
    : [node]);
}

function detectNodeCapabilities(
  node: ComponentNode,
  requireCapability: (capability: RuntimeCapabilityId, source: string) => void,
): void {
  if (node.type === 'camera') requireCapability('camera', node.id);
  if (node.type === 'listview' && node.props.dataSource.kind === 'collection') {
    requireCapability('database', node.id);
  }
}

function detectActionCapabilities(
  payload: ActionPayload,
  source: string,
  requireCapability: (capability: RuntimeCapabilityId, source: string) => void,
): void {
  switch (payload.type) {
    case 'get-record':
    case 'get-records':
    case 'insert-record':
    case 'update-record':
    case 'delete-record':
    case 'refresh-collection':
      requireCapability('database', source);
      return;
    case 'send-email':
      requireCapability('email', source);
      return;
    case 'document-load':
    case 'text-split':
    case 'embedding-generate':
    case 'vector-upsert':
    case 'vector-delete':
    case 'chat-input':
    case 'query-embedding':
    case 'vector-retrieve':
    case 'rerank':
    case 'prompt-template':
    case 'llm-generate':
    case 'chat-output':
    case 'memory':
    case 'vector-store':
    case 'chat-model':
    case 'ai-agent':
      requireCapability('rag', source);
      return;
    case 'cv-liveness':
    case 'cv-enroll':
    case 'cv-verify':
      requireCapability('computer-vision', source);
      requireCapability('authentication', source);
      return;
    case 'add-local-list-item':
      // Local ListView state is provided by the generated client runtime and needs no backend binding.
      return;
    default:
      return;
  }
}

function detectExpressionCapability(
  expression: ValueExpression,
  source: string,
  requireCapability: (capability: RuntimeCapabilityId, source: string) => void,
): void {
  if (expression.source === 'session') requireCapability('authentication', source);
}
