import { useEffect, useState, type FormEvent } from 'react';
import type { DataRecord, DataValue } from '@domain/entities/appData';
import { Button } from '@presentation/components/ui/Button';
import { LoadingScreen } from '@presentation/components/system/LoadingScreen';
import { Modal } from '@presentation/components/system/Modal';
import { CollectionSchemaEditor } from './CollectionSchemaEditor';
import { RecordDialog } from './RecordDialog';
import { RecordsTable } from './RecordsTable';
import type { ProjectDataController } from './useProjectData';

type DataTab = 'schema' | 'records';

export function DataWorkspace({ data }: { data: ProjectDataController }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<DataTab>('schema');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [recordTarget, setRecordTarget] = useState<DataRecord | 'new' | null>(null);
  const [deleteRecordTarget, setDeleteRecordTarget] = useState<DataRecord | null>(null);
  const [deleteCollectionOpen, setDeleteCollectionOpen] = useState(false);

  useEffect(() => {
    if (selectedId && data.collections.some((collection) => collection.id === selectedId)) return;
    setSelectedId(data.collections[0]?.id ?? null);
  }, [data.collections, selectedId]);

  if (data.status === 'loading') return <LoadingScreen label="Loading project data…" />;
  if (data.status === 'error') {
    return <div className="flex flex-1 items-center justify-center p-8"><div className="text-center"><p className="text-sm text-red-600">{data.error}</p><Button className="mt-4" onClick={data.reload}>Retry</Button></div></div>;
  }

  const collection = data.collections.find((item) => item.id === selectedId) ?? null;
  const records = collection ? data.recordsByCollection.get(collection.id) ?? [] : [];
  const visibleCollections = data.collections.filter((item) =>
    item.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  async function createCollection(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const created = await data.createCollection({ name: newName });
      setSelectedId(created.id);
      setNewName('');
    } finally {
      setCreating(false);
    }
  }

  return (
    <section aria-label="Data workspace" className="flex min-h-0 flex-1 bg-canvas">
      <aside className="flex w-64 shrink-0 flex-col border-r border-hairline bg-surface" aria-label="Collections">
        <div className="border-b border-hairline p-3">
          <h2 className="text-sm font-semibold text-ink">Collections</h2>
          <label className="sr-only" htmlFor="collection-search">Search collections</label>
          <input className="mt-2 h-8 w-full rounded-md border border-hairline px-2 text-sm" id="collection-search" onChange={(event) => setSearch(event.target.value)} placeholder="Search…" type="search" value={search} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {data.collections.length === 0 ? <p className="p-2 text-sm text-ink-muted" role="status">No collections yet.</p> : null}
          {visibleCollections.map((item) => (
            <button
              aria-pressed={item.id === selectedId}
              className={`mb-1 w-full rounded-md px-3 py-2 text-left ${item.id === selectedId ? 'bg-brand-50 text-brand-700' : 'text-ink hover:bg-canvas'}`}
              key={item.id}
              onClick={() => setSelectedId(item.id)}
              type="button"
            >
              <span className="block text-sm font-medium">{item.name}</span>
              <span className="text-xs text-ink-muted">{data.recordsByCollection.get(item.id)?.length ?? 0} records</span>
            </button>
          ))}
          {data.collections.length > 0 && visibleCollections.length === 0 ? <p className="p-2 text-sm text-ink-muted" role="status">No collections match “{search}”.</p> : null}
        </div>
        <form className="border-t border-hairline p-3" onSubmit={(event) => void createCollection(event)}>
          <label className="sr-only" htmlFor="new-collection">Collection name</label>
          <input className="h-9 w-full rounded-md border border-hairline px-3 text-sm" id="new-collection" onChange={(event) => setNewName(event.target.value)} placeholder="New collection" value={newName} />
          <Button className="mt-2" disabled={!newName.trim()} isBlock isLoading={creating} type="submit">Create collection</Button>
        </form>
      </aside>

      {collection ? (
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-hairline bg-surface px-5 py-3">
            <div><h2 className="font-semibold text-ink">{collection.name}</h2><p className="text-xs text-ink-muted">Project-scoped app data</p></div>
            <button className="text-sm font-medium text-red-600" onClick={() => setDeleteCollectionOpen(true)} type="button">Delete collection</button>
          </header>
          <div className="flex gap-1 border-b border-hairline bg-surface px-5 py-2" role="tablist" aria-label="Data view">
            {(['schema', 'records'] as const).map((candidate) => <button aria-selected={tab === candidate} className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize ${tab === candidate ? 'bg-canvas text-ink' : 'text-ink-muted'}`} key={candidate} onClick={() => setTab(candidate)} role="tab" type="button">{candidate}</button>)}
          </div>
          {tab === 'schema' ? (
            <CollectionSchemaEditor
              collection={collection}
              key={`${collection.id}-${collection.updatedAt.getTime()}`}
              onSave={async (name, fields) => { await data.updateCollection(collection.id, { name, fields }); }}
            />
          ) : (
            <RecordsTable collection={collection} onAdd={() => setRecordTarget('new')} onDelete={setDeleteRecordTarget} onEdit={setRecordTarget} records={records} />
          )}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center p-8 text-center"><div><h2 className="text-lg font-semibold text-ink">Create your first collection</h2><p className="mt-1 text-sm text-ink-muted">Define a schema, add records, then bind components and logic nodes.</p></div></div>
      )}

      {collection && recordTarget ? (
        <RecordDialog
          collection={collection}
          onClose={() => setRecordTarget(null)}
          onSave={async (values: Record<string, DataValue>) => {
            if (recordTarget === 'new') await data.createRecord(collection.id, values);
            else await data.updateRecord(collection.id, recordTarget.id, values);
            setRecordTarget(null);
          }}
          record={recordTarget === 'new' ? null : recordTarget}
        />
      ) : null}

      {collection && deleteRecordTarget ? (
        <ConfirmDataDelete
          label="Delete record?"
          onCancel={() => setDeleteRecordTarget(null)}
          onConfirm={async () => { await data.deleteRecord(collection.id, deleteRecordTarget.id); setDeleteRecordTarget(null); }}
        />
      ) : null}
      {collection && deleteCollectionOpen ? (
        <ConfirmDataDelete
          label={`Delete ${collection.name}?`}
          onCancel={() => setDeleteCollectionOpen(false)}
          onConfirm={async () => { await data.deleteCollection(collection.id); setDeleteCollectionOpen(false); }}
        />
      ) : null}
    </section>
  );
}

function ConfirmDataDelete({ label, onCancel, onConfirm }: { label: string; onCancel: () => void; onConfirm: () => Promise<void> }) {
  const [deleting, setDeleting] = useState(false);
  return <Modal labelledBy="data-delete-title" onClose={onCancel}><h2 className="text-lg font-semibold" id="data-delete-title">{label}</h2><p className="mt-2 text-sm text-ink-muted">This cannot be undone.</p><div className="mt-5 flex justify-end gap-2"><Button onClick={onCancel} variant="ghost">Cancel</Button><Button isLoading={deleting} onClick={() => { setDeleting(true); void onConfirm(); }} variant="danger">Delete</Button></div></Modal>;
}
