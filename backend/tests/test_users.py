import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from httpx import AsyncClient

from app.database.models import User, AuthAccount
from app.services.user_service import find_or_create_user


@pytest.mark.asyncio
async def test_find_or_create_new_user(db_session: AsyncSession):
    user = await find_or_create_user(
        db=db_session,
        provider="google",
        provider_user_id="google-12345",
        email="newuser@example.com",
        name="New User",
        avatar_url="https://example.com/avatar.jpg",
    )
    assert user.id is not None
    assert user.email == "newuser@example.com"
    assert user.name == "New User"

    # Verify AuthAccount linked
    result = await db_session.execute(
        select(AuthAccount).where(AuthAccount.user_id == user.id)
    )
    auth_acc = result.scalar_one()
    assert auth_acc.provider == "google"
    assert auth_acc.provider_user_id == "google-12345"


@pytest.mark.asyncio
async def test_find_or_create_account_linking_by_email(db_session: AsyncSession):
    # Step 1: User signs up with Google
    user1 = await find_or_create_user(
        db=db_session,
        provider="google",
        provider_user_id="google-999",
        email="samename@example.com",
        name="Same Person",
        avatar_url="https://example.com/google.jpg",
    )

    # Step 2: Same user later logs in with GitHub using the same email
    user2 = await find_or_create_user(
        db=db_session,
        provider="github",
        provider_user_id="github-888",
        email="samename@example.com",
        name="Same Person GitHub",
        avatar_url="https://example.com/github.jpg",
    )

    # Must be the exact same user ID!
    assert user1.id == user2.id

    # Verify both provider accounts exist
    result = await db_session.execute(
        select(AuthAccount).where(AuthAccount.user_id == user1.id)
    )
    accounts = result.scalars().all()
    assert len(accounts) == 2
    providers = {acc.provider for acc in accounts}
    assert providers == {"google", "github"}


@pytest.mark.asyncio
async def test_get_current_user_profile_api(client: AsyncClient, auth_headers: dict, test_user: User):
    response = await client.get("/users/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == test_user.email
    assert data["name"] == test_user.name
    assert data["status"] == "active"


@pytest.mark.asyncio
async def test_unauthorized_when_no_token(client: AsyncClient):
    response = await client.get("/users/me")
    assert response.status_code == 401 or response.status_code == 403
