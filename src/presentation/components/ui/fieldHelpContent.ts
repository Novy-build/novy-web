/**
 * Help copy for editor fields. Used by FieldHelp to explain a setting and to
 * prepare a documentation question for the in-app Novy assistant.
 *
 * Entries are keyed by the stable input `name` where one exists (for example
 * `screen-background`), and by `label:<lowercase label>` for fields rendered
 * without a name. Unmapped fields receive generic fallback copy so that every
 * editor field can expose a help affordance.
 */

export interface FieldHelpContent {
  /** Short, plain-language explanation shown in the tooltip. */
  description: string;
  /** Question pre-filled in the assistant's help mode. */
  docsQuery?: string;
}

const HELP: Readonly<Record<string, FieldHelpContent>> = {
  // App styles / screen surface
  'screen-background': {
    description: 'The base fill of the screen in light mode. Components without their own background inherit this canvas token.',
    docsQuery: 'What does the Background field under Screen surface control?',
  },
  'screen-dark-background': {
    description: 'The base fill used when the app switches to its dark theme. Leave empty to inherit the design system dark canvas token.',
    docsQuery: 'How does Dark background work in the app styles inspector?',
  },
  'label:primary': {
    description: 'The primary brand token used by buttons and key actions across the app.',
    docsQuery: 'Where is the Primary color token used?',
  },
  'label:accent': {
    description: 'The accent token for highlights, active states, and small decorative elements.',
    docsQuery: 'Where is the Accent color token used?',
  },
  'label:canvas': {
    description: 'The default page background token behind screens and panels.',
    docsQuery: 'What is the Canvas color token?',
  },
  'label:surface': {
    description: 'The token for cards, inputs, and other raised surfaces above the canvas.',
    docsQuery: 'What is the Surface color token?',
  },
  'design-body-font': {
    description: 'The default font stack for body text. Exported apps never depend on an external font CDN.',
    docsQuery: 'How does the Body font stack affect my app?',
  },
  'design-heading-font': {
    description: 'The font stack used for headings and titles throughout the app.',
    docsQuery: 'How does the Heading font stack affect my app?',
  },

  // Inspector
  'label:reusable style': {
    description: 'Attach a saved component style so this component shares its appearance with others. Local overrides stay available.',
    docsQuery: 'How do reusable styles work in the design editor?',
  },
  'inspector-button-label': {
    description: 'The text displayed inside the button in the canvas and in the exported app.',
    docsQuery: 'How do I change a button label?',
  },
  'inspector-button-icon': {
    description: 'An optional icon shown next to the button label. The icon uses the configured position.',
    docsQuery: 'How do I add an icon to a button?',
  },
  'inspector-input-placeholder': {
    description: 'The hint shown inside an empty input before the user types.',
    docsQuery: 'What does the input placeholder do?',
  },

  // Logic
  'label:event': {
    description: 'The user interaction that starts this behavior, such as a click or value change.',
    docsQuery: 'What triggers a behavior in the logic builder?',
  },
  'label:target component': {
    description: 'The component whose event starts this behavior.',
    docsQuery: 'How do I choose a target component for a trigger?',
  },
  'label:value source': {
    description: 'Where the condition reads its left-hand value from: a component, variable, record field, or constant.',
    docsQuery: 'What value sources are available in logic conditions?',
  },
  'label:collection': {
    description: 'The project data collection that the action reads records from or writes records to.',
    docsQuery: 'How do logic actions use data collections?',
  },

  // Data
  'collection-name': {
    description: 'The display name of the collection in the data editor and in logic pickers.',
    docsQuery: 'How do I rename a data collection?',
  },
  'collection-record-id': {
    description: 'The key used as the stable identifier for every record in this collection.',
    docsQuery: 'What is the Record ID name?',
  },
};

const EDITOR_LABELS: Readonly<Record<string, string>> = {
  design: 'Design',
  logic: 'Logic',
  data: 'Data',
};

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Resolves help copy for a field, falling back to generic guidance. */
export function getFieldHelp(
  key: string | undefined,
  label: string,
  editor: string | undefined,
): FieldHelpContent {
  const byName = key ? HELP[normalize(key)] : undefined;
  const byLabel = HELP[`label:${normalize(label)}`];
  const match = byName ?? byLabel;
  if (match) return match;

  const subject = label.trim() || 'this setting';
  const editorName = editor ? EDITOR_LABELS[editor] ?? editor : 'editor';
  return {
    description: `Controls “${subject}” in the ${editorName} editor. Ask Novy to search the documentation for details.`,
    docsQuery: `What is “${subject}” in the ${editorName} editor used for?`,
  };
}
