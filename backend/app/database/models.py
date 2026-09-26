"""
Database models — compatible with both SQLite (dev) and PostgreSQL (production).

Tables:
- users: Core user accounts (persistent, never auto-deleted)
- auth_accounts: Linked OAuth providers (Google, GitHub, Discord)
- api_credentials: Encrypted BYOK API keys (AES-256-GCM)
- audit_logs: Accountability trail for every important action
"""
import uuid
import json
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Text, DateTime, ForeignKey, LargeBinary,
    Index, UniqueConstraint, TypeDecorator, event, text
)
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy.types import CHAR


# ─── Custom Type: UUID that works on both SQLite and PostgreSQL ───

class GUID(TypeDecorator):
    """Platform-independent UUID type.
    Uses CHAR(36) on SQLite, stores as string.
    Can be swapped to native UUID on PostgreSQL in production.
    """
    impl = CHAR(36)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            return str(value)
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            return uuid.UUID(value) if not isinstance(value, uuid.UUID) else value
        return value


# ─── Custom Type: JSON that works on SQLite ───

class JSONType(TypeDecorator):
    """JSON type that stores as TEXT on SQLite."""
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            return json.dumps(value)
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            return json.loads(value)
        return value


class Base(DeclarativeBase):
    """SQLAlchemy declarative base for all models."""
    pass


class User(Base):
    """
    Core user table. One user can have multiple auth providers linked.
    Data persists permanently — logging in again after months loads
    the existing account, never creates a new one.
    """
    __tablename__ = "users"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    avatar_url = Column(Text, nullable=True)
    status = Column(String(20), default="active", nullable=False)
    created_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc),
    )
    updated_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    last_login_at = Column(DateTime, nullable=True)

    # Relationships
    auth_accounts = relationship(
        "AuthAccount", back_populates="user", cascade="all, delete-orphan"
    )
    api_credentials = relationship(
        "ApiCredential", back_populates="user", cascade="all, delete-orphan"
    )
    audit_logs = relationship("AuditLog", back_populates="user")


class AuthAccount(Base):
    """
    Linked OAuth provider accounts. Same user can have Google + GitHub + Discord
    all linked to one HackForge account.
    """
    __tablename__ = "auth_accounts"
    __table_args__ = (
        UniqueConstraint("provider", "provider_user_id", name="uq_provider_provider_user_id"),
        Index("idx_auth_accounts_user", "user_id"),
    )

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False,
    )
    provider = Column(String(20), nullable=False)  # google | github | discord
    provider_user_id = Column(String(255), nullable=False)
    provider_email = Column(String(255), nullable=True)
    provider_data = Column(JSONType, nullable=True)  # raw profile payload
    access_token_encrypted = Column(LargeBinary, nullable=True)
    refresh_token_encrypted = Column(LargeBinary, nullable=True)
    token_expires_at = Column(DateTime, nullable=True)
    created_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc),
    )
    last_login_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="auth_accounts")


class ApiCredential(Base):
    """
    User's BYOK (Bring Your Own Key) API credentials.
    Keys are encrypted at rest using AES-256-GCM with a master key.
    The plaintext is NEVER stored, logged, or returned to the frontend.
    key_hint stores only the last 4 characters for display: "7X91"
    """
    __tablename__ = "api_credentials"
    __table_args__ = (
        Index("idx_api_credentials_user", "user_id"),
        Index("idx_api_credentials_provider", "user_id", "provider"),
    )

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False,
    )
    provider = Column(String(50), nullable=False)
    key_name = Column(String(100), nullable=False)
    encrypted_secret = Column(LargeBinary, nullable=False)
    key_hint = Column(String(10), nullable=True)
    status = Column(String(20), default="active", nullable=False)
    created_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc),
    )
    updated_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    last_used_at = Column(DateTime, nullable=True)
    last_tested_at = Column(DateTime, nullable=True)
    test_status = Column(String(20), nullable=True)

    # Relationships
    user = relationship("User", back_populates="api_credentials")


class AuditLog(Base):
    """
    Every important action gets recorded here for accountability.
    """
    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("idx_audit_logs_user", "user_id"),
        Index("idx_audit_logs_action", "action", "timestamp"),
    )

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    resource_type = Column(String(50), nullable=True)
    resource_id = Column(GUID(), nullable=True)
    details = Column(JSONType, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    timestamp = Column(
        DateTime, default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user = relationship("User", back_populates="audit_logs")


# ─── SQLite FK enforcement ──────────────────────────────────────

@event.listens_for(Base.metadata, "after_create")
def _enable_sqlite_fk(target, connection, **kwargs):
    """Enable foreign key enforcement for SQLite."""
    if connection.dialect.name == "sqlite":
        connection.execute(text("PRAGMA foreign_keys=ON"))
