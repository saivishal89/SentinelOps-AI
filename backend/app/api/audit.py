"""
Audit API routes — view audit logs for accountability.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

from app.database.connection import get_db
from app.database.models import User, AuditLog
from app.api.deps import get_current_user

router = APIRouter(prefix="/audit", tags=["audit"])


# ─── Pydantic Schemas ──────────────────────────────────────────

class AuditLogResponse(BaseModel):
    """Single audit log entry."""
    id: UUID
    action: str
    resource_type: str | None
    resource_id: UUID | None
    details: dict | None
    ip_address: str | None
    timestamp: datetime

    model_config = {"from_attributes": True}


class PaginatedAuditLogs(BaseModel):
    """Paginated audit log response."""
    items: list[AuditLogResponse]
    total: int
    page: int
    page_size: int
    pages: int


# ─── Endpoints ──────────────────────────────────────────────────

@router.get("/logs", response_model=PaginatedAuditLogs)
async def get_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    action: str | None = Query(None, description="Filter by action type (e.g., AUTH_LOGIN, API_KEY_ADD)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get paginated audit logs for the current user.

    Supports filtering by action type:
    - AUTH_LOGIN
    - AUTH_UNLINK_PROVIDER
    - USER_PROFILE_UPDATE
    - API_KEY_ADD
    - API_KEY_TEST
    - API_KEY_REVOKE
    """
    # Build base queries
    query = select(AuditLog).where(AuditLog.user_id == current_user.id)
    count_query = select(func.count()).select_from(AuditLog).where(
        AuditLog.user_id == current_user.id
    )

    # Apply action filter if provided
    if action:
        query = query.where(AuditLog.action == action)
        count_query = count_query.where(AuditLog.action == action)

    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Get paginated results
    offset = (page - 1) * page_size
    query = query.order_by(AuditLog.timestamp.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    items = result.scalars().all()

    return PaginatedAuditLogs(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size if total > 0 else 0,
    )
