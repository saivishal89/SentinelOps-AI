"""
Auth API routes — OAuth login/callback for Google, GitHub, Discord.
Also handles JWT token refresh and logout.
"""
from fastapi import APIRouter, Request, Depends, HTTPException, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
import jwt as pyjwt

from app.database.connection import get_db
from app.auth.oauth import oauth
from app.auth.jwt import create_access_token, create_refresh_token, verify_token
from app.auth.providers import PROFILE_FETCHERS
from app.services.user_service import find_or_create_user, get_user_by_id
from app.services.audit_service import create_audit_log
from app.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

SUPPORTED_PROVIDERS = ("google", "github", "discord")


@router.get("/{provider}/login")
async def oauth_login(provider: str, request: Request):
    """
    Redirect user to OAuth provider's consent screen.

    Flow: Browser → GET /auth/google/login → 302 to Google → user approves
    """
    if provider not in SUPPORTED_PROVIDERS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported provider: {provider}. Supported: {SUPPORTED_PROVIDERS}",
        )

    client = oauth.create_client(provider)
    redirect_uri = f"{settings.APP_URL}/auth/{provider}/callback"
    return await client.authorize_redirect(request, redirect_uri)


@router.get("/{provider}/callback")
async def oauth_callback(
    provider: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Handle OAuth callback after user approves on provider side.

    Flow:
        Provider redirects to /auth/{provider}/callback?code=xxx
        → Exchange code for access_token
        → Fetch user profile from provider
        → Find or create user (account linking by email)
        → Issue JWT access token + HttpOnly refresh cookie
        → Redirect to frontend with token
    """
    if provider not in SUPPORTED_PROVIDERS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported provider: {provider}",
        )

    client = oauth.create_client(provider)
    token = await client.authorize_access_token(request)
    access_token = token.get("access_token")

    if not access_token:
        raise HTTPException(status_code=400, detail="Failed to get access token from provider")

    # Fetch normalized profile from provider
    fetch_profile = PROFILE_FETCHERS[provider]
    profile = await fetch_profile(access_token)

    if not profile.get("email"):
        raise HTTPException(
            status_code=400,
            detail="Email is required. Please grant email access to your account.",
        )

    # Find or create user (account linking by email)
    user = await find_or_create_user(
        db=db,
        provider=profile["provider"],
        provider_user_id=profile["provider_user_id"],
        email=profile["email"],
        name=profile["name"],
        avatar_url=profile.get("avatar_url"),
        provider_data=profile.get("raw"),
    )

    # Record in audit log
    await create_audit_log(
        db=db,
        user_id=user.id,
        action="AUTH_LOGIN",
        details={"provider": provider},
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    # Issue JWT tokens
    jwt_access = create_access_token(user.id, user.email, user.name)
    jwt_refresh = create_refresh_token(user.id)

    # Redirect to frontend with access token in URL, refresh token as HttpOnly cookie
    response = RedirectResponse(
        url=f"{settings.FRONTEND_URL}/auth/callback?token={jwt_access}"
    )
    response.set_cookie(
        key="refresh_token",
        value=jwt_refresh,
        httponly=True,
        secure=settings.APP_ENV != "development",
        samesite="lax",
        max_age=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/auth/refresh",
    )

    return response


@router.post("/refresh")
async def refresh_token(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Use refresh token (HttpOnly cookie) to get a new access token.
    Frontend calls this when the access token expires.
    """
    refresh = request.cookies.get("refresh_token")
    if not refresh:
        raise HTTPException(status_code=401, detail="No refresh token provided")

    try:
        payload = verify_token(refresh)
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired — please login again")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type — expected refresh token")

    user = await get_user_by_id(db, payload["sub"])
    if not user or user.status != "active":
        raise HTTPException(status_code=401, detail="User not found or account inactive")

    new_access = create_access_token(user.id, user.email, user.name)
    return {"access_token": new_access, "token_type": "bearer"}


@router.post("/logout")
async def logout(response: Response):
    """Clear refresh token cookie — effectively logging the user out."""
    response.delete_cookie("refresh_token", path="/auth/refresh")
    return {"message": "Logged out successfully"}
