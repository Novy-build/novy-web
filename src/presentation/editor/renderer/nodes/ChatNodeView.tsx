import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { ChatProps, ChatStyle, ComponentAppearance } from '@domain/entities/componentNode';
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
  const style = props.style;
  const tone = (token: string): string => ({
    surface: 'var(--novy-app-surface)',
    canvas: 'var(--novy-app-canvas)',
    primary: 'var(--novy-app-primary)',
    accent: 'var(--novy-app-accent)',
    muted: 'var(--novy-app-text-muted)',
    text: 'var(--novy-app-text)',
    'surface-elevated': 'var(--novy-app-surface-elevated)',
  }[token] ?? 'var(--novy-app-surface)');
  const radius = (token: ChatStyle['bubbleRadius']): string => ({
    sharp: 'var(--novy-app-radius-sm)',
    soft: 'var(--novy-app-radius-md)',
    rounded: 'var(--novy-app-radius-lg)',
    pill: 'var(--novy-app-radius-pill)',
  }[token]);
  const spacing = (token: ChatStyle['spacing']): string => ({
    compact: '6px',
    comfortable: '12px',
    spacious: '18px',
  }[token]);
  const textSize = (token: 'small' | 'medium' | 'large'): string => ({
    small: '12px',
    medium: '14px',
    large: '16px',
  }[token]);
  const textWeight = (token: 'regular' | 'semibold' | 'bold'): string => ({
    regular: '400',
    semibold: '600',
    bold: '700',
  }[token]);
  const align = (token: 'start' | 'center' | 'end'): 'left' | 'center' | 'right' => ({
    start: 'left',
    center: 'center',
    end: 'right',
  } as const)[token];
  const bubbleWidth = (token: 'compact' | 'normal' | 'wide'): string => ({
    compact: '65%',
    normal: '85%',
    wide: '100%',
  }[token]);
  const inputControl = style?.composerInput;
  const sendControl = style?.sendButton;
  const controlTextStyle = (text: NonNullable<ChatStyle['composerInput']>['textStyle']) => ({
    fontFamily: text?.fontFamily || undefined,
    fontSize: text?.fontSize ? `${text.fontSize}px` : undefined,
    fontWeight: text?.fontWeight || undefined,
    lineHeight: text?.lineHeight || undefined,
    letterSpacing: text?.letterSpacing ? `${text.letterSpacing}px` : undefined,
    textAlign: text?.textAlign || undefined,
    fontStyle: text?.fontStyle || undefined,
    textTransform: text?.textTransform || undefined,
  });
  const frameStyle = {
    background: tone(style?.composerTone ?? 'surface'),
    border: style?.border === 'none' ? 'none' : undefined,
    borderColor: style?.border === 'outlined' ? 'var(--novy-app-border)' : undefined,
    borderRadius: style ? radius(style.bubbleRadius) : undefined,
  };
  const headerStyle = {
    background: tone(style?.headerTone ?? 'surface'),
    color: style?.headerTone === 'primary' ? '#fff' : 'var(--novy-app-text)',
    padding: style ? `${spacing(style.spacing)} 16px` : undefined,
    fontSize: style ? textSize(style.headerTextSize) : undefined,
    fontWeight: style ? textWeight(style.headerTextWeight) : undefined,
    textAlign: style ? align(style.headerTextAlign) : undefined,
  };
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-md border border-hairline bg-surface" style={frameStyle}>
      <div className="novy-widget-text border-b border-hairline px-4 py-3 text-sm font-semibold" style={headerStyle}>
        {props.title}
      </div>
      <div aria-live="polite" className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3" style={style ? { gap: spacing(style.spacing), padding: spacing(style.spacing) } : undefined}>
        {messages.length === 0 ? (
          <p className="novy-widget-text-muted m-auto text-center text-xs" style={style ? {
            fontSize: textSize(style.emptyTextSize),
            textAlign: align(style.emptyTextAlign),
          } : undefined}>{props.emptyText}</p>
        ) : null}
        {messages.map((message) => {
          const role = message.values.role === 'user' ? 'user' : 'assistant';
          return (
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${role === 'user' ? 'novy-widget-text-contrast ml-auto bg-brand-600' : 'novy-widget-text mr-auto bg-canvas'}`}
              key={message.itemId}
              style={style ? {
                background: tone(role === 'user' ? style.userBubbleTone : style.assistantBubbleTone),
                borderRadius: radius(style.bubbleRadius),
                padding: spacing(style.spacing),
                maxWidth: bubbleWidth(style.bubbleMaxWidth),
                fontSize: textSize(style.bubbleTextSize),
                fontWeight: textWeight(style.bubbleTextWeight),
              } : undefined}
            >
              <p>{String(message.values.text ?? '')}</p>
              {props.showCitations && message.values.citations ? (
                <p className="mt-1 text-xs opacity-75" style={style ? { color: tone(style.citationsTone) } : undefined}>{String(message.values.citations)}</p>
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
          style={{
            ...fieldStyleCss(appearance, inputControl?.fieldStyle ?? props.fieldStyle),
            ...(inputControl?.appearance ? fieldStyleCss(inputControl.appearance, inputControl.fieldStyle) : {}),
            ...(style ? { fontSize: textSize(style.inputTextSize), fontWeight: textWeight(style.inputTextWeight) } : {}),
            ...controlTextStyle(inputControl?.textStyle),
            width: inputControl?.width ? `${inputControl.width}px` : undefined,
            height: inputControl?.height ? `${inputControl.height}px` : undefined,
          }}
          disabled={!isPreview || renderStatic || isThinking}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={props.placeholder}
          value={draft}
        />
        <button className="novy-widget-text-contrast rounded-md bg-brand-600 px-3 text-sm font-medium disabled:opacity-60" disabled={!isPreview || renderStatic || isThinking} style={style ? {
          background: sendControl?.appearance?.backgroundColor
            ?? (style.sendVariant === 'solid' ? 'var(--novy-app-primary)' : 'transparent'),
          border: sendControl?.appearance ? undefined
            : style.sendVariant === 'outline' ? '1px solid var(--novy-app-border)' : undefined,
          color: sendControl?.appearance?.textColor
            ?? (style.sendVariant === 'text' ? 'var(--novy-app-primary)' : '#fff'),
          borderRadius: sendControl?.appearance?.borderRadius,
          borderColor: sendControl?.appearance?.borderColor,
          borderWidth: sendControl?.appearance?.borderWidth,
          borderStyle: sendControl?.appearance?.borderStyle,
          boxShadow: sendControl?.appearance?.boxShadows?.map((shadow) =>
            `${shadow.inset ? 'inset ' : ''}${shadow.x}px ${shadow.y}px ${shadow.blur}px ${shadow.spread}px ${shadow.color}`).join(', '),
          ...controlTextStyle(sendControl?.textStyle),
          fontSize: sendControl?.textStyle?.fontSize
            ? `${sendControl.textStyle.fontSize}px`
            : textSize(style.sendTextSize),
          fontWeight: sendControl?.textStyle?.fontWeight ?? textWeight(style.sendTextWeight),
          width: sendControl?.width ? `${sendControl.width}px` : undefined,
          height: sendControl?.height ? `${sendControl.height}px` : undefined,
        } : undefined} type="submit">
          {props.sendLabel}
        </button>
      </form>
    </div>
  );
}
