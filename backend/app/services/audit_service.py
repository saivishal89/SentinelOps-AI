"""
Audit service — records every important action for accountability.

Actions include: AUTH_LOGIN, AUTH_UNLINK_PROVIDER, USER_PROFILE_UPDATE,
API_KEY_ADD, API_KEY_TEST, API_KEY_REVOKE, etc.
"""
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.models import AuditLog


async def create_audit_log(
    db: AsyncSession,
    action: str,
    user_id: UUID | None = None,
    resource_type: str | None = None,
    resource_id: UUID | None = None,
    details: dict | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> AuditLog:
    """
    Record an auditable action.

    Example:
        await create_audit_log(
            db=db,
            user_id=user.id,
            action="API_KEY_ADD",
            resource_type="api_credential",
            resource_id=credential.id,
            details={"provider": "openai", "key_name": "My Key"},
        )
    """
    log = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(log)
    await db.flush()
    return log
