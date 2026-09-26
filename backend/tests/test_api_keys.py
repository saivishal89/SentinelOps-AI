import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import ApiCredential, AuditLog
from app.services.key_manager import decrypt_key


@pytest.mark.asyncio
async def test_add_api_key(client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
    payload = {
        "provider": "openai",
        "key_name": "My Development OpenAI Key",
        "api_key": "sk-proj-test1234567890xyz",
    }
    response = await client.post("/api-keys/", json=payload, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()

    assert data["provider"] == "openai"
    assert data["key_name"] == "My Development OpenAI Key"
    assert data["key_hint"] == "0xyz"
    assert data["status"] == "active"
    # Security check: plaintext API key must never appear in response
    assert "sk-proj-test1234567890xyz" not in str(data)

    # Verify key is stored encrypted in database
    result = await db_session.execute(
        select(ApiCredential).where(ApiCredential.id == data["id"])
    )
    cred = result.scalar_one()
    assert cred.encrypted_secret != payload["api_key"].encode("utf-8")
    assert decrypt_key(cred.encrypted_secret) == payload["api_key"]


@pytest.mark.asyncio
async def test_list_api_keys(client: AsyncClient, auth_headers: dict):
    # Add a key first
    await client.post(
        "/api-keys/",
        json={"provider": "anthropic", "key_name": "Claude Key", "api_key": "sk-ant-test9876"},
        headers=auth_headers,
    )

    response = await client.get("/api-keys/", headers=auth_headers)
    assert response.status_code == 200
    keys = response.json()
    assert len(keys) >= 1
    key_entry = [k for k in keys if k["provider"] == "anthropic"][0]
    assert key_entry["key_hint"] == "9876"
    assert "encrypted_key" not in key_entry


@pytest.mark.asyncio
async def test_revoke_api_key(client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
    add_resp = await client.post(
        "/api-keys/",
        json={"provider": "google_ai", "key_name": "Gemini Key", "api_key": "AIzaSyTest1234"},
        headers=auth_headers,
    )
    key_id = add_resp.json()["id"]

    revoke_resp = await client.delete(f"/api-keys/{key_id}", headers=auth_headers)
    assert revoke_resp.status_code == 200

    # Verify status changed to revoked in database
    result = await db_session.execute(
        select(ApiCredential).where(ApiCredential.id == key_id)
    )
    cred = result.scalar_one()
    assert cred.status == "revoked"
