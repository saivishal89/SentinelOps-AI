"""
User service — handles find-or-create logic with email-based account linking.

Account linking strategy:
1. If auth_account exists for provider+provider_user_id → return existing user
2. If user with same email exists → link new provider to existing account
3. Otherwise → create new user + auth_account

This means: same person, multiple login providers, ONE HackForge account.
"""
from datetime import datetime, timezone
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database.models import User, AuthAccount


async def find_or_create_user(
    db: AsyncSession,
    provider: str,
    provider_user_id: str,
    email: str,
    name: str,
    avatar_url: str | None,
    provider_data: dict | None = None,
) -> User:
    """
    Find existing user or create new one. Links multiple providers to one account.

    Returns the User object (existing or newly created).
    """
    now = datetime.now(timezone.utc)

    # 1. Check existing auth account for this specific provider login
    result = await db.execute(
        select(AuthAccount).where(
            AuthAccount.provider == provider,
            AuthAccount.provider_user_id == provider_user_id,
        )
    )
    existing_auth = result.scalar_one_or_none()

    if existing_auth:
        # Returning user — just update login timestamps
        user_result = await db.execute(
            select(User).where(User.id == existing_auth.user_id)
        )
        user = user_result.scalar_one()
        user.last_login_at = now
        existing_auth.last_login_at = now
        await db.flush()
        return user

    # 2. Check if a user with this email already exists (account linking)
    user_result = await db.execute(select(User).where(User.email == email))
    existing_user = user_result.scalar_one_or_none()

    if existing_user:
        # Link new provider to existing account
        auth_account = AuthAccount(
            user_id=existing_user.id,
            provider=provider,
            provider_user_id=provider_user_id,
            provider_email=email,
            provider_data=provider_data,
            last_login_at=now,
        )
        db.add(auth_account)
        existing_user.last_login_at = now
        await db.flush()
        return existing_user

    # 3. Brand new user — create user + auth_account
    user = User(
        email=email,
        name=name,
        avatar_url=avatar_url,
        last_login_at=now,
    )
    db.add(user)
    await db.flush()  # Get user.id assigned

    auth_account = AuthAccount(
        user_id=user.id,
        provider=provider,
        provider_user_id=provider_user_id,
        provider_email=email,
        provider_data=provider_data,
        last_login_at=now,
    )
    db.add(auth_account)
    await db.flush()

    return user


async def get_user_by_id(db: AsyncSession, user_id: str | UUID) -> User | None:
    """Get a user by their UUID."""
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()
