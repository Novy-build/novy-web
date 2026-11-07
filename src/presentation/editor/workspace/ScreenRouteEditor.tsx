import { useEffect, useState } from 'react';

interface ScreenRouteEditorProps {
  path: string;
  onChange: (path: string) => void;
}

/** Editable generated-app route for the active screen. */
export function ScreenRouteEditor({ path, onChange }: ScreenRouteEditorProps) {
  const [draft, setDraft] = useState(path);
  useEffect(() => setDraft(path), [path]);

  function commit(): void {
    const next = draft.trim();
    if (next && next !== path) onChange(next);
    else setDraft(path);
  }

  return (
    <div className="flex items-center gap-2 border-b border-hairline bg-surface px-3 py-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted" htmlFor="active-screen-route">
        Route
      </label>
      <input
        className="h-7 min-w-0 flex-1 rounded-md border border-hairline bg-canvas px-2 font-mono text-xs text-ink"
        id="active-screen-route"
        onBlur={commit}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commit();
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            setDraft(path);
          }
        }}
        value={draft}
      />
      <span className="text-xs text-ink-muted">Generated app URL path</span>
    </div>
  );
}
