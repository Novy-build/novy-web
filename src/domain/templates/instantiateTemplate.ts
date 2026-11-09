import type { ComponentNode } from '../entities/componentNode';
import { isChildBearingNode } from '../entities/componentNode';
import type { ActionPayload } from '../entities/logic';
import type { Project } from '../entities/project';
import type { ProjectDocument } from '../entities/screen';
import type { Template } from '../entities/template';
import type { AppDataRepository } from '../repositories/appData.repository';
import type { ProjectRepository } from '../repositories/project.repository';

export interface TemplateInstantiationRepositories {
  projects: ProjectRepository;
  appData: AppDataRepository;
}

/**
 * Creates a project and provisions any database blueprint shipped by its
 * starter template. Template collection aliases are replaced with the real,
 * project-scoped IDs returned by the data repository.
 */
export async function instantiateTemplateProject(
  name: string,
  template: Template,
  repositories: TemplateInstantiationRepositories,
): Promise<Project> {
  const project = await repositories.projects.createProject(name, template);
  if (!template.data || template.data.collections.length === 0) return project;

  let databaseId: string | null = null;
  try {
    const database = await repositories.appData.createDatabase(project.id, {
      name: template.data.databaseName,
    });
    databaseId = database.id;
    const collectionIds = new Map<string, string>();

    for (const blueprint of template.data.collections) {
      const collection = await repositories.appData.createCollection(project.id, {
        databaseId: database.id,
        name: blueprint.name,
        fields: structuredClone(blueprint.fields),
      });
      collectionIds.set(blueprint.referenceId, collection.id);
      for (const values of blueprint.records ?? []) {
        await repositories.appData.createRecord(project.id, collection.id, structuredClone(values));
      }
    }

    const document = remapTemplateCollectionReferences(project.document, collectionIds);
    return await repositories.projects.saveProjectDocument(project.id, document);
  } catch (error: unknown) {
    if (databaseId) {
      await repositories.appData.deleteDatabase(project.id, databaseId).catch(() => undefined);
    }
    await repositories.projects.deleteProject(project.id).catch(() => undefined);
    throw error;
  }
}

/** Returns a cloned document whose template collection aliases use live IDs. */
export function remapTemplateCollectionReferences(
  document: ProjectDocument,
  collectionIds: ReadonlyMap<string, string>,
): ProjectDocument {
  return {
    screens: document.screens.map((screen) => ({
      ...screen,
      nodes: screen.nodes.map((node) => remapComponentNode(node, collectionIds)),
      logicGraphs: screen.logicGraphs.map((graph) => ({
        ...graph,
        nodes: graph.nodes.map((node) => node.kind === 'action'
          ? { ...node, payload: remapActionPayload(node.payload, collectionIds) }
          : node),
      })),
    })),
  };
}

function remapComponentNode(
  node: ComponentNode,
  collectionIds: ReadonlyMap<string, string>,
): ComponentNode {
  if (isChildBearingNode(node)) {
    const children = node.children.map((child) => remapComponentNode(child, collectionIds));
    if (node.type === 'listview' && node.props.dataSource.kind === 'collection') {
      return {
        ...node,
        props: {
          ...node.props,
          dataSource: {
            ...node.props.dataSource,
            collectionId: collectionIds.get(node.props.dataSource.collectionId)
              ?? node.props.dataSource.collectionId,
          },
        },
        children,
      };
    }
    return { ...node, children };
  }
  return node;
}

function remapActionPayload(
  payload: ActionPayload,
  collectionIds: ReadonlyMap<string, string>,
): ActionPayload {
  const collectionId = 'collectionId' in payload && typeof payload.collectionId === 'string'
    ? collectionIds.get(payload.collectionId) ?? payload.collectionId
    : undefined;
  if (payload.type === 'navigate' && payload.recordContext) {
    return {
      ...payload,
      recordContext: {
        ...payload.recordContext,
        collectionId: collectionIds.get(payload.recordContext.collectionId)
          ?? payload.recordContext.collectionId,
      },
    };
  }
  if (collectionId !== undefined && 'collectionId' in payload) {
    return { ...payload, collectionId } as ActionPayload;
  }
  return payload;
}
