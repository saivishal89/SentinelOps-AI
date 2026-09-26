import jwt
from datetime import datetime, timedelta, timezone
from uuid import UUID
from app.config import settings

ALGORITHM = "HS256"


def create_access_token(user_id: UUID, email: str, name: str) -> str:
    """
    Create a short-lived JWT access token (1 hour default).
    Sent as Authorization: Bearer <token> header.
    """
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "email": email,
        "name": name,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(user_id: UUID) -> str:
    """
    Create a long-lived JWT refresh token (30 days default).
    Stored as HttpOnly cookie, used to get new access tokens.
    """
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "type": "refresh",
        "iat": now,
        "exp": now + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> dict:
    """
    Verify and decode a JWT token.
    Raises jwt.ExpiredSignatureError if expired.
    Raises jwt.InvalidTokenError if invalid.
    """
    return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[ALGORITHM])
