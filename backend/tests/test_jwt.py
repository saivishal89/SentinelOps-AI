import uuid
import pytest
import jwt as pyjwt
from datetime import timedelta
from app.auth.jwt import create_access_token, create_refresh_token, verify_token


def test_create_and_verify_access_token():
    user_id = uuid.uuid4()
    token = create_access_token(user_id, "user@test.com", "Test User")

    payload = verify_token(token)
    assert payload["sub"] == str(user_id)
    assert payload["email"] == "user@test.com"
    assert payload["name"] == "Test User"
    assert payload["type"] == "access"
    assert "exp" in payload


def test_create_and_verify_refresh_token():
    user_id = uuid.uuid4()
    token = create_refresh_token(user_id)

    payload = verify_token(token)
    assert payload["sub"] == str(user_id)
    assert payload["type"] == "refresh"
    assert "exp" in payload


def test_invalid_token_rejected():
    with pytest.raises(pyjwt.InvalidTokenError):
        verify_token("invalid.jwt.token")
