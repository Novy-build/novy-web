# AGENTS.md — Frontend Engineering Guidelines & AI Agent Rules

This document outlines the architecture, coding standards, design patterns, testing protocols, and operational rules for developing in this repository. All contributors and AI agents working on this codebase MUST follow these guidelines.

## 1. Project Overview & Scope

* **Domain:** Frontend Web Application (React + TypeScript).

* **Frontend repository (this project):** `C:\Users\Calexx\Desktop\novy-web`.

* **Backend repository:** `C:\Users\Calexx\Desktop\novy-backend`.

* **Backend:** Decoupled external API handled in the backend repository above. **Do not** write or assume backend business logic within this repository. Coordinate shared DTO and API contract changes across both repositories.

* **Core Tech Stack:**

  * **Framework:** React (Functional Components, Hooks)

  * **Language:** TypeScript (Strict Mode)

  * **HTTP Client:** Axios

  * **Testing:** Vitest / React Testing Library / Jest

## 2. Architecture: Clean Architecture for Frontend

The project strictly follows **Clean Architecture** principles adapted for modern React applications. The goal is to isolate business logic, UI components, data sources, and state management into distinct, maintainable layers.

```
src/
├── domain/            # Entities, Interfaces, Use Cases (Pure JS/TS, zero React dependencies)
├── data/              # API implementations, Axios instances, Repositories, DTOs, Mappers
├── presentation/      # React components, pages, custom hooks, styles, UI state
└── main/              # Application bootstrap, dependency injection, global providers

```

### 2.1 Layer Breakdown

#### A. Domain Layer (`src/domain`)

* **Responsibility:** Houses business models and contracts (interfaces).

* **Rules:**

  * **Zero External Dependencies:** Must NOT import React, Axios, or UI libraries.

  * Contains **Entities** (type definitions, interface definitions representing domain models).

  * Contains **Repository Interfaces** defining contracts for data fetching (e.g., `UserRepository`).

  * Contains **Use Cases / Domain Logic** (pure functions or classes executing specific domain actions).

#### B. Data Layer (`src/data`)

* **Responsibility:** Manages external data sources, network requests, and data transformation.

* **Rules:**

  * Implements Repository interfaces defined in `domain/`.

  * Uses **Axios** for network requests.

  * Contains **DTOs (Data Transfer Objects)** to type API request/response payloads.

  * Contains **Mappers** to transform DTOs into Domain Entities.

  * **Never** expose raw API responses directly to the presentation layer.

#### C. Presentation Layer (`src/presentation`)

* **Responsibility:** UI rendering, user interaction, and presentation state.

* **Rules:**

  * Contains React Components (Pages, Components, UI Elements).

  * Uses **Custom Hooks** to bridge the Presentation and Domain/Data layers.

  * Components should remain **dumb/presentational** where possible, delegating logic to custom hooks or use cases.

#### D. Main / Infrastructure Layer (`src/main`)

* **Responsibility:** App configuration, dependency injection, global context providers, routing setups, and environment setup.

## 3. Axios & Network Layer Guidelines

1. **Centralized Axios Instance:**

   * Create a single, centralized Axios instance (`src/data/api/axiosClient.ts`).

   * Configure base URLs, timeouts, default headers, and interceptors (request/response) in this central file.

2. **Interceptors:**

   * **Request Interceptor:** Attach authentication tokens (e.g., JWT) dynamically.

   * **Response Interceptor:** Normalize API errors and handle global HTTP statuses (e.g., `401 Unauthorized` redirecting to login).

3. **Decoupled API Methods:**

   * Do not call `axios.get()` or `axios.post()` directly inside React components or hooks.

   * Wrap Axios calls within Data Repositories or Data Sources.

```
// Good Example: Repository pattern with Axios
// src/data/repositories/UserRepositoryImpl.ts
import { UserRepository } from '../../domain/repositories/UserRepository';
import { User } from '../../domain/entities/User';
import { axiosClient } from '../api/axiosClient';
import { UserDTO } from '../dtos/UserDTO';
import { mapUserDtoToEntity } from '../mappers/userMapper';

export class UserRepositoryImpl implements UserRepository {
  async getUserById(id: string): Promise<User> {
    const response = await axiosClient.get<UserDTO>(`/users/${id}`);
    return mapUserDtoToEntity(response.data);
  }
}

```

## 4. TypeScript Best Practices

* **Strict Mode Enabled:** Never set `"strict": false` or disable type checks.

* **No `any`:** Avoid using `any`. Use `unknown`, generics, or explicit interfaces/types.

* **Interfaces vs Types:** Use `interface` for object definitions and contract signatures; use `type` for unions, primitives, and tuples.

* **Explicit Return Types:** Explicitly define return types for API functions, custom hooks, and complex domain utility functions.

* **Enums vs Union Types:** Prefer String Union Types (`'pending' | 'success' | 'error'`) over TypeScript `enum` constructs unless necessary.

## 5. React Coding Standards

### Custom Hooks

* Extract complex component logic, side effects, and state management into custom hooks (e.g., `useGetUser.ts`).

* Hooks act as orchestrators between the UI components and Data/Domain layers.

### Component Structure

* Use **Functional Components** with named exports or explicit types (`React.FC` or typed props).

* Keep components small and single-purposed (< 150 lines of code per component recommended).

* Enforce strict prop typing:

```
interface ButtonProps {
  label: string;
  onClick: () => void;
  isDisabled?: boolean;
}

export const Button = ({ label, onClick, isDisabled = false }: ButtonProps) => {
  return (
    <button onClick={onClick} disabled={isDisabled}>
      {label}
    </button>
  );
};

```

## 6. Testing Requirements & Policy

Testing is non-negotiable. Every code change must be accompanied by relevant test coverage.

### 6.1 Test-Driven Development & Feature Completeness

* **Mandatory Unit Tests:** Every new feature, hook, utility function, mapper, or domain use case MUST include corresponding test suites (`.test.ts` or `.spec.ts`).

* **Component Tests:** Presentation components must have unit/integration tests verifying key UI interactions and state states (loading, error, success).

* **Data Layer Tests:** Mappers and repositories must have mock-based tests verifying data mapping accuracy and API interaction behavior without making actual network calls.

### 6.2 Test Execution Workflow

* **Pre-Commit / Post-Task Verification:** The test runner (`npm test` / `vitest run`) MUST be executed every time a task or feature implementation is completed.

* **Zero Failures Allowed:** Code is not considered complete until all tests pass without errors or regression.

## 7. The Do's and Don'ts

### ✅ DO's

* **DO** write unit tests for Domain logic, Data Mappers, Hooks, and UI Components for every new feature added.

* **DO** run the entire test suite to verify no regressions occurred after completing work.

* **DO** validate API responses using Mappers or Schema validation libraries (e.g., Zod) at the Data layer boundary.

* **DO** handle loading, error, and empty states explicitly in UI components.

* **DO** write self-documenting code with clear variable and function naming (e.g., `fetchUserProfile` instead of `getData`).

* **DO** use path aliases (e.g., `@domain/...`, `@presentation/...`) instead of deeply nested relative imports (`../../../../`).

### ❌ DON'Ts

* **DON'T** mark a feature or task as complete without writing and running corresponding unit/integration tests.

* **DON'T** leave failing tests in the suite when finishing work.

* **DON'T** call Axios or make HTTP calls directly inside UI components or `useEffect`.

* **DON'T** mix API response structure directly into component states (always map DTO $\rightarrow$ Domain Entity first).

* **DON'T** write backend/database logic or assume direct DB connections in the frontend repository.

* **DON'T** use inline styles or unorganized inline handler functions for complex logic.

* **DON'T** store raw access tokens in LocalStorage if cookies/HTTP-only mechanisms are available (or ensure secure memory-based token management).

* **DON'T** overuse global state (Redux/Zustand) for local component UI state.

## 8. AI Agent Instructions & Constraints

When assisting or auto-generating code for this project, AI agents MUST follow these rules:

1. **Scope Boundary:** Restrict generated code strictly to the frontend React/TypeScript environment. Do not create server-side endpoints, Node.js backend logic, or database schemas.

2. **Layer Adherence:** Always check which layer a requested file belongs to before adding imports.

   * Never import React or Axios inside `src/domain`.

   * Never import Axios directly inside `src/presentation`.

3. **Mandatory Test Generation:** Whenever asked to implement a new feature, hook, mapper, or component, AI agents **MUST** generate the accompanying test file (`*.test.tsx?`) along with the implementation code.

4. **Test Verification Step:** AI agents must instruct or execute test verification steps upon task completion to ensure all tests pass.

5. **TypeScript Integrity:** Generate full type signatures. Do not use `any` or placeholder `// @ts-ignore` directives.

6. **Consistency:** Match the established code format, naming conventions, and export styles (named exports preferred over default exports).

7. **Mandatory Changelog Maintenance:** Every repository addition, update, fix, removal,
   configuration change, test change, or documentation change **MUST** append a corresponding
   entry to the root `CHANGELOGS.md` before the task is considered complete. Add entries under
   **Unreleased**, use the current date, keep the newest entry first, describe user-visible and
   technical effects, and never delete or rewrite prior history merely to simplify the file.

8. **Mandatory MCP Usage:** AI agents **MUST** use the Context7 and Repomix MCP tools as part of
   repository work:

   * Use **Repomix** to inspect and analyze relevant repository structure and implementation
     context before non-trivial implementations, refactors, reviews, or bug fixes.
   * Use **Context7** to retrieve current official documentation before writing or changing code
     that depends on a library, framework, SDK, API, CLI, or cloud service. Do not rely only on
     model memory when current documentation can be queried.

## 9. Progress Tracking & Backend Handoff

These rules apply to every contributor and AI agent working with this repository.

### 9.1 Mandatory Progress Maintenance

Every repository addition, update, fix, removal, configuration change, test change, or
documentation change **MUST** update the root `PROGRESS.md` in the same task before the work is
considered complete.

* Update the **Last reviewed** date when the inventory is reviewed or changed.
* Add, revise, or remove feature entries so they match the current implementation.
* Keep local mocks, preview simulations, deferred work, and production integrations clearly
  distinguished; never mark planned or simulated behavior as production-complete.
* Update the generated Project JSON documentation whenever screens, component DTOs, layout,
  behaviors, logic graphs, data bindings, schema versions, or mapper contracts change.
* Keep the verification summary synchronized with the commands and results from the current task.
* `PROGRESS.md` is a current-state inventory, while `CHANGELOGS.md` is append-only history. Update
  both files; do not use one as a substitute for the other.

### 9.2 Required Reading for Backend Handoff

Before designing or implementing backend persistence, API endpoints, authentication, generated-app
runtime execution, React project generation, or deployment integration, backend contributors
**MUST** review the following files:

1. `AGENTS.md` — repository scope, architecture, tests, migration rules, and product baseline.
2. `PROGRESS.md` — implemented frontend capabilities, current limitations, and a representative
   Project JSON payload for screens, component layout, behaviors, and logic graphs.
3. `project_information/PD6_A-04.pdf` — canonical product requirements.
4. `docs/pd6-traceability.md` — mapping from product use cases to current frontend code and tests.
5. `CONVO_DEEPSEEK.md` — supplemental frontend/backend handoff context only; it does not override
   the canonical contracts or product baseline.
6. `src/data/dto/project.dto.ts`, `src/data/dto/appData.dto.ts`, and
   `src/data/dto/deployment.dto.ts` — serialized transport shapes.
7. `src/data/mappers/` — domain/DTO conversion, schema-version handling, and migration behavior.
8. `src/domain/entities/`, `src/domain/repositories/`, and `src/domain/validation/` — domain models,
   integration contracts, and validation rules.
9. Relevant repository, mapper, migration, validation, logic-runtime, preview, and deployment tests
   that define expected behavior and backward compatibility.

When documentation conflicts, use this priority order: the canonical PD6 product baseline and
explicit scope decisions; domain/repository contracts, DTOs, mappers, validation, and tests;
`PROGRESS.md`; then supplemental discussion documents. Coordinate contract changes with the
frontend, preserve schema-version compatibility, and add migrations and tests before changing data
that existing saved projects or generated applications consume.

## 10. Product Baseline & UX References

### 10.1 Canonical Product Baseline

`project_information/PD6_A-04.pdf` is the canonical functional baseline for Novy. Frontend work
must remain traceable to its builder-facing use cases and domain model:

* Identity and project management.
* Reusable component templates and a drag-and-drop visual editor.
* Event -> Condition -> Action logic rules.
* Project-scoped data collections, schemas, and record CRUD.
* AI-generated structured component proposals that require explicit user acceptance before saving.
* Validation, save feedback, and preview without implicit deployment.
* Deployment validation, status/error reporting, history, and a live URL while preserving the
  previous successful deployment after a failure.

Novy currently has a **single application-builder role**. Platform administration (PD6 UC-08),
multi-user account management, audit dashboards, and service-health screens are outside the
current frontend scope. Keep repository and authorization boundaries compatible with a future
backend, but do not create administrator UI unless the scope is explicitly changed.

### 10.2 Figma-Inspired Visual Editor

Use Figma as an **interaction reference, not a visual or branded clone**. Keep Novy's own tokens
and visual identity. The editor should provide:

* A hierarchical component tree with type icons, indentation, and expand/collapse controls.
* Frame/group-style nesting, canvas/layer selection synchronization, and inline layer renaming.
* Drag-to-reorder and drag-to-reparent with unambiguous insertion indicators.
* Visibility and lock controls whose state is respected by canvas interactions and preview rules.
* Precise direct manipulation: dragging, resizing, snapping, panning, and zooming.
* Keyboard-accessible alternatives for selection, reorder, nesting, and all pointer interactions.
* Undo/redo and autosave coverage for every persisted editor mutation.

### 10.3 n8n-Inspired Logic Builder

Use n8n as the interaction reference for the Logic workspace while retaining Novy branding:

* A pannable/zoomable dotted graph canvas with draggable nodes.
* Trigger, condition, and action nodes with typed input/output ports.
* Drag-to-connect interactions, selected/invalid edge states, and clear connection feedback.
* True/false condition branches, reference validation, and cycle prevention.
* A focused node configuration inspector plus fit-view and zoom controls.
* Explicit empty, invalid, and runtime-feedback states.

### 10.4 Baseline Evolution Rules

* Existing local project documents must migrate safely; do not silently discard saved nodes,
  rules, or deployment history.
* New PD6 capabilities stay behind domain repository interfaces and local mock implementations
  until backend integration; presentation code must not assume Supabase, MongoDB, Vercel, or AI
  SDK details.
* Add pure validation at domain boundaries for component trees, logic references/graphs, data
  references, preview, and deployment.
* Every redesign gate requires focused tests plus the full `npm run typecheck`, `npm test -- --run`,
  and milestone `npm run build` gates.
