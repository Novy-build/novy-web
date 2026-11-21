# Novy Backend Authentication and Logic-Node Runtime Roadmap

**Status:** Binding implementation and acceptance specification  
**Audience:** Backend contributor and the AI agent implementing the backend  
**Frontend contract date:** 2026-11-21  
**Required backend stack:** Python 3.13, FastAPI, Pydantic 2, SQLAlchemy 2 async,
PostgreSQL/asyncpg, Alembic, httpx, Supabase Auth, pytest/pytest-asyncio

This document defines the backend behavior required by the existing Novy frontend. It is deliberately
more specific than a normal feature roadmap: route names, request and response contracts, cookies,
errors, security boundaries, persistence, pseudocode, file layout, implementation order, and expected
test results are all acceptance criteria.

The backend implementation is complete only when the frontend can use it **without changing any
frontend HTTP URL, field name, cookie expectation, or response parser**.

---

## 1. Non-negotiable compatibility rules

### 1.1 Do not change the frontend to fit the backend

The frontend already has its HTTP integration. Implement the backend against these source-of-truth
files:

- `src/data/api/axiosClient.ts` — builder API client, credentials, and CSRF interceptor.
- `src/data/api/runtimeAxiosClient.ts` — generated-app runtime client.
- `src/data/api/csrf.ts` — `novy_csrf` to `X-CSRF-Token` double-submit behavior.
- `src/data/repositories/api/ApiAuthRepository.ts` — exact builder-auth calls and parsed errors.
- `src/data/repositories/api/ApiRuntimePreviewRepository.ts` — exact node execution, upload, CV,
  and generated-app auth calls.
- `src/data/repositories/api/ApiRagRepository.ts` — RAG profile and file-source calls.
- `src/data/repositories/api/ApiAppDataRepository.ts` — project data contracts required by CRUD
  nodes.
- `src/data/repositories/api/ApiReactExportRepository.ts` — immutable app-version creation through
  export.
- `src/data/dto/generatedApp.dto.ts` and `src/domain/entities/logic.ts` — manifest and node payloads.

Never rename an endpoint because another spelling looks cleaner. Never switch camelCase wire fields
to snake_case. Internal Python names should be snake_case and explicitly mapped at the presentation
boundary.

### 1.2 There are two API roots

| Security realm | Base | Frontend client | Credentials |
|---|---|---|---|
| Builder | `/api/v1` | `axiosClient` | `withCredentials: true` |
| Generated application | `/runtime/v1` | `runtimeAxiosClient` | Public by default; opt in for runtime auth/CV |

`VITE_API_BASE_URL` normally equals `http://localhost:8000/api/v1`. The runtime client removes the
trailing `/api/v1` and then calls `/runtime/v1/...` from the backend origin. Therefore this is right:

```text
http://localhost:8000/api/v1/auth/login
http://localhost:8000/runtime/v1/apps/{appId}/actions/{actionId}/execute
```

This is wrong and must not exist:

```text
http://localhost:8000/api/v1/runtime/v1/...
```

### 1.3 Wire conventions

- JSON field names are camelCase.
- Timestamps are UTC ISO-8601 strings.
- IDs are opaque strings. Never parse business meaning from client-supplied IDs.
- Request models reject unknown fields (`extra="forbid"`).
- Validation responses never echo submitted values; passwords, tokens, media, prompts, and secrets
  must not appear in error responses or logs.
- Every error uses:

```json
{
  "error": {
    "code": "stable_machine_code",
    "message": "Safe human-readable message.",
    "details": null,
    "requestId": "request-id"
  }
}
```

- Successful runtime action responses use:

```json
{
  "branch": "success",
  "output": {}
}
```

The frontend only requires `output`, but `branch: "success"` is part of the canonical response and
must remain present.

### 1.4 Separate identity realms

Builder sessions and generated-app end-user sessions are unrelated:

- Builder auth uses Supabase and `novy_access_token`, `novy_refresh_token`, `novy_csrf`.
- Generated-app auth uses passwordless codes or biometric device binding and
  `novy_runtime_session`, `novy_runtime_csrf`, `novy_biometric_device`.
- Never expose or reuse a builder token inside a generated application.
- A session expression on a generated-app action must not be substituted with the builder identity.

### 1.5 Node ownership boundary

Backend server actions:

- Get Records, Get Record, Insert Record, Update Record, Delete Record.
- Send Email.
- Document Upload and the approved RAG pipeline actions.
- CV Liveness, CV Enroll, CV Verify.

Browser-only actions:

- Change Text, Show Message, Navigate, Set Variable, Set Theme, Set Component Value,
  Add Local List Item, Refresh Collection.
- Chat Input, Chat Output, and Chat Message rendering.
- Triggers and conditions.

If a browser-only action ID is posted to the server execution endpoint, return
`422 unsupported_capability`; do not attempt to execute it on the backend.

---

## 2. Required backend architecture

Use this dependency direction:

```text
app/domain          <- pure entities, errors, repository interfaces
app/application     <- commands, use cases, contracts, validation; depends on domain
app/infrastructure  <- SQLAlchemy, Supabase, email, RAG, CV implementations
app/presentation    <- FastAPI routes, Pydantic HTTP schemas, middleware, DI
```

Rules:

1. `domain` must not import FastAPI, Pydantic, SQLAlchemy, Supabase, or provider SDKs.
2. `application` must not import `presentation` or concrete infrastructure adapters.
3. Provider and repository interfaces belong at the domain/application boundary.
4. FastAPI composition belongs in `app/factory.py` and `app/presentation/dependencies.py`.
5. Routes map HTTP models to application commands; do not pass Pydantic request models into core
   logic.
6. Routes return response schemas; never return ORM models.
7. Every owner-controlled repository query is scoped by owner ID.
8. Every public runtime query is scoped through an immutable app version to its owner, project, and
   data scope. Never trust owner/project/collection authority supplied by the caller.

---

## 3. Required file inventory

Names may only differ when an existing backend has an equivalent established structure. The
responsibility and layer boundaries must remain the same.

```text
backend/
├── .env.example
├── alembic.ini
├── pyproject.toml
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── factory.py
│   ├── domain/
│   │   ├── errors.py
│   │   ├── entities/
│   │   │   ├── user.py
│   │   │   ├── profile.py
│   │   │   ├── app_data.py
│   │   │   ├── app_version.py
│   │   │   ├── rag.py
│   │   │   └── vision.py
│   │   └── repositories/
│   │       ├── profile_repository.py
│   │       ├── project_repository.py
│   │       ├── app_data_repository.py
│   │       ├── app_version_repository.py
│   │       ├── rag_repository.py
│   │       └── vision_repository.py
│   ├── application/
│   │   ├── contracts/
│   │   │   └── generated_app.py
│   │   ├── dto/
│   │   │   └── auth.py
│   │   ├── generation/
│   │   │   └── validation.py
│   │   ├── ports/
│   │   │   ├── auth_provider.py
│   │   │   ├── email_delivery.py
│   │   │   ├── id_generator.py
│   │   │   ├── rag.py
│   │   │   └── vision_provider.py
│   │   ├── projects/
│   │   │   └── validation.py
│   │   └── use_cases/
│   │       ├── auth.py
│   │       ├── app_versions.py
│   │       ├── runtime.py
│   │       ├── runtime_previews.py
│   │       ├── runtime_rag.py
│   │       ├── runtime_vision.py
│   │       └── rag_sources.py
│   ├── infrastructure/
│   │   ├── auth/
│   │   │   ├── supabase.py
│   │   │   ├── jwt.py
│   │   │   ├── dummy.py
│   │   │   └── unavailable.py
│   │   ├── email/
│   │   │   ├── development.py
│   │   │   ├── resend.py
│   │   │   └── unavailable.py
│   │   ├── persistence/
│   │   │   ├── models.py
│   │   │   ├── profile_repository.py
│   │   │   ├── app_data_repository.py
│   │   │   ├── app_version_repository.py
│   │   │   ├── rag_repository.py
│   │   │   ├── vision_repository.py
│   │   │   └── in_memory_*.py
│   │   ├── rag/
│   │   │   ├── profiles.py
│   │   │   ├── documents.py
│   │   │   ├── ollama.py
│   │   │   ├── openrouter.py
│   │   │   └── quota.py
│   │   ├── vision/
│   │   │   ├── development.py
│   │   │   └── unavailable.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── ids.py
│   │   ├── rate_limit.py
│   │   ├── request_context.py
│   │   └── runtime_origins.py
│   └── presentation/
│       ├── content.py
│       ├── cookies.py
│       ├── dependencies.py
│       ├── errors.py
│       ├── middleware/
│       │   ├── body_limit.py
│       │   ├── csrf.py
│       │   ├── request_context.py
│       │   └── runtime_cors.py
│       ├── routes/
│       │   ├── auth.py
│       │   ├── exports.py
│       │   ├── rag.py
│       │   └── runtime.py
│       └── schemas/
│           ├── auth.py
│           ├── common.py
│           ├── app_data.py
│           ├── exports.py
│           ├── rag.py
│           └── runtime.py
├── migrations/
│   ├── env.py
│   └── versions/
│       ├── 0001_profiles.py
│       ├── 0003_app_data.py
│       ├── 0004_app_versions.py
│       ├── 0009_runtime_vision.py
│       ├── 0011_generated_app_rag.py
│       └── 0012_runtime_preview_data.py
└── tests/
    ├── conftest.py
    ├── fakes.py
    ├── manifest_fixtures.py
    ├── api/
    │   ├── test_auth.py
    │   ├── test_dummy_auth.py
    │   ├── test_runtime.py
    │   ├── test_runtime_rag.py
    │   └── test_exports.py
    ├── contract/
    │   ├── fixtures/user.json
    │   └── test_user_contract.py
    ├── integration/
    │   ├── test_profile_repository.py
    │   └── test_app_data_repository.py
    └── unit/
        ├── test_auth_service.py
        ├── test_supabase_provider.py
        ├── test_jwt_verifier.py
        ├── test_app_versions.py
        ├── test_manifest_validation.py
        ├── test_runtime_use_case.py
        ├── test_runtime_rag.py
        ├── test_runtime_vision_use_case.py
        └── test_runtime_preview_use_case.py
```

Migration numbers may be adjusted to fit an existing history, but all represented tables and
constraints are required. Do not edit an already-applied migration; add a new one.

---

## 4. Phase 0 — Foundation and shared HTTP behavior

Complete this before Auth or runtime routes.

### 4.1 Dependencies

Pin compatible versions and install at least:

```toml
requires-python = ">=3.13"
dependencies = [
  "alembic",
  "asyncpg",
  "email-validator",
  "fastapi",
  "httpx",
  "pgvector",
  "pydantic",
  "pydantic-settings",
  "pyjwt[crypto]",
  "pypdf",
  "python-multipart",
  "sqlalchemy[asyncio]",
  "uvicorn[standard]",
]
```

Development dependencies: `aiosqlite`, `asgi-lifespan`, `mypy`, `pytest`, `pytest-asyncio`, `ruff`.

### 4.2 Configuration

Use `pydantic-settings` with `NOVY_` prefix and `.env`. Required defaults:

```text
NOVY_ENVIRONMENT=development
NOVY_AUTH_MODE=dummy
NOVY_DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/novy
NOVY_SUPABASE_URL=
NOVY_SUPABASE_PUBLISHABLE_KEY=
NOVY_CORS_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173","http://[::1]:5173"]
NOVY_COOKIE_SECURE=false
NOVY_SESSION_COOKIE_NAME=novy_access_token
NOVY_REFRESH_COOKIE_NAME=novy_refresh_token
NOVY_CSRF_COOKIE_NAME=novy_csrf
NOVY_SESSION_COOKIE_SAMESITE=lax
NOVY_REFRESH_COOKIE_MAX_AGE_SECONDS=2592000
NOVY_RUNTIME_SESSION_COOKIE_NAME=novy_runtime_session
NOVY_RUNTIME_CSRF_COOKIE_NAME=novy_runtime_csrf
NOVY_RUNTIME_BIOMETRIC_DEVICE_COOKIE_NAME=novy_biometric_device
NOVY_RUNTIME_SESSION_COOKIE_SAMESITE=lax
NOVY_RUNTIME_SESSION_MAX_AGE_SECONDS=3600
NOVY_RUNTIME_BIOMETRIC_DEVICE_MAX_AGE_SECONDS=15552000
NOVY_RUNTIME_LOGIN_CODE_TTL_SECONDS=600
NOVY_RUNTIME_AUTH_SECRET=
NOVY_VISION_MODE=disabled
NOVY_VISION_CHALLENGE_TTL_SECONDS=120
NOVY_VISION_MAX_MEDIA_BYTES=5242880
NOVY_VISION_VERIFICATION_THRESHOLD=0.55
NOVY_RAG_MODE=disabled
NOVY_RAG_MAX_FILE_BYTES=5242880
NOVY_EMAIL_MODE=development
NOVY_MAX_REQUEST_BODY_BYTES=1048576
```

Rate-limit defaults:

```text
register 5/minute; login 10/minute; refresh 30/minute; session 120/minute
runtime reads 240/minute; actions 60/minute; runtime auth 10/minute
runtime vision 20/minute; runtime RAG upload 10/minute
```

Production startup must reject:

- dummy auth;
- missing Supabase URL/key;
- insecure cookies;
- development email delivery;
- development/simulated CV;
- `SameSite=None` cookies without `Secure`;
- wildcard credentialed CORS origins.

### 4.3 Request IDs and errors

Accept `X-Request-ID`; otherwise generate one. Echo it in the response header and error body.
Never include request bodies in validation logs.

Required status mapping:

| Code | HTTP |
|---|---:|
| `validation_error`, `invalid_runtime_input`, `unsupported_capability`, `invalid_manifest` | 422 |
| `invalid_credentials`, `session_required`, `invalid_session`, `runtime_auth_required`, `invalid_runtime_code`, `rag_memory_auth_required` | 401 |
| `forbidden`, `email_not_confirmed` | 403 |
| `email_already_registered`, `conflict` | 409 |
| `runtime_app_not_found`, `runtime_action_not_found`, `runtime_collection_not_found`, `app_data_not_found`, `rag_source_not_found` | 404 |
| `request_too_large`, `rag_source_too_large` | 413 |
| `unsupported_media_type` | 415 |
| `rate_limited`, `auth_provider_rate_limited` | 429 |
| `rag_embedding_invalid`, `rag_provider_response_invalid` | 502 |
| `auth_not_configured`, `auth_provider_unavailable`, `rag_not_configured`, `rag_provider_unavailable`, `vision_provider_unavailable`, `email_delivery_unavailable` | 503 |
| `internal_error` | 500 |

`429` includes `Retry-After` and `details.retryAfterSeconds`.

Pydantic validation errors map to:

```json
{
  "error": {
    "code": "validation_error",
    "message": "The request payload is invalid.",
    "details": [
      {"location": ["body", "password"], "message": "...", "type": "..."}
    ],
    "requestId": "..."
  }
}
```

Do not include Pydantic's `input` value in the response.

### 4.4 CORS

Builder CORS:

```python
allow_origins=settings.cors_origins
allow_credentials=True
allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
allow_headers=["Content-Type", "X-CSRF-Token", "X-Request-ID", "If-Match"]
expose_headers=["X-Request-ID", "ETag", "Retry-After"]
```

Runtime CORS must distinguish:

- Public action/record/upload routes: allow origin `*`, no credential permission.
- Runtime auth, vision, logout, and credential revocation: echo only an exact configured/deployed
  origin and set `Access-Control-Allow-Credentials: true`.
- Public runtime preflight allows `Content-Type, X-Request-ID`.
- Credentialed runtime preflight also allows `X-CSRF-Token` and the `DELETE` method.

### 4.5 CSRF

Builder unsafe methods (`POST`, `PUT`, `PATCH`, `DELETE`) require a double-submit token when a
builder session cookie exists. Compare `novy_csrf` to `X-CSRF-Token` with
`secrets.compare_digest`.

Exempt only:

- `/api/v1/auth/register`
- `/api/v1/auth/login`
- all `/runtime/v1/*` routes, because credentialed runtime routes perform their own realm-specific
  CSRF check.

Failure:

```json
{"error":{"code":"csrf_failed","message":"The request could not be verified. Refresh the page and try again.","details":null,"requestId":"..."}}
```

with HTTP 403.

---

## 5. Phase 1 — Builder authentication

### 5.1 Domain and application contracts

```python
@dataclass(frozen=True, slots=True)
class User:
    id: UUID
    display_name: str
    email: str

class ProfileStatus(str, Enum):
    ACTIVE = "active"
    DISABLED = "disabled"

@dataclass(frozen=True, slots=True)
class Profile:
    user_id: UUID
    display_name: str
    email: str
    status: ProfileStatus
    created_at: datetime
    updated_at: datetime
```

Application DTOs:

```python
RegisterCommand(display_name: str, email: str, password: str)
LoginCommand(email: str, password: str)
AuthSession(access_token: str, refresh_token: str, expires_in: int)
RegistrationResult(user: User, session: AuthSession | None, requires_email_confirmation: bool)
AuthResult(user: User, session: AuthSession)
SessionResult(user: User, session: AuthSession | None)
```

Provider port:

```python
class AuthProvider(Protocol):
    async def register(*, email, password, display_name) -> ProviderRegistration: ...
    async def login(*, email, password) -> ProviderSession: ...
    async def refresh(*, refresh_token) -> ProviderSession: ...
    async def get_user(*, access_token) -> AuthIdentity: ...
    async def logout(*, access_token) -> None: ...
    async def aclose() -> None: ...

class AccessTokenVerifier(Protocol):
    async def verify(access_token: str) -> AuthIdentity | None: ...
```

Profile repository:

```python
async def get_by_user_id(user_id: UUID) -> Profile | None
async def upsert(profile: Profile) -> Profile
async def update_display_name(user_id: UUID, display_name: str) -> Profile
```

### 5.2 Persistence

Create `profiles`:

| Column | Rules |
|---|---|
| `user_id` | UUID primary key; equals Supabase user ID |
| `display_name` | varchar(120), non-null |
| `email` | varchar(320), unique, indexed, non-null, lowercase |
| `status` | varchar(20), non-null, default `active` |
| `created_at` | timezone-aware, server generated |
| `updated_at` | timezone-aware, server generated/updated |

Passwords are never stored in this database. Supabase Auth is the only production password store.

### 5.3 HTTP schemas

```python
class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    displayName: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

class UserResponse(BaseModel):
    id: str
    displayName: str
    email: str

class RegistrationPendingResponse(BaseModel):
    user: UserResponse
    requiresEmailConfirmation: Literal[True] = True
```

Normalize email to stripped lowercase. Reject blank display names. Registration passwords require
at least 8 characters and at least one digit. Do not apply the registration-strength rule during
login.

### 5.4 Exact builder-auth routes

#### `POST /api/v1/auth/register`

Request:

```json
{"displayName":"Builder Name","email":"builder@example.com","password":"secret123"}
```

Auto-confirmed response: HTTP 201

```json
{"id":"uuid","displayName":"Builder Name","email":"builder@example.com"}
```

Email-confirmation response: HTTP 202

```json
{
  "user":{"id":"uuid","displayName":"Builder Name","email":"builder@example.com"},
  "requiresEmailConfirmation":true
}
```

Set session cookies only on 201. Apply registration rate limit. Duplicate email returns
`409 email_already_registered`.

#### `POST /api/v1/auth/login`

Request: `{"email":"...","password":"..."}`. Response: HTTP 200 `UserResponse` plus rotated
session cookies. Unknown email and wrong password must produce the same HTTP 401 body with
`invalid_credentials`. Unconfirmed email returns HTTP 403 `email_not_confirmed`.

#### `GET /api/v1/auth/session`

No body. Read access and refresh cookies. If neither exists, return `401 session_required`.

1. Verify valid access token; return the user without rotating provider tokens.
2. If access token is absent/invalid and refresh token is valid, refresh and rotate cookies.
3. If both fail, clear all auth cookies and return `401 invalid_session`.
4. Ensure a readable CSRF cookie exists for a valid session.

The frontend deliberately treats a 401 from this route as an anonymous visitor.

#### `POST /api/v1/auth/refresh`

No body. Requires the refresh cookie and valid builder CSRF. Return HTTP 200 `UserResponse` and
rotate access, refresh, and CSRF cookies. Invalid refresh clears all cookies and returns
`401 invalid_session`.

The current frontend does not call this route directly, but it is required for a complete auth
contract and security tests.

#### `POST /api/v1/auth/logout`

No body. Requires builder CSRF if a session cookie exists. Revoke provider access when possible,
always clear local cookies, and return HTTP 204 with an empty body. Logout remains successful if
the provider is unavailable or the access token is already invalid.

Every auth response sets `Cache-Control: no-store` and `Pragma: no-cache`.

### 5.5 Cookie contract

| Cookie | Value | HttpOnly | Path | Max age |
|---|---|---:|---|---:|
| `novy_access_token` | provider access token | yes | `/` | provider `expires_in` |
| `novy_refresh_token` | provider refresh token | yes | `/api/v1/auth` | 2,592,000 s |
| `novy_csrf` | random URL-safe 32-byte token | no | `/` | 2,592,000 s |

All cookies use configured domain, SameSite (`lax` default), and `Secure` in production. Deletion
must use the same paths/attributes as creation.

Never place access or refresh tokens in JSON.

### 5.6 AuthService reference algorithm

```python
async def register(command):
    registration = await provider.register(
        email=command.email,
        password=command.password,
        display_name=command.display_name,
    )
    profile = await sync_profile(registration.identity)
    session = to_auth_session(registration.session)  # None means confirmation required
    return RegistrationResult(
        user=profile.to_user(),
        session=session,
        requires_email_confirmation=session is None,
    )

async def login(command):
    provider_session = await provider.login(email=command.email, password=command.password)
    profile = await sync_profile(provider_session.identity)
    return AuthResult(profile.to_user(), require_session(provider_session))

async def get_session(access_token, refresh_token):
    if access_token:
        identity = await resolve_identity(access_token)
        if identity:
            profile = await sync_profile(identity)
            return SessionResult(profile.to_user(), session=None)
    if not refresh_token:
        raise InvalidSessionError()
    provider_session = await provider.refresh(refresh_token=refresh_token)
    profile = await sync_profile(provider_session.identity)
    return SessionResult(profile.to_user(), to_auth_session(provider_session))

async def refresh(refresh_token):
    provider_session = await provider.refresh(refresh_token=refresh_token)
    profile = await sync_profile(provider_session.identity)
    return AuthResult(profile.to_user(), to_auth_session(provider_session))

async def logout(access_token):
    evict_cached_identity(sha256(access_token))
    try:
        await provider.logout(access_token=access_token)
    except (InvalidAccessTokenError, AuthProviderUnavailableError):
        pass
```

`sync_profile` behavior:

1. Load existing profile by provider UUID.
2. If disabled, raise `403 forbidden`.
3. Display-name priority: provider metadata; existing profile; email local part; `Builder`.
4. Lowercase email and truncate display name to 120 characters.
5. Skip database update if values have not changed.
6. Cache profiles for at most 60 seconds; this TTL bounds the disabled-account acceptance window.

Cache provider-validated identities by a SHA-256 token digest, never the raw token, max 512 entries,
default TTL 60 seconds.

### 5.7 Supabase adapter

Use an `httpx.AsyncClient` with:

```python
base_url = f"{supabase_url.rstrip('/')}/auth/v1"
headers = {
    "apikey": publishable_or_anon_key,
    "Content-Type": "application/json",
    "Accept": "application/json",
}
```

Do not require a service-role secret.

| Operation | Supabase request |
|---|---|
| Register | `POST /signup`, `{"email","password","data":{"display_name":...}}` |
| Login | `POST /token?grant_type=password`, `{"email","password"}` |
| Refresh | `POST /token?grant_type=refresh_token`, `{"refresh_token":...}` |
| User | `GET /user`, `Authorization: Bearer ...` |
| Logout | `POST /logout`, bearer token |

Map provider errors to stable Novy errors without leaking provider bodies. A signup body without an
access token is a valid pending-registration result. Default missing/invalid `expires_in` to 3600.

### 5.8 Offline JWT verification

Fetch `GET /auth/v1/.well-known/jwks.json`; cache keys for 3600 seconds. Accept asymmetric
`ES256/384/512` and `RS256/384/512` only. Require `exp`, `iat`, `sub`, `aud`, `iss`; audience defaults
to `authenticated`, issuer is `{SUPABASE_URL}/auth/v1`. Unknown `kid` triggers one forced JWKS
refresh. Invalid/unverifiable tokens return `None` so the service can fall back to `/user`.

### 5.9 Development and fail-closed adapters

- `DummyAuthProvider` is development-only, ephemeral, ignores passwords, and issues random
  `dummy-access-*`/`dummy-refresh-*` tokens. Never use it in production.
- `UnavailableAuthProvider` raises `auth_not_configured` for auth operations.
- Readiness reports `auth: configured` or `auth: not_configured`.

---

## 6. Phase 2 — Immutable generated-app contract

The runtime may never accept an arbitrary action definition from a public caller. A request supplies
only `appId`, `actionId`, `executionId`, and declared inputs. Resolve everything else from a validated,
immutable stored app version.

### 6.1 Manifest envelope

The Pydantic contract is strict and includes:

```python
class GeneratedAppManifest(ContractModel):
    manifestVersion: Literal[2]
    generatedAt: datetime
    project: Project                 # schemaVersion 13 or 14
    layout: GeneratedLayout          # layoutVersion 2
    appData: GeneratedAppData        # recordsIncluded is False
    runtime: Runtime
    security: Security

class Security(ContractModel):
    secretsIncluded: Literal[False]
    rawMediaIncluded: Literal[False]
    biometricTemplatesIncluded: Literal[False]
```

`ContractModel` must use `extra="forbid"`. Preserve unknown saved project nodes through explicit
schema compatibility/migration before manifest creation; do not silently drop them.

Semantic validation must cover:

- manifest v2, layout v2, Project schema v13/v14;
- unique IDs and valid references;
- valid routes and route parameters;
- graph node/edge limits and acyclic control flow;
- exactly one valid trigger source where required;
- typed resource edges and port cardinality;
- action collection/field/component references;
- collection data types and required fields;
- RAG resource attachments, chunk overlap `< chunk size`, vector index naming;
- runtime capability inference;
- max screens/routes/nodes/depth/graphs/logic nodes/edges;
- `recordsIncluded`, all security flags are false.

Validation errors return `422 invalid_manifest` with at most 50 issues and total `issueCount`.

### 6.2 AppVersion

Persist a frozen logical entity:

```python
AppVersion(
    id: str,
    owner_id: UUID,
    project_id: str,
    manifest: dict,
    data_scope: Literal["live", "preview"],
    created_at: datetime,
)
```

Create IDs deterministically:

```text
canonical = stable JSON serialization of the validated manifest
id = "app_" + sha256(owner_id + ":" + data_scope + ":" + canonical)
```

Pin `generatedAt` to the saved project's `updatedAt` before hashing so export clock differences do
not change the app ID. Owner ID and data scope must participate in identity.

### 6.3 Runtime preview preparation

The frontend needs:

#### `POST /api/v1/exports/runtime-preview`

- Builder-authenticated.
- Body: full `GeneratedAppManifest` JSON.
- Validate manifest and project ownership.
- Create/get immutable version with `data_scope="preview"`.
- On first preparation, transactionally copy live records into preview scope, with new record IDs.
- Re-preparing the same version is idempotent and does not overwrite preview edits.
- Limit copied records (default 5,000); fail atomically with
  `422 runtime_preview_data_too_large`.
- Rewrite preview vector namespaces to isolated `novy-preview-{digest}` values.
- Response: `200 {"appId":"app_..."}`.

#### `POST /api/v1/exports/runtime-preview/reset`

- Builder-authenticated and CSRF protected.
- Request: `{"projectId":"..."}`.
- Delete only owner-scoped preview records, never live records.
- Response: `200 {"clearedRecords": number}`.

Export and publish flows should create equivalent immutable live app versions, but implementation of
archive generation/deployment is outside the minimum Auth + Nodes assignment unless already present.

---

## 7. Phase 3 — Core runtime execution endpoint

### 7.1 HTTP schemas

```python
class ExecuteActionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    executionId: str = Field(min_length=1, max_length=200)
    inputs: dict[str, JsonValue] = Field(default_factory=dict, max_length=100)

class ExecuteActionResponse(BaseModel):
    branch: Literal["success"] = "success"
    output: dict[str, Any]

class RuntimeRecordListResponse(BaseModel):
    records: list[RecordResponse]
```

Runtime value limits:

- maximum nesting depth 8;
- string length 100,000;
- array length 2,000;
- object size 200 keys;
- key length 200.

### 7.2 Routes

| Method | Exact path | Content type | Response |
|---|---|---|---|
| GET | `/runtime/v1/apps/{appId}/collections/{collectionId}/records` | — | `{records: RecordResponse[]}` |
| POST | `/runtime/v1/apps/{appId}/actions/{actionId}/execute` | `application/json` | `ExecuteActionResponse` |
| POST | `/runtime/v1/apps/{appId}/actions/{actionId}/execute-upload` | multipart | `ExecuteActionResponse` |
| POST | `/runtime/v1/apps/{appId}/vision/challenges` | JSON | `VisionChallengeResponse` |
| POST | `/runtime/v1/apps/{appId}/actions/{actionId}/execute-media` | multipart | `ExecuteActionResponse` |

Path parameter Python names may be snake_case, but generated OpenAPI paths and external paths must
match exactly.

### 7.3 Secure resolution algorithm

```python
async def load(app_id):
    version = await versions.get(app_id)
    if version is None:
        raise RuntimeAppNotFoundError()
    project = await projects.get(version.project_id, version.owner_id)
    if project is None:
        raise RuntimeAppNotFoundError()
    manifest = GeneratedAppManifest.model_validate(version.manifest)
    return version, manifest

def find_action(manifest, action_id):
    for screen in manifest.project.screens:
        for graph in screen.logicGraphs:
            for node in graph.nodes:
                if isinstance(node, ActionNode) and node.id == action_id:
                    return node, graph
    raise RuntimeActionNotFoundError()

async def declared_collection(version, manifest, collection_id):
    if collection_id not in [c.id for c in manifest.appData.collections]:
        raise RuntimeCollectionNotFoundError()
    collection = await app_data.get_collection(
        version.project_id, collection_id, version.owner_id
    )
    if collection is None:
        raise RuntimeCollectionNotFoundError()
    return collection
```

Input enforcement:

```python
mappings = action.inputMappings or {}
if any(mapping.source == "session" for mapping in mappings.values()):
    raise RuntimeAuthRequiredError()

reserved = {"$previous"} if action.type is approved_rag_action else set()
unknown = set(inputs) - set(mappings) - reserved
if unknown:
    raise InvalidRuntimeInputError(details={"issues": [
        {"path": f"inputs.{key}", "message": "Input is not declared by this action."}
        for key in sorted(unknown)
    ]})
```

Do not use an action payload sent by the browser. The frontend intentionally does not send it.

### 7.4 Canonical record contract

```json
{
  "id":"record_...",
  "projectId":"project_...",
  "collectionId":"collection_...",
  "values":{"field_title":"Example"},
  "createdAt":"2026-11-21T12:00:00+00:00",
  "updatedAt":"2026-11-21T12:00:00+00:00"
}
```

Runtime outputs must filter record values to fields declared by that immutable version, even if the
live collection gained fields later.

### 7.5 CRUD node behavior and outputs

#### Get Records (`type: "get-records"`)

Payload: `{type, collectionId}`. Verify the collection is version-declared and owner-scoped.

```json
{"branch":"success","output":{"records":[/* canonical records */]}}
```

#### Get Record (`type: "get-record"`)

Payload: `{type, collectionId, recordId}`. Resolve record ID in priority order:
`inputs.$recordId`, `inputs.recordId`, static `payload.recordId`. Missing/not found returns
`404 app_data_not_found`.

```json
{"branch":"success","output":{"record":{/* canonical record */}}}
```

#### Insert Record (`type: "insert-record"`)

Payload: `{type, collectionId, values}`. Start from static values and overlay non-`$` runtime inputs.
Every input key must be both action-declared and a real collection field. Coerce numbers and boolean
strings, enforce required/type constraints, generate immutable backend record ID, and persist in the
version data scope.

```json
{"branch":"success","output":{"record":{/* canonical created record */}}}
```

#### Update Record (`type: "update-record"`)

Payload: `{type, collectionId, recordId, values}`. Resolve `inputs.$recordId` then static record ID;
validate values and return the canonical updated record.

#### Delete Record (`type: "delete-record"`)

Payload: `{type, collectionId, recordId, confirm?}`. Resolve record ID; missing record gives 404.

```json
{
  "branch":"success",
  "output":{"deletedRecordId":"record_...","collectionId":"collection_..."}
}
```

Use transactions for multi-record mutations. Never silently overwrite another scope.

### 7.6 Send Email node

Payload: `{type:"send-email", to, subject, body}`. Runtime inputs override matching static fields.

- Validate recipient syntax without network deliverability checks.
- Subject length 1–200.
- Body length 1–20,000.
- Use idempotency key `{appId}:{actionId}:{executionId}`.
- Provider credentials remain backend-only.
- Response exposes only a sanitized delivery identifier, never recipient/provider internals:

```json
{"branch":"success","output":{"deliveryId":"email_dev_..."}}
```

Development email adapter must be side-effect free. Disabled adapter fails with
`503 email_delivery_unavailable`.

### 7.7 Unsupported action behavior

These types are deprecated and rejected: `rag-index`, `rag-query`, `rag-remove`, plus unsupported
granular `vector-*`, `query-*`, `llm-*` forms that are not part of the current approved dispatch.

All browser-owned actions return:

```json
{
  "error": {
    "code": "unsupported_capability",
    "message": "This action belongs in the generated browser runtime.",
    "details": {"actionId":"...","actionType":"navigate"},
    "requestId":"..."
  }
}
```

Unknown action ID returns 404, not 422. This avoids revealing capabilities not present in the
immutable version.

---

## 8. Phase 4 — RAG node endpoints

RAG is generated-application functionality, separate from the builder assistant. Providers are
explicitly selected; never fall back between Ollama, OpenRouter, profiles, or models.

### 8.1 Supported node payloads

Implement these exact payload names and key fields:

| Type | Required configuration |
|---|---|
| `document-upload` | `mediaReference` |
| `document-load` | `source`, source/file/collection references, fields, metadata |
| `text-split` | `strategy`, `chunkSize`, `chunkOverlap`, `separators` |
| `embedding-generate` | `connectionProfileId`, `model`, `batchSize` |
| `rerank` | profile/model, `topN`, `minimumScore` |
| `prompt-template` | `template`, `contextSeparator`, `emptyContextBehavior` |
| `memory` | `operation`, profile, `scope`, `windowSize` |
| `vector-store` | `operation`, profile, `indexName`, `namespace`, input/conflict mode, document ID, retrieval limits |
| `chat-model` | profile/model, `temperature`, `maxTokens`; resource node, not directly executed |
| `ai-agent` | `instructions`, `maxIterations`, `returnIntermediateSteps` |

`chat-input`, `chat-output`, and `chat-message` remain browser actions. They gather the question and
render the canonical answer/citations from the AI Agent output.

### 8.2 Multipart document upload

`POST /runtime/v1/apps/{appId}/actions/{actionId}/execute-upload`

Multipart fields:

| Field | Rule |
|---|---|
| `executionId` | string, 1–200 |
| `inputs` | JSON object encoded as string, max 20,000 characters |
| `file` | accepted text/Markdown/HTML/PDF file |

Read no more than `rag_max_file_bytes + 1`; close the upload; reject excess with
`413 rag_source_too_large`. Sanitize filename by replacing backslashes, stripping directory parts,
trimming, defaulting to `document`, and limiting to 255 chars. Infer media type from extension only
when the declared value is absent or `application/octet-stream`.

The action ID must resolve to `document-upload`; otherwise return 404. Reject undeclared inputs.
Extract safe text, store only bounded extracted text/metadata, and discard original binary bytes.
Never echo extracted text in the upload response.

Example output:

```json
{
  "branch":"success",
  "output":{
    "sourceId":"rag_file_...",
    "filename":"notes.pdf",
    "mediaType":"application/pdf",
    "contentHash":"sha256..."
  }
}
```

The same execution ID and same input must return the first result. Reusing an execution ID with
different input returns `409 conflict`. A previously failed execution remains failed/conflicted;
do not partially repeat side effects.

### 8.3 RAG profile discovery and file management

Builder-authenticated support endpoints:

| Method | Exact path | Response/status |
|---|---|---|
| GET | `/api/v1/runtime-profiles?capability=...` | `200 {profiles:[...]}` |
| POST | `/api/v1/projects/{projectId}/rag/files` | multipart `file`; 201 source metadata |
| GET | `/api/v1/projects/{projectId}/rag/files` | `200 {files:[...]}` |
| DELETE | `/api/v1/projects/{projectId}/rag/files/{sourceId}` | 204 |

Profile response fields:

```text
id, name, capability, provider, models, defaultModel, location,
costWarning, usageNote, available, embeddingDimensions
```

Capabilities are `embedding | chat | reranking | vector | memory`; location is
`local | remote | backend`. Never return API keys.

### 8.4 Resource-edge resolution

RAG configuration is attached in the immutable graph with `edge.kind == "resource"`. Resolve
attached text splitter, embedding model, vector store, chat model, reranker, prompt, and memory
server-side by typed target port. Do not allow callers to replace resources through inputs.

The vector store requires attached resources for upsert. The AI Agent requires an attached chat
model and retrieval tool. Missing required resources return `422 invalid_runtime_input`.

### 8.5 RAG action outputs

Canonical shapes:

```json
{"documents":[{"id":"doc_1","title":"...","text":"...","metadata":{}}]}
{"chunks":[{"id":"chunk_1","documentId":"doc_1","text":"...","metadata":{}}]}
{"chunks":[...],"embeddings":[[0.1,0.2]]}
{"insertedCount":1,"updatedCount":0,"chunkCount":4,"indexName":"...","namespace":"..."}
{"removedCount":1,"documentId":"doc_1"}
{"toolName":"retrieve_knowledge","operation":"retrieve-tool"}
{"operation":"append","conversationId":"...","messages":[...]}
```

AI Agent output:

```json
{
  "answer":"Grounded answer",
  "citations":[
    {
      "reference":"S1",
      "documentId":"doc_1",
      "chunkId":"chunk_1",
      "title":"Source title",
      "excerpt":"Canonical bounded excerpt"
    }
  ],
  "conversationId":"...",
  "toolCalls":[],
  "finishReason":"stop"
}
```

Rules:

- Citation references are backend-generated and canonical.
- Retrieval context is explicitly marked untrusted in the internal prompt.
- Provider prompts, raw provider responses, API keys, and raw embeddings never leave the backend.
- Cap documents, chunks, context characters, output tokens, and agent iterations from settings.
- Memory with `scope="user"` requires a generated-app user; otherwise
  `401 rag_memory_auth_required`.
- `emptyContextBehavior="return-empty"` produces no fabricated answer.
- RAG disabled returns `503 rag_not_configured` before provider work.

---

## 9. Phase 5 — Generated-app passwordless identity and CV endpoints

This realm is used by protected runtime workflows and is not Supabase builder auth.

### 9.1 Passwordless routes

#### `POST /runtime/v1/apps/{appId}/auth/code`

JSON: `{"email":"user@example.com"}`. Validate 3–320 chars, resolve app, rate limit, generate a
six-digit code, store only a secure digest with 10-minute expiry, and send via email adapter. Return:

```text
HTTP 202
{"status":"accepted"}
```

Use a generic accepted response to avoid account enumeration.

#### `POST /runtime/v1/apps/{appId}/auth/code/verify`

JSON: `{"email":"...","code":"123456"}` where code matches `^\d{6}$`. Consume valid code,
upsert the app-scoped runtime user, create signed opaque session, set runtime session + CSRF cookies,
and return:

```json
{
  "user":{"id":"runtime_user_...","email":"user@example.com","isAnonymous":false},
  "csrfToken":"..."
}
```

Invalid/expired/used code: `401 invalid_runtime_code`.

#### `GET /runtime/v1/apps/{appId}/auth/session`

Credentialed. Validate app-scoped session and require the runtime CSRF cookie. Return the same
`RuntimeAuthResponse`; invalid/missing session returns `401 runtime_auth_required`.

#### `POST /runtime/v1/apps/{appId}/auth/logout`

Credentialed and runtime-CSRF protected. Revoke runtime session, clear runtime cookies, HTTP 204.

### 9.2 Runtime cookies

| Cookie | HttpOnly | Purpose |
|---|---:|---|
| `novy_runtime_session` | yes | short generated-app session |
| `novy_runtime_csrf` | no | runtime double-submit token |
| `novy_biometric_device` | yes | signed, opaque same-device binding, 180 days default |

Use `/runtime/v1` path. Cross-site generated apps require exact origins, HTTPS, `SameSite=None`, and
`Secure`. Local same-site development may use `lax`.

### 9.3 Vision challenge

`POST /runtime/v1/apps/{appId}/vision/challenges`

Request:

```json
{"actionId":"action_verify","inputs":{}}
```

Schema:

```python
actionId: str = Field(min_length=1, max_length=200)
inputs: dict[str, DataValue] = Field(default_factory=dict, max_length=100)
```

Resolve the exact CV action in the immutable manifest. If a runtime session exists, require runtime
CSRF. Otherwise identify only through a valid signed biometric device cookie. Persist one-time,
short-lived challenge bound to app, action, user/device context, and declared inputs.

Response:

```json
{"challengeId":"challenge_...","expiresAt":"2026-11-21T12:02:00+00:00"}
```

### 9.4 Vision media execution

`POST /runtime/v1/apps/{appId}/actions/{actionId}/execute-media`

Multipart fields: `executionId`, `challengeId`, `inputs` JSON string, `media` file. Read at most
`vision_max_media_bytes + 1` and close the upload. Do not persist or log raw media.

Consume the challenge exactly once, even when provider execution fails. Expired, mismatched, or
replayed challenges return `422 vision_challenge_invalid`.

Expected outputs:

```json
{"isLive":true,"confidence":0.99,"reason":"development_simulation"}
{"enrolled":true,"credentialId":"credential_...","qualityScore":0.88}
{"verified":true,"confidence":0.91}
```

For CV Enroll:

- require an action-declared `consent` mapping and truthy consent input;
- persist policy version and timestamp;
- issue a signed device binding when anonymous enrollment succeeds;
- never expose provider references/templates.

For CV Verify:

- do not trust a caller-supplied `userId` to change challenge identity;
- use server-side threshold/configuration constraints;
- successful same-device verification may establish a runtime session;
- anonymous runtime users have `isAnonymous: true` and synthetic email must not be shown by the UI.

Production must use `UnavailableVisionProvider` until a production provider is explicitly selected.
Development simulation must identify itself as simulation and is rejected by production config.

### 9.5 Credential revocation

`DELETE /runtime/v1/apps/{appId}/vision/credential`

Require runtime session + runtime CSRF. Revoke credential, delete/replace provider reference so it
cannot be reused, clear device binding, and return 204.

---

## 10. Persistence and transaction requirements

At minimum create relational storage for:

### App versions

- immutable ID primary key;
- owner/project foreign scope;
- JSONB manifest;
- `data_scope` (`live`/`preview`);
- timestamps;
- indexes for owner/project.

### App data

- databases, collections, fields, records;
- owner/project/collection foreign scoping;
- backend-generated immutable record IDs;
- JSONB values with backend type validation;
- record `data_scope` so preview and live data cannot collide;
- cascades reviewed manually.

### Runtime identity/CV

- app-scoped runtime users;
- login code digest/expiry/consumed marker;
- session digest/expiry/revocation;
- one-time vision challenges;
- biometric consent;
- credential status and provider-neutral opaque reference;
- device binding material as signed/digested tokens, never raw media.

### RAG

- source metadata and bounded extracted text;
- documents and chunks;
- vectors with pinned dimensions;
- conversation messages;
- idempotent execution records with input fingerprint, status, and canonical output;
- all rows scoped by owner/project/app version as appropriate.

Use transactions for preview seeding/reset, challenge consumption, enrollment, vector indexing,
multi-record mutation, and idempotency acquisition/finalization.

---

## 11. Complete frontend endpoint parity reference

The Auth + Nodes assignment must implement the bold routes and their prerequisites. Other rows are
listed to prevent collisions and naming drift with the already-connected frontend.

### Builder auth

- **`POST /api/v1/auth/register`**
- **`POST /api/v1/auth/login`**
- **`GET /api/v1/auth/session`**
- **`POST /api/v1/auth/logout`**
- `POST /api/v1/auth/refresh` (backend-complete contract)

### Runtime preparation and server nodes

- **`POST /api/v1/exports/runtime-preview`**
- **`POST /api/v1/exports/runtime-preview/reset`**
- **`GET /runtime/v1/apps/{appId}/collections/{collectionId}/records`**
- **`POST /runtime/v1/apps/{appId}/actions/{actionId}/execute`**
- **`POST /runtime/v1/apps/{appId}/actions/{actionId}/execute-upload`**
- **`POST /runtime/v1/apps/{appId}/vision/challenges`**
- **`POST /runtime/v1/apps/{appId}/actions/{actionId}/execute-media`**
- **`POST /runtime/v1/apps/{appId}/auth/code`**
- **`POST /runtime/v1/apps/{appId}/auth/code/verify`**
- **`GET /runtime/v1/apps/{appId}/auth/session`**
- **`POST /runtime/v1/apps/{appId}/auth/logout`**
- `DELETE /runtime/v1/apps/{appId}/vision/credential`

### RAG support

- **`GET /api/v1/runtime-profiles`**
- **`POST /api/v1/projects/{projectId}/rag/files`**
- **`GET /api/v1/projects/{projectId}/rag/files`**
- **`DELETE /api/v1/projects/{projectId}/rag/files/{sourceId}`**

### Existing frontend paths outside this assignment

Do not reuse or conflict with:

- `/api/v1/projects`, `/projects/{id}`, `/projects/{id}/document`, `/projects/{id}/duplicate`,
  `/projects/import`;
- `/api/v1/projects/{id}/databases` and nested database IDs;
- `/api/v1/projects/{id}/collections` and nested record CRUD;
- `/api/v1/projects/{id}/app-data`;
- `/api/v1/exports/react`;
- `/api/v1/deployments/providers`, `/deployments/published`, project deployment paths;
- `/api/v1/assistant/capabilities` and project assistant proposal/help paths.

---

## 12. Test plan and exact acceptance expectations

Write tests before or with each phase. Tests must assert exact path, method, status, response shape,
cookies, error codes, and security scoping—not merely that a function was called.

### 12.1 Auth API tests

| Test | Expected result |
|---|---|
| `test_register_creates_profile_and_session_cookies` | 201; body keys exactly `id,displayName,email`; no token text; access/refresh HttpOnly; CSRF readable; profile active |
| `test_register_returns_conflict_for_existing_email` | 409; `email_already_registered`; request ID present |
| `test_register_requires_confirmation_when_supabase_requires_it` | 202 pending shape; no access/refresh cookies; subsequent login 403 `email_not_confirmed` |
| `test_invalid_login_is_generic_for_unknown_email_and_wrong_password` | both 401; identical `invalid_credentials` message |
| `test_login_and_session_restore` | login 200; session 200; bodies equal |
| `test_session_without_cookies_is_rejected` | 401 `session_required` |
| `test_session_refreshes_an_expired_access_token` | 200; one provider refresh; access cookie rotated |
| `test_refresh_requires_csrf_and_rotates_tokens` | no CSRF 403 `csrf_failed`; valid CSRF 200 and refresh rotation |
| `test_logout_clears_cookies_and_revokes_provider_session` | 204; provider called once; all three cookies removed; session then 401 |
| `test_logout_requires_csrf_when_session_cookies_exist` | 403 `csrf_failed`; session remains |
| `test_validation_errors_do_not_echo_submitted_passwords` | 422; password absent from response; detail keys exactly location/message/type |
| `test_request_id_is_echoed_and_attached_to_errors` | supplied request ID appears in header and error body |
| `test_rate_limiting_login_attempts` | configured 2/min: two 401s then 429 with `Retry-After >= 1` |
| `test_cors_allows_only_exact_configured_origins` | configured origin gets credentials; evil origin gets no allow-origin |
| `test_oversized_bodies_are_rejected_before_parsing` | 413 `request_too_large` |

### 12.2 Auth unit/provider/contract tests

Required assertions:

- cached profile avoids another read;
- disabled profile is rejected, with cache TTL behavior explicitly tested;
- unchanged profile is not written;
- registration syncs provider identity;
- missing metadata preserves existing name then falls back to email local part;
- access failure refreshes; no tokens is invalid;
- logout tolerates unavailable provider/invalid token;
- valid offline JWT does not call provider; unverifiable JWT does;
- fallback identity cache is digest-keyed, expiring, and cleared by logout;
- Supabase requests use exact paths/body/header and no authorization on signup;
- duplicate, invalid credentials, unconfirmed email, rate limit, outage, and network errors map safely;
- valid/tampered/expired/wrong issuer/wrong audience/unknown-kid JWT cases;
- `UserResponse` exactly matches frontend fixture `{id, displayName, email}`;
- profile email uniqueness enforced at the database.

### 12.3 Core runtime API tests

| Test | Expected result |
|---|---|
| `test_runtime_executes_only_declared_actions_and_reconciles_records` | Insert 200 canonical record; list returns it; undeclared action 404 `runtime_action_not_found`; undeclared collection 404 |
| `test_runtime_rejects_inputs_not_declared_by_immutable_action` | 422 `invalid_runtime_input` with issue path |
| `test_runtime_filters_fields_added_after_the_immutable_version` | 200; only manifest-declared values returned |
| `test_runtime_cors_separates_public_and_credentialed_routes` | public preflight `*`, no credentials; vision preflight exact origin + credentials + CSRF header |
| `test_runtime_email_returns_a_sanitized_delivery_identifier` | output delivery ID only; recipient absent |
| `test_runtime_record_actions_complete_the_canonical_crud_lifecycle` | create/update/get/list/delete output shapes all canonical; final list empty |
| `test_runtime_never_substitutes_builder_identity_for_session_mappings` | 401 `runtime_auth_required` |
| `test_runtime_rejects_deprecated_granular_rag_actions` | 422 `unsupported_capability`, action type in details |

### 12.4 Runtime preview/version tests

- Equivalent manifests with different export clocks produce the same app ID.
- Different owners produce different IDs.
- Preview preparation copies live records into preview scope with new IDs.
- Repeated preparation is idempotent and preserves sandbox edits.
- Reset clears only preview records for the owner.
- Foreign project reset returns 404.
- Seed limit fails atomically with no partial preview data.
- Live and preview app versions read only their own data scopes.

### 12.5 RAG API and unit tests

| Test | Expected result |
|---|---|
| profile discovery without builder session | 401 `session_required` |
| profile locality/cost response | Ollama local/no cost; OpenRouter remote/cost warning; vector backend; no key strings |
| capability filter | only requested capability returned |
| owner-scoped file CRUD | upload 201, list 200, delete 204, no extracted text returned |
| unsupported/oversized file | 422 `rag_source_unsupported`; 413 `rag_source_too_large` |
| RAG disabled | 503 `rag_not_configured` |
| indexing and question | store output counts; persisted doc/chunk; agent answer with canonical citation |
| undeclared RAG input | 422 `invalid_runtime_input` |
| public document upload | 200 source metadata only; binary discarded; then vector store and agent succeed |
| duplicate upload execution | same canonical output; no duplicate side effect |

Unit tests must additionally cover URL allowlisting, text split bounds, overlap rejection, vector
upsert/delete, required resource edges, prompt empty-context behavior, user-memory auth, bounded
memory, execution idempotency, and changed-input conflict.

### 12.6 Runtime identity and vision tests

| Test | Expected result |
|---|---|
| passwordless code lifecycle | code delivered; valid code creates runtime user/session; reused/expired code 401 |
| one-time liveness challenge | challenge 200; media 200 liveness output; replay 422 `vision_challenge_invalid` |
| anonymous enrollment/device unlock | enroll output and HttpOnly 180-day device cookie; no provider reference leaked |
| caller user-ID hijack attempt | challenge identity unchanged; unauthorized target cannot be verified |
| verify after enrollment | `verified:true`; runtime session issued; session response `isAnonymous:true` |
| revoke credential | CSRF-protected 204; status revoked; provider reference unusable; device cookie removed |
| verify after revocation | completed request returns `verified:false` rather than restoring credential |
| production disabled provider | 503 `vision_provider_unavailable`; no development simulation claim |

### 12.7 Manifest contract tests

At minimum test:

- valid frontend manifest;
- schema v12 rejected; v13/v14 accepted;
- layout v2 required;
- security flags required false;
- browser-only Set Theme remains valid but server-nonexecuted;
- field styling/design-system v14 accepted;
- unsafe CSS/media rejected;
- layout/project disagreements rejected;
- missing inferred capability rejected;
- component/graph/edge/depth limits;
- typed RAG resource ports;
- chunk overlap;
- vector-store index name;
- collection document source content-field reference.

---

## 13. Verification commands and completion gate

Use the backend's package manager, but the equivalent complete gate is:

```powershell
uv sync --extra dev
uv run ruff check app tests
uv run ruff format --check app tests
uv run mypy app
uv run alembic check
uv run pytest
```

Run optional PostgreSQL integration tests against a disposable database when configured. Then verify
the existing frontend without changing its contracts:

```powershell
npm run typecheck
npm test -- --run --maxWorkers=2 --testTimeout=20000
npm run build
```

Completion requires:

- zero failed applicable backend tests;
- zero Ruff/mypy failures;
- Alembic at head with no ungenerated model changes;
- frontend typecheck/tests/build still pass;
- no changed frontend URL or DTO solely to accommodate backend divergence;
- no secrets/tokens/passwords/raw media in logs, JSON, exports, or fixtures;
- manual smoke test of register/login/session/logout and one CRUD runtime action;
- explicit report of skipped optional provider tests and why they were skipped.

---

## 14. Recommended implementation order

Follow this order; each step must be green before the next:

1. **Foundation:** package config, settings, DB session, errors, request IDs, body limits, CORS, CSRF,
   rate limiter, app factory.
2. **Auth domain/application:** user/profile, ports, errors, AuthService, unit tests.
3. **Auth infrastructure:** profile migration/repository, dummy/unavailable provider, API tests.
4. **Supabase production auth:** REST adapter, JWKS verifier, provider unit tests.
5. **Manifest contract:** strict DTOs and semantic validator against real frontend fixtures.
6. **App versions/data scope:** migrations, deterministic IDs, repositories, preview seeding/reset.
7. **Core runtime:** immutable action resolution, declared-input enforcement, CRUD, email, API tests.
8. **RAG:** profiles/source storage, bounded upload, resource edges, idempotency, vector/memory/agent.
9. **Runtime identity/CV:** passwordless codes, cookies/CSRF, challenges, provider-neutral execution,
   revocation.
10. **Hardening:** cross-owner tests, CORS tests, payload/rate limits, secret-leak assertions, complete
    quality gate.

Do not begin provider-heavy work before immutable action lookup and owner/data-scope enforcement are
tested. Those are the security boundary for every public node endpoint.

---

## 15. Definition of done checklist

- [ ] Backend exposes exact `/api/v1/auth/*` paths and camelCase auth payloads.
- [ ] Frontend never receives or stores builder access/refresh tokens.
- [ ] Register supports both 201 auto-confirmed and 202 pending-confirmation flows.
- [ ] Session restoration refreshes expired access tokens through the cookie.
- [ ] CSRF, exact credentialed CORS, rate limits, no-store, body limits, and error envelope work.
- [ ] Runtime lives at `/runtime/v1`, not under `/api/v1`.
- [ ] Runtime actions are looked up by ID from immutable validated versions.
- [ ] Unknown actions/collections/inputs fail closed with the exact error codes.
- [ ] CRUD outputs use canonical records and filter fields to the immutable manifest.
- [ ] Email output is sanitized and idempotent.
- [ ] Browser-only nodes are not executed by the server.
- [ ] RAG upload is bounded; source bytes are discarded; providers never auto-fallback.
- [ ] AI Agent answers include canonical backend citations and no raw embeddings/prompts.
- [ ] Generated-app auth is separate from builder auth.
- [ ] CV challenges are one-use; media stays in memory; consent and revocation are enforced.
- [ ] Development CV is never represented as production processing.
- [ ] Preview data cannot mutate live data.
- [ ] Migrations, unit/API/integration/contract tests, lint, types, and frontend gates pass.
