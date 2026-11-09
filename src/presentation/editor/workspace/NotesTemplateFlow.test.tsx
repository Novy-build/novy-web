import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TEMPLATE_CATALOG } from '@data/templates/templateCatalog';
import { createLocalRepositories } from '@data/repositories/local';
import type { DataValue } from '@domain/entities/appData';
import { instantiateTemplateProject } from '@domain/templates/instantiateTemplate';
import { PreviewOverlay, type PreviewPersistenceActions } from './PreviewOverlay';

beforeEach(() => window.localStorage.clear());

describe('Notes starter template Preview flow', () => {
  it('adds, opens, edits, and deletes notes from detail and card-menu actions', async () => {
    const repositories = createLocalRepositories({ latencyMs: 0 });
    const template = TEMPLATE_CATALOG.find((candidate) => candidate.id === 'template_notes')!;
    const project = await instantiateTemplateProject('Notes demo', template, repositories);
    const collections = await repositories.appData.listCollections(project.id);
    const collection = collections[0]!;
    const initialRecords = await repositories.appData.listRecords(project.id, collection.id);
    const persistence: PreviewPersistenceActions = {
      createRecord: (collectionId, values: Record<string, DataValue>) =>
        repositories.appData.createRecord(project.id, collectionId, values),
      updateRecord: (collectionId, recordId, values) =>
        repositories.appData.updateRecord(project.id, collectionId, recordId, values),
      deleteRecord: (collectionId, recordId) =>
        repositories.appData.deleteRecord(project.id, collectionId, recordId),
    };

    render(
      <PreviewOverlay
        collections={collections}
        initialDevice="mobile"
        onClose={vi.fn()}
        persistence={persistence}
        projectName={project.name}
        recordsByCollection={new Map([[collection.id, initialRecords]])}
        screens={project.document.screens}
      />,
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'Save data changes' }));

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    fireEvent.change(await screen.findByLabelText('Title'), { target: { value: 'Trip list' } });
    fireEvent.change(screen.getByLabelText('Content'), { target: { value: 'Passport and charger' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save note' }));
    expect(await screen.findByText('Trip list')).toBeInTheDocument();
    expect(await repositories.appData.listRecords(project.id, collection.id)).toHaveLength(4);

    fireEvent.click(screen.getByText('Trip list'));
    expect(await screen.findByRole('button', { name: 'Edit note' })).toBeInTheDocument();
    expect(screen.getByText('Passport and charger')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit note' }));
    await waitFor(() => expect(screen.getByLabelText('Title')).toHaveValue('Trip list'));
    expect(screen.getByLabelText('Content')).toHaveValue('Passport and charger');
    fireEvent.change(screen.getByLabelText('Content'), { target: { value: 'Passport, charger, tickets' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('button', { name: 'Edit note' })).toBeInTheDocument();
    expect(screen.getByText('Passport, charger, tickets')).toBeInTheDocument();

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Delete note' }));
    expect(await screen.findByRole('button', { name: 'Add' })).toBeInTheDocument();
    await waitFor(async () => expect(await repositories.appData.listRecords(project.id, collection.id)).toHaveLength(3));

    fireEvent.click(screen.getByRole('button', { name: 'Note actions: Minimal notes' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    await waitFor(() => expect(screen.queryByText('Minimal notes')).not.toBeInTheDocument());
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(await repositories.appData.listRecords(project.id, collection.id)).toHaveLength(2);
    confirm.mockRestore();
  });
});
