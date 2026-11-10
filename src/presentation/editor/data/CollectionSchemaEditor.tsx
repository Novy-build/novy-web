import { useState } from 'react';
import {
  RECORD_IDENTIFIER_KEY_PATTERN,
  recordIdentifierForCollection,
  type DataCollection,
  type DataField,
  type DataFieldType,
} from '@domain/entities/appData';
import { generateId } from '@domain/ids';
import { Button } from '@presentation/components/ui/Button';
import { TextInput } from '@presentation/components/ui/TextInput';

export function CollectionSchemaEditor({
  collection,
  onSave,
}: {
  collection: DataCollection;
  onSave: (name: string, fields: DataField[], identifierKey: string) => Promise<void>;
}) {
  const [name, setName] = useState(collection.name);
  const [identifierKey, setIdentifierKey] = useState(() => recordIdentifierForCollection(collection).key);
  const [fields, setFields] = useState<DataField[]>(() => collection.fields.map((field) => ({ ...field })));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function updateField(fieldId: string, patch: Partial<DataField>): void {
    setFields((current) => current.map((field) => field.id === fieldId ? { ...field, ...patch } : field));
  }

  function moveField(index: number, direction: -1 | 1): void {
    setFields((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[target]] = [copy[target]!, copy[index]!];
      return copy;
    });
  }

  async function save(): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      if (!RECORD_IDENTIFIER_KEY_PATTERN.test(identifierKey)) {
        throw new Error('Record ID name must start with a lowercase letter and contain only letters and numbers.');
      }
      if (fields.some((field) => field.key === identifierKey)) {
        throw new Error('Record ID name must be different from collection field keys.');
      }
      await onSave(name, fields, identifierKey);
      setSaving(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Schema could not be saved.');
      setSaving(false);
    }
  }

  return (
    <section aria-label="Collection schema" className="min-w-0 flex-1 overflow-auto p-5">
      <div className="max-w-4xl">
        <h3 className="text-base font-semibold text-ink">Schema</h3>
        <div className="mt-4 max-w-sm">
          <TextInput label="Collection name" name="collection-name" onChange={(event) => setName(event.target.value)} value={name} />
          <div className="mt-3">
            <TextInput label="Record ID name" name="collection-record-id" onChange={(event) => setIdentifierKey(event.target.value)} value={identifierKey} />
            <p className="mt-1 text-xs text-ink-muted">Backend-generated and immutable for every record.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-2">
          {fields.map((field, index) => (
            <div className="grid grid-cols-[1fr_1fr_140px_auto_auto_auto] items-end gap-2 rounded-tile border border-hairline p-3" key={field.id}>
              <TextInput label="Label" name={`field-label-${field.id}`} onChange={(event) => updateField(field.id, { label: event.target.value })} value={field.label} />
              <TextInput label="Key" name={`field-key-${field.id}`} onChange={(event) => updateField(field.id, { key: event.target.value })} value={field.key} />
              <label className="text-xs font-medium text-ink-muted">Type
                <select className="mt-1 h-10 w-full rounded-tile border border-hairline bg-surface px-2 text-sm text-ink" onChange={(event) => updateField(field.id, { type: event.target.value as DataFieldType })} value={field.type}>
                  <option value="text">Text</option><option value="number">Number</option><option value="boolean">Boolean</option><option value="date">Date</option>
                </select>
              </label>
              <label className="flex h-10 items-center gap-2 text-xs text-ink-muted"><input checked={field.required} onChange={(event) => updateField(field.id, { required: event.target.checked })} type="checkbox" />Required</label>
              <div className="flex h-10 items-center">
                <button aria-label={`Move ${field.label} up`} disabled={index === 0} onClick={() => moveField(index, -1)} type="button">↑</button>
                <button aria-label={`Move ${field.label} down`} disabled={index === fields.length - 1} onClick={() => moveField(index, 1)} type="button">↓</button>
              </div>
              <button aria-label={`Remove ${field.label}`} className="h-10 px-2 text-red-600" onClick={() => setFields((current) => current.filter((item) => item.id !== field.id))} type="button">×</button>
            </div>
          ))}
        </div>
        <button className="mt-3 rounded-md border border-hairline px-3 py-2 text-sm font-medium text-ink" onClick={() => setFields((current) => [...current, { id: generateId('field'), key: `field_${current.length + 1}`, label: `Field ${current.length + 1}`, type: 'text', required: false }])} type="button">Add field</button>
        {error ? <p className="mt-3 text-sm text-red-600" role="alert">{error}</p> : null}
        <div className="mt-5"><Button isLoading={saving} onClick={() => void save()}>Save schema</Button></div>
      </div>
    </section>
  );
}
