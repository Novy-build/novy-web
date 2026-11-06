import { useState, type DragEvent } from 'react';
import type { ComponentType } from '@domain/entities/componentNode';
import { TextInput } from '@presentation/components/ui/TextInput';

type PaletteCategory = 'Layout' | 'Basic' | 'Form controls' | 'Data';

interface PaletteItemConfig {
  type: ComponentType;
  label: string;
  description: string;
  category: PaletteCategory;
}

export const PALETTE_ITEMS: readonly PaletteItemConfig[] = [
  { type: 'container', label: 'Container', description: 'Card that groups components', category: 'Layout' },
  { type: 'text', label: 'Text', description: 'Heading or body copy', category: 'Basic' },
  { type: 'button', label: 'Button', description: 'Tap target with a label', category: 'Basic' },
  { type: 'image', label: 'Image', description: 'Picture with alt text', category: 'Basic' },
  { type: 'divider', label: 'Divider', description: 'Horizontal or vertical separator', category: 'Basic' },
  { type: 'input', label: 'Text field', description: 'Labelled text input', category: 'Form controls' },
  { type: 'checkbox', label: 'Checkbox', description: 'Toggle a single option', category: 'Form controls' },
  { type: 'radio', label: 'Radio group', description: 'Choose one of several options', category: 'Form controls' },
  { type: 'switch', label: 'Switch', description: 'On/off toggle', category: 'Form controls' },
  { type: 'dropdown', label: 'Dropdown', description: 'Select from a list of options', category: 'Form controls' },
  { type: 'slider', label: 'Slider', description: 'Pick a value from a range', category: 'Form controls' },
  { type: 'progress', label: 'Progress', description: 'Show completion status', category: 'Form controls' },
  { type: 'list', label: 'List', description: 'Rows of repeating data', category: 'Data' },
  { type: 'form', label: 'Form', description: 'Fields with a submit action', category: 'Data' },
];

const CATEGORY_ORDER: readonly PaletteCategory[] = ['Layout', 'Basic', 'Form controls', 'Data'];

export const COMPONENT_MIME = 'application/x-novy-component';

interface ComponentsPaletteProps {
  onAddByType: (type: ComponentType) => void;
  isEmbedded?: boolean;
}

/**
 * Left rail: searchable, categorized component palette. Items drag onto the
 * canvas (HTML5 drag with a typed payload) and support click-to-add so the
 * keyboard path stays first-class.
 */
export function ComponentsPalette({ onAddByType, isEmbedded = false }: ComponentsPaletteProps) {
  const [search, setSearch] = useState('');

  const query = search.trim().toLowerCase();
  const visibleItems = PALETTE_ITEMS.filter(
    (item) => query.length === 0 || item.label.toLowerCase().includes(query),
  );

  function handleDragStart(event: DragEvent<HTMLButtonElement>, type: ComponentType) {
    event.dataTransfer.setData(COMPONENT_MIME, type);
    event.dataTransfer.effectAllowed = 'copy';
  }

  return (
    <section
      aria-label="Component assets"
      className={`flex min-h-0 flex-col bg-surface ${
        isEmbedded ? 'min-w-0 flex-1' : 'w-60 shrink-0 border-r border-hairline'
      }`}
    >
      <div className="border-b border-hairline p-3">
        <TextInput
          label="Search components"
          name="palette-search"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Button, list…"
          type="search"
          value={search}
        />
      </div>

      <nav aria-label="Components" className="flex-1 overflow-y-auto p-3">
        {CATEGORY_ORDER.map((category) => {
          const items = visibleItems.filter((item) => item.category === category);
          if (items.length === 0) {
            return null;
          }
          return (
            <section className="mb-4" key={category}>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                {category}
              </h3>
              <ul className="grid grid-cols-2 gap-2">
                {items.map((item) => (
                  <li key={item.type}>
                    <button
                      aria-label={`Add ${item.label}`}
                      className="flex w-full flex-col gap-0.5 rounded-tile border border-hairline bg-surface px-2.5 py-2 text-left transition-colors hover:bg-canvas focus-visible:outline-2"
                      draggable
                      onClick={() => onAddByType(item.type)}
                      onDragStart={(event) => handleDragStart(event, item.type)}
                      title="Drag onto the canvas or click to add"
                      type="button"
                    >
                      <span className="text-xs font-semibold text-ink">{item.label}</span>
                      <span className="text-[10px] leading-tight text-ink-muted">{item.description}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        {visibleItems.length === 0 ? (
          <p className="px-1 text-sm text-ink-muted" role="status">No components match “{search}”.</p>
        ) : null}
      </nav>

      <div className="border-t border-hairline p-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Roadmap</h3>
        <p className="mt-1 text-xs text-ink-muted">Data modeling arrives in a later phase.</p>
      </div>
    </section>
  );
}
