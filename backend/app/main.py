"""
HackForge Backend — Main FastAPI Application

This is the entry point for the entire backend.
Run with: uvicorn app.main:app --reload --port 8000
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.config import settings
from app.database.connection import async_engine

# Import all routers
from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.api_keys import router as api_keys_router
from app.api.audit import router as audit_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup/shutdown lifecycle."""
    # ── Startup ──
    yield
    # ── Shutdown ──
    await async_engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    description="HackForge Backend — AI-powered Incident Investigation Platform",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ─── Middleware ─────────────────────────────────────────────────

# Session middleware — required by Authlib for OAuth state management
app.add_middleware(SessionMiddleware, secret_key=settings.JWT_SECRET_KEY)

# CORS — allow frontend origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ───────────────────────────────────────────────────

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(api_keys_router)
app.include_router(audit_router)


# ─── Root Endpoints ────────────────────────────────────────────

@app.get("/health", tags=["system"])
async def health_check():
    """Health check endpoint for monitoring and load balancers."""
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "version": "0.1.0",
    }


@app.get("/", tags=["system"])
async def root():
    """Root endpoint with API info."""
    return {
        "service": settings.APP_NAME,
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/health",
    }
