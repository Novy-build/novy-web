import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { ChatProps, ComponentAppearance } from '@domain/entities/componentNode';
import type { LocalListItemAddition } from '@domain/entities/appData';
import { fieldStyleClass, fieldStyleCss } from './fieldStyle';

export function ChatNodeView({
  props,
  appearance,
  messages,
  isThinking = false,
  renderStatic,
  isPreview,
  onSubmit,
}: {
  props: ChatProps;
  appearance?: ComponentAppearance;
  messages: readonly LocalListItemAddition[];
  isThinking?: boolean;
  renderStatic: boolean;
  isPreview: boolean;
  onSubmit?: (value: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [isThinking, messages.length]);
  function submit(event: FormEvent): void {
    event.preventDefault();
    const value = draft.trim();
    if (!value) return;
    onSubmit?.(value);
    setDraft('');
  }
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-md border border-hairline bg-surface">
      <div className="novy-widget-text border-b border-hairline px-4 py-3 text-sm font-semibold">
        {props.title}
      </div>
      <div aria-live="polite" className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <p className="novy-widget-text-muted m-auto text-center text-xs">{props.emptyText}</p>
        ) : null}
        {messages.map((message) => {
          const role = message.values.role === 'user' ? 'user' : 'assistant';
          return (
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${role === 'user' ? 'novy-widget-text-contrast ml-auto bg-brand-600' : 'novy-widget-text mr-auto bg-canvas'}`}
              key={message.itemId}
            >
              <p>{String(message.values.text ?? '')}</p>
              {props.showCitations && message.values.citations ? (
                <p className="mt-1 text-xs opacity-75">{String(message.values.citations)}</p>
              ) : null}
            </div>
          );
        })}
        {isThinking ? (
          <div
            aria-label="Assistant is thinking"
            className="novy-widget-text mr-auto flex max-w-[85%] items-center gap-1 rounded-lg bg-canvas px-3 py-3"
            role="status"
          >
            <span aria-hidden="true" className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-muted motion-reduce:animate-none" />
            <span aria-hidden="true" className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-muted motion-reduce:animate-none" />
            <span aria-hidden="true" className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-muted motion-reduce:animate-none" />
          </div>
        ) : null}
        <div aria-hidden="true" ref={transcriptEndRef} />
      </div>
      <form className="flex gap-2 border-t border-hairline p-3" onSubmit={submit}>
        <input
          aria-label={props.placeholder}
          className={`novy-widget-text min-w-0 flex-1 rounded-md border border-hairline px-3 text-sm placeholder:text-current placeholder:opacity-70 ${fieldStyleClass(props.fieldStyle)}`}
          style={fieldStyleCss(appearance, props.fieldStyle)}
          disabled={!isPreview || renderStatic || isThinking}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={props.placeholder}
          value={draft}
        />
        <button className="novy-widget-text-contrast rounded-md bg-brand-600 px-3 text-sm font-medium disabled:opacity-60" disabled={!isPreview || renderStatic || isThinking} type="submit">
          {props.sendLabel}
        </button>
      </form>
    </div>
  );
}
