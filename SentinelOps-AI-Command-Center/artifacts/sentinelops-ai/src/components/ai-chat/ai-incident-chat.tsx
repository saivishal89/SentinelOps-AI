import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Sparkles,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  Activity,
  FileSearch,
  GitBranch,
  Zap,
  ShieldCheck,
  ArrowRight,
  Send,
  RefreshCw,
  Play,
  RotateCcw,
  Cpu,
  Database,
  Layers,
  Check,
  Clock,
  Eye,
  ChevronRight,
  Flame,
  Radio,
  FileCode2
} from 'lucide-react';

export interface AgentPersona {
  id: string;
  name: string;
  role: string;
  avatarColor: string;
  badgeBg: string;
  badgeText: string;
  icon: React.ElementType;
}

export const AGENT_PERSONAS: Record<string, AgentPersona> = {
  orchestrator: {
    id: 'orchestrator',
    name: 'AIOps Orchestrator',
    role: 'Lead Synthesis & Decision Engine',
    avatarColor: 'bg-purple-600/20 text-purple-400 border border-purple-500/30',
    badgeBg: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
    badgeText: 'Orchestrator',
    icon: Sparkles,
  },
  logs: {
    id: 'logs',
    name: 'Log Analysis Agent',
    role: 'Error Aggregation & Pattern Mining',
    avatarColor: 'bg-amber-600/20 text-amber-400 border border-amber-500/30',
    badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    badgeText: 'Logs Agent',
    icon: FileSearch,
  },
  metrics: {
    id: 'metrics',
    name: 'Metrics & Telemetry Agent',
    role: 'P95 Latency & Anomaly Detection',
    avatarColor: 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30',
    badgeBg: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
    badgeText: 'Metrics Agent',
    icon: Activity,
  },
  traces: {
    id: 'traces',
    name: 'Distributed Trace Agent',
    role: 'RPC Spans & Bottleneck Isolation',
    avatarColor: 'bg-blue-600/20 text-blue-400 border border-blue-500/30',
    badgeBg: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
    badgeText: 'Trace Agent',
    icon: GitBranch,
  },
  deployment: {
    id: 'deployment',
    name: 'Deployment & CI/CD Agent',
    role: 'Release Diff & Container Auditor',
    avatarColor: 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30',
    badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    badgeText: 'Deploy Agent',
    icon: FileCode2,
  },
  rootcause: {
    id: 'rootcause',
    name: 'Root Cause Inference Agent',
    role: 'Bayesian Hypothesis Correlator',
    avatarColor: 'bg-rose-600/20 text-rose-400 border border-rose-500/30',
    badgeBg: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
    badgeText: 'Root Cause Agent',
    icon: Flame,
  },
  remediation: {
    id: 'remediation',
    name: 'Remediation & Safety Agent',
    role: 'Sandbox Validation & Rollback Gate',
    avatarColor: 'bg-teal-600/20 text-teal-400 border border-teal-500/30',
    badgeBg: 'bg-teal-500/10 text-teal-300 border-teal-500/20',
    badgeText: 'Remediation Agent',
    icon: ShieldCheck,
  },
};

export interface ChatMessage {
  id: string;
  agentId?: string;
  type: 'message' | 'handoff' | 'action_card' | 'user';
  text?: string;
  timestamp: string;
  handoffFrom?: string;
  handoffTo?: string;
  handoffReason?: string;
  actionData?: {
    title: string;
    description: string;
    risk: 'LOW' | 'MEDIUM' | 'HIGH';
    reversible: boolean;
    confidence: number;
    actionCmd: string;
    sandboxed: boolean;
  };
  metrics?: { label: string; value: string; delta?: string }[];
  codeBlock?: { language: string; code: string };
}

export interface ActivityStep {
  id: string;
  title: string;
  agent: string;
  status: 'completed' | 'in_progress' | 'pending';
  duration?: string;
  details?: string;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    agentId: 'orchestrator',
    type: 'message',
    timestamp: '10:42:15',
    text: '🚨 P1 Latency Alert received for `checkout-api` and `payment-service`. Initiating collaborative multi-agent investigation protocol #INV-1042. Dispatching Log and Metrics agents for immediate telemetry correlation.',
  },
  {
    id: 'handoff-1',
    type: 'handoff',
    timestamp: '10:42:18',
    handoffFrom: 'orchestrator',
    handoffTo: 'metrics',
    handoffReason: 'Investigate anomaly spike across edge gateways and database connection pools',
  },
  {
    id: 'msg-2',
    agentId: 'metrics',
    type: 'message',
    timestamp: '10:42:25',
    text: 'Metrics Agent telemetry sweep complete. At 10:41:00 UTC, P95 request latency for `POST /api/v1/checkout` surged from 145ms to 842ms (+480%). Connection pool utilization spiked to 98.4%.',
    metrics: [
      { label: 'P95 Latency', value: '842 ms', delta: '+480%' },
      { label: 'Error Rate', value: '4.6%', delta: '+4.2%' },
      { label: 'Pool Saturation', value: '98.4%', delta: '+68%' },
      { label: 'Throughput', value: '1.2k rps', delta: '-15%' },
    ],
  },
  {
    id: 'handoff-2',
    type: 'handoff',
    timestamp: '10:42:30',
    handoffFrom: 'metrics',
    handoffTo: 'logs',
    handoffReason: 'Correlate latency surge with application stdout/stderr logs and timeout events',
  },
  {
    id: 'msg-3',
    agentId: 'logs',
    type: 'message',
    timestamp: '10:42:42',
    text: 'Log Agent analyzed 14,200 lines around the anomaly window. Found 18 critical exceptions in `checkout-api`: pool exhaustion errors followed by Redis keepalive timeouts.',
    codeBlock: {
      language: 'log',
      code: '[10:41:22] ERROR checkout.pool: Redis pool acquire timeout after 250ms (active: 100/100)\n[10:41:24] WARN  checkout.session: Failing back to direct query; read latency elevated\n[10:41:28] FATAL payment.worker: Circuit breaker tripped for redis-primary:6379',
    },
  },
  {
    id: 'handoff-3',
    type: 'handoff',
    timestamp: '10:42:50',
    handoffFrom: 'logs',
    handoffTo: 'deployment',
    handoffReason: 'Verify recent releases or configuration changes across affected microservices',
  },
  {
    id: 'msg-4',
    agentId: 'deployment',
    type: 'message',
    timestamp: '10:43:02',
    text: 'Deployment Agent verified CI/CD audit logs. Deployment `checkout-api:v2.4.1` (commit `8f42c19`) was rolled out 12 minutes prior to the alert. Diff indicates Redis connection pool maximum size was reduced from 500 to 100.',
    codeBlock: {
      language: 'diff',
      code: '@@ -14,2 +14,2 @@\n- REDIS_POOL_MAX_SIZE = 500\n+ REDIS_POOL_MAX_SIZE = 100  # accidental constraint',
    },
  },
  {
    id: 'handoff-4',
    type: 'handoff',
    timestamp: '10:43:10',
    handoffFrom: 'deployment',
    handoffTo: 'rootcause',
    handoffReason: 'Synthesize evidence, compute Bayesian confidence, and formulate primary hypothesis',
  },
  {
    id: 'msg-5',
    agentId: 'rootcause',
    type: 'message',
    timestamp: '10:43:20',
    text: 'Root Cause Inference complete with 94% confidence. The connection pool ceiling reduction in `v2.4.1` starved checkout workers under steady 1.2k rps load, triggering cascade timeouts across the payment gateway.',
  },
  {
    id: 'handoff-5',
    type: 'handoff',
    timestamp: '10:43:25',
    handoffFrom: 'rootcause',
    handoffTo: 'remediation',
    handoffReason: 'Formulate safe, sandboxed, and reversible remediation plan for human-in-the-loop signoff',
  },
  {
    id: 'msg-6',
    agentId: 'remediation',
    type: 'action_card',
    timestamp: '10:43:35',
    actionData: {
      title: 'Rollback Deployment v2.4.1 → v2.4.0',
      description: 'Restore previous stable container image `checkout-api:v2.4.0` (with 500 connection pool headroom). Estimated recovery time: 45 seconds.',
      risk: 'LOW',
      reversible: true,
      confidence: 94,
      actionCmd: 'kubectl rollout undo deployment/checkout-api --to-revision=41',
      sandboxed: true,
    },
  },
];

const INITIAL_ACTIVITIES: ActivityStep[] = [
  { id: '1', title: 'Signal Triage & Ingestion', agent: 'Orchestrator', status: 'completed', duration: '3s' },
  { id: '2', title: 'P95 & Error Telemetry Sweep', agent: 'Metrics Agent', status: 'completed', duration: '7s' },
  { id: '3', title: 'Log Pattern & Error Mining', agent: 'Log Agent', status: 'completed', duration: '12s' },
  { id: '4', title: 'Git & Deployment Diff Audit', agent: 'Deploy Agent', status: 'completed', duration: '8s' },
  { id: '5', title: 'Bayesian Root Cause Modeling', agent: 'Root Cause Agent', status: 'completed', duration: '10s' },
  { id: '6', title: 'Remediation Plan Formulation', agent: 'Remediation Agent', status: 'completed', duration: '5s' },
  { id: '7', title: 'Awaiting Operator Approval', agent: 'Human Operator', status: 'in_progress' },
];

export function AIIncidentChat({
  incidentId = 'INC-1042',
  onApproveAction,
}: {
  incidentId?: string;
  onApproveAction?: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [activities, setActivities] = useState<ActivityStep[]>(INITIAL_ACTIVITIES);
  const [inputVal, setInputVal] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [sandboxExecuted, setSandboxExecuted] = useState(false);
  const [fixApplied, setFixApplied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputVal.trim()) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      type: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      text: inputVal,
    };

    setMessages((prev) => [...prev, userMsg]);
    const currentInput = inputVal;
    setInputVal('');

    // Trigger collaborative agent response
    setTimeout(() => {
      const orchestratorResponse: ChatMessage = {
        id: `orch-${Date.now()}`,
        agentId: 'orchestrator',
        type: 'message',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        text: `Query analyzed: "${currentInput}". Consulting the team: Log and Trace agents confirm the blast radius is strictly isolated to checkout session stores. No secondary database locks detected.`,
      };
      setMessages((prev) => [...prev, orchestratorResponse]);
    }, 700);
  };

  const handleRunSandbox = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
      setSandboxExecuted(true);
      const sandboxMsg: ChatMessage = {
        id: `sand-${Date.now()}`,
        agentId: 'remediation',
        type: 'message',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        text: '✅ Sandbox Simulation Successful: Traffic replay of 1,200 req/s against ephemeral replica passed with 0 errors. P95 latency dropped back to 138ms baseline. Safe to proceed with production rollback.',
      };
      setMessages((prev) => [...prev, sandboxMsg]);
    }, 1500);
  };

  const handleApplyFix = () => {
    setFixApplied(true);
    setActivities((prev) =>
      prev.map((step) =>
        step.id === '7'
          ? { ...step, status: 'completed', duration: 'Instant' }
          : step
      ).concat([
        {
          id: '8',
          title: 'Rollback Executed & Verified',
          agent: 'Remediation Agent',
          status: 'completed',
          duration: '38s',
        },
      ])
    );

    const appliedMsg: ChatMessage = {
      id: `apply-${Date.now()}`,
      agentId: 'remediation',
      type: 'message',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      text: '🚀 Rollback command executed via Kubernetes API: `checkout-api` rolling back to revision 41 (v2.4.0). Health checks passed (3/3 replicas live). Incident marked RESOLVED.',
    };
    setMessages((prev) => [...prev, appliedMsg]);

    if (onApproveAction) {
      onApproveAction();
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[760px] w-full rounded-xl border border-border/80 bg-[#0d131f] text-foreground shadow-2xl overflow-hidden font-sans">
      {/* ─── Main Chat Window (Left / Center) ────────────────────── */}
      <div className="flex flex-1 flex-col h-full min-w-0 bg-[#0b0f19]">
        {/* Chat Header */}
        <div className="flex items-center justify-between border-b border-border/60 bg-[#0f172a]/80 px-6 py-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-sm font-bold tracking-tight text-white">
                  AI Incident Investigation Swarm
                </h3>
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  7 Agents Active
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Collaborative autonomous investigation rail · Incident {incidentId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setMessages(INITIAL_MESSAGES);
                setActivities(INITIAL_ACTIVITIES);
                setSandboxExecuted(false);
                setFixApplied(false);
              }}
              className="flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/20 px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-muted/40 hover:text-white transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reset Swarm
            </button>
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin scrollbar-thumb-muted">
          {messages.map((msg) => {
            if (msg.type === 'handoff') {
              const fromAgent = AGENT_PERSONAS[msg.handoffFrom || 'orchestrator'];
              const toAgent = AGENT_PERSONAS[msg.handoffTo || 'orchestrator'];
              return (
                <div key={msg.id} className="relative my-4 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-dashed border-border/40" />
                  </div>
                  <div className="relative flex items-center gap-2 rounded-full border border-border/80 bg-[#121927] px-4 py-1.5 text-[11px] text-muted-foreground shadow-sm">
                    <Radio className="h-3 w-3 text-primary animate-pulse" />
                    <span className="font-semibold text-white/90">{fromAgent?.name}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="font-semibold text-white/90">{toAgent?.name}</span>
                    <span className="text-[10px] text-muted-foreground/80 hidden sm:inline">
                      ({msg.handoffReason})
                    </span>
                  </div>
                </div>
              );
            }

            if (msg.type === 'user') {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-sm text-primary-foreground shadow-md">
                    <div className="flex items-center justify-between gap-3 text-[10px] font-medium opacity-80 mb-1">
                      <span>Operator</span>
                      <span>{msg.timestamp}</span>
                    </div>
                    <p className="leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              );
            }

            if (msg.type === 'action_card' && msg.actionData) {
              const data = msg.actionData;
              return (
                <div
                  key={msg.id}
                  className="rounded-xl border border-teal-500/40 bg-[#0e1e24] p-5 shadow-xl transition-all"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                          Recommended Human-in-the-Loop Action
                        </div>
                        <h4 className="font-display text-base font-bold text-white">
                          {data.title}
                        </h4>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                        RISK: {data.risk}
                      </span>
                      <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                        CONFIDENCE: {data.confidence}%
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                    {data.description}
                  </p>

                  <div className="rounded-lg bg-black/50 p-3 font-mono text-[11px] text-emerald-300 border border-border/40 mb-4 flex items-center justify-between">
                    <code>{data.actionCmd}</code>
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground">K8s Exec</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleRunSandbox}
                      disabled={isSimulating || sandboxExecuted || fixApplied}
                      className="flex items-center gap-2 rounded-lg border border-teal-500/40 bg-teal-500/10 px-4 py-2 text-xs font-semibold text-teal-300 hover:bg-teal-500/20 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
                    >
                      {isSimulating ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin text-teal-300" />
                          Testing in Sandbox...
                        </>
                      ) : sandboxExecuted ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          Sandbox Verified (Passed)
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5 text-teal-300" />
                          Test in Sandbox
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleApplyFix}
                      disabled={fixApplied}
                      className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
                    >
                      {fixApplied ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Rollback Applied & Verified
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4" />
                          Apply Production Fix
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            }

            const agent = AGENT_PERSONAS[msg.agentId || 'orchestrator'];
            const AgentIcon = agent?.icon || Bot;

            return (
              <div key={msg.id} className="flex gap-3.5 items-start">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${agent?.avatarColor}`}
                >
                  <AgentIcon className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-xs font-bold text-white">
                      {agent?.name}
                    </span>
                    <span
                      className={`rounded border px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${agent?.badgeBg}`}
                    >
                      {agent?.badgeText}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{msg.timestamp}</span>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-[#121927]/90 p-4 text-xs leading-relaxed text-foreground shadow-sm">
                    <p className="whitespace-pre-wrap">{msg.text}</p>

                    {/* Optional Metrics Grid */}
                    {msg.metrics && (
                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/40">
                        {msg.metrics.map((m, idx) => (
                          <div key={idx} className="rounded-lg bg-black/40 p-2.5 border border-border/40">
                            <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                              {m.label}
                            </div>
                            <div className="mt-1 font-display text-sm font-bold text-white">
                              {m.value}
                            </div>
                            {m.delta && (
                              <div
                                className={`text-[10px] font-semibold ${
                                  m.delta.startsWith('+') ? 'text-rose-400' : 'text-emerald-400'
                                }`}
                              >
                                {m.delta}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Optional Code/Log Block */}
                    {msg.codeBlock && (
                      <div className="mt-3 rounded-lg overflow-hidden border border-border/50 bg-[#070b13]">
                        <div className="flex items-center justify-between bg-black/40 px-3 py-1.5 text-[10px] font-mono text-muted-foreground border-b border-border/30">
                          <span>{msg.codeBlock.language.toUpperCase()}</span>
                          <span>Output Trace</span>
                        </div>
                        <pre className="p-3 font-mono text-[11px] leading-5 text-emerald-400 overflow-x-auto">
                          <code>{msg.codeBlock.code}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="border-t border-border/60 bg-[#0f172a]/90 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2 rounded-xl border border-border/80 bg-[#080d18] px-3 py-2 shadow-inner focus-within:border-primary/80 transition-colors"
          >
            <Terminal className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Ask the swarm (e.g. 'Trace Redis connection latency', 'Inspect container diff')..."
              className="flex-1 bg-transparent text-xs text-white placeholder:text-muted-foreground/60 outline-none"
            />
            <button
              type="submit"
              disabled={!inputVal.trim()}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:brightness-110 active:scale-95 disabled:opacity-30 transition-all cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* ─── Live Activity Rail (Right Side) ─────────────────────── */}
      <div className="w-full lg:w-[320px] shrink-0 border-t lg:border-t-0 lg:border-l border-border/70 bg-[#0f1728] p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-4">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-white">
                Live Activity Rail
              </h4>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">
              {activities.filter((a) => a.status === 'completed').length}/{activities.length} Done
            </span>
          </div>

          {/* Timeline steps */}
          <div className="space-y-4">
            {activities.map((step, idx) => {
              const isDone = step.status === 'completed';
              const isInProgress = step.status === 'in_progress';
              return (
                <div key={step.id} className="relative flex items-start gap-3">
                  {idx < activities.length - 1 && (
                    <div className="absolute left-3.5 top-6 bottom-[-16px] w-0.5 bg-border/40" />
                  )}
                  <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/70 bg-[#162032]">
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : isInProgress ? (
                      <RefreshCw className="h-3.5 w-3.5 text-amber-400 animate-spin" />
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-white truncate">
                        {step.title}
                      </span>
                      {step.duration && (
                        <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                          {step.duration}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>{step.agent}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Agent Roster Card */}
        <div className="mt-6 rounded-lg border border-border/60 bg-[#141d2e] p-3.5">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <Bot className="h-3.5 w-3.5 text-primary" />
            Active Personas
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.values(AGENT_PERSONAS).map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-1.5 rounded bg-black/30 px-2 py-1 text-[10px] text-muted-foreground"
                >
                  <Icon className="h-3 w-3 text-white/70" />
                  <span className="truncate">{p.name.split(' ')[0]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
