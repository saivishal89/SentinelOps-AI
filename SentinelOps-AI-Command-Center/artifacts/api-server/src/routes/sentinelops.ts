import { Router, type IRouter } from "express";
import {
  ApproveIncidentBody,
  ApproveIncidentResponse,
  GetAuditResponse,
  GetDashboardSummaryResponse,
  GetEvaluationsResponse,
  GetIncidentLogsResponse,
  GetIncidentMetricsResponse,
  GetIncidentResponse,
  GetIncidentTimelineResponse,
  GetIncidentTracesResponse,
  GetIncidentsResponse,
  InvestigateIncidentResponse,
  GenerateRecommendationResponse,
  ExecuteIncidentResponse,
  RejectIncidentResponse,
  RejectIncidentBody,
  RollbackIncidentResponse,
  RunEvaluationsResponse,
  VerifyIncidentResponse,
} from "@workspace/api-zod";

type Incident = {
  id: string;
  title: string;
  severity: string;
  status: string;
  workflowState: string;
  affectedServices: string[];
  rootCause: string;
  recommendation: string;
  risk: string;
  confidence: number;
  reversible: boolean;
  rollbackAvailable: boolean;
  approvedBy: string | null;
  outcome: string | null;
  createdAt: string;
  updatedAt: string;
};

type AuditEvent = {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  result: string;
  risk: string;
  incidentId: string;
};

const incident: Incident = {
  id: "INC-1042",
  title: "Payment API Latency Spike",
  severity: "CRITICAL",
  status: "AWAITING APPROVAL",
  workflowState: "awaiting-approval",
  affectedServices: ["Payment Service", "Database", "API Gateway"],
  rootCause: "Database performance regression caused by deployment v2.4.1.",
  recommendation: "Rollback deployment v2.4.1",
  risk: "MEDIUM",
  confidence: 86,
  reversible: true,
  rollbackAvailable: true,
  approvedBy: null,
  outcome: null,
  createdAt: "2026-09-26T10:42:11Z",
  updatedAt: "2026-09-26T10:45:34Z",
};

const logs = [
  { timestamp: "10:42:12", service: "PaymentService", level: "ERROR", message: "Database timeout" },
  { timestamp: "10:42:14", service: "PaymentService", level: "ERROR", message: "Retry failed" },
  { timestamp: "10:42:16", service: "Database", level: "WARN", message: "CPU above threshold" },
  { timestamp: "10:43:02", service: "APIGateway", level: "INFO", message: "Upstream latency threshold exceeded" },
];

const metrics = {
  cpu: 98,
  memory: 81,
  latency: 4.2,
  errorRate: 34,
  connections: 98,
};

const traces = [
  { service: "API Gateway", dependency: "Payment Service", latency: 4120, status: "degraded" },
  { service: "Payment Service", dependency: "Database", latency: 3980, status: "degraded" },
  { service: "Database", dependency: "Postgres primary", latency: 3750, status: "degraded" },
];

const timeline = [
  { timestamp: "10:40", type: "Deployment detected", description: "Version v2.4.1 deployed", service: "Release Controller", status: "completed" },
  { timestamp: "10:42", type: "Incident detected", description: "Payment API error rate exceeded threshold", service: "Payment Service", status: "completed" },
  { timestamp: "10:44", type: "AI investigation started", description: "Evidence collection agents activated", service: "SentinelOps AI", status: "completed" },
  { timestamp: "10:45", type: "Root cause identified", description: "Database performance regression after deployment", service: "Root Cause Agent", status: "completed" },
  { timestamp: "10:46", type: "Human approval", description: "Rollback awaiting operator approval", service: "Command Center", status: "waiting" },
  { timestamp: "10:46", type: "Rollback executed", description: "Rollback v2.4.1 → v2.4.0", service: "Sandbox", status: "pending" },
  { timestamp: "10:47", type: "Health restored", description: "Verification pending", service: "Verification Agent", status: "pending" },
];

const audit: AuditEvent[] = [
  { id: "AUD-001", timestamp: "10:40:02", actor: "Release Controller", action: "Deployment detected", target: "v2.4.1", result: "Completed", risk: "LOW", incidentId: "INC-1042" },
  { id: "AUD-002", timestamp: "10:42:11", actor: "Incident Agent", action: "Incident created", target: "Payment API", result: "Completed", risk: "LOW", incidentId: "INC-1042" },
  { id: "AUD-003", timestamp: "10:44:02", actor: "Investigation Agent", action: "AI investigation started", target: "INC-1042", result: "Completed", risk: "LOW", incidentId: "INC-1042" },
  { id: "AUD-004", timestamp: "10:45:18", actor: "Root Cause Agent", action: "Root cause identified", target: "Database regression", result: "86% confidence", risk: "MEDIUM", incidentId: "INC-1042" },
  { id: "AUD-005", timestamp: "10:45:34", actor: "Remediation Agent", action: "Recommendation generated", target: "Rollback v2.4.1", result: "Awaiting approval", risk: "MEDIUM", incidentId: "INC-1042" },
];

const evaluationScenarios = [
  { id: "database-overload", name: "Database Overload", groundTruth: "Database performance regression", agentRootCause: "Database performance regression", baselineRootCause: "Database performance regression", agentConfidence: 93, diagnosisSeconds: 18, remediationSuccess: true },
  { id: "memory-leak", name: "Memory Leak", groundTruth: "Memory leak", agentRootCause: "Memory leak", baselineRootCause: "Database performance regression", agentConfidence: 82, diagnosisSeconds: 24, remediationSuccess: true },
  { id: "failed-deployment", name: "Failed Deployment", groundTruth: "Failed deployment", agentRootCause: "Failed deployment", baselineRootCause: "Network latency", agentConfidence: 89, diagnosisSeconds: 16, remediationSuccess: true },
  { id: "network-latency", name: "Network Latency", groundTruth: "Network latency", agentRootCause: "Network latency", baselineRootCause: "Network latency", agentConfidence: 78, diagnosisSeconds: 31, remediationSuccess: true },
  { id: "dependency-failure", name: "Dependency Failure", groundTruth: "Dependency failure", agentRootCause: "Dependency failure", baselineRootCause: "API timeout", agentConfidence: 74, diagnosisSeconds: 28, remediationSuccess: false },
  { id: "api-timeout", name: "API Timeout", groundTruth: "API timeout", agentRootCause: "API timeout", baselineRootCause: "API timeout", agentConfidence: 91, diagnosisSeconds: 14, remediationSuccess: true },
];

const evaluationMetrics = (agent: boolean) => {
  const correct = evaluationScenarios.filter((scenario) =>
    agent
      ? scenario.groundTruth === scenario.agentRootCause
      : scenario.groundTruth === scenario.baselineRootCause,
  ).length;
  const falsePositives = evaluationScenarios.length - correct;
  const successRate = agent
    ? evaluationScenarios.filter((scenario) => scenario.remediationSuccess).length
    : 4;
  const averageSeconds = agent
    ? evaluationScenarios.reduce((total, scenario) => total + scenario.diagnosisSeconds, 0) / evaluationScenarios.length
    : 42;
  const calibration = agent
    ? evaluationScenarios.reduce((total, scenario) => total + (scenario.groundTruth === scenario.agentRootCause ? scenario.agentConfidence : 100 - scenario.agentConfidence), 0) / evaluationScenarios.length
    : 62;
  return {
    rootCauseAccuracy: Math.round((correct / evaluationScenarios.length) * 100),
    timeToDiagnosis: Math.round(averageSeconds),
    remediationSuccessRate: Math.round((successRate / evaluationScenarios.length) * 100),
    falsePositiveRate: Math.round((falsePositives / evaluationScenarios.length) * 100),
    confidenceCalibration: Math.round(calibration),
  };
};

const router: IRouter = Router();

function addAudit(actor: string, action: string, target: string, result: string, risk = "MEDIUM") {
  audit.unshift({
    id: `AUD-${String(audit.length + 1).padStart(3, "0")}`,
    timestamp: new Date().toISOString().slice(11, 19),
    actor,
    action,
    target,
    result,
    risk,
    incidentId: incident.id,
  });
}

function updateIncident(patch: Partial<Incident>) {
  Object.assign(incident, patch, { updatedAt: new Date().toISOString() });
  return incident;
}

router.get("/dashboard/summary", (_req, res) => {
  const data = {
    systemHealth: incident.workflowState === "resolved" || incident.workflowState === "restored" ? 99.8 : 98.4,
    activeIncidents: incident.workflowState === "resolved" || incident.workflowState === "restored" ? 0 : 1,
    servicesHealthy: incident.workflowState === "resolved" || incident.workflowState === "restored" ? 5 : 3,
    servicesTotal: 5,
    aiConfidence: incident.confidence,
    errorRate: incident.workflowState === "resolved" || incident.workflowState === "restored" ? 2 : 2.1,
    recoveryTime: incident.workflowState === "resolved" || incident.workflowState === "restored" ? 47 : 0,
  };
  res.json(GetDashboardSummaryResponse.parse(data));
});

router.get("/incidents", (_req, res) => res.json(GetIncidentsResponse.parse([incident])));
router.get("/incidents/:id", (req, res) => {
  if (req.params.id !== incident.id) return res.status(404).json({ error: "Incident not found" });
  return res.json(GetIncidentResponse.parse(incident));
});
router.get("/incidents/:id/logs", (_req, res) => res.json(GetIncidentLogsResponse.parse(logs)));
router.get("/incidents/:id/metrics", (_req, res) => res.json(GetIncidentMetricsResponse.parse(metrics)));
router.get("/incidents/:id/traces", (_req, res) => res.json(GetIncidentTracesResponse.parse(traces)));
router.get("/incidents/:id/timeline", (_req, res) => res.json(GetIncidentTimelineResponse.parse(timeline)));

router.post("/incidents/:id/investigate", (_req, res) => {
  const next = updateIncident({ status: "INVESTIGATING", workflowState: "analyzing" });
  addAudit("Investigation Agent", "AI investigation started", incident.id, "Evidence collection active", "LOW");
  return res.json(InvestigateIncidentResponse.parse(next));
});

router.post("/incidents/:id/recommendation", (_req, res) => {
  const next = updateIncident({ status: "AWAITING APPROVAL", workflowState: "awaiting-approval" });
  addAudit("Remediation Agent", "Recommendation generated", incident.recommendation, "Awaiting approval");
  return res.json(GenerateRecommendationResponse.parse(next));
});

router.post("/incidents/:id/approve", (req, res) => {
  const body = ApproveIncidentBody.parse(req.body ?? {});
  const next = updateIncident({ status: "APPROVED", workflowState: "approved", approvedBy: body.actor ?? "Alex Morgan" });
  addAudit(body.actor ?? "Alex Morgan", "Human approval received", incident.recommendation, "Approved");
  return res.json(ApproveIncidentResponse.parse(next));
});

router.post("/incidents/:id/reject", (req, res) => {
  const body = RejectIncidentBody.parse(req.body ?? {});
  const next = updateIncident({ status: "REJECTED", workflowState: "rejected", outcome: body.note ?? "Remediation stopped by operator" });
  addAudit(body.actor ?? "Alex Morgan", "Human approval rejected", incident.recommendation, "Rejected");
  return res.json(RejectIncidentResponse.parse(next));
});

router.post("/incidents/:id/execute", (_req, res) => {
  const next = updateIncident({ status: "EXECUTING", workflowState: "executing" });
  addAudit("Execution Agent", "Sandbox rollback executed", "v2.4.1 → v2.4.0", "Running health checks");
  return res.json(ExecuteIncidentResponse.parse(next));
});

router.post("/incidents/:id/rollback", (_req, res) => {
  const next = updateIncident({ status: "ROLLING BACK", workflowState: "rolling-back", outcome: "Previous stable state restored" });
  addAudit("Rollback Agent", "Previous stable state restored", "v2.4.0", "Rollback completed");
  return res.json(RollbackIncidentResponse.parse(next));
});

router.post("/incidents/:id/verify", (_req, res) => {
  const next = updateIncident({ status: "RESOLVED", workflowState: "resolved", outcome: "Health restored" });
  addAudit("Verification Agent", "Health check passed", incident.id, "Incident resolved", "LOW");
  return res.json(VerifyIncidentResponse.parse(next));
});

router.get("/audit", (_req, res) => res.json(GetAuditResponse.parse(audit)));

router.get("/evaluations", (_req, res) => {
  const data = {
    scenarios: evaluationScenarios,
    agent: evaluationMetrics(true),
    baseline: evaluationMetrics(false),
  };
  return res.json(GetEvaluationsResponse.parse(data));
});

router.post("/evaluations/run", (_req, res) => {
  const data = {
    scenarios: evaluationScenarios,
    agent: evaluationMetrics(true),
    baseline: evaluationMetrics(false),
  };
  return res.json(RunEvaluationsResponse.parse(data));
});

export default router;