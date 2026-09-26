"""
API Key Management routes — BYOK (Bring Your Own Key) system.

Users can add, list, test, and revoke their API keys.
Keys are encrypted at rest using AES-256-GCM.
The full key is NEVER returned to the frontend after storage.
"""
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.providers import get_provider
from app.api.deps import get_current_user
from app.database.connection import get_db
from app.database.models import ApiCredential, User
from app.services.audit_service import create_audit_log
from app.services.key_manager import decrypt_key, encrypt_key, get_key_hint

router = APIRouter(prefix="/api-keys", tags=["api-keys"])


# ─── Pydantic Schemas ──────────────────────────────────────────

class ApiKeyCreate(BaseModel):
    """Request to add a new API key."""
    provider: str  # openai | anthropic | google_ai | github | discord | custom
    key_name: str
    api_key: str  # plaintext — will be encrypted before storage


class ApiKeyResponse(BaseModel):
    """API key info — NEVER includes the actual secret."""
    id: UUID
    provider: str
    key_name: str
    key_hint: str | None
    status: str
    created_at: datetime
    updated_at: datetime
    last_used_at: datetime | None
    last_tested_at: datetime | None
    test_status: str | None

    model_config = {"from_attributes": True}


class ApiKeyTestResult(BaseModel):
    """Result of testing an API key's connectivity."""
    success: bool
    message: str


# ─── Endpoints ──────────────────────────────────────────────────

@router.post("/", response_model=ApiKeyResponse, status_code=201)
async def add_api_key(
    payload: ApiKeyCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Add a new API key. The key is encrypted with AES-256-GCM before storage.
    Only the last 4 characters are saved as a hint for display.
    """
    # Encrypt the key
    encrypted = encrypt_key(payload.api_key)
    hint = get_key_hint(payload.api_key)

    credential = ApiCredential(
        user_id=current_user.id,
        provider=payload.provider,
        key_name=payload.key_name,
        encrypted_secret=encrypted,
        key_hint=hint,
        test_status="untested",
    )
    db.add(credential)
    await db.flush()

    await create_audit_log(
        db=db,
        user_id=current_user.id,
        action="API_KEY_ADD",
        resource_type="api_credential",
        resource_id=credential.id,
        details={"provider": payload.provider, "key_name": payload.key_name},
    )

    return credential


@router.get("/", response_model=list[ApiKeyResponse])
async def list_api_keys(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all API keys for the current user. Never returns actual secrets."""
    result = await db.execute(
        select(ApiCredential)
        .where(ApiCredential.user_id == current_user.id)
        .order_by(ApiCredential.created_at.desc())
    )
    return result.scalars().all()


@router.post("/{key_id}/test", response_model=ApiKeyTestResult)
async def test_api_key(
    key_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Test an API key by making a lightweight call to the provider.
    The key is decrypted temporarily, used for the test, then discarded.
    """
    result = await db.execute(
        select(ApiCredential).where(
            ApiCredential.id == key_id,
            ApiCredential.user_id == current_user.id,
        )
    )
    credential = result.scalar_one_or_none()

    if not credential:
        raise HTTPException(status_code=404, detail="API key not found")

    if credential.status != "active":
        raise HTTPException(status_code=400, detail="API key is not active")

    # Decrypt and test
    plaintext_key = decrypt_key(credential.encrypted_secret)

    try:
        provider = get_provider(credential.provider)
        await provider.test_connection(plaintext_key)
        credential.test_status = "success"
        message = f"{credential.provider} key is valid and working"
    except ValueError:
        # Unknown provider — can't test programmatically
        credential.test_status = "untested"
        message = f"No automated test available for provider: {credential.provider}"
    except Exception as e:
        credential.test_status = "failed"
        message = f"Key test failed: {str(e)}"
    finally:
        # Clear plaintext from local scope
        plaintext_key = ""  # noqa: F841

    credential.last_tested_at = datetime.now(timezone.utc)
    await db.flush()

    await create_audit_log(
        db=db,
        user_id=current_user.id,
        action="API_KEY_TEST",
        resource_type="api_credential",
        resource_id=key_id,
        details={"provider": credential.provider, "result": credential.test_status},
    )

    return ApiKeyTestResult(
        success=credential.test_status == "success",
        message=message,
    )


@router.delete("/{key_id}")
async def revoke_api_key(
    key_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Revoke (soft-delete) an API key — marks as 'revoked', doesn't hard-delete."""
    result = await db.execute(
        select(ApiCredential).where(
            ApiCredential.id == key_id,
            ApiCredential.user_id == current_user.id,
        )
    )
    credential = result.scalar_one_or_none()

    if not credential:
        raise HTTPException(status_code=404, detail="API key not found")

    credential.status = "revoked"
    await db.flush()

    await create_audit_log(
        db=db,
        user_id=current_user.id,
        action="API_KEY_REVOKE",
        resource_type="api_credential",
        resource_id=key_id,
        details={"provider": credential.provider, "key_name": credential.key_name},
    )

    return {"message": "API key revoked successfully"}


@router.get("/providers")
async def get_supported_providers():
    """List all supported AI providers for BYOK key management."""
    return {
        "providers": [
            {"id": "openai", "name": "OpenAI", "testable": True},
            {"id": "anthropic", "name": "Anthropic", "testable": True},
            {"id": "google_ai", "name": "Google AI", "testable": True},
            {"id": "github", "name": "GitHub", "testable": False},
            {"id": "discord", "name": "Discord", "testable": False},
            {"id": "custom", "name": "Custom", "testable": False},
        ]
    }
