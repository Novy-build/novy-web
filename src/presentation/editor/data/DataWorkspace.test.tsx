import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { ensureDemoProject } from '@data/seeding/demoSeed';
import { RepositoriesProvider } from '@main/providers/RepositoriesProvider';
import { SessionProvider } from '@main/providers/SessionProvider';
import { AppRoutes } from '@main/routes';
import { createStubRepositories, STUB_USER } from '@test/stubRepositories';

beforeEach(() => window.localStorage.clear());

async function renderEditor() {
  const repositories = createStubRepositories({ sessionUser: STUB_USER });
  await ensureDemoProject(repositories);
  const project = (await repositories.projects.listProjects())[0]!;
  await repositories.appData.createDatabase(project.id, { name: 'Project database' });
  render(
    <RepositoriesProvider repositories={repositories}>
      <MemoryRouter initialEntries={[`/project/${project.id}/editor`]}>
        <SessionProvider><AppRoutes /></SessionProvider>
      </MemoryRouter>
    </RepositoriesProvider>,
  );
  await screen.findByTestId('canvas-frame', {}, { timeout: 5_000 });
  fireEvent.click(screen.getByRole('button', { name: 'Data mode' }));
  await screen.findByRole('heading', { name: 'Collections' });
  return { repositories, project };
}

describe('DataWorkspace', () => {
  it('minimizes and restores the Collections panel', async () => {
    await renderEditor();

    fireEvent.click(screen.getByRole('button', { name: 'Collapse collections panel' }));
    expect(screen.queryByRole('heading', { name: 'Collections' })).not.toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'collections panel minimized' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Expand collections panel' }));
    expect(screen.getByRole('heading', { name: 'Collections' })).toBeInTheDocument();
  });

  it('creates a collection, edits schema, and performs record CRUD', async () => {
    const { repositories, project } = await renderEditor();

    fireEvent.change(screen.getByLabelText('Collection name'), { target: { value: 'Students' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create collection' }));
    expect(await screen.findByRole('heading', { name: 'Students' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add field' }));
    const keyInputs = screen.getAllByLabelText('Key');
    fireEvent.change(keyInputs[1]!, { target: { value: 'age' } });
    const labelInputs = screen.getAllByLabelText('Label');
    fireEvent.change(labelInputs[1]!, { target: { value: 'Age' } });
    expect(screen.getByLabelText('Record ID name')).toHaveValue('studentId');
    fireEvent.change(screen.getByLabelText('Record ID name'), { target: { value: 'studentKey' } });
    const saveSchema = screen.getByRole('button', { name: 'Save schema' });
    fireEvent.click(saveSchema);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save schema' })).not.toHaveAttribute('aria-busy', 'true'));
    expect((await repositories.appData.listCollections(project.id))[0]?.identifier?.key).toBe('studentKey');

    fireEvent.click(screen.getByRole('tab', { name: 'records' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add record' }));
    const dialog = screen.getByRole('dialog', { name: 'Add record' });
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Ada' } });
    fireEvent.change(within(dialog).getByLabelText('Age'), { target: { value: '20' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save record' }));
    expect(await screen.findByText('Ada')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const editDialog = screen.getByRole('dialog', { name: 'Edit record' });
    fireEvent.change(within(editDialog).getByLabelText('Name'), { target: { value: 'Ada Lovelace' } });
    fireEvent.click(within(editDialog).getByRole('button', { name: 'Save record' }));
    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Delete record?' })).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument());
    expect(screen.getByText('No records yet')).toBeInTheDocument();
  });

  it('deletes a collection with confirmation', async () => {
    await renderEditor();
    fireEvent.change(screen.getByLabelText('Collection name'), { target: { value: 'Students' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create collection' }));
    await screen.findByRole('heading', { name: 'Students' });

    fireEvent.click(screen.getByRole('button', { name: 'Delete collection' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Delete Students?' })).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByRole('heading', { name: 'Create your first collection' })).toBeInTheDocument();
  });

  it('binds a ListView to project records and renders them in Preview', async () => {
    const repositories = createStubRepositories({ sessionUser: STUB_USER });
    await ensureDemoProject(repositories);
    const project = (await repositories.projects.listProjects())[0]!;
    const database = await repositories.appData.createDatabase(project.id, { name: 'Project database' });
    const collection = await repositories.appData.createCollection(project.id, {
      name: 'Students',
      databaseId: database.id,
      fields: [{ id: 'student_name', key: 'name', label: 'Name', type: 'text', required: true }],
    });
    await repositories.appData.createRecord(project.id, collection.id, { student_name: 'Ada Lovelace' });
    render(
      <RepositoriesProvider repositories={repositories}>
        <MemoryRouter initialEntries={[`/project/${project.id}/editor`]}>
          <SessionProvider><AppRoutes /></SessionProvider>
        </MemoryRouter>
      </RepositoriesProvider>,
    );
    await screen.findByTestId('canvas-frame');
    fireEvent.click(screen.getByRole('button', { name: 'Data mode' }));
    await screen.findByRole('heading', { name: 'Students' });
    fireEvent.click(screen.getByRole('button', { name: 'Layers section' }));
    fireEvent.click(screen.getByRole('button', { name: 'Assets section' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add ListView' }));
    fireEvent.change(screen.getByLabelText('Data source'), { target: { value: 'collection' } });
    fireEvent.click(screen.getByRole('button', { name: 'Edit item design' }));
    fireEvent.click(screen.getByLabelText('Add Text'));
    fireEvent.change(screen.getByRole('combobox', { name: 'Text content' }), { target: { value: 'student_name' } });

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    const preview = await screen.findByRole('dialog');
    expect(within(preview).getByText('Ada Lovelace')).toBeInTheDocument();
  });
});
