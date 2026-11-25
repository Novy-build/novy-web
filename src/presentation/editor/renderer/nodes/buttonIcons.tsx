import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  ChevronRight,
  Download,
  ExternalLink,
  Heart,
  Mail,
  Pencil,
  Play,
  Plus,
  Save,
  Search,
  Share2,
  ShoppingCart,
  Trash,
  Upload,
  User,
  type LucideIcon,
} from 'lucide-react';
import { BUTTON_ICON_NAMES, type ButtonIconName } from '@domain/entities/componentNode';

interface ButtonIconDefinition {
  label: string;
  Icon: LucideIcon;
}

/**
 * Completeness is enforced by the Record keyed on ButtonIconName, so adding a
 * persisted icon name without a renderer/Inspector option is a type error.
 */
const BUTTON_ICON_DEFINITIONS: Readonly<Record<ButtonIconName, ButtonIconDefinition>> = {
  'arrow-left': { label: 'Arrow left', Icon: ArrowLeft },
  'arrow-right': { label: 'Arrow right', Icon: ArrowRight },
  calendar: { label: 'Calendar', Icon: Calendar },
  check: { label: 'Check', Icon: Check },
  'chevron-right': { label: 'Chevron right', Icon: ChevronRight },
  download: { label: 'Download', Icon: Download },
  'external-link': { label: 'External link', Icon: ExternalLink },
  heart: { label: 'Heart', Icon: Heart },
  mail: { label: 'Mail', Icon: Mail },
  pencil: { label: 'Pencil', Icon: Pencil },
  play: { label: 'Play', Icon: Play },
  plus: { label: 'Plus', Icon: Plus },
  save: { label: 'Save', Icon: Save },
  search: { label: 'Search', Icon: Search },
  share: { label: 'Share', Icon: Share2 },
  'shopping-cart': { label: 'Shopping cart', Icon: ShoppingCart },
  trash: { label: 'Trash', Icon: Trash },
  upload: { label: 'Upload', Icon: Upload },
  user: { label: 'User', Icon: User },
};

export const BUTTON_ICON_OPTIONS: ReadonlyArray<{ value: ButtonIconName; label: string }> =
  BUTTON_ICON_NAMES.map((value) => ({ value, label: BUTTON_ICON_DEFINITIONS[value].label }));

/** Decorative icon; the button label remains the accessible name. */
export function ButtonIcon({ name, size = 16 }: { name: ButtonIconName; size?: number }) {
  const { Icon } = BUTTON_ICON_DEFINITIONS[name];
  return (
    <span aria-hidden="true" className="inline-flex shrink-0" data-button-icon={name}>
      <Icon focusable="false" size={size} />
    </span>
  );
}
