import { useState, type FormEvent } from 'react';
import type { ChatProps } from '@domain/entities/componentNode';
import type { LocalListItemAddition } from '@domain/entities/appData';

export function ChatNodeView({
  props,
  messages,
  renderStatic,
  isPreview,
  onSubmit,
}: {
  props: ChatProps;
  messages: readonly LocalListItemAddition[];
  renderStatic: boolean;
  isPreview: boolean;
  onSubmit?: (value: string) => void;
}) {
  const [draft, setDraft] = useState('');
  function submit(event: FormEvent): void {
    event.preventDefault();
    const value = draft.trim();
    if (!value) return;
    onSubmit?.(value);
    setDraft('');
  }
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-md border border-hairline bg-surface">
      <div className="border-b border-hairline px-4 py-3 text-sm font-semibold text-ink">
        {props.title}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <p className="m-auto text-center text-xs text-ink-muted">{props.emptyText}</p>
        ) : null}
        {messages.map((message) => {
          const role = message.values.role === 'user' ? 'user' : 'assistant';
          return (
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${role === 'user' ? 'ml-auto bg-brand-600 text-white' : 'mr-auto bg-canvas text-ink'}`}
              key={message.itemId}
            >
              <p>{String(message.values.text ?? '')}</p>
              {props.showCitations && message.values.citations ? (
                <p className="mt-1 text-xs opacity-75">{String(message.values.citations)}</p>
              ) : null}
            </div>
          );
        })}
      </div>
      <form className="flex gap-2 border-t border-hairline p-3" onSubmit={submit}>
        <input
          aria-label={props.placeholder}
          className="min-w-0 flex-1 rounded-md border border-hairline px-3 text-sm text-ink"
          disabled={!isPreview || renderStatic}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={props.placeholder}
          value={draft}
        />
        <button className="rounded-md bg-brand-600 px-3 text-sm font-medium text-white" disabled={!isPreview || renderStatic} type="submit">
          {props.sendLabel}
        </button>
      </form>
    </div>
  );
}
