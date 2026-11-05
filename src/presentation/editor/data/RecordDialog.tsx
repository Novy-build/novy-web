import { useState, type FormEvent } from 'react';
import type { DataCollection, DataRecord, DataValue } from '@domain/entities/appData';
import { Modal } from '@presentation/components/system/Modal';
import { Button } from '@presentation/components/ui/Button';
import { TextInput } from '@presentation/components/ui/TextInput';

export function RecordDialog({
  collection,
  record,
  onClose,
  onSave,
}: {
  collection: DataCollection;
  record: DataRecord | null;
  onClose: () => void;
  onSave: (values: Record<string, DataValue>) => Promise<void>;
}) {
  const [values, setValues] = useState<Record<string, DataValue>>(() => ({ ...(record?.values ?? {}) }));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave(values);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Record could not be saved.');
      setSaving(false);
    }
  }

  return (
    <Modal labelledBy="record-dialog-title" onClose={onClose}>
      <h2 className="text-lg font-semibold text-ink" id="record-dialog-title">
        {record ? 'Edit record' : 'Add record'}
      </h2>
      <p className="mt-1 text-sm text-ink-muted">{collection.name}</p>
      <form className="mt-5 grid gap-4" onSubmit={(event) => void submit(event)}>
        {collection.fields.map((field) => field.type === 'boolean' ? (
          <label className="flex items-center gap-2 text-sm text-ink" key={field.id}>
            <input
              checked={values[field.id] === true}
              onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.checked }))}
              type="checkbox"
            />
            {field.label}{field.required ? ' *' : ''}
          </label>
        ) : (
          <TextInput
            key={field.id}
            label={`${field.label}${field.required ? ' *' : ''}`}
            name={`record-${field.key}`}
            onChange={(event) => setValues((current) => ({
              ...current,
              [field.id]: field.type === 'number'
                ? event.target.value === '' ? null : Number(event.target.value)
                : event.target.value,
            }))}
            type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
            value={String(values[field.id] ?? '')}
          />
        ))}
        {error ? <p className="text-sm text-red-600" role="alert">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} type="button" variant="ghost">Cancel</Button>
          <Button isLoading={saving} type="submit">Save record</Button>
        </div>
      </form>
    </Modal>
  );
}
