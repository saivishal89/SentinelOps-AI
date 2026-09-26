"""
Incidents and Operations API Router for HackForge / SentinelOps Command Center.
Provides endpoints for AI Incident Investigation, telemetry, evidence streams,
evaluations, and human-in-the-loop remediation lifecycle.
"""
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/api", tags=["incidents"])


# ─── Pydantic Schemas ──────────────────────────────────────────

class HealthStatus(BaseModel):
    status: str = "ok"


class DashboardSummary(BaseModel):
    systemHealth: float = 98.4
    activeIncidents: int = 1
    servicesHealthy: int = 4
    servicesTotal: int = 5
    aiConfidence: int = 94
    errorRate: float = 2.1
    recoveryTime: int = 45


class Incident(BaseModel):
    id: str
    title: str
    severity: str
    status: str
    workflowState: str
    affectedServices: List[str]
    rootCause: str
    recommendation: str
    risk: str
    confidence: float
    reversible: bool
    rollbackAvailable: bool
    approvedBy: Optional[str] = None
    outcome: Optional[str] = None
    createdAt: str
    updatedAt: str


class IncidentActionInput(BaseModel):
    actor: Optional[str] = "Alex Rivera"
    note: Optional[str] = None


class LogEntry(BaseModel):
    timestamp: str
    service: str
    level: str
    message: str


class IncidentMetrics(BaseModel):
    cpu: float
    memory: float
    latency: float
    errorRate: float
    connections: int


class TraceSpan(BaseModel):
    service: str
    dependency: str
    latency: int
    status: str


class TimelineEvent(BaseModel):
    timestamp: str
    type: str
    description: str
    service: str
    status: str


class AuditEvent(BaseModel):
    id: str
    timestamp: str
    actor: str
    action: str
    target: str
    result: str
    risk: str
    incidentId: str


class EvaluationScenario(BaseModel):
    id: str
    name: str
    groundTruth: str
    agentRootCause: str
    baselineRootCause: str
    agentConfidence: int
    diagnosisSeconds: int
    remediationSuccess: bool


class EvaluationMetrics(BaseModel):
    rootCauseAccuracy: float
    timeToDiagnosis: int
    remediationSuccessRate: float
    falsePositiveRate: float
    confidenceCalibration: int


class EvaluationResults(BaseModel):
    scenarios: List[EvaluationScenario]
    agent: EvaluationMetrics
    baseline: EvaluationMetrics


# ─── In-Memory Operational State ────────────────────────────────

now_str = datetime.now(timezone.utc).isoformat()

INCIDENTS_STORE: dict[str, Incident] = {
    "INC-1042": Incident(
        id="INC-1042",
        title="Payment API Latency Spike & Pool Saturation",
        severity="CRITICAL",
        status="AWAITING APPROVAL",
        workflowState="awaiting-approval",
        affectedServices=["Payment Service", "Database", "API Gateway"],
        rootCause="Redis connection pool constraint introduced in deployment v2.4.1 caused worker exhaustion under steady 1.2k rps load.",
        recommendation="Rollback deployment v2.4.1 to v2.4.0 (restore 500 pool connections)",
        risk="LOW",
        confidence=0.94,
        reversible=True,
        rollbackAvailable=True,
        approvedBy=None,
        outcome=None,
        createdAt=now_str,
        updatedAt=now_str,
    )
}

AUDIT_LOG_STORE: List[AuditEvent] = [
    AuditEvent(
        id="aud-1",
        timestamp="10:43:35",
        actor="Remediation Agent",
        action="Prepared reversible rollback proposal",
        target="checkout-api",
        result="success",
        risk="low",
        incidentId="INC-1042",
    ),
    AuditEvent(
        id="aud-2",
        timestamp="10:43:20",
        actor="Root Cause Agent",
        action="Bayesian hypothesis confidence crossed 90%",
        target="INC-1042",
        result="success",
        risk="low",
        incidentId="INC-1042",
    ),
    AuditEvent(
        id="aud-3",
        timestamp="10:42:25",
        actor="Metrics Agent",
        action="Detected P95 latency surge to 842ms",
        target="checkout-api",
        result="success",
        risk="medium",
        incidentId="INC-1042",
    ),
]


# ─── Endpoints ─────────────────────────────────────────────────

@router.get("/healthz", response_model=HealthStatus)
async def get_healthz():
    return HealthStatus(status="ok")


@router.get("/dashboard/summary", response_model=DashboardSummary)
async def get_dashboard_summary():
    return DashboardSummary(
        systemHealth=98.4,
        activeIncidents=len([i for i in INCIDENTS_STORE.values() if i.workflowState != "verified"]),
        servicesHealthy=4,
        servicesTotal=5,
        aiConfidence=94,
        errorRate=2.1,
        recoveryTime=45,
    )


@router.get("/incidents", response_model=List[Incident])
async def get_incidents():
    return list(INCIDENTS_STORE.values())


@router.get("/incidents/{incident_id}", response_model=Incident)
async def get_incident(incident_id: str):
    if incident_id not in INCIDENTS_STORE:
        raise HTTPException(status_code=404, detail="Incident not found")
    return INCIDENTS_STORE[incident_id]


@router.get("/incidents/{incident_id}/logs", response_model=List[LogEntry])
async def get_incident_logs(incident_id: str):
    return [
        LogEntry(timestamp="10:41:22", service="checkout-api", level="ERROR", message="redis pool acquire timeout after 250ms (active: 100/100)"),
        LogEntry(timestamp="10:41:24", service="checkout-api", level="WARN", message="failing back to direct query; read latency elevated"),
        LogEntry(timestamp="10:41:28", service="payment-worker", level="FATAL", message="circuit breaker tripped for redis-primary:6379"),
        LogEntry(timestamp="10:42:01", service="api-gateway", level="WARN", message="504 gateway timeout on POST /api/v1/checkout"),
    ]


@router.get("/incidents/{incident_id}/metrics", response_model=IncidentMetrics)
async def get_incident_metrics(incident_id: str):
    return IncidentMetrics(
        cpu=82.5,
        memory=71.2,
        latency=842.0,
        errorRate=4.6,
        connections=1842,
    )


@router.get("/incidents/{incident_id}/traces", response_model=List[TraceSpan])
async def get_incident_traces(incident_id: str):
    return [
        TraceSpan(service="checkout-api", dependency="redis-primary", latency=842, status="degraded"),
        TraceSpan(service="payments-worker", dependency="checkout-api", latency=284, status="degraded"),
        TraceSpan(service="api-gateway", dependency="checkout-api", latency=910, status="degraded"),
        TraceSpan(service="edge-router", dependency="api-gateway", latency=950, status="healthy"),
    ]


@router.get("/incidents/{incident_id}/timeline", response_model=List[TimelineEvent])
async def get_incident_timeline(incident_id: str):
    return [
        TimelineEvent(timestamp="10:41:00", type="alert", description="Error rate & latency threshold breached in checkout-api", service="checkout-api", status="detected"),
        TimelineEvent(timestamp="10:42:15", type="investigation", description="Multi-agent swarm mobilized by Orchestrator", service="orchestrator", status="complete"),
        TimelineEvent(timestamp="10:42:42", type="evidence", description="Log Agent correlated Redis pool exhaustion logs", service="log-agent", status="complete"),
        TimelineEvent(timestamp="10:43:02", type="finding", description="Deployment Agent pinpointed commit 8f42c19 constraint", service="deployment-agent", status="complete"),
        TimelineEvent(timestamp="10:43:35", type="remediation", description="Remediation Agent prepared rollback to v2.4.0", service="remediation-agent", status="pending"),
    ]


@router.post("/incidents/{incident_id}/investigate", response_model=Incident)
async def investigate_incident(incident_id: str):
    if incident_id not in INCIDENTS_STORE:
        raise HTTPException(status_code=404, detail="Incident not found")
    inc = INCIDENTS_STORE[incident_id]
    inc.workflowState = "investigating"
    inc.status = "INVESTIGATING"
    inc.updatedAt = datetime.now(timezone.utc).isoformat()
    return inc


@router.post("/incidents/{incident_id}/recommendation", response_model=Incident)
async def generate_recommendation(incident_id: str):
    if incident_id not in INCIDENTS_STORE:
        raise HTTPException(status_code=404, detail="Incident not found")
    inc = INCIDENTS_STORE[incident_id]
    inc.workflowState = "awaiting-approval"
    inc.status = "AWAITING APPROVAL"
    inc.confidence = 0.96
    inc.updatedAt = datetime.now(timezone.utc).isoformat()
    return inc


@router.post("/incidents/{incident_id}/approve", response_model=Incident)
async def approve_incident(incident_id: str, action: IncidentActionInput):
    if incident_id not in INCIDENTS_STORE:
        raise HTTPException(status_code=404, detail="Incident not found")
    inc = INCIDENTS_STORE[incident_id]
    inc.workflowState = "approved"
    inc.status = "APPROVED"
    inc.approvedBy = action.actor or "Alex Rivera"
    inc.updatedAt = datetime.now(timezone.utc).isoformat()
    AUDIT_LOG_STORE.insert(0, AuditEvent(
        id=f"aud-{len(AUDIT_LOG_STORE)+1}",
        timestamp=datetime.now(timezone.utc).strftime("%H:%M:%S"),
        actor=inc.approvedBy,
        action="Approved remediation action",
        target=incident_id,
        result="success",
        risk="low",
        incidentId=incident_id,
    ))
    return inc


@router.post("/incidents/{incident_id}/reject", response_model=Incident)
async def reject_incident(incident_id: str, action: IncidentActionInput):
    if incident_id not in INCIDENTS_STORE:
        raise HTTPException(status_code=404, detail="Incident not found")
    inc = INCIDENTS_STORE[incident_id]
    inc.workflowState = "rejected"
    inc.status = "REJECTED"
    inc.updatedAt = datetime.now(timezone.utc).isoformat()
    return inc


@router.post("/incidents/{incident_id}/execute", response_model=Incident)
async def execute_incident(incident_id: str):
    if incident_id not in INCIDENTS_STORE:
        raise HTTPException(status_code=404, detail="Incident not found")
    inc = INCIDENTS_STORE[incident_id]
    inc.workflowState = "executing"
    inc.status = "EXECUTING"
    inc.updatedAt = datetime.now(timezone.utc).isoformat()
    return inc


@router.post("/incidents/{incident_id}/rollback", response_model=Incident)
async def rollback_incident(incident_id: str):
    if incident_id not in INCIDENTS_STORE:
        raise HTTPException(status_code=404, detail="Incident not found")
    inc = INCIDENTS_STORE[incident_id]
    inc.workflowState = "rolled_back"
    inc.status = "ROLLED BACK"
    inc.updatedAt = datetime.now(timezone.utc).isoformat()
    return inc


@router.post("/incidents/{incident_id}/verify", response_model=Incident)
async def verify_incident(incident_id: str):
    if incident_id not in INCIDENTS_STORE:
        raise HTTPException(status_code=404, detail="Incident not found")
    inc = INCIDENTS_STORE[incident_id]
    inc.workflowState = "verified"
    inc.status = "VERIFIED"
    inc.outcome = "Recovery verified. Error rate returned to 0.02% baseline."
    inc.updatedAt = datetime.now(timezone.utc).isoformat()
    return inc


@router.get("/audit", response_model=List[AuditEvent])
async def get_audit_log():
    return AUDIT_LOG_STORE


@router.get("/evaluations", response_model=EvaluationResults)
async def get_evaluations():
    return EvaluationResults(
        scenarios=[
            EvaluationScenario(
                id="checkout-pool",
                name="Connection pool regression",
                groundTruth="pool exhaustion",
                agentRootCause="pool exhaustion",
                baselineRootCause="redis saturation",
                agentConfidence=94,
                diagnosisSeconds=186,
                remediationSuccess=True,
            ),
            EvaluationScenario(
                id="cache-eviction",
                name="Cache eviction storm",
                groundTruth="eviction policy",
                agentRootCause="eviction policy",
                baselineRootCause="memory pressure",
                agentConfidence=88,
                diagnosisSeconds=241,
                remediationSuccess=True,
            ),
            EvaluationScenario(
                id="deadlock-cascade",
                name="PostgreSQL advisory lock cascade",
                groundTruth="lock contention",
                agentRootCause="lock contention",
                baselineRootCause="slow query",
                agentConfidence=96,
                diagnosisSeconds=142,
                remediationSuccess=True,
            ),
        ],
        agent=EvaluationMetrics(
            rootCauseAccuracy=91.4,
            timeToDiagnosis=212,
            remediationSuccessRate=89.2,
            falsePositiveRate=4.8,
            confidenceCalibration=93,
        ),
        baseline=EvaluationMetrics(
            rootCauseAccuracy=67.2,
            timeToDiagnosis=488,
            remediationSuccessRate=61.8,
            falsePositiveRate=16.7,
            confidenceCalibration=71,
        ),
    )


@router.post("/evaluations/run", response_model=EvaluationResults)
async def run_evaluations():
    return await get_evaluations()
