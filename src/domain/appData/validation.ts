import type { DataCollection, DataField, DataValue } from '../entities/appData';

export function validateFields(fields: readonly DataField[]): string | null {
  const keys = new Set<string>();
  for (const field of fields) {
    const key = field.key.trim();
    if (!key) return 'Every field needs a key.';
    if (!/^[a-z][a-z0-9_]*$/.test(key)) return `“${key}” must use lowercase letters, numbers, or underscores.`;
    if (keys.has(key)) return `Field key “${key}” is duplicated.`;
    keys.add(key);
  }
  return null;
}

export function validateRecordValues(
  collection: DataCollection,
  values: Readonly<Record<string, DataValue>>,
): string | null {
  const fieldIds = new Set(collection.fields.map((field) => field.id));
  const unknownField = Object.keys(values).find((fieldId) => !fieldIds.has(fieldId));
  if (unknownField) return `Unknown field “${unknownField}”.`;
  for (const field of collection.fields) {
    const value = values[field.id];
    if (field.required && (value === null || value === undefined || value === '')) {
      return `${field.label} is required.`;
    }
    if (value === null || value === undefined || value === '') continue;
    if (field.type === 'number' && typeof value !== 'number') return `${field.label} must be a number.`;
    if (field.type === 'boolean' && typeof value !== 'boolean') return `${field.label} must be true or false.`;
    if ((field.type === 'text' || field.type === 'date') && typeof value !== 'string') {
      return `${field.label} must be text.`;
    }
  }
  return null;
}
