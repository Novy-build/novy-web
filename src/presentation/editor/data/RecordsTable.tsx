import type { DataCollection, DataRecord } from '@domain/entities/appData';

export function RecordsTable({
  collection,
  records,
  onAdd,
  onEdit,
  onDelete,
}: {
  collection: DataCollection;
  records: readonly DataRecord[];
  onAdd: () => void;
  onEdit: (record: DataRecord) => void;
  onDelete: (record: DataRecord) => void;
}) {
  return (
    <section aria-label="Records" className="min-w-0 flex-1 overflow-auto p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-ink">Records</h3>
          <p className="text-sm text-ink-muted">{records.length} total</p>
        </div>
        <button className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white" onClick={onAdd} type="button">Add record</button>
      </div>
      {records.length === 0 ? (
        <div className="mt-8 rounded-panel border border-dashed border-hairline p-8 text-center" role="status">
          <p className="font-medium text-ink">No records yet</p>
          <p className="mt-1 text-sm text-ink-muted">Add test data for bindings and preview.</p>
        </div>
      ) : (
        <table className="mt-5 w-full min-w-[640px] border-separate border-spacing-0 text-left text-sm">
          <thead><tr>
            {collection.fields.map((field) => <th className="border-b border-hairline px-3 py-2 text-xs font-medium text-ink-muted" key={field.id}>{field.label}</th>)}
            <th className="border-b border-hairline px-3 py-2 text-right text-xs font-medium text-ink-muted">Actions</th>
          </tr></thead>
          <tbody>{records.map((record) => (
            <tr key={record.id}>
              {collection.fields.map((field) => (
                <td className="border-b border-hairline px-3 py-3 text-ink" key={field.id}>{formatValue(record.values[field.id])}</td>
              ))}
              <td className="border-b border-hairline px-3 py-3 text-right">
                <button className="mr-2 text-xs font-medium text-brand-700" onClick={() => onEdit(record)} type="button">Edit</button>
                <button className="text-xs font-medium text-red-600" onClick={() => onDelete(record)} type="button">Delete</button>
              </td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </section>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}
