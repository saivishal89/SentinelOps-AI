# HackForge Backend Foundation — Design Specification

> **Scope:** Authentication (Google, GitHub, Discord) + Persistent User Database + API Key Management (BYOK)
>
> **Out of scope (Phase 2):** AI Investigation Engine, Remediation System, Observability Backend, Incident API, Agent System

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
└──────────────────────────┬───────────────────────────────────────┘
                           │ HTTPS
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                     FastAPI Application                          │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────────────────┐   │
│  │  Auth API   │  │  Users API  │  │  API Keys API          │   │
│  │  /auth/*    │  │  /users/*   │  │  /api-keys/*           │   │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬─────────────┘   │
│         │                │                     │                  │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────────▼─────────────┐   │
│  │ OAuth Layer │  │  User Svc   │  │  Key Manager           │   │
│  │ Google      │  │             │  │  (AES-256-GCM encrypt) │   │
│  │ GitHub      │  │             │  │                        │   │
│  │ Discord     │  │             │  │  Provider Abstraction  │   │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬─────────────┘   │
│         │                │                     │                  │
│  ┌──────▼──────────────────────────────────────▼─────────────┐   │
│  │                   SQLAlchemy ORM                          │   │
│  │                   (Async Sessions)                        │   │
│  └──────────────────────────┬────────────────────────────────┘   │
└─────────────────────────────┼────────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │    PostgreSQL      │
                    │   (Docker)         │
                    └───────────────────┘
```

## 2. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | FastAPI | 0.115+ |
| ORM | SQLAlchemy (async) | 2.0+ |
| Migrations | Alembic | 1.13+ |
| Database | PostgreSQL | 16 |
| Auth | Authlib (OAuth) + PyJWT | latest |
| Encryption | cryptography (AES-256-GCM) | latest |
| Session Store | Redis (via docker) | 7 |
| Validation | Pydantic v2 | 2.0+ |
| Server | Uvicorn | latest |
| Container | Docker Compose | v2 |
| Python | 3.12+ | |

## 3. Database Schema

### 3.1 `users` table

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    status VARCHAR(20) DEFAULT 'active',  -- active | suspended | deleted
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);
```

### 3.2 `auth_accounts` table (linked providers)

```sql
CREATE TABLE auth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL,  -- google | github | discord
    provider_user_id VARCHAR(255) NOT NULL,
    provider_email VARCHAR(255),
    provider_data JSONB,  -- raw profile payload
    access_token_encrypted BYTEA,
    refresh_token_encrypted BYTEA,
    token_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    UNIQUE (provider, provider_user_id)
);
CREATE INDEX idx_auth_accounts_user ON auth_accounts(user_id);
```

### 3.3 `api_credentials` table (BYOK keys)

```sql
CREATE TABLE api_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,  -- openai | anthropic | google_ai | github | discord | custom
    key_name VARCHAR(100) NOT NULL,
    encrypted_secret BYTEA NOT NULL,
    key_hint VARCHAR(10),  -- last 4 chars: "7X91"
    status VARCHAR(20) DEFAULT 'active',  -- active | revoked | expired
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    last_tested_at TIMESTAMPTZ,
    test_status VARCHAR(20)  -- success | failed | untested
);
CREATE INDEX idx_api_credentials_user ON api_credentials(user_id);
CREATE INDEX idx_api_credentials_provider ON api_credentials(user_id, provider);
```

### 3.4 `audit_logs` table

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, timestamp);
```

### 3.5 Future tables (Phase 2 — listed for reference, not built now)

```
projects, incidents, incident_events, hypotheses, evidence,
remediation_plans, remediation_actions, approvals, integrations
```

## 4. Authentication Flow

### 4.1 OAuth Flow (all 3 providers)

```
Browser -> GET /auth/{provider}/login
        -> 302 Redirect to Provider's consent screen
        -> User approves
        -> Provider redirects to /auth/{provider}/callback?code=xxx
        -> Backend exchanges code for access_token
        -> Backend fetches user profile from provider
        -> Find or create user in DB (account linking by email)
        -> Issue JWT access_token + set HttpOnly refresh cookie
        -> 302 Redirect to frontend with token
```

### 4.2 Account Linking Logic

```python
# Pseudocode
provider_profile = fetch_profile_from_provider(access_token)
email = provider_profile.email

# Check if auth_account exists for this provider+provider_user_id
existing_auth = find_auth_account(provider, provider_user_id)

if existing_auth:
    # Returning user — update last_login, return existing user
    user = existing_auth.user
    update_last_login(user)
else:
    # Check if a user with this email already exists
    existing_user = find_user_by_email(email)
    if existing_user:
        # Link new provider to existing account
        create_auth_account(existing_user, provider, provider_data)
        user = existing_user
    else:
        # Brand new user — create user + auth_account
        user = create_user(email, name, avatar)
        create_auth_account(user, provider, provider_data)

return issue_jwt(user)
```

### 4.3 JWT Structure

```json
{
    "sub": "user-uuid",
    "email": "user@example.com",
    "name": "User Name",
    "iat": 1695700000,
    "exp": 1695703600,
    "type": "access"
}
```

- **Access token:** 1 hour expiry, sent as `Authorization: Bearer <token>`
- **Refresh token:** 30 day expiry, HttpOnly cookie, used to get new access token

### 4.4 Provider-Specific Config

| Provider | OAuth Scope | Profile Endpoint |
|----------|-------------|------------------|
| Google | `openid email profile` | `https://www.googleapis.com/oauth2/v3/userinfo` |
| GitHub | `read:user user:email` | `https://api.github.com/user` |
| Discord | `identify email` | `https://discord.com/api/v10/users/@me` |

## 5. API Key Management (BYOK)

### 5.1 Encryption Architecture

```
User submits API key (plaintext)
    |
    v
Backend receives key via HTTPS
    |
    v
Generate random 12-byte nonce (IV)
    |
    v
AES-256-GCM encrypt with MASTER_ENCRYPTION_KEY
    |
    v
Store: nonce || ciphertext || auth_tag  as BYTEA
    |
    v
Store key_hint = last 4 chars of plaintext
    |
    v
Discard plaintext from memory
```

### 5.2 Decryption (when AI needs the key)

```
AI Agent requests key for provider
    |
    v
Key Manager loads encrypted_secret from DB
    |
    v
Split: nonce (12 bytes) | ciphertext | tag (16 bytes)
    |
    v
AES-256-GCM decrypt with MASTER_ENCRYPTION_KEY
    |
    v
Return plaintext to caller
    |
    v
Caller uses key for API call
    |
    v
Plaintext discarded after use (not cached)
```

### 5.3 Key Management API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api-keys/` | Add new API key |
| GET | `/api-keys/` | List user's keys (no secrets) |
| POST | `/api-keys/{id}/test` | Test key connectivity |
| DELETE | `/api-keys/{id}` | Revoke/delete key |

**Response for GET never includes the actual key:**

```json
{
    "id": "uuid",
    "provider": "openai",
    "key_name": "My OpenAI Key",
    "key_hint": "7X91",
    "status": "active",
    "last_used_at": "2026-09-26T10:00:00Z",
    "test_status": "success"
}
```

### 5.4 Provider Abstraction

```python
class AIProviderBase(ABC):
    @abstractmethod
    async def test_connection(self, api_key: str) -> bool: ...

    @abstractmethod
    async def generate(self, prompt: str, api_key: str, **kwargs) -> str: ...

class OpenAIProvider(AIProviderBase): ...
class AnthropicProvider(AIProviderBase): ...
class GoogleAIProvider(AIProviderBase): ...
```

## 6. API Contract Summary (for Frontend team)

### 6.1 Auth Endpoints

```
GET  /auth/google/login        -> 302 redirect to Google
GET  /auth/google/callback     -> handles OAuth callback
GET  /auth/github/login        -> 302 redirect to GitHub
GET  /auth/github/callback     -> handles OAuth callback
GET  /auth/discord/login       -> 302 redirect to Discord
GET  /auth/discord/callback    -> handles OAuth callback
POST /auth/refresh             -> refresh JWT using cookie
POST /auth/logout              -> invalidate session
```

### 6.2 User Endpoints

```
GET    /users/me               -> current user profile
PATCH  /users/me               -> update profile (name, avatar)
GET    /users/me/accounts      -> list linked OAuth accounts
DELETE /users/me/accounts/{id} -> unlink a provider (if >1 linked)
```

### 6.3 API Key Endpoints

```
POST   /api-keys/              -> add new key (encrypted)
GET    /api-keys/              -> list keys (no secrets)
POST   /api-keys/{id}/test     -> test key connectivity
DELETE /api-keys/{id}          -> revoke key
```

### 6.4 Audit Endpoints

```
GET    /audit/logs             -> paginated audit trail (admin)
```

## 7. Security Rules

1. **MASTER_ENCRYPTION_KEY** lives in `.env` only — never in code or DB
2. **User API keys** are stored encrypted in DB — never in `.env`
3. **Plaintext keys** are never logged, never returned after storage
4. **JWT secrets** are separate from encryption key
5. **CORS** configured for frontend origin only
6. **Rate limiting** on auth endpoints (10/min per IP)
7. **All mutations** produce audit log entries
8. **OAuth tokens** from providers are also stored encrypted

## 8. File Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI app, middleware, CORS
│   ├── config.py                  # Settings from .env via Pydantic
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── deps.py                # Dependency injection (get_db, get_current_user)
│   │   ├── auth.py                # OAuth login/callback/refresh/logout
│   │   ├── users.py               # User profile CRUD
│   │   ├── api_keys.py            # BYOK key management
│   │   └── audit.py               # Audit log viewing
│   │
│   ├── auth/
│   │   ├── __init__.py
│   │   ├── oauth.py               # OAuth client setup (Authlib)
│   │   ├── jwt.py                 # JWT creation/verification
│   │   └── providers.py           # Provider-specific profile fetching
│   │
│   ├── database/
│   │   ├── __init__.py
│   │   ├── connection.py          # Async engine + session factory
│   │   └── models.py              # SQLAlchemy models (all tables)
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── user_service.py        # User find/create/update logic
│   │   ├── key_manager.py         # AES encrypt/decrypt + CRUD
│   │   └── audit_service.py       # Audit log creation
│   │
│   └── ai/
│       ├── __init__.py
│       └── providers/
│           ├── __init__.py
│           ├── base.py            # AIProviderBase ABC
│           ├── openai.py          # OpenAI provider
│           ├── anthropic.py       # Anthropic provider
│           └── google_ai.py       # Google AI provider
│
├── alembic/
│   ├── env.py
│   └── versions/                  # Migration files
│
├── tests/
│   ├── conftest.py                # Test fixtures (db, client, auth)
│   ├── test_auth.py
│   ├── test_users.py
│   ├── test_api_keys.py
│   └── test_key_manager.py
│
├── alembic.ini
├── docker-compose.yml             # PostgreSQL + Redis
├── Dockerfile
├── requirements.txt
├── .env.example
└── .gitignore
```

## 9. Environment Variables

```env
# Application
APP_NAME=hackforge
APP_ENV=development
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql+asyncpg://hackforge:hackforge@localhost:5432/hackforge

# Redis (sessions)
REDIS_URL=redis://localhost:6379/0

# JWT
JWT_SECRET_KEY=<random-64-char-hex>
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
JWT_REFRESH_TOKEN_EXPIRE_DAYS=30

# Encryption (API Keys)
MASTER_ENCRYPTION_KEY=<random-32-byte-hex-key>

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# GitHub OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Discord OAuth
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=

# CORS
CORS_ORIGINS=http://localhost:3000
```

## 10. Design Decisions and Trade-offs

| Decision | Rationale |
|----------|-----------|
| Async SQLAlchemy | FastAPI is async — sync DB calls would bottleneck |
| Email-based account linking | Simple, covers 95% of cases. Edge case: user has different emails on providers — they get separate accounts, can merge later |
| AES-256-GCM over Vault | Simpler for a team project, Vault can be added later without schema changes |
| Redis for sessions | JWT is stateless but we need refresh token revocation — Redis tracks revoked tokens |
| UUID primary keys | No sequential IDs exposed to frontend (security) |
| Provider abstraction now | Even though AI system is Phase 2, the abstraction layer is cheap and prevents tech debt |
