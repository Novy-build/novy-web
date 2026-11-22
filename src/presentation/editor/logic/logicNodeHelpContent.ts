import {
  LOGIC_NODE_DEFINITIONS,
  type LogicNodeDefinition,
} from './logicNodeRegistry';

/** A single configurable field shown in a node's guide. */
export interface LogicNodeHelpField {
  name: string;
  description: string;
}

/** One annotated node in the visual workflow example. */
export interface LogicNodeHelpExampleNode {
  label: string;
  detail: string;
  kind: 'trigger' | 'action' | 'condition';
  iconKey?: string;
}

export interface LogicNodeHelpContent {
  /** Resolved help key (dynamic ids map to a generic entry). */
  id: string;
  /** Display name for the definition the builder asked about. */
  title: string;
  category: string;
  /** The short one-line description from the node registry. */
  description: string;
  /** Short "how to use" text for the (?) popover. */
  summary: string;
  steps: readonly string[];
  fields: readonly LogicNodeHelpField[];
  example: {
    title: string;
    nodes: readonly LogicNodeHelpExampleNode[];
    note?: string;
  };
  isCurated: boolean;
}

type CuratedHelp = Pick<LogicNodeHelpContent, 'summary' | 'steps' | 'fields' | 'example'>;

/** Hand-written guides for the most commonly used nodes. */
const CURATED: Readonly<Record<string, CuratedHelp>> = {
  'trigger-click': {
    summary: 'Starts a workflow when the user clicks or taps the chosen component, such as a button or card.',
    steps: [
      'Select the component that should start the workflow.',
      'Drag On Click from the Triggers group onto the Logic canvas.',
      'Set Target component to the component you selected.',
      'Connect the trigger to the first action you want to run.',
    ],
    fields: [
      { name: 'Event', description: 'Fixed to Click. Use On Change for inputs and On Load for screens.' },
      { name: 'Target component', description: 'The component whose click starts this workflow.' },
    ],
    example: {
      title: 'Save a note when the button is clicked',
      nodes: [
        { label: 'On Click', detail: 'Target: Save button', kind: 'trigger', iconKey: 'trigger-click' },
        { label: 'Insert to DB', detail: 'Collection: Notes · map Title and Content from inputs', kind: 'action', iconKey: 'insert-db' },
        { label: 'Navigate', detail: 'Success → Home', kind: 'action', iconKey: 'navigate' },
      ],
    },
  },
  'trigger-change': {
    summary: 'Starts a workflow when an input, dropdown, switch, or other control receives a new value.',
    steps: [
      'Drag On Change from the Triggers group onto the canvas.',
      'Set Target component to the input or control to watch.',
      'Read the new value with Component value in a condition or input mapping.',
      'Connect the actions that should run after the value changes.',
    ],
    fields: [
      { name: 'Event', description: 'Fixed to Change; fires whenever the control value is updated.' },
      { name: 'Target component', description: 'The input, switch, dropdown, or other control being watched.' },
    ],
    example: {
      title: 'React to an actions menu choice',
      nodes: [
        { label: 'On Change', detail: 'Target: Note actions dropdown', kind: 'trigger', iconKey: 'trigger-change' },
        { label: 'If / Else', detail: 'Component value equals “Delete”', kind: 'condition', iconKey: 'if-else' },
        { label: 'Delete current item', detail: 'True → delete the clicked note', kind: 'action', iconKey: 'delete-db' },
      ],
    },
  },
  'trigger-load': {
    summary: 'Starts a workflow as soon as its target component appears on screen, ideal for loading record data.',
    steps: [
      'Drag On Load from the Triggers group onto the canvas.',
      'Choose a component on the screen as the target.',
      'Add Get Record and map Record ID from route.recordId when opening a detail screen.',
      'Prefill inputs with Set Component Value from the record on the success branch.',
    ],
    fields: [
      { name: 'Event', description: 'Fixed to Load; runs when the screen is opened.' },
      { name: 'Target component', description: 'A component on the screen that hosts this workflow.' },
    ],
    example: {
      title: 'Prefill an edit form when the screen opens',
      nodes: [
        { label: 'On Load', detail: 'Target: Edit Note screen', kind: 'trigger', iconKey: 'trigger-load' },
        { label: 'Get Record', detail: 'Collection: Notes · Record ID: route.recordId', kind: 'action', iconKey: 'get-record' },
        { label: 'Set Component Value', detail: 'Success → Title input ← record Title', kind: 'action', iconKey: 'set-component-value' },
      ],
    },
  },
  'if-else': {
    summary: 'Compares a value and splits the workflow into separate true and false branches.',
    steps: [
      'Add If / Else from the Flow group and connect it after a trigger or action.',
      'Choose a value source: a component value, variable, previous node output, or constant.',
      'Pick an operator such as equals, contains, or is empty.',
      'Enter or map the compare value, then wire the true and false outputs separately.',
    ],
    fields: [
      { name: 'Value source', description: 'The left-hand value to compare, chosen from live components, variables, or node outputs.' },
      { name: 'Operator', description: 'Equals, not equals, contains, not contains, empty, or not empty.' },
      { name: 'Compare value', description: 'The constant or mapped value on the right-hand side.' },
    ],
    example: {
      title: 'Show a different message for each result',
      nodes: [
        { label: 'On Click', detail: 'Target: Check answer button', kind: 'trigger', iconKey: 'trigger-click' },
        { label: 'If / Else', detail: 'Answer equals expected value', kind: 'condition', iconKey: 'if-else' },
        { label: 'True → Show Message', detail: '“Correct!”', kind: 'action', iconKey: 'show-message' },
        { label: 'False → Show Message', detail: '“Try again”', kind: 'action', iconKey: 'show-message' },
      ],
    },
  },
  'change-text': {
    summary: 'Replaces the text shown in a Text component while the app is running.',
    steps: [
      'Add a Text component to the screen and give it a recognizable name.',
      'Add Change Text from the UI group after a trigger or action.',
      'Set Target component to that Text component.',
      'Type a message or map one from a previous node output or collection field.',
    ],
    fields: [
      { name: 'Target component', description: 'The Text component whose content will be replaced.' },
      { name: 'Text', description: 'The new content; use a value source to show dynamic data.' },
    ],
    example: {
      title: 'Show the saved record title',
      nodes: [
        { label: 'On Click', detail: 'Target: Load note button', kind: 'trigger', iconKey: 'trigger-click' },
        { label: 'Get Record', detail: 'Collection: Notes', kind: 'action', iconKey: 'get-record' },
        { label: 'Change Text', detail: 'Target: Note title · Text ← record Title', kind: 'action', iconKey: 'change-text' },
      ],
    },
  },
  'show-message': {
    summary: 'Displays a short toast message in the running app, useful for confirming actions or errors.',
    steps: [
      'Add Show Message from the UI group after a trigger or action.',
      'Type the message to display.',
      'Map in dynamic values when the message needs data from a previous node.',
      'Wire it to the success or error output depending on the result you want to report.',
    ],
    fields: [
      { name: 'Message', description: 'The text shown to the app user when this step runs.' },
    ],
    example: {
      title: 'Confirm a saved record',
      nodes: [
        { label: 'On Click', detail: 'Target: Save button', kind: 'trigger', iconKey: 'trigger-click' },
        { label: 'Insert to DB', detail: 'Collection: Notes', kind: 'action', iconKey: 'insert-db' },
        { label: 'Show Message', detail: 'Success → “Note saved”', kind: 'action', iconKey: 'show-message' },
        { label: 'Show Message', detail: 'Error → “Could not save the note”', kind: 'action', iconKey: 'show-message' },
      ],
    },
  },
  navigate: {
    summary: 'Opens another screen in the running app and can carry the current record as route context.',
    steps: [
      'Add Navigate from the UI group where the workflow should change screens.',
      'Choose the destination screen.',
      'Keep record context when opening a detail screen so bindings resolve the selected record.',
      'Connect it to a trigger or to the success output of a database action.',
    ],
    fields: [
      { name: 'Target screen', description: 'The screen to open in the app.' },
      { name: 'Route context', description: 'Carries values such as the current record ID to the destination screen.' },
    ],
    example: {
      title: 'Open a note after inserting it',
      nodes: [
        { label: 'On Click', detail: 'Target: Save button', kind: 'trigger', iconKey: 'trigger-click' },
        { label: 'Insert to DB', detail: 'Collection: Notes', kind: 'action', iconKey: 'insert-db' },
        { label: 'Navigate', detail: 'Success → Home', kind: 'action', iconKey: 'navigate' },
      ],
    },
  },
  'set-component-value': {
    summary: 'Prefills or updates the value of an input or other value-holding component.',
    steps: [
      'Select the input you want to populate and note its name.',
      'Add Set Component Value from the UI group.',
      'Set Target component to that input.',
      'Map Value from a previous node output and pick the record field to display.',
    ],
    fields: [
      { name: 'Target component', description: 'The input, dropdown, or other component to update.' },
      { name: 'Value', description: 'The new value; use Previous node output to read a record field.' },
    ],
    example: {
      title: 'Fill an edit form from a record',
      nodes: [
        { label: 'On Load', detail: 'Target: Edit Note screen', kind: 'trigger', iconKey: 'trigger-load' },
        { label: 'Get Record', detail: 'Collection: Notes · Record ID: route.recordId', kind: 'action', iconKey: 'get-record' },
        { label: 'Set Component Value', detail: 'Target: Content input ← record Content', kind: 'action', iconKey: 'set-component-value' },
      ],
    },
  },
  'add-local-list-item': {
    summary: 'Appends a temporary item to a static ListView for the current session only.',
    steps: [
      'Add a ListView with a static data source and design its item template.',
      'Add Add Local List Item from the UI group after a trigger.',
      'Set Target component to the ListView.',
      'Map each item field to a component value, then choose append or prepend.',
    ],
    fields: [
      { name: 'Target component', description: 'The static ListView that receives the new item.' },
      { name: 'Placement', description: 'Append adds the item to the end; prepend adds it to the start.' },
      { name: 'Values', description: 'The value for each field in the ListView item template.' },
    ],
    example: {
      title: 'Add a row without saving to a collection',
      nodes: [
        { label: 'On Click', detail: 'Target: Add row button', kind: 'trigger', iconKey: 'trigger-click' },
        { label: 'Add Local List Item', detail: 'Target: Tasks list · Placement: append', kind: 'action', iconKey: 'add-local-list-item' },
      ],
      note: 'Local items disappear when the preview session closes. Use Insert to DB for saved data.',
    },
  },
  database: {
    summary: 'Reads a list of records from a project collection for use in the workflow.',
    steps: [
      'Add Database from the Database group.',
      'Choose the collection to read from.',
      'Use the returned records in a condition, a ListView, or another action.',
      'Connect the node after a trigger or an On Load workflow.',
    ],
    fields: [
      { name: 'Collection', description: 'The project collection whose records will be read.' },
    ],
    example: {
      title: 'Load records when a screen opens',
      nodes: [
        { label: 'On Load', detail: 'Target: Home screen', kind: 'trigger', iconKey: 'trigger-load' },
        { label: 'Database', detail: 'Collection: Notes', kind: 'action', iconKey: 'database' },
        { label: 'Load List Items', detail: 'Target: Notes list ← returned records', kind: 'action', iconKey: 'load-list-items' },
      ],
    },
  },
  'insert-db': {
    summary: 'Creates a new record in a collection from the values mapped in its input mapping.',
    steps: [
      'Create the collection and its fields in the Data workspace.',
      'Add Insert to DB from the Database group.',
      'Choose the collection, then map each field to a component value or constant.',
      'Wire the success output onward and handle the error output separately.',
    ],
    fields: [
      { name: 'Collection', description: 'The collection that receives the new record.' },
      { name: 'Input mapping', description: 'Maps each collection field to a value source, usually a component value.' },
      { name: 'Success / error', description: 'Separate outputs for a completed write and a failed write.' },
    ],
    example: {
      title: 'Create a note from a form',
      nodes: [
        { label: 'On Click', detail: 'Target: Save button', kind: 'trigger', iconKey: 'trigger-click' },
        { label: 'Insert to DB', detail: 'Collection: Notes · Title ← Title input', kind: 'action', iconKey: 'insert-db' },
        { label: 'Navigate', detail: 'Success → Home', kind: 'action', iconKey: 'navigate' },
      ],
    },
  },
  'get-record': {
    summary: 'Reads one record by ID, typically to populate an edit form or detail screen.',
    steps: [
      'Add Get Record from the Database group.',
      'Choose the collection that contains the record.',
      'Map Record ID from route.recordId when using a detail screen.',
      'On success, use Previous node output to bind individual record fields.',
    ],
    fields: [
      { name: 'Collection', description: 'The collection to read the record from.' },
      { name: 'Record ID', description: 'The stable ID of the record; route.recordId on detail screens.' },
    ],
    example: {
      title: 'Prefill an edit form',
      nodes: [
        { label: 'On Load', detail: 'Target: Edit Note screen', kind: 'trigger', iconKey: 'trigger-load' },
        { label: 'Get Record', detail: 'Collection: Notes · Record ID: route.recordId', kind: 'action', iconKey: 'get-record' },
        { label: 'Set Component Value', detail: 'Success → Title input ← record Title', kind: 'action', iconKey: 'set-component-value' },
      ],
    },
  },
  'update-db': {
    summary: 'Changes the fields of an existing record in a collection.',
    steps: [
      'Add Update in DB from the Database group.',
      'Choose the collection and map the Record ID of the row to change.',
      'Map the fields to update from the form inputs.',
      'Connect success and error outputs to the appropriate next steps.',
    ],
    fields: [
      { name: 'Collection', description: 'The collection that contains the record.' },
      { name: 'Record ID', description: 'Identifies which record to update.' },
      { name: 'Values', description: 'The new values for the fields being changed.' },
    ],
    example: {
      title: 'Save edits to a note',
      nodes: [
        { label: 'On Click', detail: 'Target: Save changes button', kind: 'trigger', iconKey: 'trigger-click' },
        { label: 'Update in DB', detail: 'Collection: Notes · Record ID: route.recordId', kind: 'action', iconKey: 'update-db' },
        { label: 'Navigate', detail: 'Success → Note detail', kind: 'action', iconKey: 'navigate' },
      ],
    },
  },
  'delete-db': {
    summary: 'Removes one record from a collection, with an optional confirmation step.',
    steps: [
      'Add Delete from DB from the Database group.',
      'Choose the collection and map the Record ID to delete.',
      'Enable confirmation when the app user should approve the deletion.',
      'Navigate away or refresh the collection on the success output.',
    ],
    fields: [
      { name: 'Collection', description: 'The collection that contains the record.' },
      { name: 'Record ID', description: 'Identifies which record to delete.' },
      { name: 'Confirmation', description: 'When enabled, asks the user to confirm before deleting.' },
    ],
    example: {
      title: 'Delete a note from its detail screen',
      nodes: [
        { label: 'On Click', detail: 'Target: Delete button', kind: 'trigger', iconKey: 'trigger-click' },
        { label: 'Delete from DB', detail: 'Collection: Notes · Record ID: route.recordId', kind: 'action', iconKey: 'delete-db' },
        { label: 'Navigate', detail: 'Success → Home', kind: 'action', iconKey: 'navigate' },
      ],
    },
  },
  'set-variable': {
    summary: 'Stores a value for later steps in the same workflow.',
    steps: [
      'Add Set Variable from the Actions group.',
      'Give the variable a short name.',
      'Type a constant or map a value from a component, record, or previous node.',
      'Read it later using the Variable value source in conditions and input mappings.',
    ],
    fields: [
      { name: 'Name', description: 'The variable name used when selecting it as a value source.' },
      { name: 'Value', description: 'The value to store for the rest of the workflow.' },
    ],
    example: {
      title: 'Remember the selected record',
      nodes: [
        { label: 'On Click', detail: 'Target: Note card', kind: 'trigger', iconKey: 'trigger-click' },
        { label: 'Set Variable', detail: 'Name: selectedId · Value: route.recordId', kind: 'action', iconKey: 'set-variable' },
        { label: 'Get Record', detail: 'Record ID ← selectedId', kind: 'action', iconKey: 'get-record' },
      ],
    },
  },
  'set-theme': {
    summary: 'Switches the running app between light and dark appearance, or toggles the current theme.',
    steps: [
      'Add Set Theme from the UI group.',
      'Choose light, dark, system, or toggle.',
      'Trigger it from a switch or button.',
      'Preview the app to check both appearances; the editor theme is not changed.',
    ],
    fields: [
      { name: 'Theme', description: 'Light, dark, system, or toggle to flip the current appearance.' },
    ],
    example: {
      title: 'Let the user switch themes',
      nodes: [
        { label: 'On Change', detail: 'Target: Dark mode switch', kind: 'trigger', iconKey: 'trigger-change' },
        { label: 'Set Theme', detail: 'Theme: toggle', kind: 'action', iconKey: 'set-theme' },
      ],
    },
  },
  'refresh-collection': {
    summary: 'Refetches a collection after a write so bound lists show the latest records.',
    steps: [
      'Add Refresh Collection from the Database group after a write action.',
      'Choose the collection that changed.',
      'Connect the write action’s success output to this node.',
      'Preview the app and confirm the list updates without reloading the screen.',
    ],
    fields: [
      { name: 'Collection', description: 'The collection to refetch after the preceding action succeeds.' },
    ],
    example: {
      title: 'Refresh a list after saving',
      nodes: [
        { label: 'On Click', detail: 'Target: Save button', kind: 'trigger', iconKey: 'trigger-click' },
        { label: 'Insert to DB', detail: 'Collection: Notes', kind: 'action', iconKey: 'insert-db' },
        { label: 'Refresh Collection', detail: 'Success → Notes', kind: 'action', iconKey: 'refresh-collection' },
      ],
    },
  },
  'send-email': {
    summary: 'Sends an email through the Novy runtime when this workflow step runs.',
    steps: [
      'Add Send Email from the Actions group.',
      'Set the recipient, subject, and body.',
      'Map dynamic values from inputs or previous node outputs where needed.',
      'Wire the success and error outputs to the appropriate next steps.',
    ],
    fields: [
      { name: 'To', description: 'The recipient email address.' },
      { name: 'Subject', description: 'The subject line of the message.' },
      { name: 'Body', description: 'The email content.' },
    ],
    example: {
      title: 'Send a confirmation email',
      nodes: [
        { label: 'On Click', detail: 'Target: Submit button', kind: 'trigger', iconKey: 'trigger-click' },
        { label: 'Send Email', detail: 'To: Email input · Subject: “We got your message”', kind: 'action', iconKey: 'send-email' },
        { label: 'Show Message', detail: 'Success → “Email sent”', kind: 'action', iconKey: 'show-message' },
      ],
    },
  },
  'load-list-items': {
    summary: 'Loads collection records into a ListView and selects which fields its item template can bind.',
    steps: [
      'Add a ListView to the screen and design its item template.',
      'Add Load List Items from the Database group.',
      'Set Target component to the ListView and choose a collection.',
      'Select the fields to expose, then bind item Text components to those fields.',
    ],
    fields: [
      { name: 'Target component', description: 'The ListView whose runtime items are replaced.' },
      { name: 'Collection', description: 'The collection that supplies the records.' },
      { name: 'Fields', description: 'The record fields available to the item template bindings.' },
    ],
    example: {
      title: 'Show notes in a ListView',
      nodes: [
        { label: 'On Load', detail: 'Target: Home screen', kind: 'trigger', iconKey: 'trigger-load' },
        { label: 'Load List Items', detail: 'Target: Notes list · Collection: Notes · Fields: Title, Content', kind: 'action', iconKey: 'load-list-items' },
      ],
    },
  },
  'load-chart-data': {
    summary: 'Feeds collection records into a Chart component as categories and numeric series.',
    steps: [
      'Add a Chart component to the screen and choose its chart type.',
      'Add Load Chart Data from the Database group.',
      'Set Target component to the Chart and choose a collection.',
      'Pick a category field and map one or more numeric series fields.',
    ],
    fields: [
      { name: 'Target component', description: 'The Chart that receives the loaded records.' },
      { name: 'Collection', description: 'The collection that supplies the data.' },
      { name: 'Category field', description: 'The field whose values label each category.' },
      { name: 'Series', description: 'Numeric fields plotted as bars, lines, or pie slices.' },
    ],
    example: {
      title: 'Visualize records in a chart',
      nodes: [
        { label: 'On Load', detail: 'Target: Dashboard screen', kind: 'trigger', iconKey: 'trigger-load' },
        { label: 'Load Chart Data', detail: 'Target: Sales chart · Category: Month · Series: Total', kind: 'action', iconKey: 'load-chart-data' },
      ],
    },
  },
  'component-click': {
    summary: 'A click trigger created directly for a component on the current screen. It carries that component as its target.',
    steps: [
      'Find the component’s entry in the Components group of the node library.',
      'Click or drag it onto the canvas; the target component is already set.',
      'Add the actions that should run when the component is clicked.',
      'Preview the app and click the component to test the workflow.',
    ],
    fields: [
      { name: 'Event', description: 'Fixed to Click for this component.' },
      { name: 'Target component', description: 'The component shown in the node label; set automatically.' },
    ],
    example: {
      title: 'Use the component’s own click trigger',
      nodes: [
        { label: 'Component click', detail: 'Target: the component in the node label', kind: 'trigger', iconKey: 'trigger-click' },
        { label: 'Show Message', detail: 'Message: “Clicked”', kind: 'action', iconKey: 'show-message' },
      ],
    },
  },
  'component-change': {
    summary: 'A change trigger created directly for an input or control on the current screen.',
    steps: [
      'Find the component’s entry in the Components group of the node library.',
      'Click or drag it onto the canvas; the target component is already set.',
      'Read its new value with Component value in a condition or input mapping.',
      'Add the actions that should run when the value changes.',
    ],
    fields: [
      { name: 'Event', description: 'Fixed to Change for this component.' },
      { name: 'Target component', description: 'The component shown in the node label; set automatically.' },
    ],
    example: {
      title: 'React to an input change',
      nodes: [
        { label: 'Component change', detail: 'Target: the input in the node label', kind: 'trigger', iconKey: 'trigger-change' },
        { label: 'If / Else', detail: 'Component value is not empty', kind: 'condition', iconKey: 'if-else' },
        { label: 'Show Message', detail: 'True → “Looks good”', kind: 'action', iconKey: 'show-message' },
      ],
    },
  },
  'current-update': {
    summary: 'Updates the record behind the ListView item that was clicked, without asking for its ID.',
    steps: [
      'Build a collection-backed ListView and open On Click for its item template.',
      'Add the Update current item entry from the Current item group.',
      'Choose the fields to change and map their new values.',
      'The current record ID is mapped automatically from the clicked row.',
    ],
    fields: [
      { name: 'Collection', description: 'The collection behind the ListView; inferred automatically.' },
      { name: 'Record ID', description: 'Automatically mapped from the clicked list item.' },
      { name: 'Values', description: 'The fields to update on the current record.' },
    ],
    example: {
      title: 'Edit the clicked item',
      nodes: [
        { label: 'On Click', detail: 'Target: ListView item template', kind: 'trigger', iconKey: 'trigger-click' },
        { label: 'Update current item', detail: 'Record ID ← clicked row · Values: form inputs', kind: 'action', iconKey: 'update-db' },
        { label: 'Show Message', detail: 'Success → “Updated”', kind: 'action', iconKey: 'show-message' },
      ],
    },
  },
  'current-delete': {
    summary: 'Deletes the record behind the ListView item that was clicked, using its ID automatically.',
    steps: [
      'Open the workflow for the ListView item template or its actions menu.',
      'Add the Delete current item entry from the Current item group.',
      'Keep confirmation enabled so the user must approve the deletion.',
      'Connect navigation or a message to the success output.',
    ],
    fields: [
      { name: 'Collection', description: 'The collection behind the ListView; inferred automatically.' },
      { name: 'Record ID', description: 'Automatically mapped from the clicked list item.' },
      { name: 'Confirmation', description: 'Asks the user to confirm before deleting.' },
    ],
    example: {
      title: 'Delete the clicked item',
      nodes: [
        { label: 'On Change', detail: 'Target: item actions menu · choice “Delete”', kind: 'trigger', iconKey: 'trigger-change' },
        { label: 'Delete current item', detail: 'Record ID ← clicked row · Confirm: on', kind: 'action', iconKey: 'delete-db' },
      ],
    },
  },
  'current-open': {
    summary: 'Opens a detail screen for the ListView item that was clicked, carrying its record as route context.',
    steps: [
      'Add the Open current item entry from the Current item group to the item’s click workflow.',
      'Choose the detail screen to open.',
      'The selected record ID travels with the route as route.recordId.',
      'Bind detail Text components and Get Record to that route value.',
    ],
    fields: [
      { name: 'Collection', description: 'The collection behind the ListView; inferred automatically.' },
      { name: 'Target screen', description: 'The detail screen to open.' },
      { name: 'Route context', description: 'Carries route.recordId so the destination resolves the selected record.' },
    ],
    example: {
      title: 'Open a note detail screen',
      nodes: [
        { label: 'On Click', detail: 'Target: note card', kind: 'trigger', iconKey: 'trigger-click' },
        { label: 'Open current item', detail: 'Target screen: Note Detail', kind: 'action', iconKey: 'navigate' },
        { label: 'Get Record', detail: 'On Detail: Record ID ← route.recordId', kind: 'action', iconKey: 'get-record' },
      ],
    },
  },
};

/** Definitions for dynamic library ids that still need a stable guide URL. */
const GENERIC_DEFINITIONS: Readonly<Record<string, LogicNodeDefinition>> = {
  'component-click': {
    id: 'component-click',
    category: 'Components',
    label: 'Component click',
    description: 'When a component is clicked',
    icon: '↗',
    keywords: [],
    create: () => ({ kind: 'trigger', event: 'click' }),
  },
  'component-change': {
    id: 'component-change',
    category: 'Components',
    label: 'Component change',
    description: 'When a component value changes',
    icon: '↻',
    keywords: [],
    create: () => ({ kind: 'trigger', event: 'change' }),
  },
  'current-update': {
    id: 'current-update',
    category: 'Current item',
    label: 'Update current item',
    description: 'Change fields on the current list item',
    icon: '✓',
    keywords: [],
    create: () => ({ kind: 'condition' }),
  },
  'current-delete': {
    id: 'current-delete',
    category: 'Current item',
    label: 'Delete current item',
    description: 'Delete the current list item',
    icon: '×',
    keywords: [],
    create: () => ({ kind: 'condition' }),
  },
  'current-open': {
    id: 'current-open',
    category: 'Current item',
    label: 'Open current item',
    description: 'Open a detail screen with the current list item',
    icon: '→',
    keywords: [],
    create: () => ({ kind: 'condition' }),
  },
};

/** Maps dynamic library ids to a generic, curation-friendly help key. */
export function helpKeyForId(id: string): string {
  if (id in CURATED || LOGIC_NODE_DEFINITIONS.some((definition) => definition.id === id)) return id;
  if (id.startsWith('component-')) {
    return id.endsWith('-change') || id.endsWith('-load') ? 'component-change' : 'component-click';
  }
  if (id.startsWith('current-update')) return 'current-update';
  if (id.startsWith('current-delete')) return 'current-delete';
  if (id.startsWith('current-open')) return 'current-open';
  return id;
}

export function helpKeyForDefinition(definition: LogicNodeDefinition): string {
  return helpKeyForId(definition.id);
}

function fieldLabel(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\bId\b/g, 'ID')
    .replace(/\bIds\b/g, 'IDs')
    .replace(/\b\w/g, (character) => character.toUpperCase())
    .trim();
}

const GENERIC_FIELD_DESCRIPTIONS: Readonly<Record<string, string>> = {
  collectionId: 'Choose the project collection this node reads from or writes to.',
  recordId: 'Choose which record to use; detail screens commonly map route.recordId.',
  targetNodeId: 'Pick the target component on the canvas.',
  componentId: 'Pick the component this node reads from.',
  targetScreenId: 'Choose the screen to open in the running app.',
  connectionProfileId: 'Select the configured provider profile for this step.',
  values: 'Map each collection field to a value source in the Inspector.',
  fields: 'Select the fields this node should expose or write.',
  series: 'Choose the numeric fields to plot in the chart.',
  collection: 'Choose the project collection this node uses.',
  message: 'Type the message shown to the app user.',
  text: 'Type the text to display or map a dynamic value.',
  name: 'Give this variable a name you can select as a value source later.',
  value: 'Type a value or map one from a component, record, or previous node.',
  to: 'Enter the recipient email address.',
  subject: 'Enter the subject line of the email.',
  body: 'Enter the content of the email.',
};

function describeGenericField(key: string, value: unknown): string {
  const curated = GENERIC_FIELD_DESCRIPTIONS[key];
  if (curated) return curated;
  if (typeof value === 'boolean') return 'Turn this option on or off in the Inspector.';
  if (typeof value === 'number') return 'Set a numeric value in the Inspector.';
  if (Array.isArray(value)) return 'Choose or add the entries for this field in the Inspector.';
  if (value && typeof value === 'object') return 'Fill in the nested values for this field in the Inspector.';
  if (typeof value === 'string' && value.length > 0) return `Set this value in the Inspector; the default is “${value}”.`;
  return 'Set this value in the Inspector after adding the node.';
}

function genericFields(definition: LogicNodeDefinition): LogicNodeHelpField[] {
  const node = definition.create();
  if (node.kind === 'condition') {
    return [
      { name: 'Value source', description: 'Choose what to compare in the Inspector.' },
      { name: 'Operator', description: 'Pick how the two values should be compared.' },
      { name: 'Compare value', description: 'Enter or map the value on the right-hand side.' },
    ];
  }
  if (node.kind === 'trigger') {
    return [
      { name: 'Event', description: 'The interaction or lifecycle event that starts this workflow.' },
      { name: 'Target component', description: 'The component or screen this trigger watches.' },
    ];
  }
  if (!('payload' in node) || !node.payload || typeof node.payload !== 'object') return [];
  return Object.entries(node.payload)
    .filter(([key]) => key !== 'type')
    .map(([key, value]) => ({ name: fieldLabel(key), description: describeGenericField(key, value) }));
}

function genericSummary(definition: LogicNodeDefinition): string {
  const kind = definition.create().kind;
  if (kind === 'trigger') {
    return 'Starts a workflow when the chosen event happens. Add it to the canvas, pick its target, then connect the action to run.';
  }
  if (kind === 'condition') {
    return 'Compares a value and splits the workflow into true and false branches. Configure the comparison in the Inspector.';
  }
  return `Add ${definition.label} to the canvas, configure its fields in the Inspector, then connect it after a trigger or another node.`;
}

function genericSteps(definition: LogicNodeDefinition, fields: readonly LogicNodeHelpField[]): string[] {
  const steps = [
    `Add ${definition.label} from the ${definition.category} group of the node library.`,
    'Select the node on the canvas to open its Inspector.',
    ...fields.slice(0, 3).map((field) => `Set ${field.name} in the Inspector.`),
    'Connect the node to the next step in the workflow.',
  ];
  return steps;
}

function genericExample(
  definition: LogicNodeDefinition,
  fields: readonly LogicNodeHelpField[],
): CuratedHelp['example'] {
  const ownNode: LogicNodeHelpExampleNode = {
    label: definition.label,
    detail: fields.length > 0
      ? fields.slice(0, 2).map((field) => `${field.name} = …`).join(' · ')
      : 'Configure in the Inspector',
    kind: definition.create().kind === 'condition' ? 'condition' : 'action',
    iconKey: definition.id,
  };
  const nodes: LogicNodeHelpExampleNode[] = ownNode.kind === 'trigger'
    ? [
        ownNode,
        { label: 'Show Message', detail: 'Message: “Workflow started”', kind: 'action', iconKey: 'show-message' },
      ]
    : ownNode.kind === 'condition'
      ? [
          { label: 'On Click', detail: 'Target: a button or component', kind: 'trigger', iconKey: 'trigger-click' },
          ownNode,
          { label: 'True → Show Message', detail: 'Runs when the condition passes', kind: 'action', iconKey: 'show-message' },
          { label: 'False → Show Message', detail: 'Runs when the condition fails', kind: 'action', iconKey: 'show-message' },
        ]
      : [
          { label: 'On Click', detail: 'Target: a button or component', kind: 'trigger', iconKey: 'trigger-click' },
          ownNode,
          { label: 'Show Message', detail: 'Confirm the result to the user', kind: 'action', iconKey: 'show-message' },
        ];
  return {
    title: `${definition.label} in a workflow`,
    nodes,
    note: 'This is a generic example. Set the fields in the Inspector after adding the node, and connect the outputs your app needs.',
  };
}

/** Resolves curated or generated help content for a library definition. */
export function getLogicNodeHelp(definition: LogicNodeDefinition): LogicNodeHelpContent {
  const id = helpKeyForDefinition(definition);
  const curated = CURATED[id];
  const reference = LOGIC_NODE_DEFINITIONS.find((candidate) => candidate.id === id) ?? definition;
  const fields = curated?.fields ?? genericFields(reference);
  return {
    id,
    title: definition.label,
    category: definition.category,
    description: definition.description,
    summary: curated?.summary ?? genericSummary(reference),
    steps: curated?.steps ?? genericSteps(reference, fields),
    fields,
    example: curated?.example ?? genericExample(reference, fields),
    isCurated: Boolean(curated),
  };
}

/** Resolves a guide by URL id, including generic ids used by dynamic nodes. */
export function getLogicNodeHelpById(id: string): LogicNodeHelpContent | null {
  const key = helpKeyForId(id);
  const definition = LOGIC_NODE_DEFINITIONS.find((candidate) => candidate.id === key)
    ?? GENERIC_DEFINITIONS[key];
  if (!definition) return null;
  return getLogicNodeHelp(definition);
}
