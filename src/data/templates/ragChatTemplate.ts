import type { ComponentNode } from '@domain/entities/componentNode';
import type { ActionNode, Behavior, LogicEdge, LogicGraph } from '@domain/entities/logic';
import type { Screen } from '@domain/entities/screen';
import type { Template } from '@domain/entities/template';

const UPLOAD_SCREEN_ID = 'screen_rag_upload';
const CHAT_SCREEN_ID = 'screen_rag_chat';
const FILE_INPUT_ID = 'rag_demo_file';
const STATUS_ID = 'rag_demo_status';
const CHAT_ID = 'rag_demo_chat';
const INDEX_NAME = 'rag-demo-documents';

const uploadScreen: Screen = {
  id: UPLOAD_SCREEN_ID,
  name: 'Upload Document',
  path: '/',
  nodes: [
    title('rag_demo_upload_title', 'Chat with a document', 56),
    body(
      'rag_demo_upload_intro',
      'Choose a text, Markdown, HTML, or PDF file. Novy will index it and open the chat automatically.',
      112,
      72,
    ),
    {
      id: FILE_INPUT_ID,
      type: 'file-input',
      x: 24,
      y: 220,
      w: 342,
      h: 116,
      props: {
        label: 'Choose a document',
        helperText: 'Text, Markdown, HTML, or PDF up to 5 MB',
        accept: ['text/plain', 'text/markdown', 'text/html', 'application/pdf'],
      },
    },
    body(STATUS_ID, 'Your document stays private to this demo project.', 360, 52),
  ],
  behaviors: [behavior('rag_demo_upload_behavior', 'Upload and index document', FILE_INPUT_ID, 'rag_demo_upload_graph', 'change')],
  logicGraphs: [uploadGraph()],
};

const chatScreen: Screen = {
  id: CHAT_SCREEN_ID,
  name: 'Document Chat',
  path: '/chat',
  nodes: [
    {
      id: CHAT_ID,
      type: 'chat',
      x: 24,
      y: 40,
      w: 342,
      h: 700,
      props: {
        title: 'Ask your document',
        placeholder: 'Ask a question…',
        sendLabel: 'Send',
        emptyText: 'Your document is ready. Ask your first question.',
        showCitations: true,
      },
    },
  ],
  behaviors: [behavior('rag_demo_chat_behavior', 'Ask document', CHAT_ID, 'rag_demo_chat_graph', 'change')],
  logicGraphs: [chatGraph()],
};

function uploadGraph(): LogicGraph {
  const upload: ActionNode = {
    kind: 'action',
    id: 'rag_demo_action_upload',
    position: { x: 312, y: 160 },
    payload: { type: 'document-upload', mediaReference: '' },
    inputMappings: {
      mediaReference: { source: 'component', nodeId: FILE_INPUT_ID, property: 'value' },
    },
  };
  const store: ActionNode = {
    kind: 'action',
    id: 'rag_demo_action_store',
    position: { x: 544, y: 160 },
    payload: {
      type: 'vector-store',
      operation: 'upsert',
      connectionProfileId: 'postgres-vector',
      indexName: INDEX_NAME,
      namespace: '',
      documentInputMode: 'document-loader',
      conflictMode: 'replace',
      documentId: '',
      topK: 5,
      minimumScore: 0,
    },
  };
  const navigate: ActionNode = {
    kind: 'action',
    id: 'rag_demo_action_open_chat',
    position: { x: 776, y: 160 },
    payload: { type: 'navigate', targetScreenId: CHAT_SCREEN_ID },
  };
  const loader: ActionNode = {
    kind: 'action',
    id: 'rag_demo_resource_loader',
    position: { x: 440, y: 390 },
    payload: {
      type: 'document-load',
      source: 'file-reference',
      sourceReference: '',
      documentId: '',
      title: '',
      text: '',
      metadata: { template: 'rag-demo' },
    },
  };
  const splitter: ActionNode = {
    kind: 'action',
    id: 'rag_demo_resource_splitter',
    position: { x: 208, y: 500 },
    payload: {
      type: 'text-split',
      strategy: 'recursive-character',
      chunkSize: 700,
      chunkOverlap: 100,
      separators: ['\n\n', '\n', '. ', ' '],
    },
  };
  const embeddings: ActionNode = {
    kind: 'action',
    id: 'rag_demo_resource_embeddings',
    position: { x: 672, y: 390 },
    payload: {
      type: 'embedding-generate',
      connectionProfileId: 'ollama-embedding',
      model: '',
      batchSize: 32,
    },
  };
  return {
    id: 'rag_demo_upload_graph',
    name: 'Upload and index document',
    sourceNodeId: FILE_INPUT_ID,
    purpose: 'ingestion',
    nodes: [
      { kind: 'trigger', id: 'rag_demo_upload_trigger', event: 'change', position: { x: 80, y: 160 } },
      upload,
      store,
      navigate,
      loader,
      splitter,
      embeddings,
    ],
    edges: [
      control('rag_demo_edge_upload_1', 'rag_demo_upload_trigger', 'next', upload.id),
      control('rag_demo_edge_upload_2', upload.id, 'success', store.id),
      control('rag_demo_edge_upload_3', store.id, 'success', navigate.id),
      resource('rag_demo_edge_upload_documents', loader.id, 'documents', store.id),
      resource('rag_demo_edge_upload_splitter', splitter.id, 'text-splitter', loader.id),
      resource('rag_demo_edge_upload_embeddings', embeddings.id, 'embeddings', store.id),
    ],
  };
}

function chatGraph(): LogicGraph {
  const userMessage: ActionNode = {
    kind: 'action',
    id: 'rag_demo_action_user_message',
    position: { x: 312, y: 160 },
    payload: { type: 'chat-message', targetNodeId: CHAT_ID, role: 'user', text: '' },
    inputMappings: { text: { source: 'component', nodeId: CHAT_ID, property: 'value' } },
  };
  const chatInput: ActionNode = {
    kind: 'action',
    id: 'rag_demo_action_chat_input',
    position: { x: 544, y: 160 },
    payload: { type: 'chat-input', componentId: CHAT_ID, staticQuestion: '' },
  };
  const agent: ActionNode = {
    kind: 'action',
    id: 'rag_demo_action_agent',
    position: { x: 776, y: 160 },
    payload: {
      type: 'ai-agent',
      instructions: 'Answer only from the uploaded document. If the answer is absent, say so. Cite the relevant source.',
      maxIterations: 2,
      returnIntermediateSteps: false,
    },
  };
  const assistantMessage: ActionNode = {
    kind: 'action',
    id: 'rag_demo_action_assistant_message',
    position: { x: 1008, y: 160 },
    payload: { type: 'chat-message', targetNodeId: CHAT_ID, role: 'assistant', text: '' },
    inputMappings: {
      text: { source: 'node-output', nodeId: agent.id, path: 'answer' },
      citations: { source: 'node-output', nodeId: agent.id, path: 'citations' },
    },
  };
  const chatModel: ActionNode = {
    kind: 'action',
    id: 'rag_demo_resource_chat_model',
    position: { x: 672, y: 400 },
    payload: {
      type: 'chat-model',
      connectionProfileId: 'ollama-chat',
      model: '',
      temperature: 0.2,
      maxTokens: 600,
    },
  };
  const tool: ActionNode = {
    kind: 'action',
    id: 'rag_demo_resource_tool',
    position: { x: 900, y: 400 },
    payload: {
      type: 'vector-store',
      operation: 'retrieve-tool',
      connectionProfileId: 'postgres-vector',
      indexName: INDEX_NAME,
      namespace: '',
      documentInputMode: 'document-loader',
      conflictMode: 'upsert',
      documentId: '',
      topK: 5,
      minimumScore: 0.15,
    },
  };
  const queryEmbeddings: ActionNode = {
    kind: 'action',
    id: 'rag_demo_resource_query_embeddings',
    position: { x: 1128, y: 510 },
    payload: {
      type: 'embedding-generate',
      connectionProfileId: 'ollama-embedding',
      model: '',
      batchSize: 1,
    },
  };
  const prompt: ActionNode = {
    kind: 'action',
    id: 'rag_demo_resource_prompt',
    position: { x: 440, y: 510 },
    payload: {
      type: 'prompt-template',
      template: 'Answer using only this context. Cite source labels.\n\nContext:\n{context}\n\nQuestion:\n{question}',
      contextSeparator: '\n\n---\n\n',
      emptyContextBehavior: 'return-empty',
    },
  };
  return {
    id: 'rag_demo_chat_graph',
    name: 'Ask document',
    sourceNodeId: CHAT_ID,
    purpose: 'chat',
    nodes: [
      { kind: 'trigger', id: 'rag_demo_chat_trigger', event: 'change', position: { x: 80, y: 160 } },
      userMessage,
      chatInput,
      agent,
      assistantMessage,
      chatModel,
      tool,
      queryEmbeddings,
      prompt,
    ],
    edges: [
      control('rag_demo_edge_chat_1', 'rag_demo_chat_trigger', 'next', userMessage.id),
      control('rag_demo_edge_chat_2', userMessage.id, 'next', chatInput.id),
      control('rag_demo_edge_chat_3', chatInput.id, 'next', agent.id),
      control('rag_demo_edge_chat_4', agent.id, 'success', assistantMessage.id),
      resource('rag_demo_edge_chat_model', chatModel.id, 'chat-model', agent.id),
      resource('rag_demo_edge_chat_tool', tool.id, 'tool', agent.id),
      resource('rag_demo_edge_chat_embeddings', queryEmbeddings.id, 'embeddings', tool.id),
      resource('rag_demo_edge_chat_prompt', prompt.id, 'prompt-template', agent.id),
    ],
  };
}

function title(id: string, text: string, y: number): ComponentNode {
  return { id, type: 'text', x: 24, y, w: 342, h: 44, props: { text, level: 'display' } };
}

function body(id: string, text: string, y: number, h = 44): ComponentNode {
  return { id, type: 'text', x: 24, y, w: 342, h, props: { text, level: 'body' } };
}

function behavior(id: string, name: string, targetNodeId: string, graphId: string, event: 'click' | 'change'): Behavior {
  return { id, name, targetNodeId, graphId, event };
}

function control(id: string, fromNodeId: string, fromPort: 'next' | 'success', toNodeId: string): LogicEdge {
  return { id, fromNodeId, fromPort, toNodeId, toPort: 'in', kind: 'control' };
}

function resource(id: string, fromNodeId: string, port: 'documents' | 'text-splitter' | 'embeddings' | 'chat-model' | 'tool' | 'prompt-template', toNodeId: string): LogicEdge {
  return { id, fromNodeId, fromPort: port, toNodeId, toPort: port, kind: 'resource' };
}

export const RAG_CHAT_TEMPLATE: Template = {
  id: 'template_rag_chat',
  name: 'Chat with a document',
  description: 'Upload a document, index it automatically, and ask grounded questions in a dedicated chat.',
  projectType: 'app',
  screens: [uploadScreen, chatScreen],
};
