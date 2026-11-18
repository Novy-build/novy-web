import { useState, type DragEvent } from 'react';
import {
  Camera,
  CircleDot,
  CircleGauge,
  Columns3,
  FileUp,
  Image as ImageIcon,
  List as ListIcon,
  ListFilter,
  MessageCircle,
  MousePointerClick,
  RectangleEllipsis,
  Rows3,
  SeparatorHorizontal,
  SlidersHorizontal,
  SquareCheck,
  SquareDashed,
  TextCursorInput,
  ToggleRight,
  Shapes,
  Type as TypeIcon,
  type LucideIcon,
} from 'lucide-react';
import type { ComponentType } from '@domain/entities/componentNode';
import { TextInput } from '@presentation/components/ui/TextInput';

type PaletteCategory = 'Layout' | 'Interaction' | 'Basic' | 'Form controls' | 'Data';

interface PaletteItemConfig {
  type: ComponentType;
  label: string;
  description: string;
  category: PaletteCategory;
  icon: LucideIcon;
}

export const PALETTE_ITEMS: readonly PaletteItemConfig[] = [
  { type: 'column', label: 'Column', description: 'Arrange children vertically', category: 'Layout', icon: Rows3 },
  { type: 'row', label: 'Row', description: 'Arrange children horizontally', category: 'Layout', icon: Columns3 },
  { type: 'container', label: 'Container', description: 'Free-form frame for children', category: 'Layout', icon: SquareDashed },
  { type: 'gesture-detector', label: 'Gesture Detector', description: 'Make a visual group tappable', category: 'Interaction', icon: MousePointerClick },
  { type: 'text', label: 'Text', description: 'Heading or body copy', category: 'Basic', icon: TypeIcon },
  { type: 'icon', label: 'Icon', description: 'Decorative or labelled symbol', category: 'Basic', icon: Shapes },
  { type: 'button', label: 'Button', description: 'Tap target with a label', category: 'Basic', icon: RectangleEllipsis },
  { type: 'image', label: 'Image', description: 'Picture with alt text', category: 'Basic', icon: ImageIcon },
  { type: 'camera', label: 'Camera', description: 'Capture a live image', category: 'Basic', icon: Camera },
  { type: 'file-input', label: 'File input', description: 'Upload a document', category: 'Basic', icon: FileUp },
  { type: 'chat', label: 'Chat', description: 'Conversation transcript and composer', category: 'Data', icon: MessageCircle },
  { type: 'divider', label: 'Divider', description: 'Horizontal or vertical separator', category: 'Basic', icon: SeparatorHorizontal },
  { type: 'input', label: 'Text field', description: 'Labelled text input', category: 'Form controls', icon: TextCursorInput },
  { type: 'checkbox', label: 'Checkbox', description: 'Toggle a single option', category: 'Form controls', icon: SquareCheck },
  { type: 'radio', label: 'Radio group', description: 'Choose one of several options', category: 'Form controls', icon: CircleDot },
  { type: 'switch', label: 'Switch', description: 'On/off toggle', category: 'Form controls', icon: ToggleRight },
  { type: 'dropdown', label: 'Dropdown', description: 'Select from a list of options', category: 'Form controls', icon: ListFilter },
  { type: 'slider', label: 'Slider', description: 'Pick a value from a range', category: 'Form controls', icon: SlidersHorizontal },
  { type: 'progress', label: 'Progress', description: 'Show completion status', category: 'Form controls', icon: CircleGauge },
  { type: 'listview', label: 'ListView', description: 'Scrollable repeated item template', category: 'Data', icon: ListIcon },
];

const CATEGORY_ORDER: readonly PaletteCategory[] = ['Layout', 'Interaction', 'Basic', 'Form controls', 'Data'];

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
          placeholder="Button, Column…"
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
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.type}>
                      <button
                        aria-label={`Add ${item.label}`}
                        className="flex w-full flex-col gap-1 rounded-tile border border-hairline bg-surface px-2.5 py-2 text-left transition-colors hover:bg-canvas focus-visible:outline-2"
                        draggable
                        onClick={() => onAddByType(item.type)}
                        onDragStart={(event) => handleDragStart(event, item.type)}
                        title="Drag onto the canvas or click to add"
                        type="button"
                      >
                        <span className="flex min-w-0 items-center gap-1.5">
                          <Icon
                            aria-hidden="true"
                            className="shrink-0 text-ink-muted"
                            size={16}
                            strokeWidth={1.75}
                          />
                          <span className="truncate text-xs font-semibold text-ink">{item.label}</span>
                        </span>
                        <span className="text-[10px] leading-tight text-ink-muted">{item.description}</span>
                      </button>
                    </li>
                  );
                })}
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
