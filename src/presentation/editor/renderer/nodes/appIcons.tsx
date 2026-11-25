import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  Box,
  Calendar,
  Check,
  ChevronRight,
  CircleUser,
  Download,
  ExternalLink,
  Folder,
  GraduationCap,
  Grid2X2,
  Heart,
  Image,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  Pencil,
  Play,
  Plus,
  Save,
  Search,
  Settings,
  Share2,
  ShoppingCart,
  Trash,
  Upload,
  User,
  Users,
  Video,
  Volume2,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { APP_ICON_NAMES, type AppIconName } from '@domain/entities/componentNode';

interface AppIconDefinition {
  label: string;
  Icon: LucideIcon;
}

const DEFINITIONS: Readonly<Record<AppIconName, AppIconDefinition>> = {
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
  bell: { label: 'Bell', Icon: Bell },
  'book-open': { label: 'Book open', Icon: BookOpen },
  box: { label: 'Box', Icon: Box },
  'circle-user': { label: 'Profile', Icon: CircleUser },
  folder: { label: 'Folder', Icon: Folder },
  'graduation-cap': { label: 'Education', Icon: GraduationCap },
  'grid-2x2': { label: 'Grid', Icon: Grid2X2 },
  image: { label: 'Image', Icon: Image },
  'layout-dashboard': { label: 'Dashboard', Icon: LayoutDashboard },
  'log-out': { label: 'Log out', Icon: LogOut },
  menu: { label: 'Menu', Icon: Menu },
  'message-square': { label: 'Message', Icon: MessageSquare },
  settings: { label: 'Settings', Icon: Settings },
  users: { label: 'Users', Icon: Users },
  video: { label: 'Video', Icon: Video },
  'volume-2': { label: 'Audio', Icon: Volume2 },
  workflow: { label: 'Workflow', Icon: Workflow },
};

export const APP_ICON_OPTIONS = APP_ICON_NAMES.map((value) => ({
  value,
  label: DEFINITIONS[value].label,
}));

export function AppIcon({
  name,
  label,
  size,
  strokeWidth = 1.75,
}: {
  name: AppIconName;
  label?: string;
  size: number;
  strokeWidth?: number;
}) {
  const { Icon } = DEFINITIONS[name];
  return (
    <Icon
      aria-hidden={label ? undefined : 'true'}
      aria-label={label || undefined}
      focusable="false"
      role={label ? 'img' : undefined}
      size={size}
      strokeWidth={strokeWidth}
    />
  );
}
