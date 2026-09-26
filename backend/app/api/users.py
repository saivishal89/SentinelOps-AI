"""
User API routes — profile management and linked accounts.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

from app.database.connection import get_db
from app.database.models import User, AuthAccount
from app.api.deps import get_current_user
from app.services.audit_service import create_audit_log

router = APIRouter(prefix="/users", tags=["users"])


# ─── Pydantic Schemas ──────────────────────────────────────────

class UserProfile(BaseModel):
    """User profile response — returned by GET /users/me"""
    id: UUID
    email: str
    name: str
    avatar_url: str | None
    status: str
    created_at: datetime
    last_login_at: datetime | None

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    """User profile update request — sent to PATCH /users/me"""
    name: str | None = None
    avatar_url: str | None = None


class LinkedAccount(BaseModel):
    """Linked OAuth provider account — returned by GET /users/me/accounts"""
    id: UUID
    provider: str
    provider_email: str | None
    created_at: datetime
    last_login_at: datetime | None

    model_config = {"from_attributes": True}


# ─── Endpoints ──────────────────────────────────────────────────

@router.get("/me", response_model=UserProfile)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user's profile."""
    return current_user


@router.patch("/me", response_model=UserProfile)
async def update_me(
    update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update current user's profile (name, avatar)."""
    if update.name is not None:
        current_user.name = update.name
    if update.avatar_url is not None:
        current_user.avatar_url = update.avatar_url

    await db.flush()

    await create_audit_log(
        db=db,
        user_id=current_user.id,
        action="USER_PROFILE_UPDATE",
        resource_type="user",
        resource_id=current_user.id,
        details=update.model_dump(exclude_none=True),
    )

    return current_user


@router.get("/me/accounts", response_model=list[LinkedAccount])
async def get_linked_accounts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all OAuth providers linked to the current user's account."""
    result = await db.execute(
        select(AuthAccount).where(AuthAccount.user_id == current_user.id)
    )
    return result.scalars().all()


@router.delete("/me/accounts/{account_id}")
async def unlink_account(
    account_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Unlink an OAuth provider from the current user's account.
    Must have at least 1 linked account remaining (can't remove last login method).
    """
    # Count linked accounts
    count_result = await db.execute(
        select(func.count()).select_from(AuthAccount).where(
            AuthAccount.user_id == current_user.id
        )
    )
    count = count_result.scalar()

    if count <= 1:
        raise HTTPException(
            status_code=400,
            detail="Cannot unlink last authentication method — you need at least one way to log in",
        )

    # Find the specific account to unlink
    result = await db.execute(
        select(AuthAccount).where(
            AuthAccount.id == account_id,
            AuthAccount.user_id == current_user.id,
        )
    )
    account = result.scalar_one_or_none()

    if not account:
        raise HTTPException(status_code=404, detail="Linked account not found")

    await create_audit_log(
        db=db,
        user_id=current_user.id,
        action="AUTH_UNLINK_PROVIDER",
        resource_type="auth_account",
        resource_id=account_id,
        details={"provider": account.provider},
    )

    await db.delete(account)
    await db.flush()

    return {"message": f"{account.provider} account unlinked successfully"}
