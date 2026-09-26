# HackForge Backend Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete backend foundation for HackForge — authentication (Google, GitHub, Discord), persistent user database, and API key management with BYOK encryption.

**Architecture:** FastAPI with async SQLAlchemy ORM over PostgreSQL (Docker Compose). OAuth via Authlib, JWT + HttpOnly refresh cookies for sessions, AES-256-GCM for API key encryption at rest, Redis for refresh token revocation.

**Tech Stack:** Python 3.12+, FastAPI, SQLAlchemy 2.0 (async), Alembic, PostgreSQL 16, Redis 7, Authlib, PyJWT, cryptography, Pydantic v2, Docker Compose

**Spec:** `docs/superpowers/specs/2026-09-26-hackforge-backend-foundation-design.md`

## Global Constraints

- Python 3.12+
- All database operations must use async SQLAlchemy sessions
- UUID primary keys everywhere (never expose sequential IDs)
- Pydantic v2 for all request/response models
- Never log or return plaintext secrets
- Every mutation must create an audit log entry
- All files must have `__init__.py` in their package directories

---

### Task 1: Project Scaffolding + Docker Infrastructure

**Files:**
- Create: `backend/docker-compose.yml`
- Create: `backend/requirements.txt`
- Create: `backend/.env.example`
- Create: `backend/.gitignore`
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Create: `backend/app/config.py`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `app.config.Settings` — Pydantic settings class with all env vars
  - `app.main.app` — FastAPI application instance
  - Docker services: `postgres` (port 5432), `redis` (port 6379)

- [x] **Step 1: Create docker-compose.yml**
- [x] **Step 2: Create requirements.txt**
- [x] **Step 3: Create .env.example**
- [x] **Step 4: Create .gitignore**
- [x] **Step 5: Create app/__init__.py**
- [x] **Step 6: Create app/config.py**
- [x] **Step 7: Create app/main.py**
- [x] **Step 8: Start DB + verify health endpoint**
- [x] **Step 9: Verification**

---

### Task 2: Database Layer — Models + Migrations

**Files:**
- Create: `backend/app/database/__init__.py`
- Create: `backend/app/database/connection.py`
- Create: `backend/app/database/models.py`
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`

**Interfaces:**
- Consumes: `app.config.settings.DATABASE_URL`
- Produces: User, AuthAccount, ApiCredential, AuditLog models + async sessions

- [x] **Step 1-3: Create database package files**
- [x] **Step 4-6: Initialize and configure Alembic**
- [x] **Step 7-9: Generate and run initial migration**
- [x] **Step 10: Verification**

---

### Task 3: JWT Authentication System

**Files:**
- Create: `backend/app/auth/__init__.py`
- Create: `backend/app/auth/jwt.py`
- Create: `backend/app/api/__init__.py`
- Create: `backend/app/api/deps.py`

- [x] **Steps 1-5: JWT creation/verification + auth dependency**

---

### Task 4: OAuth (Google + GitHub + Discord) + Account Linking

**Files:**
- Create: `backend/app/auth/oauth.py`
- Create: `backend/app/auth/providers.py`
- Create: `backend/app/services/user_service.py`
- Create: `backend/app/services/audit_service.py`
- Create: `backend/app/api/auth.py`
- Modify: `backend/app/main.py`

- [x] **Steps 1-9: Full OAuth flow with account linking by email**

---

### Task 5: User Profile API

**Files:**
- Create: `backend/app/api/users.py`
- Modify: `backend/app/main.py`

- [x] **Steps 1-4: User CRUD + linked accounts management**

---

### Task 6: API Key Management (BYOK + Encryption)

**Files:**
- Create: `backend/app/services/key_manager.py`
- Create: `backend/app/ai/providers/base.py`
- Create: `backend/app/ai/providers/openai_provider.py`
- Create: `backend/app/ai/providers/anthropic_provider.py`
- Create: `backend/app/ai/providers/google_ai_provider.py`
- Create: `backend/app/api/api_keys.py`
- Modify: `backend/app/main.py`

- [x] **Steps 1-10: AES-256-GCM encryption + provider abstraction + API**

---

### Task 7: Audit Log API

**Files:**
- Create: `backend/app/api/audit.py`
- Modify: `backend/app/main.py`

- [x] **Steps 1-3: Paginated audit logs with filtering**

---

### Task 8: Final Assembly — Complete main.py + Dockerfile

**Files:**
- Modify: `backend/app/main.py` (final version)
- Create: `backend/Dockerfile`

- [x] **Steps 1-4: Lifespan management + Docker deployment**
