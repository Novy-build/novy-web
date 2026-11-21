import {
  ArrowDownUp,
  Binary,
  Bot,
  Box,
  Boxes,
  Braces,
  Clock3,
  ContactRound,
  Cpu,
  Database,
  DatabasePlus,
  DatabaseSearch,
  FileText,
  FileUp,
  GitBranch,
  ListPlus,
  Mail,
  MessageCircle,
  MessageSquare,
  MessagesSquare,
  MousePointerClick,
  MoveRight,
  Play,
  RefreshCw,
  ScanEye,
  Scissors,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  SquarePen,
  SunMoon,
  Trash,
  Type,
  Variable,
  type LucideIcon,
} from 'lucide-react';
import type { LogicNode } from '@domain/entities/logic';

/**
 * Lucide icons for Logic nodes, rendered with the same plain, muted style as
 * the component palette so icons look consistent across the editor.
 */

type IconKey = string;

const ICONS: Record<IconKey, LucideIcon> = {
  fallback: Box,

  // Triggers
  'trigger-click': MousePointerClick,
  'trigger-change': RefreshCw,
  'trigger-load': Play,

  // Flow
  'if-else': GitBranch,

  // UI
  'change-text': Type,
  'show-message': MessageSquare,
  'set-component-value': SlidersHorizontal,
  'add-local-list-item': ListPlus,
  navigate: MoveRight,
  'set-theme': SunMoon,

  // Database
  database: Database,
  'insert-db': DatabasePlus,
  'get-record': DatabaseSearch,
  'update-db': SquarePen,
  'delete-db': Trash,
  'refresh-collection': RefreshCw,

  // Actions
  'set-variable': Variable,
  'send-email': Mail,

  // RAG nodes
  'document-load': FileText,
  'document-upload': FileUp,
  'text-split': Scissors,
  'embedding-generate': Binary,
  'vector-store': Boxes,
  'chat-input': MessageCircle,
  rerank: ArrowDownUp,
  'prompt-template': Braces,
  'chat-model': Cpu,
  'ai-agent': Bot,
  'chat-output': MessagesSquare,
  'chat-message': Send,
  memory: Clock3,

  // Computer Vision
  'cv-liveness': ScanEye,
  'cv-enroll': ContactRound,
  'cv-verify': ShieldCheck,
};

const CANVAS_TYPE_ALIASES: Record<string, IconKey> = {
  'get-records': 'database',
  'insert-record': 'insert-db',
  'update-record': 'update-db',
  'delete-record': 'delete-db',
  'vector-upsert': 'vector-store',
  'vector-delete': 'vector-store',
  'vector-retrieve': 'vector-store',
  'query-embedding': 'embedding-generate',
  'llm-generate': 'chat-model',
};

/** Resolve a library definition id (including dynamic ids) to an icon key. */
export function logicNodeIconKey(definitionId: string): IconKey {
  if (definitionId in ICONS) return definitionId;
  if (definitionId.startsWith('component-')) {
    if (definitionId.endsWith('-click')) return 'trigger-click';
    if (definitionId.endsWith('-change')) return 'trigger-change';
    return 'trigger-load';
  }
  if (definitionId.startsWith('current-update')) return 'update-db';
  if (definitionId.startsWith('current-delete')) return 'delete-db';
  if (definitionId.startsWith('current-open')) return 'navigate';
  return 'fallback';
}

/** Resolve a graph-canvas node to the matching library icon key. */
export function logicNodeIconKeyForGraphNode(node: LogicNode): IconKey {
  if (node.kind === 'condition') return 'if-else';
  if (node.kind === 'trigger') {
    if (node.event === 'change') return 'trigger-change';
    if (node.event === 'load') return 'trigger-load';
    return 'trigger-click';
  }
  const type = node.payload.type;
  const key = CANVAS_TYPE_ALIASES[type] ?? type;
  return key in ICONS ? key : 'fallback';
}

export function LogicNodeIcon({
  iconKey,
  className = '',
}: {
  iconKey: IconKey;
  className?: string;
}) {
  const Icon = ICONS[iconKey] ?? ICONS.fallback;
  return (
    <Icon
      aria-hidden="true"
      className={`shrink-0 text-ink-muted ${className}`}
      data-testid={`logic-node-icon-${iconKey}`}
      size={16}
      strokeWidth={1.75}
    />
  );
}
