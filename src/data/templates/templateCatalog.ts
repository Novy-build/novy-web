import type { ComponentNode } from '@domain/entities/componentNode';
import type { Template } from '@domain/entities/template';
import type { Behavior, LogicGraph } from '@domain/entities/logic';
import type { Screen } from '@domain/entities/screen';

/*
 * Starter templates for the New Project gallery.
 * Ids are deterministic (not factory-generated) so templates stay stable in
 * snapshots; projects get fresh screen ids on creation.
 */

const EMPTY_BEHAVIORS: Behavior[] = [];
const EMPTY_GRAPHS: LogicGraph[] = [];

function screen(id: string, name: string, nodes: ComponentNode[]): Screen {
  return { id, name, path: name === 'Home' ? '/' : `/${name.toLowerCase().replace(/\s+/g, '-')}`, nodes, behaviors: EMPTY_BEHAVIORS, logicGraphs: EMPTY_GRAPHS };
}

const BLANK: Template = {
  id: 'template_blank',
  name: 'Blank',
  description: 'Start from an empty screen and drag your own components in.',
  screens: [screen('screen_blank_home', 'Home', [])],
};

const LANDING: Template = {
  id: 'template_landing',
  name: 'Landing page',
  description: 'A classic hero + call to action for products and services.',
  screens: [
    screen('screen_landing_home', 'Home', [
      {
        id: 'landing_image',
        type: 'image',
        x: 50,
        y: 60,
        w: 290,
        h: 170,
        props: { src: '', alt: 'Hero image', fit: 'cover' },
      },
      {
        id: 'landing_headline',
        type: 'text',
        x: 50,
        y: 250,
        w: 290,
        h: 72,
        props: { text: 'Grow your business with Novy', level: 'display' },
      },
      {
        id: 'landing_support',
        type: 'text',
        x: 50,
        y: 330,
        w: 270,
        h: 48,
        props: {
          text: 'Build, preview and publish your idea in minutes — no code required.',
          level: 'body',
        },
      },
      {
        id: 'landing_cta',
        type: 'button',
        x: 50,
        y: 400,
        w: 290,
        h: 48,
        props: { label: 'Get started', variant: 'solid' },
      },
      {
        id: 'landing_secondary_cta',
        type: 'button',
        x: 50,
        y: 458,
        w: 290,
        h: 48,
        props: { label: 'Learn more', variant: 'outline' },
      },
    ]),
  ],
};

const LOGIN_FORM: Template = {
  id: 'template_login',
  name: 'Login form',
  description: 'A ready-made sign-in screen to connect to your backend later.',
  screens: [
    screen('screen_login_home', 'Sign in', [
      {
        id: 'login_title',
        type: 'text',
        x: 50,
        y: 120,
        w: 290,
        h: 36,
        props: { text: 'Welcome back', level: 'display' },
      },
      {
        id: 'login_subtitle',
        type: 'text',
        x: 50,
        y: 162,
        w: 270,
        h: 24,
        props: { text: 'Use your email to continue.', level: 'body' },
      },
      {
        id: 'login_email',
        type: 'input',
        x: 50,
        y: 218,
        w: 290,
        h: 64,
        props: { label: 'Email', placeholder: 'you@example.com', inputType: 'email', multiline: false },
      },
      {
        id: 'login_password',
        type: 'input',
        x: 50,
        y: 292,
        w: 290,
        h: 64,
        props: { label: 'Password', placeholder: '••••••••', inputType: 'password', multiline: false },
      },
      {
        id: 'login_submit',
        type: 'button',
        x: 50,
        y: 376,
        w: 290,
        h: 48,
        props: { label: 'Sign in', variant: 'solid' },
      },
    ]),
  ],
};

const STUDENT_LIST: Template = {
  id: 'template_students',
  name: 'Student list',
  description: 'A directory screen — the example app from the product spec.',
  screens: [
    screen('screen_students_home', 'Home', [
      {
        id: 'students_title',
        type: 'text',
        x: 50,
        y: 72,
        w: 250,
        h: 36,
        props: { text: 'Student Directory', level: 'display' },
      },
      {
        id: 'students_hint',
        type: 'text',
        x: 50,
        y: 116,
        w: 270,
        h: 24,
        props: { text: 'Everyone enrolled this term.', level: 'body' },
      },
      {
        id: 'students_list',
        type: 'list',
        x: 50,
        y: 164,
        w: 290,
        h: 260,
        props: {
          items: ['Bañares, Peter Andrew', 'Briñas, Andrei', 'Muñoz, Carl'],
          scrollable: true,
          showDividers: true,
        },
      },
      {
        id: 'students_add',
        type: 'button',
        x: 50,
        y: 444,
        w: 290,
        h: 44,
        props: { label: 'Add student', variant: 'solid' },
      },
    ]),
  ],
};

const NOTES_SCREEN_ID = 'screen_notes_home';
const EDITOR_SCREEN_ID = 'screen_note_editor';
const UNLOCK_SCREEN_ID = 'screen_notes_unlock';
const ASK_NOTES_SCREEN_ID = 'screen_ask_notes';

const notesScreen = screen(NOTES_SCREEN_ID, 'Notes', [
  {
    id: 'notes_title',
    type: 'text',
    x: 24,
    y: 24,
    w: 220,
    h: 36,
    props: { text: 'My Notes', level: 'display' },
  },
  {
    id: 'notes_search',
    type: 'input',
    x: 24,
    y: 72,
    w: 220,
    h: 44,
    props: { label: 'Search', placeholder: 'Search notes', inputType: 'text', multiline: false },
  },
  {
    id: 'notes_new',
    type: 'button',
    x: 252,
    y: 72,
    w: 92,
    h: 44,
    props: { label: 'New', variant: 'solid' },
  },
  {
    id: 'notes_list',
    type: 'repeater',
    x: 24,
    y: 128,
    w: 320,
    h: 420,
    props: {
      emptyText: 'No notes yet. Create your first note.',
      showDividers: true,
      dataSource: {
        kind: 'collection',
        collectionId: '',
        displayFieldIds: [],
        sortFieldId: '',
        sortDirection: 'desc',
        searchFieldId: '',
        searchComponentId: 'notes_search',
      },
    },
  },
  {
    id: 'notes_ask',
    type: 'button',
    x: 24,
    y: 560,
    w: 320,
    h: 44,
    props: { label: 'Ask your notes', variant: 'outline' },
  },
]);

const editorScreen = screen(EDITOR_SCREEN_ID, 'Note Editor', [
  {
    id: 'editor_title',
    type: 'input',
    x: 24,
    y: 24,
    w: 320,
    h: 44,
    props: { label: 'Title', placeholder: 'Note title', inputType: 'text', multiline: false },
  },
  {
    id: 'editor_body',
    type: 'input',
    x: 24,
    y: 80,
    w: 320,
    h: 220,
    props: { label: 'Body', placeholder: 'Write your note', inputType: 'text', multiline: true },
  },
  {
    id: 'editor_save',
    type: 'button',
    x: 24,
    y: 312,
    w: 104,
    h: 44,
    props: { label: 'Save', variant: 'solid' },
  },
  {
    id: 'editor_delete',
    type: 'button',
    x: 136,
    y: 312,
    w: 104,
    h: 44,
    props: { label: 'Delete', variant: 'outline' },
  },
  {
    id: 'editor_cancel',
    type: 'button',
    x: 248,
    y: 312,
    w: 96,
    h: 44,
    props: { label: 'Cancel', variant: 'text' },
  },
  {
    id: 'editor_status',
    type: 'text',
    x: 24,
    y: 368,
    w: 320,
    h: 24,
    props: { text: 'Save your note.', level: 'body' },
  },
]);

const askNotesScreen = screen(ASK_NOTES_SCREEN_ID, 'Ask Notes', [
  { id: 'ask_title', type: 'text', x: 24, y: 24, w: 320, h: 36, props: { text: 'Ask your notes', level: 'display' } },
  { id: 'ask_question', type: 'input', x: 24, y: 72, w: 320, h: 80, props: { label: 'Question', placeholder: 'What do my notes say about…?', inputType: 'text', multiline: true } },
  { id: 'ask_submit', type: 'button', x: 24, y: 168, w: 152, h: 44, props: { label: 'Ask', variant: 'solid' } },
  { id: 'ask_index', type: 'button', x: 192, y: 168, w: 152, h: 44, props: { label: 'Index notes', variant: 'outline' } },
  { id: 'ask_answer', type: 'text', x: 24, y: 232, w: 320, h: 120, props: { text: 'Your answer will appear here.', level: 'body' } },
  { id: 'ask_citations', type: 'repeater', x: 24, y: 368, w: 320, h: 160, props: { emptyText: 'No citations yet.', showDividers: true, dataSource: { kind: 'static', items: [] } } },
  { id: 'ask_back', type: 'button', x: 24, y: 544, w: 320, h: 44, props: { label: 'Back to notes', variant: 'text' } },
]);

const unlockScreen = screen(UNLOCK_SCREEN_ID, 'Unlock', [
  {
    id: 'unlock_title',
    type: 'text',
    x: 24,
    y: 24,
    w: 320,
    h: 36,
    props: { text: 'Unlock your notes', level: 'display' },
  },
  {
    id: 'unlock_intro',
    type: 'text',
    x: 24,
    y: 68,
    w: 320,
    h: 48,
    props: { text: 'Camera images are processed temporarily and are not stored in project data.', level: 'body' },
  },
  {
    id: 'unlock_camera',
    type: 'camera',
    x: 24,
    y: 128,
    w: 320,
    h: 220,
    props: { label: 'Face camera', facingMode: 'user', captureLabel: 'Capture face' },
  },
  {
    id: 'unlock_consent',
    type: 'checkbox',
    x: 24,
    y: 360,
    w: 320,
    h: 32,
    props: { label: 'I consent to biometric processing', checked: false },
  },
  {
    id: 'unlock_enroll',
    type: 'button',
    x: 24,
    y: 408,
    w: 152,
    h: 44,
    props: { label: 'Enroll', variant: 'outline' },
  },
  {
    id: 'unlock_verify',
    type: 'button',
    x: 192,
    y: 408,
    w: 152,
    h: 44,
    props: { label: 'Verify & unlock', variant: 'solid' },
  },
  {
    id: 'unlock_fallback',
    type: 'button',
    x: 24,
    y: 464,
    w: 320,
    h: 44,
    props: { label: 'Use standard sign-in', variant: 'text' },
  },
]);
unlockScreen.path = '/';

notesScreen.behaviors = [
  { id: 'behavior_notes_new', name: 'Create note', event: 'click', graphId: 'graph_notes_create', targetNodeId: 'notes_new' },
  { id: 'behavior_notes_open', name: 'Open note', event: 'click', graphId: 'graph_notes_open', targetNodeId: 'notes_list' },
  { id: 'behavior_notes_ask', name: 'Ask notes', event: 'click', graphId: 'graph_notes_ask', targetNodeId: 'notes_ask' },
];

editorScreen.behaviors = [
  { id: 'behavior_editor_save', name: 'Save note', event: 'click', graphId: 'graph_editor_save', targetNodeId: 'editor_save' },
  { id: 'behavior_editor_delete', name: 'Delete note', event: 'click', graphId: 'graph_editor_delete', targetNodeId: 'editor_delete' },
  { id: 'behavior_editor_cancel', name: 'Cancel edit', event: 'click', graphId: 'graph_editor_cancel', targetNodeId: 'editor_cancel' },
  { id: 'behavior_editor_load', name: 'Prefill note', event: 'load', graphId: 'graph_editor_load', targetNodeId: 'editor_body' },
];

askNotesScreen.behaviors = [
  { id: 'behavior_ask_submit', name: 'Ask indexed notes', event: 'click', graphId: 'graph_ask_submit', targetNodeId: 'ask_submit' },
  { id: 'behavior_ask_index', name: 'Index notes', event: 'click', graphId: 'graph_ask_index', targetNodeId: 'ask_index' },
  { id: 'behavior_ask_back', name: 'Back to notes', event: 'click', graphId: 'graph_ask_back', targetNodeId: 'ask_back' },
];

askNotesScreen.logicGraphs = [
  {
    id: 'graph_ask_index', name: 'Index notes', sourceNodeId: 'ask_index', purpose: 'ingestion',
    nodes: [
      { kind: 'trigger', id: 'trigger_ask_index', event: 'click', position: { x: 80, y: 160 } },
      { kind: 'action', id: 'upsert_notes_vectors', position: { x: 312, y: 160 }, payload: { type: 'vector-store', operation: 'upsert', connectionProfileId: '', indexName: 'notes', namespace: '', documentInputMode: 'document-loader', conflictMode: 'upsert', documentId: '', topK: 5, minimumScore: 0 } },
      { kind: 'action', id: 'show_notes_indexed', position: { x: 544, y: 160 }, payload: { type: 'show-message', message: 'Notes indexed successfully.' } },
      { kind: 'action', id: 'load_notes_documents', position: { x: 260, y: 360 }, payload: { type: 'document-load', source: 'collection', sourceReference: '', collectionId: '', documentId: '', title: '', text: '', contentFieldId: '', titleFieldId: '', documentIdFieldId: '', metadata: {} } },
      { kind: 'action', id: 'split_notes_documents', position: { x: 40, y: 500 }, payload: { type: 'text-split', strategy: 'recursive-character', chunkSize: 700, chunkOverlap: 100, separators: ['\n\n', '\n', '. ', ' '] } },
      { kind: 'action', id: 'embed_notes_documents', position: { x: 480, y: 360 }, payload: { type: 'embedding-generate', connectionProfileId: '', model: '', batchSize: 32 } },
    ],
    edges: [
      { id: 'edge_ask_index_1', fromNodeId: 'trigger_ask_index', fromPort: 'next', toNodeId: 'upsert_notes_vectors', toPort: 'in', kind: 'control' },
      { id: 'edge_ask_index_2', fromNodeId: 'upsert_notes_vectors', fromPort: 'success', toNodeId: 'show_notes_indexed', toPort: 'in', kind: 'control' },
      { id: 'resource_index_loader', fromNodeId: 'load_notes_documents', fromPort: 'documents', toNodeId: 'upsert_notes_vectors', toPort: 'documents', kind: 'resource' },
      { id: 'resource_index_splitter', fromNodeId: 'split_notes_documents', fromPort: 'text-splitter', toNodeId: 'load_notes_documents', toPort: 'text-splitter', kind: 'resource' },
      { id: 'resource_index_embeddings', fromNodeId: 'embed_notes_documents', fromPort: 'embeddings', toNodeId: 'upsert_notes_vectors', toPort: 'embeddings', kind: 'resource' },
    ],
  },
  {
    id: 'graph_ask_submit', name: 'Ask indexed notes', sourceNodeId: 'ask_submit', purpose: 'chat',
    nodes: [
      { kind: 'trigger', id: 'trigger_ask_submit', event: 'click', position: { x: 80, y: 160 } },
      { kind: 'action', id: 'read_chat_question', position: { x: 312, y: 160 }, payload: { type: 'chat-input', componentId: 'ask_question', staticQuestion: '' } },
      { kind: 'action', id: 'notes_ai_agent', position: { x: 544, y: 160 }, payload: { type: 'ai-agent', instructions: 'Answer using the attached notes tool and cite the notes used.', maxIterations: 4, returnIntermediateSteps: false }, inputMappings: { question: { source: 'node-output', nodeId: 'read_chat_question', path: 'question' }, conversationId: { source: 'node-output', nodeId: 'read_chat_question', path: 'conversationId' } } },
      { kind: 'action', id: 'render_chat_answer', position: { x: 776, y: 160 }, payload: { type: 'chat-output', targetNodeId: 'ask_answer', citationsNodeId: 'ask_citations' }, inputMappings: { answer: { source: 'node-output', nodeId: 'notes_ai_agent', path: 'answer' }, citations: { source: 'node-output', nodeId: 'notes_ai_agent', path: 'citations' } } },
      { kind: 'action', id: 'notes_chat_model', position: { x: 400, y: 360 }, payload: { type: 'chat-model', connectionProfileId: '', model: '', temperature: 0.2, maxTokens: 800 } },
      { kind: 'action', id: 'notes_chat_memory', position: { x: 580, y: 360 }, payload: { type: 'memory', operation: 'load', connectionProfileId: '', scope: 'session', windowSize: 10 } },
      { kind: 'action', id: 'notes_vector_tool', position: { x: 760, y: 360 }, payload: { type: 'vector-store', operation: 'retrieve-tool', connectionProfileId: '', indexName: 'notes', namespace: '', documentInputMode: 'document-loader', conflictMode: 'upsert', documentId: '', topK: 8, minimumScore: 0.3 } },
      { kind: 'action', id: 'notes_tool_embeddings', position: { x: 720, y: 500 }, payload: { type: 'embedding-generate', connectionProfileId: '', model: '', batchSize: 32 } },
      { kind: 'action', id: 'notes_tool_reranker', position: { x: 900, y: 500 }, payload: { type: 'rerank', connectionProfileId: '', model: '', topN: 5, minimumScore: 0.3 } },
      { kind: 'action', id: 'notes_agent_prompt', position: { x: 940, y: 360 }, payload: { type: 'prompt-template', template: 'Answer the question using only the supplied context.\n\nContext:\n{context}\n\nQuestion:\n{question}', contextSeparator: '\n\n---\n\n', emptyContextBehavior: 'return-empty' } },
    ],
    edges: [
      { id: 'edge_ask_chat_1', fromNodeId: 'trigger_ask_submit', fromPort: 'next', toNodeId: 'read_chat_question', toPort: 'in', kind: 'control' },
      { id: 'edge_ask_chat_2', fromNodeId: 'read_chat_question', fromPort: 'next', toNodeId: 'notes_ai_agent', toPort: 'in', kind: 'control' },
      { id: 'edge_ask_chat_3', fromNodeId: 'notes_ai_agent', fromPort: 'success', toNodeId: 'render_chat_answer', toPort: 'in', kind: 'control' },
      { id: 'resource_agent_model', fromNodeId: 'notes_chat_model', fromPort: 'chat-model', toNodeId: 'notes_ai_agent', toPort: 'chat-model', kind: 'resource' },
      { id: 'resource_agent_memory', fromNodeId: 'notes_chat_memory', fromPort: 'memory', toNodeId: 'notes_ai_agent', toPort: 'memory', kind: 'resource' },
      { id: 'resource_agent_tool', fromNodeId: 'notes_vector_tool', fromPort: 'tool', toNodeId: 'notes_ai_agent', toPort: 'tool', kind: 'resource' },
      { id: 'resource_agent_prompt', fromNodeId: 'notes_agent_prompt', fromPort: 'prompt-template', toNodeId: 'notes_ai_agent', toPort: 'prompt-template', kind: 'resource' },
      { id: 'resource_tool_embeddings', fromNodeId: 'notes_tool_embeddings', fromPort: 'embeddings', toNodeId: 'notes_vector_tool', toPort: 'embeddings', kind: 'resource' },
      { id: 'resource_tool_reranker', fromNodeId: 'notes_tool_reranker', fromPort: 'reranker', toNodeId: 'notes_vector_tool', toPort: 'reranker', kind: 'resource' },
    ],
  },
  {
    id: 'graph_ask_back', name: 'Back to notes', sourceNodeId: 'ask_back', purpose: 'ui',
    nodes: [
      { kind: 'trigger', id: 'trigger_ask_back', event: 'click', position: { x: 80, y: 160 } },
      { kind: 'action', id: 'navigate_ask_back', payload: { type: 'navigate', targetScreenId: NOTES_SCREEN_ID }, position: { x: 312, y: 160 } },
    ],
    edges: [{ id: 'edge_ask_back_1', fromNodeId: 'trigger_ask_back', fromPort: 'next', toNodeId: 'navigate_ask_back', toPort: 'in' }],
  },
];

unlockScreen.behaviors = [
  { id: 'behavior_unlock_enroll', name: 'Enroll biometric', event: 'click', graphId: 'graph_unlock_enroll', targetNodeId: 'unlock_enroll' },
  { id: 'behavior_unlock_verify', name: 'Verify biometric', event: 'click', graphId: 'graph_unlock_verify', targetNodeId: 'unlock_verify' },
  { id: 'behavior_unlock_fallback', name: 'Standard sign-in fallback', event: 'click', graphId: 'graph_unlock_fallback', targetNodeId: 'unlock_fallback' },
];

unlockScreen.logicGraphs = [
  {
    id: 'graph_unlock_enroll',
    name: 'Enroll biometric',
    sourceNodeId: 'unlock_enroll',
    nodes: [
      { kind: 'trigger', id: 'trigger_unlock_enroll', event: 'click', position: { x: 80, y: 160 } },
      { kind: 'condition', id: 'condition_unlock_consent', position: { x: 312, y: 160 }, left: { source: 'component', nodeId: 'unlock_consent', property: 'value' }, operator: 'equals', compareValue: 'true' },
      { kind: 'action', id: 'cv_enroll_liveness', payload: { type: 'cv-liveness', mediaReference: '' }, inputMappings: { mediaReference: { source: 'component', nodeId: 'unlock_camera', property: 'value' } }, position: { x: 544, y: 80 } },
      { kind: 'condition', id: 'condition_enroll_live', position: { x: 776, y: 80 }, left: { source: 'node-output', nodeId: 'cv_enroll_liveness', path: 'isLive' }, operator: 'equals', compareValue: 'true' },
      { kind: 'action', id: 'cv_enroll_face', payload: { type: 'cv-enroll', mediaReference: '', userId: '', consent: true }, inputMappings: { mediaReference: { source: 'component', nodeId: 'unlock_camera', property: 'value' }, userId: { source: 'session', path: 'user.id' } }, position: { x: 1008, y: 40 } },
      { kind: 'action', id: 'set_biometric_credential', payload: { type: 'set-variable', name: 'biometricCredentialId', value: '' }, inputMappings: { value: { source: 'node-output', nodeId: 'cv_enroll_face', path: 'credentialId' } }, position: { x: 1240, y: 40 } },
      { kind: 'action', id: 'show_enrolled', payload: { type: 'show-message', message: 'Biometric unlock is ready.' }, position: { x: 1472, y: 40 } },
      { kind: 'action', id: 'show_consent_required', payload: { type: 'show-message', message: 'Consent is required before enrollment.' }, position: { x: 544, y: 280 } },
      { kind: 'action', id: 'show_not_live_enroll', payload: { type: 'show-message', message: 'A live face was not detected.' }, position: { x: 1008, y: 200 } },
      { kind: 'action', id: 'show_camera_error_enroll', payload: { type: 'show-message', message: 'Capture a face image before enrolling.' }, position: { x: 776, y: 320 } },
      { kind: 'action', id: 'show_enroll_error', payload: { type: 'show-message', message: 'Biometric enrollment could not be completed.' }, position: { x: 1240, y: 200 } },
    ],
    edges: [
      { id: 'edge_enroll_1', fromNodeId: 'trigger_unlock_enroll', fromPort: 'next', toNodeId: 'condition_unlock_consent', toPort: 'in' },
      { id: 'edge_enroll_2', fromNodeId: 'condition_unlock_consent', fromPort: 'true', toNodeId: 'cv_enroll_liveness', toPort: 'in' },
      { id: 'edge_enroll_3', fromNodeId: 'condition_unlock_consent', fromPort: 'false', toNodeId: 'show_consent_required', toPort: 'in' },
      { id: 'edge_enroll_4', fromNodeId: 'cv_enroll_liveness', fromPort: 'success', toNodeId: 'condition_enroll_live', toPort: 'in' },
      { id: 'edge_enroll_5', fromNodeId: 'cv_enroll_liveness', fromPort: 'error', toNodeId: 'show_camera_error_enroll', toPort: 'in' },
      { id: 'edge_enroll_6', fromNodeId: 'condition_enroll_live', fromPort: 'true', toNodeId: 'cv_enroll_face', toPort: 'in' },
      { id: 'edge_enroll_7', fromNodeId: 'condition_enroll_live', fromPort: 'false', toNodeId: 'show_not_live_enroll', toPort: 'in' },
      { id: 'edge_enroll_8', fromNodeId: 'cv_enroll_face', fromPort: 'success', toNodeId: 'set_biometric_credential', toPort: 'in' },
      { id: 'edge_enroll_9', fromNodeId: 'cv_enroll_face', fromPort: 'error', toNodeId: 'show_enroll_error', toPort: 'in' },
      { id: 'edge_enroll_10', fromNodeId: 'set_biometric_credential', fromPort: 'next', toNodeId: 'show_enrolled', toPort: 'in' },
    ],
  },
  {
    id: 'graph_unlock_verify',
    name: 'Verify biometric',
    sourceNodeId: 'unlock_verify',
    nodes: [
      { kind: 'trigger', id: 'trigger_unlock_verify', event: 'click', position: { x: 80, y: 160 } },
      { kind: 'action', id: 'cv_verify_liveness', payload: { type: 'cv-liveness', mediaReference: '' }, inputMappings: { mediaReference: { source: 'component', nodeId: 'unlock_camera', property: 'value' } }, position: { x: 312, y: 160 } },
      { kind: 'condition', id: 'condition_verify_live', position: { x: 544, y: 160 }, left: { source: 'node-output', nodeId: 'cv_verify_liveness', path: 'isLive' }, operator: 'equals', compareValue: 'true' },
      { kind: 'action', id: 'cv_verify_face', payload: { type: 'cv-verify', mediaReference: '', threshold: 0.9 }, inputMappings: { mediaReference: { source: 'component', nodeId: 'unlock_camera', property: 'value' }, userId: { source: 'session', path: 'user.id' }, credentialId: { source: 'variable', name: 'biometricCredentialId' } }, position: { x: 776, y: 80 } },
      { kind: 'condition', id: 'condition_verified', position: { x: 1008, y: 80 }, left: { source: 'node-output', nodeId: 'cv_verify_face', path: 'verified' }, operator: 'equals', compareValue: 'true' },
      { kind: 'action', id: 'navigate_verified', payload: { type: 'navigate', targetScreenId: NOTES_SCREEN_ID }, position: { x: 1240, y: 40 } },
      { kind: 'action', id: 'show_rejected', payload: { type: 'show-message', message: 'Face verification was rejected. Try again or use standard sign-in.' }, position: { x: 1240, y: 200 } },
      { kind: 'action', id: 'show_not_live_verify', payload: { type: 'show-message', message: 'A live face was not detected.' }, position: { x: 776, y: 280 } },
      { kind: 'action', id: 'show_camera_error_verify', payload: { type: 'show-message', message: 'Capture a face image before verifying.' }, position: { x: 544, y: 320 } },
      { kind: 'action', id: 'show_verify_error', payload: { type: 'show-message', message: 'Biometric verification is unavailable. Use standard sign-in.' }, position: { x: 1008, y: 320 } },
    ],
    edges: [
      { id: 'edge_verify_1', fromNodeId: 'trigger_unlock_verify', fromPort: 'next', toNodeId: 'cv_verify_liveness', toPort: 'in' },
      { id: 'edge_verify_2', fromNodeId: 'cv_verify_liveness', fromPort: 'success', toNodeId: 'condition_verify_live', toPort: 'in' },
      { id: 'edge_verify_3', fromNodeId: 'cv_verify_liveness', fromPort: 'error', toNodeId: 'show_camera_error_verify', toPort: 'in' },
      { id: 'edge_verify_4', fromNodeId: 'condition_verify_live', fromPort: 'true', toNodeId: 'cv_verify_face', toPort: 'in' },
      { id: 'edge_verify_5', fromNodeId: 'condition_verify_live', fromPort: 'false', toNodeId: 'show_not_live_verify', toPort: 'in' },
      { id: 'edge_verify_6', fromNodeId: 'cv_verify_face', fromPort: 'success', toNodeId: 'condition_verified', toPort: 'in' },
      { id: 'edge_verify_7', fromNodeId: 'cv_verify_face', fromPort: 'error', toNodeId: 'show_verify_error', toPort: 'in' },
      { id: 'edge_verify_8', fromNodeId: 'condition_verified', fromPort: 'true', toNodeId: 'navigate_verified', toPort: 'in' },
      { id: 'edge_verify_9', fromNodeId: 'condition_verified', fromPort: 'false', toNodeId: 'show_rejected', toPort: 'in' },
    ],
  },
  {
    id: 'graph_unlock_fallback',
    name: 'Standard sign-in fallback',
    sourceNodeId: 'unlock_fallback',
    nodes: [
      { kind: 'trigger', id: 'trigger_unlock_fallback', event: 'click', position: { x: 80, y: 160 } },
      { kind: 'action', id: 'navigate_fallback', payload: { type: 'navigate', targetScreenId: NOTES_SCREEN_ID }, position: { x: 312, y: 160 } },
    ],
    edges: [{ id: 'edge_fallback_1', fromNodeId: 'trigger_unlock_fallback', fromPort: 'next', toNodeId: 'navigate_fallback', toPort: 'in' }],
  },
];

notesScreen.logicGraphs = [
  {
    id: 'graph_notes_create',
    name: 'Create note',
    sourceNodeId: 'notes_new',
    nodes: [
      { kind: 'trigger', id: 'trigger_notes_create', event: 'click', position: { x: 80, y: 160 } },
      { kind: 'action', id: 'set_mode_create', payload: { type: 'set-variable', name: 'editorMode', value: 'create' }, position: { x: 312, y: 160 } },
      { kind: 'action', id: 'set_selected_create', payload: { type: 'set-variable', name: 'selectedNoteId', value: '' }, position: { x: 544, y: 160 } },
      { kind: 'action', id: 'navigate_create', payload: { type: 'navigate', targetScreenId: EDITOR_SCREEN_ID }, position: { x: 776, y: 160 } },
    ],
    edges: [
      { id: 'edge_create_1', fromNodeId: 'trigger_notes_create', fromPort: 'next', toNodeId: 'set_mode_create', toPort: 'in' },
      { id: 'edge_create_2', fromNodeId: 'set_mode_create', fromPort: 'next', toNodeId: 'set_selected_create', toPort: 'in' },
      { id: 'edge_create_3', fromNodeId: 'set_selected_create', fromPort: 'next', toNodeId: 'navigate_create', toPort: 'in' },
    ],
  },
  {
    id: 'graph_notes_open',
    name: 'Open note',
    sourceNodeId: 'notes_list',
    nodes: [
      { kind: 'trigger', id: 'trigger_notes_open', event: 'click', position: { x: 80, y: 160 } },
      { kind: 'action', id: 'set_mode_open', payload: { type: 'set-variable', name: 'editorMode', value: 'edit' }, position: { x: 312, y: 160 } },
      { kind: 'action', id: 'set_selected_open', payload: { type: 'set-variable', name: 'selectedNoteId', value: '' }, inputMappings: { value: { source: 'component', nodeId: 'notes_list', property: 'value' } }, position: { x: 544, y: 160 } },
      { kind: 'action', id: 'navigate_open', payload: { type: 'navigate', targetScreenId: EDITOR_SCREEN_ID }, position: { x: 776, y: 160 } },
    ],
    edges: [
      { id: 'edge_open_1', fromNodeId: 'trigger_notes_open', fromPort: 'next', toNodeId: 'set_mode_open', toPort: 'in' },
      { id: 'edge_open_2', fromNodeId: 'set_mode_open', fromPort: 'next', toNodeId: 'set_selected_open', toPort: 'in' },
      { id: 'edge_open_3', fromNodeId: 'set_selected_open', fromPort: 'next', toNodeId: 'navigate_open', toPort: 'in' },
    ],
  },
  {
    id: 'graph_notes_ask', name: 'Ask notes', sourceNodeId: 'notes_ask', purpose: 'ui',
    nodes: [
      { kind: 'trigger', id: 'trigger_notes_ask', event: 'click', position: { x: 80, y: 160 } },
      { kind: 'action', id: 'navigate_notes_ask', payload: { type: 'navigate', targetScreenId: ASK_NOTES_SCREEN_ID }, position: { x: 312, y: 160 } },
    ],
    edges: [{ id: 'edge_notes_ask_1', fromNodeId: 'trigger_notes_ask', fromPort: 'next', toNodeId: 'navigate_notes_ask', toPort: 'in' }],
  },
];

editorScreen.logicGraphs = [
  {
    id: 'graph_editor_save',
    name: 'Save note',
    sourceNodeId: 'editor_save',
    nodes: [
      { kind: 'trigger', id: 'trigger_editor_save', event: 'click', position: { x: 80, y: 160 } },
      { kind: 'condition', id: 'condition_title_present', position: { x: 312, y: 160 }, left: { source: 'component', nodeId: 'editor_title', property: 'value' }, operator: 'is-not-empty', compareValue: '' },
      { kind: 'condition', id: 'condition_mode_edit', position: { x: 544, y: 80 }, left: { source: 'variable', name: 'editorMode' }, operator: 'equals', compareValue: 'edit' },
      { kind: 'action', id: 'update_note', payload: { type: 'update-record', collectionId: '', recordId: '', values: { title: '', content: '' } }, inputMappings: { '$recordId': { source: 'variable', name: 'selectedNoteId' }, title: { source: 'component', nodeId: 'editor_title', property: 'value' }, content: { source: 'component', nodeId: 'editor_body', property: 'value' } }, position: { x: 776, y: 40 } },
      { kind: 'action', id: 'insert_note', payload: { type: 'insert-record', collectionId: '', values: { title: '', content: '', ownerId: '' } }, inputMappings: { title: { source: 'component', nodeId: 'editor_title', property: 'value' }, content: { source: 'component', nodeId: 'editor_body', property: 'value' }, ownerId: { source: 'session', path: 'user.id' } }, position: { x: 776, y: 200 } },
      { kind: 'action', id: 'index_updated_note', payload: { type: 'vector-store', operation: 'upsert', connectionProfileId: '', indexName: 'notes', namespace: '', documentInputMode: 'document-loader', conflictMode: 'replace', documentId: '', topK: 5, minimumScore: 0 }, position: { x: 1008, y: 40 } },
      { kind: 'action', id: 'index_inserted_note', payload: { type: 'vector-store', operation: 'upsert', connectionProfileId: '', indexName: 'notes', namespace: '', documentInputMode: 'document-loader', conflictMode: 'upsert', documentId: '', topK: 5, minimumScore: 0 }, position: { x: 1008, y: 200 } },
      { kind: 'action', id: 'navigate_after_update', payload: { type: 'navigate', targetScreenId: NOTES_SCREEN_ID }, position: { x: 1240, y: 40 } },
      { kind: 'action', id: 'navigate_after_insert', payload: { type: 'navigate', targetScreenId: NOTES_SCREEN_ID }, position: { x: 1240, y: 200 } },
      { kind: 'action', id: 'show_update_index_failed', payload: { type: 'show-message', message: 'Note saved. Vector indexing will retry.' }, position: { x: 1240, y: 320 } },
      { kind: 'action', id: 'show_insert_index_failed', payload: { type: 'show-message', message: 'Note saved. Vector indexing will retry.' }, position: { x: 1240, y: 440 } },
      { kind: 'action', id: 'show_title_required', payload: { type: 'show-message', message: 'Title is required.' }, position: { x: 544, y: 280 } },
      { kind: 'action', id: 'map_saved_note_document', position: { x: 880, y: 520 }, payload: { type: 'document-load', source: 'previous-output', sourceReference: '', documentId: '', title: '', text: '', metadata: {} } },
      { kind: 'action', id: 'split_saved_note', position: { x: 660, y: 660 }, payload: { type: 'text-split', strategy: 'recursive-character', chunkSize: 700, chunkOverlap: 100, separators: ['\n\n', '\n', '. ', ' '] } },
      { kind: 'action', id: 'embed_saved_note', position: { x: 1100, y: 520 }, payload: { type: 'embedding-generate', connectionProfileId: '', model: '', batchSize: 32 } },
    ],
    edges: [
      { id: 'edge_save_1', fromNodeId: 'trigger_editor_save', fromPort: 'next', toNodeId: 'condition_title_present', toPort: 'in' },
      { id: 'edge_save_2', fromNodeId: 'condition_title_present', fromPort: 'true', toNodeId: 'condition_mode_edit', toPort: 'in' },
      { id: 'edge_save_3', fromNodeId: 'condition_title_present', fromPort: 'false', toNodeId: 'show_title_required', toPort: 'in' },
      { id: 'edge_save_4', fromNodeId: 'condition_mode_edit', fromPort: 'true', toNodeId: 'update_note', toPort: 'in' },
      { id: 'edge_save_5', fromNodeId: 'condition_mode_edit', fromPort: 'false', toNodeId: 'insert_note', toPort: 'in' },
      { id: 'edge_save_6', fromNodeId: 'update_note', fromPort: 'success', toNodeId: 'index_updated_note', toPort: 'in', kind: 'control' },
      { id: 'edge_save_7', fromNodeId: 'insert_note', fromPort: 'success', toNodeId: 'index_inserted_note', toPort: 'in', kind: 'control' },
      { id: 'edge_save_8', fromNodeId: 'index_updated_note', fromPort: 'success', toNodeId: 'navigate_after_update', toPort: 'in', kind: 'control' },
      { id: 'edge_save_9', fromNodeId: 'index_inserted_note', fromPort: 'success', toNodeId: 'navigate_after_insert', toPort: 'in', kind: 'control' },
      { id: 'edge_save_10', fromNodeId: 'index_updated_note', fromPort: 'error', toNodeId: 'show_update_index_failed', toPort: 'in', kind: 'control' },
      { id: 'edge_save_11', fromNodeId: 'index_inserted_note', fromPort: 'error', toNodeId: 'show_insert_index_failed', toPort: 'in', kind: 'control' },
      { id: 'resource_saved_splitter', fromNodeId: 'split_saved_note', fromPort: 'text-splitter', toNodeId: 'map_saved_note_document', toPort: 'text-splitter', kind: 'resource' },
      { id: 'resource_update_loader', fromNodeId: 'map_saved_note_document', fromPort: 'documents', toNodeId: 'index_updated_note', toPort: 'documents', kind: 'resource' },
      { id: 'resource_insert_loader', fromNodeId: 'map_saved_note_document', fromPort: 'documents', toNodeId: 'index_inserted_note', toPort: 'documents', kind: 'resource' },
      { id: 'resource_update_embeddings', fromNodeId: 'embed_saved_note', fromPort: 'embeddings', toNodeId: 'index_updated_note', toPort: 'embeddings', kind: 'resource' },
      { id: 'resource_insert_embeddings', fromNodeId: 'embed_saved_note', fromPort: 'embeddings', toNodeId: 'index_inserted_note', toPort: 'embeddings', kind: 'resource' },
    ],
  },
  {
    id: 'graph_editor_delete',
    name: 'Delete note',
    sourceNodeId: 'editor_delete',
    nodes: [
      { kind: 'trigger', id: 'trigger_editor_delete', event: 'click', position: { x: 80, y: 160 } },
      { kind: 'condition', id: 'condition_has_selected', position: { x: 312, y: 160 }, left: { source: 'variable', name: 'selectedNoteId' }, operator: 'is-not-empty', compareValue: '' },
      { kind: 'action', id: 'delete_note', payload: { type: 'delete-record', collectionId: '', recordId: '' }, inputMappings: { '$recordId': { source: 'variable', name: 'selectedNoteId' } }, position: { x: 544, y: 120 } },
      { kind: 'action', id: 'delete_note_vectors', payload: { type: 'vector-store', operation: 'delete', connectionProfileId: '', indexName: 'notes', namespace: '', documentInputMode: 'previous-output', conflictMode: 'upsert', documentId: '' , topK: 5, minimumScore: 0 }, inputMappings: { documentId: { source: 'variable', name: 'selectedNoteId' } }, position: { x: 776, y: 120 } },
      { kind: 'action', id: 'clear_selected', payload: { type: 'set-variable', name: 'selectedNoteId', value: '' }, position: { x: 1008, y: 120 } },
      { kind: 'action', id: 'navigate_after_delete', payload: { type: 'navigate', targetScreenId: NOTES_SCREEN_ID }, position: { x: 1240, y: 120 } },
      { kind: 'action', id: 'show_vector_cleanup_pending', payload: { type: 'show-message', message: 'Note deleted. Vector cleanup will retry.' }, position: { x: 1008, y: 280 } },
      { kind: 'action', id: 'show_nothing_to_delete', payload: { type: 'show-message', message: 'No note selected.' }, position: { x: 544, y: 260 } },
    ],
    edges: [
      { id: 'edge_delete_1', fromNodeId: 'trigger_editor_delete', fromPort: 'next', toNodeId: 'condition_has_selected', toPort: 'in' },
      { id: 'edge_delete_2', fromNodeId: 'condition_has_selected', fromPort: 'true', toNodeId: 'delete_note', toPort: 'in' },
      { id: 'edge_delete_3', fromNodeId: 'condition_has_selected', fromPort: 'false', toNodeId: 'show_nothing_to_delete', toPort: 'in' },
      { id: 'edge_delete_4', fromNodeId: 'delete_note', fromPort: 'success', toNodeId: 'delete_note_vectors', toPort: 'in', kind: 'control' },
      { id: 'edge_delete_5', fromNodeId: 'delete_note_vectors', fromPort: 'success', toNodeId: 'clear_selected', toPort: 'in', kind: 'control' },
      { id: 'edge_delete_6', fromNodeId: 'delete_note_vectors', fromPort: 'error', toNodeId: 'show_vector_cleanup_pending', toPort: 'in', kind: 'control' },
      { id: 'edge_delete_7', fromNodeId: 'clear_selected', fromPort: 'next', toNodeId: 'navigate_after_delete', toPort: 'in', kind: 'control' },
    ],
  },
  {
    id: 'graph_editor_cancel',
    name: 'Cancel edit',
    sourceNodeId: 'editor_cancel',
    nodes: [
      { kind: 'trigger', id: 'trigger_editor_cancel', event: 'click', position: { x: 80, y: 160 } },
      { kind: 'action', id: 'navigate_cancel', payload: { type: 'navigate', targetScreenId: NOTES_SCREEN_ID }, position: { x: 312, y: 160 } },
    ],
    edges: [
      { id: 'edge_cancel_1', fromNodeId: 'trigger_editor_cancel', fromPort: 'next', toNodeId: 'navigate_cancel', toPort: 'in' },
    ],
  },
  {
    id: 'graph_editor_load',
    name: 'Prefill note',
    sourceNodeId: 'editor_body',
    nodes: [
      { kind: 'trigger', id: 'trigger_editor_load', event: 'load', position: { x: 80, y: 160 } },
      { kind: 'condition', id: 'condition_load_selected', position: { x: 312, y: 160 }, left: { source: 'variable', name: 'selectedNoteId' }, operator: 'is-not-empty', compareValue: '' },
      { kind: 'action', id: 'load_note', payload: { type: 'get-record', collectionId: '', recordId: '' }, inputMappings: { '$recordId': { source: 'variable', name: 'selectedNoteId' } }, position: { x: 544, y: 120 } },
      { kind: 'action', id: 'set_title', payload: { type: 'set-component-value', targetNodeId: 'editor_title', value: '' }, inputMappings: { value: { source: 'node-output', nodeId: 'load_note', path: 'record.values.title' } }, position: { x: 776, y: 80 } },
      { kind: 'action', id: 'set_body', payload: { type: 'set-component-value', targetNodeId: 'editor_body', value: '' }, inputMappings: { value: { source: 'node-output', nodeId: 'load_note', path: 'record.values.content' } }, position: { x: 1008, y: 80 } },
    ],
    edges: [
      { id: 'edge_load_1', fromNodeId: 'trigger_editor_load', fromPort: 'next', toNodeId: 'condition_load_selected', toPort: 'in' },
      { id: 'edge_load_2', fromNodeId: 'condition_load_selected', fromPort: 'true', toNodeId: 'load_note', toPort: 'in' },
      { id: 'edge_load_3', fromNodeId: 'load_note', fromPort: 'success', toNodeId: 'set_title', toPort: 'in' },
      { id: 'edge_load_4', fromNodeId: 'set_title', fromPort: 'next', toNodeId: 'set_body', toPort: 'in' },
    ],
  },
];

const NOTES: Template = {
  id: 'template_notes',
  name: 'Note taking app',
  description: 'A starter notes app with CRUD, search, RAG-ready data, and optional biometric unlock.',
  screens: [unlockScreen, notesScreen, editorScreen, askNotesScreen],
};

export const TEMPLATE_CATALOG: readonly Template[] = [BLANK, LANDING, LOGIN_FORM, STUDENT_LIST, NOTES];
