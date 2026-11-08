# Novy Platform: Web App Developer Guide

This document outlines the frontend architecture for the **Novy** web app builder. It focuses on your responsibilities: the drag-and-drop canvas, properties panel, logic builder UI, and how to structure the data that will eventually be sent to the backend.

## 1. Your Role & The Core Handoff
As the frontend developer, **you are building the Editor, not the generated app.** 
Your application's job is to let users visually build their projects and output a **Project Model (JSON)**. 

**What you DO:**
*   Manage the drag-and-drop canvas state.
*   Handle the Logic Builder node UI.
*   Let users create **Event Bindings** (e.g., linking a button to an action).
*   Simulate behavior chains during preview using isolated local preview data until the backend is available.
*   **Output structured JSON** representing the entire project.

**What you DO NOT do:**
*   Do not generate React code on the frontend; code generation belongs to the backend.
*   Do not execute production node logic or real external side effects on the frontend.
*   Preview simulations must not write to real databases, send emails, deploy applications, call protected services, or expose API secrets.
*   Do not handle provider-specific deployment operations, such as Vercel deployment, on the frontend.

---

## 2. Core Data Models (What your Frontend Saves)
Your web app needs to manage three separate data structures and save them through the configured backend integration.

### A. UIComponent
What is on the canvas.
```json
{
  "id": "btn_a1",
  "type": "Button",
  "props": { "label": "Add Note", "style": "primary" }
}

```

In Novy's current schema, component type names are lowercase and every component also persists its
mobile/base geometry. Tablet and desktop values are optional overrides, not separate component
copies:

```json
{
  "id": "btn_a1",
  "type": "button",
  "x": 24,
  "y": 120,
  "w": 160,
  "h": 44,
  "props": { "label": "Add note", "variant": "solid" },
  "appearance": {
    "backgroundColor": "#5551f2",
    "textColor": "#ffffff",
    "borderRadius": 10
  },
  "responsive": {
    "tablet": { "x": 48, "w": 220 },
    "desktop": { "x": 96, "w": 260 }
  }
}
```

### B. Event binding (`Behavior`)

What starts a workflow. The binding remains small and references both the source component and its
logic graph by stable ID.

```json
{
  "id": "behavior_submit",
  "name": "On click — Submit",
  "targetNodeId": "btn_submit",
  "event": "click",
  "graphId": "graph_submit"
}
```

Supported frontend events are `click`, `change`, and `load`. A screen may contain multiple
bindings, but the same component/event pair is unique.

### C. Logic graph and rules

What happens after the event. A graph contains positioned trigger, condition, and action nodes plus
typed edges. Conditions branch through `true` and `false`. Synchronous actions use `next`.
Asynchronous actions use `success` and `error`.

```json
{
  "id": "graph_submit",
  "name": "Submit note",
  "sourceNodeId": "btn_submit",
  "nodes": [
    {
      "kind": "trigger",
      "id": "trigger_submit",
      "event": "click",
      "position": { "x": 80, "y": 160 }
    },
    {
      "kind": "action",
      "id": "action_email",
      "position": { "x": 320, "y": 160 },
      "payload": {
        "type": "send-email",
        "to": "",
        "subject": "A note was submitted",
        "body": ""
      },
      "inputMappings": {
        "to": { "source": "session", "path": "user.email" },
        "body": {
          "source": "component",
          "nodeId": "input_note",
          "property": "value"
        }
      }
    },
    {
      "kind": "action",
      "id": "action_refresh",
      "position": { "x": 560, "y": 160 },
      "payload": {
        "type": "refresh-collection",
        "collectionId": "notes"
      }
    }
  ],
  "edges": [
    {
      "id": "edge_trigger_email",
      "fromNodeId": "trigger_submit",
      "fromPort": "next",
      "toNodeId": "action_email",
      "toPort": "in"
    },
    {
      "id": "edge_email_refresh",
      "fromNodeId": "action_email",
      "fromPort": "success",
      "toNodeId": "action_refresh",
      "toPort": "in"
    }
  ]
}
```

---

## 3. Dynamic Action Input Mapping

Static action payload fields remain the fallback configuration. `inputMappings` selectively
override named fields at runtime with serializable `ValueExpression` objects:

| Source | Shape | Intended use |
| --- | --- | --- |
| Literal | `{ "source": "literal", "value": "..." }` | A mapped constant |
| Component | `{ "source": "component", "nodeId": "...", "property": "value" }` | Input/control values or text content |
| Session | `{ "source": "session", "path": "user.email" }` | Current user ID, name, or email |
| Previous node | `{ "source": "node-output", "nodeId": "...", "path": "result.id" }` | A prior action result |

The frontend mapping editor persists these expressions; it does not invent backend request shapes.
The generated-app runtime must resolve them immediately before executing an action and must validate
that referenced components and graph nodes still exist.

---

## 4. Screens and Web Routes

Novy generates web apps only. Every screen therefore has an explicit, project-unique URL path:

```json
{
  "id": "screen_settings",
  "name": "Settings",
  "path": "/settings",
  "nodes": [],
  "behaviors": [],
  "logicGraphs": []
}
```

Paths are lowercase web paths beginning with `/`. The first legacy screen migrates to `/`; other
legacy screens receive slug-based paths. Navigation actions continue to use stable screen IDs so a
route can be edited without breaking workflow references.

---

## 5. Runtime Effects and Async Branches

The graph is the single source of truth. Do not add a second duplicated `effects` array. Actions
produce typed runtime effects such as:

- `navigate` — move to another screen.
- `show-message` — display transient feedback.
- `change-text` — update rendered component state.
- database operations — get, insert, update, or delete records.
- `refresh-collection` — refetch/reload collection-backed views after a mutation.
- `send-email` — request backend email delivery.
- granular ingestion — `document-load`, `text-split`, `embedding-generate`, `vector-upsert`, and
  `vector-delete`;
- granular chat/retrieval — `chat-input`, `query-embedding`, `vector-retrieve`, `rerank`,
  `prompt-template`, `llm-generate`, `chat-output`, and `memory`;
- `cv-liveness`, `cv-enroll`, and `cv-verify` — request protected Computer Vision/biometric
  processing using a temporary media reference.

Database, email, RAG, and Computer Vision actions expose `success` and `error` ports. The frontend preview safely assumes
the success branch for simulated async actions; production runtime code must choose the branch from
the real result and expose structured outputs for downstream `node-output` mappings.

---

## 6. Preview Execution Boundary

Preview executes `click`, `change`, and screen `load` chains against isolated frontend state. It may
simulate navigation, messages, component changes, collection operations, refetch feedback, and email
success so builders can test a flow.

Preview must never:

- send a real email;
- mutate a production database;
- call protected third-party services;
- expose credentials or provider tokens;
- persist raw camera captures or biometric templates in Project JSON or normal app collections;
- deploy generated code.

For example, Send Email produces a clearly labeled simulated-delivery message in preview. RAG and
Computer Vision nodes likewise return deterministic simulated results. Real delivery, model
execution, vector storage, liveness checks, face matching, encrypted biometric-template storage,
retention, and deletion belong to the generated-app backend/runtime.

---

## 7. Responsive Web Layout

The base `x`, `y`, `w`, and `h` values represent mobile geometry. Optional tablet overrides
inherit omitted values from mobile; optional desktop overrides inherit omitted values from the
resolved tablet layout (and therefore mobile when tablet omits a value). Overrides are stored as
field-level differences, so unchanged properties continue to inherit later edits to a lower
breakpoint. Breakpoint overrides may also set `isHidden`; visibility uses the same cascade. The
editor, preview, thumbnails, validation, and backend generator must all use the same inheritance
rule. Responsive web breakpoints use 768px for tablet and 1024px for desktop in generated CSS;
canvas previews use 390px, 768px, and 1200px widths. These are responsive web breakpoints, not
native mobile or desktop application targets.

---

## 8. Versioning and Compatibility

The current Project DTO is `schemaVersion: 9`. Loading older documents must preserve all existing
components, behaviors, graph nodes, data references, and deployment history. Current migration rules
include:

- generating missing screen paths without discarding screens;
- supplying deterministic positions and edge metadata for legacy graph nodes/edges;
- converting legacy async `next` edges to `success`;
- treating missing appearance, responsive geometry, and input mappings as inherited/default values.
- expanding schema-v3 `rag-index`, `rag-query`, and `rag-remove` nodes into deterministic granular
  ingestion, retrieval/generation, and vector-delete chains while preserving external edges;
- converting schema-v5 List and Repeater widgets into ListView widgets with deterministic item
  templates; and
- converting schema-v5 Form widgets into Column + Text/Input/Button composition, including a
  deterministic click-to-Insert Record graph when the legacy Form had a collection binding; and
- defaulting schema-v7 ListViews to zero item spacing and radius so their repeated-item appearance
  remains unchanged while schema-v8 projects persist explicit item-container layout; and
- materializing schema-v8 ListView flow positions into explicit free-form item coordinates so
  existing templates retain their visual placement under schema v9.

Schema v9 retains the schema-v5 distinction between solid control edges and dashed typed resource
edges while replacing live List/Form/Repeater widget types with Column, Row, and ListView.
ListView repeats its nested `children` template for static values or collection records; Text
children can read the current item through `dataBinding: { "source": "list-item", "fieldId": "..." }`.
Vector Store actions
consume attached Document Loader and Embedding resources for upsert, or expose a retrieval `tool`
to an AI Agent. The Agent consumes generic Chat Model, Memory, Vector Store Tool, Prompt Template,
and optional Reranker resources. Provider API keys remain backend-owned profile configuration.

Never silently drop unknown saved work merely to satisfy the newest editor shape.

---

## 9. Backend Handoff

The frontend saves the versioned Project JSON through repository interfaces. The Deployment page
can also export a generated-app handoff manifest containing that Project JSON, app-data schemas,
routes, responsive thresholds, and inferred runtime capabilities. The manifest never contains app
records, provider secrets, raw camera images, or biometric templates. A future backend is
responsible for:

1. validating IDs, routes, mappings, graph topology, data references, and supported action types;
2. generating the React web project and route configuration;
3. implementing authenticated data access and session-value resolution;
4. executing async actions and selecting `success` or `error` branches;
5. performing real email, database, RAG, Computer Vision, biometric, deployment, and other
   protected side effects;
6. returning deployment status and preserving the previous successful deployment after a failure.

Provider-specific SDK details must remain behind backend/domain contracts. The editor must not
assume a particular database, email provider, hosting provider, or AI SDK.
