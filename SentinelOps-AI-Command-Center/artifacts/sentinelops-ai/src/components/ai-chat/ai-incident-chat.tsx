import React, { useState, useEffect, useRef } from 'react';
import {
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
  Check,
  Radio,
  FileCode2,
  Flame,
  Copy,
  SlidersHorizontal,
  ChevronDown,
  Layers,
  Cpu,
  Bot
} from 'lucide-react';

export interface AgentPersona {
  id: string;
  name: string;
  shortName: string;
  role: string;
  gradient: string;
  glowColor: string;
  avatarRing: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  icon: React.ElementType;
}

const AGENT_PERSONAS: Record<string, AgentPersona> = {
  orchestrator: {
    id: 'orchestrator',
    name: 'AIOps Orchestrator',
    shortName: 'Orchestrator',
    role: 'Lead Synthesis & Swarm Coordinator',
    gradient: 'from-violet-600 via-indigo-600 to-purple-600',
    glowColor: 'shadow-[0_0_25px_rgba(139,92,246,0.35)]',
    avatarRing: 'ring-violet-500/40 border-violet-400',
    badgeBg: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    badgeText: 'Orchestrator',
    borderColor: 'border-violet-500/30',
    icon: Sparkles,
  },
  logs: {
    id: 'logs',
    name: 'Log Analysis Agent',
    shortName: 'Logs',
    role: 'Exception Clustering & Pattern Mining',
    gradient: 'from-amber-500 via-orange-500 to-amber-600',
    glowColor: 'shadow-[0_0_25px_rgba(245,158,11,0.35)]',
    avatarRing: 'ring-amber-500/40 border-amber-400',
    badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    badgeText: 'Logs Agent',
    borderColor: 'border-amber-500/30',
    icon: FileSearch,
  },
  metrics: {
    id: 'metrics',
    name: 'Metrics & Telemetry Agent',
    shortName: 'Metrics',
    role: 'P95 Latency & Anomaly Detection',
    gradient: 'from-cyan-500 via-sky-500 to-blue-600',
    glowColor: 'shadow-[0_0_25px_rgba(6,182,212,0.35)]',
    avatarRing: 'ring-cyan-500/40 border-cyan-400',
    badgeBg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    badgeText: 'Metrics Agent',
    borderColor: 'border-cyan-500/30',
    icon: Activity,
  },
  traces: {
    id: 'traces',
    name: 'Distributed Trace Agent',
    shortName: 'Traces',
    role: 'RPC Spans & Bottleneck Isolation',
    gradient: 'from-blue-600 via-indigo-500 to-sky-500',
    glowColor: 'shadow-[0_0_25px_rgba(59,130,246,0.35)]',
    avatarRing: 'ring-blue-500/40 border-blue-400',
    badgeBg: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    badgeText: 'Trace Agent',
    borderColor: 'border-blue-500/30',
    icon: GitBranch,
  },
  deployment: {
    id: 'deployment',
    name: 'Deployment & CI/CD Agent',
    shortName: 'Deploy',
    role: 'Git Commit Diff & Image Auditor',
    gradient: 'from-emerald-500 via-teal-500 to-green-600',
    glowColor: 'shadow-[0_0_25px_rgba(16,185,129,0.35)]',
    avatarRing: 'ring-emerald-500/40 border-emerald-400',
    badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    badgeText: 'Deploy Agent',
    borderColor: 'border-emerald-500/30',
    icon: FileCode2,
  },
  rootcause: {
    id: 'rootcause',
    name: 'Root Cause Inference Agent',
    shortName: 'Root Cause',
    role: 'Bayesian Hypothesis Correlator',
    gradient: 'from-rose-500 via-red-500 to-pink-600',
    glowColor: 'shadow-[0_0_25px_rgba(244,63,94,0.35)]',
    avatarRing: 'ring-rose-500/40 border-rose-400',
    badgeBg: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    badgeText: 'Root Cause Agent',
    borderColor: 'border-rose-500/30',
    icon: Flame,
  },
  remediation: {
    id: 'remediation',
    name: 'Remediation & Safety Agent',
    shortName: 'Remediation',
    role: 'Sandbox Validation & Rollback Gate',
    gradient: 'from-teal-500 via-emerald-500 to-cyan-600',
    glowColor: 'shadow-[0_0_25px_rgba(20,184,166,0.35)]',
    avatarRing: 'ring-teal-500/40 border-teal-400',
    badgeBg: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
    badgeText: 'Remediation Agent',
    borderColor: 'border-teal-500/30',
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
  metrics?: { label: string; value: string; delta?: string; tone?: 'bad' | 'good' | 'neutral' }[];
  codeBlock?: { language: string; code: string; title?: string };
}

export interface ActivityStep {
  id: string;
  title: string;
  agent: string;
  status: 'completed' | 'in_progress' | 'pending';
  duration?: string;
  timestamp?: string;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    agentId: 'orchestrator',
    type: 'message',
    timestamp: '10:42:15',
    text: '🚨 Critical P1 Latency Breach detected on `checkout-api` and `payment-service`. Mobilizing collaborative 7-agent investigation swarm protocol #INV-1042.\n\nDeploying telemetry listeners and dispatching Metrics and Log agents for real-time anomaly isolation.',
  },
  {
    id: 'handoff-1',
    type: 'handoff',
    timestamp: '10:42:18',
    handoffFrom: 'orchestrator',
    handoffTo: 'metrics',
    handoffReason: 'Isolate P95 request latency spike and connection pool saturation curves',
  },
  {
    id: 'msg-2',
    agentId: 'metrics',
    type: 'message',
    timestamp: '10:42:25',
    text: 'Telemetry sweep complete. Request latency surged sharply at 10:41:00 UTC. Concurrently, worker connection pool saturation crossed the critical 95% threshold under a steady 1,200 req/s load.',
    metrics: [
      { label: 'P95 Latency', value: '842 ms', delta: '+480%', tone: 'bad' },
      { label: 'Error Rate', value: '4.6%', delta: '+4.2%', tone: 'bad' },
      { label: 'Pool Saturation', value: '98.4%', delta: '+68%', tone: 'bad' },
      { label: 'System Throughput', value: '1,240 rps', delta: 'Nominal', tone: 'neutral' },
    ],
  },
  {
    id: 'handoff-2',
    type: 'handoff',
    timestamp: '10:42:30',
    handoffFrom: 'metrics',
    handoffTo: 'logs',
    handoffReason: 'Correlate latency spikes with service stderr exceptions and timeout events',
  },
  {
    id: 'msg-3',
    agentId: 'logs',
    type: 'message',
    timestamp: '10:42:42',
    text: 'Log stream mining identified 18 critical exceptions within the 3-minute alert window. The errors pinpoint Redis client acquire timeouts followed by cascading circuit breaker trips in checkout workers.',
    codeBlock: {
      language: 'log',
      title: 'checkout-api.stderr · Window [10:41:00 - 10:43:00]',
      code: '[10:41:22.408] ERROR [checkout.pool] Redis pool acquire timeout after 250ms (active: 100/100, waiting: 48)\n[10:41:24.112] WARN  [checkout.session] Failing back to direct read; query latency elevated to 780ms\n[10:41:28.991] FATAL [payment.worker] Circuit breaker tripped for redis-primary:6379 (threshold: 5 failures/5s)',
    },
  },
  {
    id: 'handoff-3',
    type: 'handoff',
    timestamp: '10:42:50',
    handoffFrom: 'logs',
    handoffTo: 'deployment',
    handoffReason: 'Inspect recent releases, config maps, and container image rollouts',
  },
  {
    id: 'msg-4',
    agentId: 'deployment',
    type: 'message',
    timestamp: '10:43:02',
    text: 'CI/CD audit confirmed deployment `checkout-api:v2.4.1` (commit `8f42c19`) was merged and deployed 14 minutes prior to alert onset. Git diff reveals the connection pool size was inadvertently reduced by 80%.',
    codeBlock: {
      language: 'diff',
      title: 'git diff HEAD~1 config/production.yaml',
      code: '@@ -14,3 +14,3 @@\n redis:\n-  pool_max_size: 500\n+  pool_max_size: 100  # accidental constraint applied during refactor\n   idle_timeout_ms: 30000',
    },
  },
  {
    id: 'handoff-4',
    type: 'handoff',
    timestamp: '10:43:10',
    handoffFrom: 'deployment',
    handoffTo: 'rootcause',
    handoffReason: 'Synthesize telemetry, logs, and git diff into probabilistic Bayesian root cause hypothesis',
  },
  {
    id: 'msg-5',
    agentId: 'rootcause',
    type: 'message',
    timestamp: '10:43:20',
    text: 'Root cause hypothesis synthesized with 94% Bayesian confidence. The accidental connection pool ceiling reduction in `v2.4.1` starved concurrent worker threads, leading directly to queue saturation and 504 timeouts across the payment gateway.',
  },
  {
    id: 'handoff-5',
    type: 'handoff',
    timestamp: '10:43:25',
    handoffFrom: 'rootcause',
    handoffTo: 'remediation',
    handoffReason: 'Construct verified, sandboxed, and reversible remediation plan for human-in-the-loop signoff',
  },
  {
    id: 'msg-6',
    agentId: 'remediation',
    type: 'action_card',
    timestamp: '10:43:35',
    actionData: {
      title: 'Reversible Rollback: checkout-api v2.4.1 → v2.4.0',
      description: 'Restore previous stable container image `checkout-api:v2.4.0` (with 500 pool capacity). Expected recovery: P95 latency drops to 135ms within 45 seconds. No data-layer or schema impact.',
      risk: 'LOW',
      reversible: true,
      confidence: 94,
      actionCmd: 'kubectl rollout undo deployment/checkout-api --to-revision=41',
      sandboxed: true,
    },
  },
];

const INITIAL_ACTIVITIES: ActivityStep[] = [
  { id: '1', title: 'Signal Triage & Ingestion', agent: 'Orchestrator', status: 'completed', duration: '3s', timestamp: '10:42:15' },
  { id: '2', title: 'P95 & Error Telemetry Sweep', agent: 'Metrics Agent', status: 'completed', duration: '7s', timestamp: '10:42:25' },
  { id: '3', title: 'Log Pattern & Error Mining', agent: 'Log Agent', status: 'completed', duration: '12s', timestamp: '10:42:42' },
  { id: '4', title: 'Git & Deployment Diff Audit', agent: 'Deploy Agent', status: 'completed', duration: '8s', timestamp: '10:43:02' },
  { id: '5', title: 'Bayesian Root Cause Modeling', agent: 'Root Cause Agent', status: 'completed', duration: '10s', timestamp: '10:43:20' },
  { id: '6', title: 'Remediation Plan Formulation', agent: 'Remediation Agent', status: 'completed', duration: '5s', timestamp: '10:43:35' },
  { id: '7', title: 'Awaiting Operator Approval', agent: 'Human Operator', status: 'in_progress', timestamp: 'Current' },
];

const SUGGESTIONS = [
  '⚡ Explain Bayesian confidence score',
  '🔍 Trace Redis connection pool leak',
  '📦 Inspect v2.4.1 commit changes',
  '🧪 Run sandbox simulation',
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
  const [simulationLogs, setSimulationLogs] = useState<string[]>([]);
  const [sandboxExecuted, setSandboxExecuted] = useState(false);
  const [fixApplied, setFixApplied] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [agentThinking, setAgentThinking] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, agentThinking, simulationLogs]);

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || inputVal;
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      type: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      text: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');

    // Dynamic Swarm response simulation
    setAgentThinking('Orchestrator is consulting Log, Metric, and Trace agents...');

    setTimeout(() => {
      setAgentThinking(null);

      let responseText = `The swarm evaluated your inquiry: "${text}".\n\nCross-referencing real-time spans: Redis node primary has normal memory headroom (1.4GB / 8GB), confirming the bottleneck is strictly client-side pool queuing introduced in commit 8f42c19.`;
      let chosenAgent = 'orchestrator';

      if (text.toLowerCase().includes('diff') || text.toLowerCase().includes('commit')) {
        chosenAgent = 'deployment';
        responseText = `Deployment Agent verified commit 8f42c19 ("chore: tighten redis pool limits for memory safety"). The author assumed 100 connections would support peak traffic, but missed that checkout-api requires 250+ during flash authorization bursts.`;
      } else if (text.toLowerCase().includes('bayes') || text.toLowerCase().includes('confidence')) {
        chosenAgent = 'rootcause';
        responseText = `Bayesian Confidence Synthesis:\n• P(Pool Exhaustion | Telemetry) = 94.2%\n• P(Network Flap | Telemetry) = 4.1%\n• P(DB Lock Contention | Telemetry) = 1.7%\n\nConclusion: Pool configuration is unambiguously the causal root.`;
      } else if (text.toLowerCase().includes('sandbox') || text.toLowerCase().includes('simulate')) {
        handleRunSandbox();
        return;
      }

      const agentResponse: ChatMessage = {
        id: `agent-${Date.now()}`,
        agentId: chosenAgent,
        type: 'message',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        text: responseText,
      };

      setMessages((prev) => [...prev, agentResponse]);
    }, 1200);
  };

  const handleRunSandbox = () => {
    setIsSimulating(true);
    setSimulationLogs(['Spinning up ephemeral shadow cluster in us-east-1...', 'Replaying 1,200 req/s recorded production traffic...']);

    setTimeout(() => {
      setSimulationLogs((prev) => [...prev, 'Injecting container image checkout-api:v2.4.0 (500 connections)...']);
    }, 800);

    setTimeout(() => {
      setSimulationLogs((prev) => [...prev, '✓ P95 latency dropped from 842ms -> 138ms baseline']);
      setSimulationLogs((prev) => [...prev, '✓ 0 failed acquisitions over 5,000 synthetic transactions']);
      setIsSimulating(false);
      setSandboxExecuted(true);

      const sandboxMsg: ChatMessage = {
        id: `sand-${Date.now()}`,
        agentId: 'remediation',
        type: 'message',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        text: '🛡️ Sandbox Verification Complete: Replica test passed with 100% authorization success rate. Rollback is safe and non-breaking for active customer carts.',
      };
      setMessages((prev) => [...prev, sandboxMsg]);
    }, 2000);
  };

  const handleApplyFix = () => {
    setFixApplied(true);
    setActivities((prev) =>
      prev
        .map((step) =>
          step.id === '7'
            ? { ...step, status: 'completed' as const, duration: 'Instant' }
            : step
        )
        .concat([
          {
            id: '8',
            title: 'Production Rollback Executed & Verified',
            agent: 'Remediation Agent',
            status: 'completed',
            duration: '38s',
            timestamp: 'Resolved',
          },
        ])
    );

    const appliedMsg: ChatMessage = {
      id: `apply-${Date.now()}`,
      agentId: 'remediation',
      type: 'message',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      text: '🚀 Production Rollback Executed: Kubernetes deployment `checkout-api` reverted to revision 41 (v2.4.0). Live traffic returned to normal (134ms P95, 0.01% error rate). Incident #INC-1042 is resolved.',
    };
    setMessages((prev) => [...prev, appliedMsg]);

    if (onApproveAction) {
      onApproveAction();
    }
  };

  const handleCopyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const completedCount = activities.filter((a) => a.status === 'completed').length;
  const progressPercent = Math.round((completedCount / activities.length) * 100);

  return (
    <div className="relative flex flex-col xl:flex-row h-[800px] w-full rounded-2xl border border-cyan-500/25 bg-[#080d19] shadow-[0_20px_60px_rgba(0,0,0,0.85)] overflow-hidden font-sans">
      {/* Ambient Cyber Light Glows */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-gradient-to-br from-violet-600/20 to-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-20 h-96 w-96 rounded-full bg-gradient-to-tr from-teal-500/15 to-emerald-600/10 blur-3xl" />

      {/* ─── Left/Center: Main Swarm Conversation ───────────────────── */}
      <div className="flex flex-1 flex-col h-full min-w-0 bg-[#090e1c]/90 z-10 backdrop-blur-md">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-500/20 bg-[#0c1427]/85 px-6 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-3.5">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.4)]">
              <Sparkles className="h-5 w-5 animate-pulse" />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-[#0c1427]">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="font-display text-base font-extrabold tracking-tight text-white drop-shadow-sm">
                  AI Incident Investigation Swarm
                </h3>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  7 Agents Synchronized
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-400">
                Autonomous multi-agent correlation · Target: <span className="text-cyan-300 font-mono font-semibold">{incidentId}</span>
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
                setSimulationLogs([]);
              }}
              className="group flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:border-cyan-500/40 hover:bg-slate-700/80 hover:text-white transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5 text-slate-400 group-hover:rotate-180 transition-transform duration-500" />
              Reset Swarm
            </button>
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin">
          {messages.map((msg) => {
            // Handoff Divider with Animated Shimmer Beam
            if (msg.type === 'handoff') {
              const fromAgent = AGENT_PERSONAS[msg.handoffFrom || 'orchestrator'];
              const toAgent = AGENT_PERSONAS[msg.handoffTo || 'orchestrator'];
              return (
                <div key={msg.id} className="relative my-6 flex items-center justify-center animate-rise">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full h-px bg-gradient-to-r from-transparent via-cyan-500/50 via-purple-500/50 to-transparent" />
                  </div>
                  <div className="relative flex items-center gap-2 rounded-full border border-cyan-500/40 bg-[#0d162b] px-4 py-1.5 text-[11px] shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                    <Radio className="h-3 w-3 text-cyan-400 animate-pulse" />
                    <span className="font-bold text-white">{fromAgent?.shortName}</span>
                    <ArrowRight className="h-3 w-3 text-cyan-400" />
                    <span className="font-bold text-white">{toAgent?.shortName}</span>
                    <span className="text-[10px] text-slate-400 hidden sm:inline ml-1 font-mono">
                      — {msg.handoffReason}
                    </span>
                  </div>
                </div>
              );
            }

            // User Message
            if (msg.type === 'user') {
              return (
                <div key={msg.id} className="flex justify-end animate-rise">
                  <div className="max-w-[78%] rounded-2xl rounded-tr-sm bg-gradient-to-br from-cyan-600 to-blue-600 p-4 text-white shadow-[0_4px_20px_rgba(6,182,212,0.3)]">
                    <div className="flex items-center justify-between gap-4 text-[10px] font-semibold text-cyan-100 mb-1">
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-cyan-200" />
                        Human Operator
                      </span>
                      <span className="font-mono">{msg.timestamp}</span>
                    </div>
                    <p className="text-xs leading-relaxed font-medium">{msg.text}</p>
                  </div>
                </div>
              );
            }

            // Interactive Action Deck (Remediation)
            if (msg.type === 'action_card' && msg.actionData) {
              const data = msg.actionData;
              return (
                <div
                  key={msg.id}
                  className="rounded-2xl border border-teal-500/50 bg-gradient-to-br from-[#0c1f26]/95 via-[#08151c]/95 to-[#0b1b22]/95 p-6 shadow-[0_0_35px_rgba(20,184,166,0.25)] backdrop-blur-xl animate-rise transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-[0_0_15px_rgba(20,184,166,0.4)]">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-[10px] font-extrabold uppercase tracking-widest text-teal-400 flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-ping" />
                          Recommended Safe Remediation Gate
                        </div>
                        <h4 className="font-display text-lg font-bold text-white tracking-tight">
                          {data.title}
                        </h4>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold text-amber-300">
                        RISK: {data.risk}
                      </span>
                      <span className="rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
                        CONFIDENCE: {data.confidence}%
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed mb-4">
                    {data.description}
                  </p>

                  {/* Terminal Execution Preview */}
                  <div className="rounded-xl bg-[#040810] border border-teal-500/30 p-3.5 mb-4 shadow-inner">
                    <div className="flex items-center justify-between font-mono text-[10px] text-slate-400 border-b border-white/10 pb-2 mb-2">
                      <span className="flex items-center gap-2 text-teal-300 font-bold">
                        <Terminal className="h-3.5 w-3.5" />
                        Automated Recovery Command
                      </span>
                      <button
                        onClick={() => handleCopyCommand(data.actionCmd)}
                        className="flex items-center gap-1 text-[10px] text-slate-300 hover:text-white transition-colors cursor-pointer"
                      >
                        {isCopied ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="font-mono text-xs text-emerald-300 flex items-center gap-2 overflow-x-auto">
                      <span className="text-teal-500 font-bold select-none">$</span>
                      <code>{data.actionCmd}</code>
                    </div>
                  </div>

                  {/* Interactive Simulation Stream if triggered */}
                  {simulationLogs.length > 0 && (
                    <div className="mb-4 rounded-xl border border-cyan-500/30 bg-[#07101f] p-3.5 space-y-1 font-mono text-[11px]">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 mb-1 flex items-center gap-1.5">
                        <Activity className="h-3.5 w-3.5 animate-pulse" />
                        Live Replica Sandbox Stream
                      </div>
                      {simulationLogs.map((log, idx) => (
                        <div key={idx} className="text-slate-300 flex items-center gap-2">
                          <span className="text-cyan-500">›</span>
                          <span className={log.startsWith('✓') ? 'text-emerald-400 font-bold' : ''}>{log}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action Controls */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      onClick={handleRunSandbox}
                      disabled={isSimulating || sandboxExecuted || fixApplied}
                      className="flex items-center gap-2 rounded-xl border border-cyan-500/50 bg-cyan-500/15 px-4 py-2.5 text-xs font-bold text-cyan-200 hover:bg-cyan-500/30 active:scale-95 disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:shadow-[0_0_25px_rgba(6,182,212,0.4)] cursor-pointer"
                    >
                      {isSimulating ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin text-cyan-300" />
                          Simulating Traffic Replay...
                        </>
                      ) : sandboxExecuted ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          Sandbox Verified (Passed)
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5 text-cyan-300" />
                          Test in Sandbox (No Risk)
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleApplyFix}
                      disabled={fixApplied}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2.5 text-xs font-bold text-white shadow-[0_0_25px_rgba(16,185,129,0.35)] hover:shadow-[0_0_35px_rgba(16,185,129,0.6)] hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
                    >
                      {fixApplied ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Rollback Verified & Live
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4" />
                          Apply Production Fix (One-Click)
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            }

            // Regular Agent Message
            const agent = AGENT_PERSONAS[msg.agentId || 'orchestrator'];
            const AgentIcon = agent?.icon || Sparkles;

            return (
              <div key={msg.id} className="flex gap-4 items-start animate-rise">
                <div
                  className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${agent?.gradient} text-white shadow-lg ${agent?.glowColor}`}
                >
                  <AgentIcon className="h-5 w-5" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#090e1c]" />
                </div>

                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="font-display text-xs font-extrabold text-white tracking-tight">
                      {agent?.name}
                    </span>
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${agent?.badgeBg}`}
                    >
                      {agent?.badgeText}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{msg.timestamp}</span>
                  </div>

                  <div className={`rounded-2xl border ${agent?.borderColor} bg-[#0d162a]/95 p-4 text-xs leading-relaxed text-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-md`}>
                    <p className="whitespace-pre-wrap font-normal leading-6">{msg.text}</p>

                    {/* Metrics Grid */}
                    {msg.metrics && (
                      <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-slate-700/60">
                        {msg.metrics.map((m, idx) => (
                          <div
                            key={idx}
                            className="rounded-xl bg-[#060c18] p-3 border border-slate-700/60 shadow-inner"
                          >
                            <div className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                              {m.label}
                            </div>
                            <div className="mt-1 font-mono text-base font-bold text-white">
                              {m.value}
                            </div>
                            {m.delta && (
                              <div
                                className={`text-[10px] font-bold mt-0.5 ${
                                  m.tone === 'bad'
                                    ? 'text-rose-400'
                                    : m.tone === 'good'
                                    ? 'text-emerald-400'
                                    : 'text-cyan-400'
                                }`}
                              >
                                {m.delta}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Code / Log Stream */}
                    {msg.codeBlock && (
                      <div className="mt-3.5 rounded-xl overflow-hidden border border-slate-700/80 bg-[#050914] shadow-md">
                        <div className="flex items-center justify-between bg-[#0a1120] px-3.5 py-2 text-[10px] font-mono text-slate-300 border-b border-slate-800">
                          <span className="font-bold text-cyan-300">
                            {msg.codeBlock.title || msg.codeBlock.language.toUpperCase()}
                          </span>
                          <span className="text-slate-400 font-sans">Active Output Span</span>
                        </div>
                        <pre className="p-3.5 font-mono text-[11px] leading-5 text-emerald-300 overflow-x-auto selection:bg-emerald-500/30">
                          <code>{msg.codeBlock.code}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Animated Swarm Reasoning Indicator */}
          {agentThinking && (
            <div className="flex items-center gap-3 animate-rise p-3 rounded-xl border border-violet-500/30 bg-[#0f172d]/80 text-xs text-violet-200">
              <RefreshCw className="h-4 w-4 animate-spin text-violet-400" />
              <span>{agentThinking}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-6 py-2 bg-[#090e1c] border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 shrink-0">
            Suggested Prompts:
          </span>
          {SUGGESTIONS.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(s)}
              className="shrink-0 rounded-full border border-cyan-500/30 bg-[#0e172c] px-3 py-1 text-[11px] font-medium text-cyan-200 hover:border-cyan-400 hover:bg-cyan-500/20 active:scale-95 transition-all cursor-pointer shadow-sm"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="border-t border-cyan-500/20 bg-[#0c1427]/90 p-4 backdrop-blur-xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-3 rounded-xl border border-cyan-500/40 bg-[#060b17] px-4 py-2.5 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)] focus-within:border-cyan-400 focus-within:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all"
          >
            <Terminal className="h-4 w-4 text-cyan-400 shrink-0" />
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Ask the swarm (e.g. 'Trace Redis connection latency', 'Inspect container diff')..."
              className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-400 outline-none"
            />
            <button
              type="submit"
              disabled={!inputVal.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:brightness-110 active:scale-95 disabled:opacity-30 transition-all cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      {/* ─── Right Side: Live Activity Rail ─────────────────────────── */}
      <div className="w-full xl:w-[340px] shrink-0 border-t xl:border-t-0 xl:border-l border-cyan-500/20 bg-[#0a1020]/95 p-5 flex flex-col justify-between backdrop-blur-xl z-10">
        <div>
          {/* Activity Header */}
          <div className="pb-4 border-b border-slate-700/60 mb-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-cyan-400" />
                <h4 className="font-display text-xs font-extrabold uppercase tracking-widest text-white">
                  Live Activity Rail
                </h4>
              </div>
              <span className="text-[11px] font-mono font-bold text-cyan-400">
                {completedCount}/{activities.length} Steps
              </span>
            </div>

            {/* Glowing Progress Bar */}
            <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 transition-all duration-700 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Stepper Timeline */}
          <div className="space-y-4">
            {activities.map((step, idx) => {
              const isDone = step.status === 'completed';
              const isInProgress = step.status === 'in_progress';
              return (
                <div
                  key={step.id}
                  className="relative flex items-start gap-3.5 group rounded-xl p-1.5 hover:bg-white/5 transition-colors"
                >
                  {/* Connecting Line */}
                  {idx < activities.length - 1 && (
                    <div
                      className={`absolute left-[21px] top-7 bottom-[-16px] w-0.5 ${
                        isDone ? 'bg-emerald-500/40' : 'bg-slate-700/50'
                      }`}
                    />
                  )}

                  {/* Indicator Icon */}
                  <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-[#0c1427] shadow-sm">
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                    ) : isInProgress ? (
                      <div className="relative flex h-4 w-4 items-center justify-center">
                        <span className="absolute h-full w-full rounded-full bg-cyan-400/30 animate-ping" />
                        <RefreshCw className="h-3.5 w-3.5 text-cyan-400 animate-spin" />
                      </div>
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-slate-600" />
                    )}
                  </div>

                  {/* Step Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-xs font-bold truncate ${
                          isDone ? 'text-white' : isInProgress ? 'text-cyan-300' : 'text-slate-400'
                        }`}
                      >
                        {step.title}
                      </span>
                      {step.duration && (
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">
                          {step.duration}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-400">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isDone ? 'bg-emerald-400' : isInProgress ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'
                        }`}
                      />
                      <span>{step.agent}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Personas Grid at Bottom of Rail */}
        <div className="mt-6 rounded-xl border border-slate-700/60 bg-[#070e1c] p-3.5 shadow-md">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Bot className="h-3.5 w-3.5 text-cyan-400" />
              Active Personas
            </span>
            <span className="text-cyan-400 font-mono">7 Ready</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {Object.values(AGENT_PERSONAS).map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-1.5 rounded-lg bg-[#0e172a] px-2 py-1 text-[10px] text-slate-300 border border-slate-800"
                >
                  <Icon className="h-3 w-3 text-cyan-400 shrink-0" />
                  <span className="truncate font-semibold">{p.shortName}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
