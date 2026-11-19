import { useState } from 'react';
import type { FileInputProps } from '@domain/entities/componentNode';

export function FileInputNodeView({
  props,
  renderStatic,
  isPreview,
  onSelect,
}: {
  props: FileInputProps;
  renderStatic: boolean;
  isPreview: boolean;
  onSelect?: (reference: string, file: File) => void;
}) {
  const [filename, setFilename] = useState('');
  return (
    <label className="flex h-full w-full cursor-pointer flex-col justify-center rounded-md border border-dashed border-hairline bg-surface px-4 py-3 text-left">
      <span className="novy-widget-text text-sm font-medium">{props.label}</span>
      <span className="novy-widget-text-muted mt-1 truncate text-xs">
        {filename || props.helperText}
      </span>
      {isPreview && !renderStatic ? (
        <input
          accept={props.accept.join(',')}
          aria-label={props.label}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setFilename(file.name);
            onSelect?.(`media:${file.name}`, file);
          }}
          type="file"
        />
      ) : null}
    </label>
  );
}
