/**
 * Help copy for editor fields. Used by FieldHelp to explain a setting, list the
 * choices of a dropdown, and prepare a documentation question for the in-app
 * Novy assistant.
 *
 * Entries are keyed by the stable input `name` where one exists (for example
 * `screen-background`), and by `label:<normalized label>` for fields rendered
 * without a name. Unmapped fields receive generic fallback copy so that every
 * editor field can expose a help affordance.
 */

export interface FieldHelpContent {
  /** Short, plain-language explanation shown in the tooltip. */
  description: string;
  /** Question pre-filled in the assistant's help mode. */
  docsQuery?: string;
  /** Extra guidance shown between the description and the choices list. */
  note?: string;
  /** Explanation used for option labels that are not in the option dictionary. */
  dynamicOptionHint?: string;
  /** Explicit choices, used for custom controls that do not expose native options. */
  options?: readonly { label: string }[];
}

export interface FieldHelpOption {
  label: string;
  description: string;
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
  'label:reusable-style': {
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
  'label:input-type': {
    description: 'The HTML input type used by this field in the generated app.',
    note: 'Password fields mask typing only. Do not use them to collect secrets you plan to store in project data.',
    docsQuery: 'Which input types are available and how do they behave?',
  },
  'label:data-source': {
    description: 'Where this list gets the items it displays.',
    note: 'Switching the data source replaces the fields below it, so re-check the record label afterwards.',
    docsQuery: 'What is the difference between Static items and Collection as a list data source?',
  },
  'label:static-items': {
    description: 'The fixed rows defined directly on this list when its data source is Static items.',
    docsQuery: 'How do I edit static items in a list?',
  },
  'label:effect-preset': {
    description: 'A ready-made shadow treatment for this component. Advanced borders and custom shadows remain editable.',
    docsQuery: 'What do the effect presets do?',
  },

  // Logic
  'label:event': {
    description: 'The user interaction that starts this behavior, such as a click or value change.',
    docsQuery: 'What triggers a behavior in the logic builder?',
  },
  'label:target-component': {
    description: 'The component whose event starts this behavior.',
    docsQuery: 'How do I choose a target component for a trigger?',
  },
  'label:value-source': {
    description: 'Where the condition reads its left-hand value from: a component, variable, record field, or constant.',
    docsQuery: 'What value sources are available in logic conditions?',
  },
  'label:collection': {
    description: 'The project data collection used by this field — as the source of list items, or as the collection an action reads from and writes to.',
    dynamicOptionHint: 'Uses records from this collection.',
    docsQuery: 'How do I choose a project data collection?',
  },
  'label:use-value-from': {
    description: 'The source of the value passed into this action input.',
    note: 'Static mapping is evaluated when the workflow runs; other sources read live state at that moment.',
    docsQuery: 'How do action input mappings work in the logic builder?',
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

/** Intuitive explanations for every static dropdown option in the editors. */
const OPTION_HELP: Readonly<Record<string, string>> = {
  // List source and data types
  'static-items': 'Hard-code a short, fixed list in the project. Best for menus that never change.',
  collection: 'Read records from a project data collection. Best when the list changes at runtime or comes from user data.',
  text: 'Stores plain text such as names, titles, or descriptions.',
  number: 'Stores numeric values for counts, prices, and calculations.',
  boolean: 'Stores a true/false value, ideal for flags and switches.',
  date: 'Stores a calendar date or time.',
  email: 'Stores an email address and uses an email-friendly keyboard on mobile.',
  password: 'Masks characters while typing. It is not encryption and should not protect stored secrets.',
  'level-preset': 'Inherits font size and weight from the selected text level preset.',

  // Alignment and spacing
  left: 'Aligns content to the left edge.',
  center: 'Centers content along the available space.',
  right: 'Aligns content to the right edge.',
  justify: 'Spreads text so each line fills the full width.',
  start: 'Places items at the beginning of the axis — top or left, depending on direction.',
  end: 'Places items at the end of the axis — bottom or right, depending on direction.',
  stretch: 'Stretches items to fill the available cross-axis space.',
  'space-between': 'Spreads items with the first at the start and the last at the end.',
  'space-around': 'Gives each item equal space around it, so edge gaps are half the size.',
  'space-evenly': 'Makes every gap, including the edges, exactly the same size.',

  // Text styling
  none: 'Leaves the value unchanged — no transform, icon, shadow, or shared style.',
  uppercase: 'Displays the text in all capitals without changing the stored value.',
  lowercase: 'Displays the text in all lowercase without changing the stored value.',
  capitalize: 'Capitalizes the first letter of each word for display only.',
  'no-shared-style': 'Detaches from any saved style, leaving only this component’s own settings.',
  'no-icon': 'Shows the component without an icon.',

  // Camera and capture
  'manual-photo': 'Opens the camera so the user takes the photo themselves.',
  'guided-face-automatic': 'Guides the user through a face capture with on-screen prompts. Production biometric processing requires an explicitly selected provider.',
  'front-camera': 'Uses the device’s front-facing camera.',
  'rear-camera': 'Uses the device’s rear camera.',

  // List and component variants
  vertical: 'Stacks items from top to bottom.',
  horizontal: 'Places items from left to right.',
  dropdown: 'A standard select menu that opens on click — use for choosing one value.',
  'actions-menu': 'A menu of actions rather than a single value — use for per-item commands.',
  'no-record-label': 'Leaves records unlabeled, so only their raw identifiers are shown.',

  // Effects
  'soft-shadow': 'A subtle, diffuse shadow for gentle depth.',
  elevated: 'A stronger shadow that makes the component appear to float above the page.',
  'accent-glow': 'A colored glow using the accent token, useful for emphasis.',
  'current-effect': 'Keeps the custom shadow already configured in Advanced.',

  // Logic triggers
  'on-click': 'Runs when the user clicks or taps the component.',
  'on-change': 'Runs when the component’s value changes.',
  'on-load': 'Runs as soon as the screen appears.',

  // Logic list operations
  append: 'Adds the new item to the end of the list.',
  prepend: 'Adds the new item to the beginning of the list.',

  // Logic operators
  equals: 'Passes when the value matches exactly.',
  'does-not-equal': 'Passes when the value is different.',
  contains: 'Passes when the text includes the comparison value.',
  'does-not-contain': 'Passes when the text does not include the comparison value.',
  'is-empty': 'Passes when the value is blank or missing.',
  'is-not-empty': 'Passes when the value has content.',

  // Logic value sources
  'field-value-above': 'Uses the value typed in the field directly above this mapping.',
  'fixed-value': 'Uses a literal value you type below — good for constants such as a status string.',
  'component-value': 'Reads the current value of another component on the screen.',
  'current-list-item': 'Reads a field from the item currently being rendered in a list.',
  'current-item-automatic': 'Uses the automatic identifier of the current list item.',
  'current-item-id': 'Uses the automatic identifier of the current list item.',
  'session-value': 'Reads a value from the generated app’s end-user session.',
  'user-id': 'Reads the signed-in end user’s identifier from the runtime session.',
  'user-email': 'Reads the signed-in end user’s email from the runtime session.',
  'user-name': 'Reads the signed-in end user’s display name from the runtime session.',
  'application-variable': 'Reads a variable stored in the generated application.',
  'earlier-step-result': 'Reuses the output of a previous node in this workflow.',
  'previous-node-output': 'Reuses the output of the immediately preceding node in this workflow.',

  // Theme and simple choices
  light: 'Uses the light color tokens.',
  dark: 'Uses the dark color tokens.',
  'follow-system': 'Follows the device’s light or dark setting automatically.',
  system: 'Follows the device’s light or dark setting automatically.',
  'toggle-light-and-dark': 'Shows a switch that lets the end user change the theme.',
  yes: 'Turns this option on.',
  'no': 'Leaves this option off.',
  'first-available': 'Lets the assistant use its configured default model.',
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

/**
 * Resolves the use case for a dropdown option. Curated labels win; dynamic
 * values fall back to the field's category hint, then to neutral generic copy.
 */
export function describeOption(label: string, dynamicHint?: string): string {
  const curated = OPTION_HELP[normalize(label)];
  if (curated) return curated;
  if (dynamicHint) return dynamicHint;
  return `Selects “${label.trim()}” as the value for this field.`;
}

/** Returns true when the option has a curated explanation. */
export function hasCuratedOptionHelp(label: string): boolean {
  return Boolean(OPTION_HELP[normalize(label)]);
}
