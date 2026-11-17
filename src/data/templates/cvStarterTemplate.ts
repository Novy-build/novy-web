import type { ComponentNode } from '@domain/entities/componentNode';
import type { ActionNode, Behavior, LogicGraph } from '@domain/entities/logic';
import type { Screen } from '@domain/entities/screen';
import type { Template } from '@domain/entities/template';

const REGISTRATION_SCREEN_ID = 'screen_cv_registration';
const TEST_SCREEN_ID = 'screen_cv_test';

const REGISTRATION_CAMERA_ID = 'cv_registration_camera';
const CONSENT_ID = 'cv_registration_consent';
const ENROLL_BUTTON_ID = 'cv_registration_enroll';
const REGISTRATION_STATUS_ID = 'cv_registration_status';
const OPEN_TEST_BUTTON_ID = 'cv_registration_open_test';

const TEST_CAMERA_ID = 'cv_test_camera';
const EMAIL_ID = 'cv_test_email';
const LIVENESS_BUTTON_ID = 'cv_test_liveness';
const VERIFY_BUTTON_ID = 'cv_test_verify';
const TEST_STATUS_ID = 'cv_test_status';
const BACK_BUTTON_ID = 'cv_test_back';

const registrationScreen: Screen = {
  id: REGISTRATION_SCREEN_ID,
  name: 'Biometric Registration',
  path: '/',
  nodes: [
    title('cv_registration_title', 'Register biometrics'),
    body(
      'cv_registration_intro',
      'Capture a clear face image and grant consent to register the signed-in app user.',
      88,
    ),
    camera(REGISTRATION_CAMERA_ID, 144),
    {
      id: CONSENT_ID,
      type: 'checkbox',
      x: 24,
      y: 368,
      w: 342,
      h: 40,
      props: { label: 'I consent to biometric enrollment', checked: false },
    },
    button(ENROLL_BUTTON_ID, 'Register my face', 424, 'solid'),
    body(
      REGISTRATION_STATUS_ID,
      'Registration status: capture a face and grant consent to begin.',
      488,
      56,
      'medium',
    ),
    button(OPEN_TEST_BUTTON_ID, 'Test face recognition', 560, 'outline'),
  ],
  behaviors: [
    behavior(
      'cv_registration_behavior_enroll',
      'Register face',
      ENROLL_BUTTON_ID,
      'cv_registration_graph_enroll',
    ),
    behavior(
      'cv_registration_behavior_open_test',
      'Open recognition test',
      OPEN_TEST_BUTTON_ID,
      'cv_registration_graph_open_test',
    ),
  ],
  logicGraphs: [
    cvStatusGraph(
      'cv_registration_graph_enroll',
      'Register face',
      ENROLL_BUTTON_ID,
      {
        kind: 'action',
        id: 'cv_registration_action_enroll',
        position: { x: 312, y: 160 },
        payload: { type: 'cv-enroll', mediaReference: '', userId: '', consent: false },
        inputMappings: {
          mediaReference: {
            source: 'component',
            nodeId: REGISTRATION_CAMERA_ID,
            property: 'value',
          },
          consent: { source: 'component', nodeId: CONSENT_ID, property: 'value' },
        },
      },
      REGISTRATION_STATUS_ID,
      'Registration status: face registered for the signed-in app user.',
      'Registration status: sign in, capture a face, and grant consent.',
    ),
    navigationGraph(
      'cv_registration_graph_open_test',
      'Open recognition test',
      OPEN_TEST_BUTTON_ID,
      TEST_SCREEN_ID,
    ),
  ],
};

const testScreen: Screen = {
  id: TEST_SCREEN_ID,
  name: 'Recognition Test',
  path: '/test-recognition',
  nodes: [
    title('cv_test_title', 'Test face recognition'),
    body(
      'cv_test_intro',
      'Capture a face and enter the account email used by the enrolled app user.',
      88,
    ),
    camera(TEST_CAMERA_ID, 144),
    {
      id: EMAIL_ID,
      type: 'input',
      x: 24,
      y: 368,
      w: 342,
      h: 64,
      props: {
        label: 'Enrolled account email',
        placeholder: 'you@example.com',
        inputType: 'email',
        multiline: false,
      },
    },
    button(LIVENESS_BUTTON_ID, 'Check liveness', 448, 'outline'),
    button(VERIFY_BUTTON_ID, 'Recognize face', 504, 'solid'),
    body(
      TEST_STATUS_ID,
      'Recognition result: not tested yet. Editor preview uses simulation.',
      568,
      56,
      'medium',
    ),
    button(BACK_BUTTON_ID, 'Back to registration', 640, 'outline'),
  ],
  behaviors: [
    behavior(
      'cv_test_behavior_liveness',
      'Check face liveness',
      LIVENESS_BUTTON_ID,
      'cv_test_graph_liveness',
    ),
    behavior(
      'cv_test_behavior_verify',
      'Recognize face',
      VERIFY_BUTTON_ID,
      'cv_test_graph_verify',
    ),
    behavior(
      'cv_test_behavior_back',
      'Back to registration',
      BACK_BUTTON_ID,
      'cv_test_graph_back',
    ),
  ],
  logicGraphs: [
    cvStatusGraph(
      'cv_test_graph_liveness',
      'Check face liveness',
      LIVENESS_BUTTON_ID,
      {
        kind: 'action',
        id: 'cv_test_action_liveness',
        position: { x: 312, y: 160 },
        payload: { type: 'cv-liveness', mediaReference: '' },
        inputMappings: {
          mediaReference: { source: 'component', nodeId: TEST_CAMERA_ID, property: 'value' },
        },
      },
      TEST_STATUS_ID,
      'Liveness result: check completed.',
      'Liveness result: capture a face before running the check.',
    ),
    verificationGraph(),
    navigationGraph(
      'cv_test_graph_back',
      'Back to registration',
      BACK_BUTTON_ID,
      REGISTRATION_SCREEN_ID,
    ),
  ],
};

export const CV_STARTER_TEMPLATE: Template = {
  id: 'template_cv_starter',
  name: 'Face verification',
  description: 'Separate biometric registration and face-recognition testing screens.',
  projectType: 'app',
  screens: [registrationScreen, testScreen],
};

function title(id: string, text: string): ComponentNode {
  return {
    id,
    type: 'text',
    x: 24,
    y: 32,
    w: 342,
    h: 48,
    props: { text, level: 'display', fontSize: 32, fontWeight: 'bold' },
  };
}

function body(
  id: string,
  text: string,
  y: number,
  h = 40,
  fontWeight?: 'medium',
): ComponentNode {
  return {
    id,
    type: 'text',
    x: 24,
    y,
    w: 342,
    h,
    props: { text, level: 'body', ...(fontWeight ? { fontWeight } : {}) },
  };
}

function camera(id: string, y: number): ComponentNode {
  return {
    id,
    type: 'camera',
    x: 24,
    y,
    w: 342,
    h: 208,
    props: { label: 'Face camera', facingMode: 'user', captureLabel: 'Capture face' },
  };
}

function button(
  id: string,
  label: string,
  y: number,
  variant: 'solid' | 'outline',
): ComponentNode {
  return {
    id,
    type: 'button',
    x: 24,
    y,
    w: 342,
    h: 44,
    props: { label, variant },
  };
}

function behavior(id: string, name: string, targetNodeId: string, graphId: string): Behavior {
  return { id, name, event: 'click', graphId, targetNodeId };
}

function cvStatusGraph(
  id: string,
  name: string,
  sourceNodeId: string,
  cvAction: ActionNode,
  statusNodeId: string,
  successText: string,
  errorText: string,
): LogicGraph {
  const triggerId = `${id}_trigger`;
  const successId = `${id}_success`;
  const errorId = `${id}_error`;
  return {
    id,
    name,
    sourceNodeId,
    nodes: [
      { kind: 'trigger', id: triggerId, event: 'click', position: { x: 80, y: 160 } },
      cvAction,
      statusAction(successId, statusNodeId, successText, { x: 544, y: 80 }),
      statusAction(errorId, statusNodeId, errorText, { x: 544, y: 240 }),
    ],
    edges: [
      controlEdge(`${id}_edge_trigger`, triggerId, 'next', cvAction.id),
      controlEdge(`${id}_edge_success`, cvAction.id, 'success', successId),
      controlEdge(`${id}_edge_error`, cvAction.id, 'error', errorId),
    ],
  };
}

function verificationGraph(): LogicGraph {
  const graphId = 'cv_test_graph_verify';
  const triggerId = 'cv_test_verify_trigger';
  const verifyId = 'cv_test_action_verify';
  const recognizedConditionId = 'cv_test_condition_recognized';
  const recognizedId = 'cv_test_status_recognized';
  const notRecognizedId = 'cv_test_status_not_recognized';
  const errorId = 'cv_test_status_verify_error';
  return {
    id: graphId,
    name: 'Recognize face',
    sourceNodeId: VERIFY_BUTTON_ID,
    nodes: [
      { kind: 'trigger', id: triggerId, event: 'click', position: { x: 80, y: 160 } },
      {
        kind: 'action',
        id: verifyId,
        position: { x: 312, y: 160 },
        payload: { type: 'cv-verify', mediaReference: '' },
        inputMappings: {
          mediaReference: { source: 'component', nodeId: TEST_CAMERA_ID, property: 'value' },
          userId: { source: 'component', nodeId: EMAIL_ID, property: 'value' },
        },
      },
      {
        kind: 'condition',
        id: recognizedConditionId,
        position: { x: 544, y: 160 },
        left: { source: 'node-output', nodeId: verifyId, path: 'verified' },
        operator: 'equals',
        compareValue: 'true',
      },
      statusAction(
        recognizedId,
        TEST_STATUS_ID,
        'Recognition result: Face recognized.',
        { x: 776, y: 80 },
      ),
      statusAction(
        notRecognizedId,
        TEST_STATUS_ID,
        'Recognition result: Face not recognized.',
        { x: 776, y: 240 },
      ),
      statusAction(
        errorId,
        TEST_STATUS_ID,
        'Recognition result: capture a face and enter the enrolled account email.',
        { x: 544, y: 320 },
      ),
    ],
    edges: [
      controlEdge('cv_test_verify_edge_trigger', triggerId, 'next', verifyId),
      controlEdge('cv_test_verify_edge_success', verifyId, 'success', recognizedConditionId),
      controlEdge('cv_test_verify_edge_error', verifyId, 'error', errorId),
      controlEdge('cv_test_verify_edge_recognized', recognizedConditionId, 'true', recognizedId),
      controlEdge(
        'cv_test_verify_edge_not_recognized',
        recognizedConditionId,
        'false',
        notRecognizedId,
      ),
    ],
  };
}

function navigationGraph(
  id: string,
  name: string,
  sourceNodeId: string,
  targetScreenId: string,
): LogicGraph {
  const triggerId = `${id}_trigger`;
  const actionId = `${id}_action`;
  return {
    id,
    name,
    sourceNodeId,
    nodes: [
      { kind: 'trigger', id: triggerId, event: 'click', position: { x: 80, y: 160 } },
      {
        kind: 'action',
        id: actionId,
        position: { x: 312, y: 160 },
        payload: { type: 'navigate', targetScreenId },
      },
    ],
    edges: [controlEdge(`${id}_edge`, triggerId, 'next', actionId)],
  };
}

function statusAction(
  id: string,
  targetNodeId: string,
  text: string,
  position: { x: number; y: number },
): ActionNode {
  return {
    kind: 'action',
    id,
    position,
    payload: { type: 'change-text', targetNodeId, text },
  };
}

function controlEdge(
  id: string,
  fromNodeId: string,
  fromPort: 'next' | 'success' | 'error' | 'true' | 'false',
  toNodeId: string,
): LogicGraph['edges'][number] {
  return { id, fromNodeId, fromPort, toNodeId, toPort: 'in' };
}
