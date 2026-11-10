import { beforeEach, describe, expect, it } from 'vitest';
import { LocalStorageAppDataRepository } from './LocalStorageAppDataRepository';

function repository() {
  let tick = 0;
  return new LocalStorageAppDataRepository(window.localStorage, {
    latencyMs: 0,
    now: () => new Date(Date.UTC(2026, 0, 1, 10, tick++)),
  });
}

beforeEach(() => window.localStorage.clear());

describe('LocalStorageAppDataRepository', () => {
  it('creates, updates, lists, and deletes project-scoped collections', async () => {
    const repo = repository();
    await repo.createDatabase('project_1', { name: 'Project database' });
    await repo.createDatabase('project_2', { name: 'Project database' });
    const created = await repo.createCollection('project_1', { name: 'Students' });
    await repo.createCollection('project_2', { name: 'Private' });

    expect(await repo.listCollections('project_1')).toEqual([created]);
    expect(created.identifier).toEqual({ key: 'studentId', type: 'string', generation: 'backend' });
    const updated = await repo.updateCollection('project_1', created.id, {
      name: 'Learners',
      fields: [{ ...created.fields[0]!, label: 'Student name' }],
      identifier: { key: 'learnerId', type: 'string', generation: 'backend' },
    });
    expect(updated.name).toBe('Learners');
    expect(updated.identifier?.key).toBe('learnerId');
    expect((await repo.getCollection('project_1', created.id))?.fields[0]?.label).toBe('Student name');
    expect(await repo.getCollection('project_2', created.id)).toBeNull();

    await repo.deleteCollection('project_1', created.id);
    expect(await repo.listCollections('project_1')).toEqual([]);
  });

  it('performs record CRUD with typed schema validation', async () => {
    const repo = repository();
    await repo.createDatabase('project_1', { name: 'Project database' });
    const collection = await repo.createCollection('project_1', {
      name: 'Students',
      fields: [
        { id: 'field_name', key: 'name', label: 'Name', type: 'text', required: true },
        { id: 'field_age', key: 'age', label: 'Age', type: 'number', required: false },
      ],
    });

    await expect(repo.createRecord('project_1', collection.id, {})).rejects.toThrow('Name is required');
    const record = await repo.createRecord('project_1', collection.id, {
      field_name: 'Ada',
      field_age: 20,
    });
    expect(await repo.listRecords('project_1', collection.id)).toEqual([record]);

    const updated = await repo.updateRecord('project_1', collection.id, record.id, {
      field_name: 'Ada Lovelace',
      field_age: 21,
    });
    expect(updated.values.field_name).toBe('Ada Lovelace');
    await repo.deleteRecord('project_1', collection.id, record.id);
    expect(await repo.listRecords('project_1', collection.id)).toEqual([]);
  });

  it('rejects cross-project access and persists across instances', async () => {
    const repo = repository();
    await repo.createDatabase('project_1', { name: 'Project database' });
    const collection = await repo.createCollection('project_1', { name: 'Students' });
    await expect(repo.listRecords('project_2', collection.id)).rejects.toThrow('Collection not found');
    await expect(repo.updateCollection('project_2', collection.id, { name: 'Hack', fields: [] })).rejects.toThrow('Collection not found');

    const fresh = repository();
    expect(await fresh.getCollection('project_1', collection.id)).toMatchObject({ name: 'Students' });
  });

  it('removes deleted field values and cascades collection record deletion', async () => {
    const repo = repository();
    await repo.createDatabase('project_1', { name: 'Project database' });
    const collection = await repo.createCollection('project_1', {
      name: 'Students',
      fields: [
        { id: 'name', key: 'name', label: 'Name', type: 'text', required: false },
        { id: 'age', key: 'age', label: 'Age', type: 'number', required: false },
      ],
    });
    await repo.createRecord('project_1', collection.id, { name: 'Ada', age: 20 });
    await repo.updateCollection('project_1', collection.id, {
      name: 'Students',
      fields: [collection.fields[0]!],
    });
    expect((await repo.listRecords('project_1', collection.id))[0]?.values).toEqual({ name: 'Ada' });

    await repo.deleteCollection('project_1', collection.id);
    await expect(repo.listRecords('project_1', collection.id)).rejects.toThrow('Collection not found');
  });

  it('rejects duplicate and malformed field keys', async () => {
    const repo = repository();
    await expect(repo.createCollection('project_1', {
      name: 'Bad',
      fields: [
        { id: 'a', key: 'student_name', label: 'A', type: 'text', required: false },
        { id: 'b', key: 'student_name', label: 'B', type: 'text', required: false },
      ],
    })).rejects.toThrow('duplicated');
  });

  it('rejects malformed or conflicting record ID names', async () => {
    const repo = repository();
    await repo.createDatabase('project_1', { name: 'Project database' });
    await expect(repo.createCollection('project_1', {
      name: 'Notes',
      identifier: { key: 'Note ID', type: 'string', generation: 'backend' },
    })).rejects.toThrow('Record ID name');
    await expect(repo.createCollection('project_1', {
      name: 'Notes',
      fields: [{ id: 'title', key: 'noteid', label: 'Title', type: 'text', required: false }],
      identifier: { key: 'noteid', type: 'string', generation: 'backend' },
    })).rejects.toThrow('conflicts');
  });

  it('cascades records when deleting a database', async () => {
    const repo = repository();
    const database = await repo.createDatabase('project_1', { name: 'Notes database' });
    const collection = await repo.createCollection('project_1', {
      databaseId: database.id,
      name: 'Notes',
      fields: [{ id: 'title', key: 'title', label: 'Title', type: 'text', required: true }],
    });
    await repo.createRecord('project_1', collection.id, { title: 'Temporary' });

    await repo.deleteDatabase('project_1', database.id);

    expect(await repo.listDatabases('project_1')).toEqual([]);
    expect(await repo.listCollections('project_1')).toEqual([]);
    await expect(repo.listRecords('project_1', collection.id)).rejects.toThrow('Collection not found');
  });
});
