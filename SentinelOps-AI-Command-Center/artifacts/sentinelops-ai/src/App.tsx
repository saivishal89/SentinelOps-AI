import { useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AIIncidentChat } from '@/components/ai-chat/ai-incident-chat';
import {
  useApproveIncident,
  useExecuteIncident,
  useGenerateRecommendation,
  useGetAudit,
  useGetDashboardSummary,
  useGetEvaluations,
  useGetIncident,
  useGetIncidentLogs,
  useGetIncidentMetrics,
  useGetIncidentTimeline,
  useGetIncidentTraces,
  useGetIncidents,
  useHealthCheck,
  useInvestigateIncident,
  useRejectIncident,
  useRollbackIncident,
  useRunEvaluations,
  useVerifyIncident,
} from '@workspace/api-client-react';
import type { Incident, TimelineEvent } from '@workspace/api-client-react';
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowRight, Bot, Check, CheckCircle2,
  ChevronRight, CircleDot, Clock3, Cloud, Code2, Database, FileSearch, Gauge,
  GitBranch, History, LayoutDashboard, LifeBuoy, ListChecks, LockKeyhole, Menu,
  Network, Play, RefreshCw, RotateCcw, Search, Server, Settings2, ShieldCheck,
  SlidersHorizontal, Sparkles, Terminal, Timer, Users, X, Zap,
} from 'lucide-react';
import {
  Link, Route, Router as WouterRouter, Switch, useLocation, useParams,
} from 'wouter';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

const fallbackIncidents: Incident[] = [
  {
    id: 'INC-1042', title: 'Payment API Latency Spike', severity: 'CRITICAL',
    status: 'AWAITING APPROVAL', workflowState: 'awaiting-approval',
    affectedServices: ['Payment Service', 'Database', 'API Gateway'],
    rootCause: 'Database performance regression caused by deployment v2.4.1.',
    recommendation: 'Rollback deployment v2.4.1',
    risk: 'MEDIUM', confidence: 86, reversible: true, rollbackAvailable: true, approvedBy: null,
    outcome: null, createdAt: '2026-09-26T10:42:11Z', updatedAt: '2026-09-26T10:45:34Z',
  },
];

const fallbackSummary = {
  systemHealth: 98.4, activeIncidents: 1, servicesHealthy: 3, servicesTotal: 5,
  aiConfidence: 86, errorRate: 2.1, recoveryTime: 0,
};

const navGroups: Array<{ label: string; items: Array<[string, string, React.ElementType]> }> = [
  {
    label: 'Operations',
    items: [
      ['Command center', '/command-center', LayoutDashboard],
      ['Incidents', '/incidents', AlertTriangle],
      ['Investigation', '/investigation', Bot],
      ['Service map', '/service-map', Network],
      ['Timeline', '/timeline', History],
    ],
  },
  {
    label: 'Control',
    items: [
      ['Remediation', '/remediation', Zap],
      ['Sandbox', '/sandbox', Terminal],
      ['Evaluations', '/evaluations', Gauge],
      ['Audit log', '/audit', ListChecks],
    ],
  },
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function Button({ children, onClick, href, variant = 'primary', disabled = false, className = '', testId = 'button-action' }: {
  children: React.ReactNode; onClick?: () => void; href?: string; variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'amber';
  disabled?: boolean; className?: string; testId?: string;
}) {
  const styles = {
    primary: 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] hover:brightness-110 active:scale-95',
    secondary: 'bg-slate-800/80 text-slate-200 border border-slate-700/80 hover:border-cyan-500/40 hover:bg-slate-700/80 hover:text-white shadow-sm active:scale-95',
    ghost: 'bg-transparent text-slate-400 hover:bg-slate-800/50 hover:text-white',
    danger: 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:brightness-110 active:scale-95',
    amber: 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:brightness-110 active:scale-95',
  };
  const body = <span className={cn('inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-[12px] font-bold tracking-[-.01em] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed', styles[variant], className)}>{children}</span>;
  if (href) return <Link href={href} data-testid={testId} className="inline-flex">{body}</Link>;
  return <button type="button" onClick={onClick} disabled={disabled} data-testid={testId} className={cn('cursor-pointer', disabled && 'cursor-not-allowed')}>{body}</button>;
}

function Badge({ children, tone = 'neutral', testId = 'status-badge' }: { children: React.ReactNode; tone?: 'neutral' | 'green' | 'amber' | 'red' | 'blue'; testId?: string }) {
  const styles = {
    neutral: 'bg-slate-800 text-slate-300 border-slate-700',
    green: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.15)]',
    red: 'bg-rose-500/15 text-rose-300 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.15)]',
    blue: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.15)]',
  };
  return <span data-testid={testId} className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[.12em] backdrop-blur-sm', styles[tone])}>{children}</span>;
}

function Panel({ children, className = '', title, action }: { children: React.ReactNode; className?: string; title?: string; action?: React.ReactNode }) {
  return <section className={cn('rounded-xl border border-slate-700/70 bg-[#0e1627]/90 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]', className)}>
    {(title || action) && <div className="flex items-center justify-between border-b border-slate-700/60 px-5 py-4"><h2 className="text-[12px] font-extrabold uppercase tracking-[.13em] text-cyan-400 flex items-center gap-2">{title}</h2>{action}</div>}
    {children}
  </section>;
}

function Metric({ label, value, detail, icon: Icon, tone = 'default' }: { label: string; value: string; detail: string; icon: React.ElementType; tone?: 'default' | 'warn' | 'good' }) {
  return <div data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`} className="rounded-xl border border-slate-700/60 bg-[#0c1424]/90 p-4 shadow-md backdrop-blur-md hover:border-cyan-500/40 transition-colors">
    <div className="flex items-start justify-between"><span className="text-[10px] font-extrabold uppercase tracking-[.13em] text-slate-400">{label}</span><Icon className={cn('h-4 w-4', tone === 'warn' ? 'text-amber-400' : tone === 'good' ? 'text-emerald-400' : 'text-cyan-400')} /></div>
    <div className="mt-3 font-display text-2xl font-bold tracking-tight text-white">{value}</div>
    <div className={cn('mt-1 text-[11px] font-medium', tone === 'warn' ? 'text-amber-300' : 'text-slate-400')}>{detail}</div>
  </div>;
}

function PageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: React.ReactNode }) {
  return <header className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
    <div><div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.18em] text-cyan-400"><CircleDot className="h-3 w-3 text-cyan-400 animate-ping" />{eyebrow}</div><h1 data-testid={`heading-${title.toLowerCase().replaceAll(' ', '-')}`} className="font-display text-3xl font-extrabold tracking-[-.035em] text-white md:text-[36px] drop-shadow-sm">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{description}</p></div>
    {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
  </header>;
}

function LoadingState({ label = 'Syncing operational data' }: { label?: string }) {
  return <div className="space-y-3" data-testid="loading-state"><div className="h-20 animate-pulse rounded-lg bg-muted" /><div className="h-32 animate-pulse rounded-lg bg-muted" /><div className="flex items-center gap-2 text-xs text-muted-foreground"><RefreshCw className="h-3.5 w-3.5 animate-spin" />{label}</div></div>;
}

function ErrorState({ retry }: { retry?: () => void }) {
  return <div data-testid="error-state" className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-800"><div className="flex items-center gap-2 font-bold"><AlertTriangle className="h-4 w-4" />Operational data unavailable</div><p className="mt-1 text-red-700/80">The command stream could not be read. Your last known state is still safe.</p>{retry && <button type="button" onClick={retry} data-testid="button-retry" className="mt-3 font-bold underline">Retry connection</button>}</div>;
}

function AppShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const healthQuery = useHealthCheck();
  const activeLabel = navGroups.flatMap((group) => group.items).find((item) => location === item[1])?.[0] ?? (location === '/' ? 'Replay' : 'Incident detail');
  return <div className="min-h-[100dvh] bg-background text-foreground">
    <aside className={cn('fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform md:translate-x-0', mobileOpen ? 'translate-x-0' : '-translate-x-full')}>
      <div className="flex h-[76px] items-center justify-between border-b border-sidebar-border px-5"><Link href="/" data-testid="link-home" className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground"><ShieldCheck className="h-5 w-5" /></span><span><span className="block font-display text-[16px] font-bold tracking-tight text-white">sentinel<span className="text-sidebar-primary">ops</span></span><span className="block text-[9px] font-bold uppercase tracking-[.18em] text-sidebar-foreground/55">AI command center</span></span></Link><button onClick={() => setMobileOpen(false)} data-testid="button-close-navigation" className="rounded p-1 text-sidebar-foreground/60 hover:bg-sidebar-accent md:hidden"><X className="h-4 w-4" /></button></div>
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-4"><span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[#314253] text-[11px] font-bold text-white">AR<span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-sidebar bg-sidebar-primary" /></span><div><div className="text-xs font-bold text-white">Alex Rivera</div><div className="text-[10px] text-sidebar-foreground/55">On-call · Platform</div></div></div>
      <nav className="flex-1 overflow-y-auto px-3 py-5">{navGroups.map((group) => <div key={group.label} className="mb-6"><div className="mb-2 px-3 text-[9px] font-extrabold uppercase tracking-[.18em] text-sidebar-foreground/40">{group.label}</div>{group.items.map(([label, href, Icon]) => <Link key={href} href={href as string} onClick={() => setMobileOpen(false)} data-testid={`link-nav-${(label as string).toLowerCase().replaceAll(' ', '-')}`} className={cn('mb-1 flex items-center gap-3 rounded-md px-3 py-2.5 text-[12px] font-semibold transition-colors', location === href ? 'bg-sidebar-accent text-white' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-white')}><Icon className={cn('h-4 w-4', location === href ? 'text-sidebar-primary' : '')} /><span>{label as string}</span>{location === href && <ChevronRight className="ml-auto h-3.5 w-3.5 text-sidebar-primary" />}</Link>)}</div>)}</nav>
      <div className="m-3 rounded-md border border-sidebar-border bg-sidebar-accent/60 p-3"><div className="flex items-center gap-2 text-[10px] font-bold text-sidebar-primary"><span className="h-1.5 w-1.5 rounded-full bg-sidebar-primary animate-pulse-soft" />CONTROL PLANE ONLINE</div><div className="mt-1 font-mono text-[10px] text-sidebar-foreground/45">stream latency 84ms</div></div>
      <Link href="/settings" data-testid="link-settings" className="flex items-center gap-3 border-t border-sidebar-border px-5 py-4 text-xs font-semibold text-sidebar-foreground/65 hover:text-white"><Settings2 className="h-4 w-4" />Operational settings</Link>
    </aside>
    <div className="md:pl-[248px]"><header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-md md:px-8"><div className="flex items-center gap-3"><button onClick={() => setMobileOpen(true)} data-testid="button-open-navigation" className="rounded-md border border-border p-2 md:hidden"><Menu className="h-4 w-4" /></button><div><div className="text-[10px] font-extrabold uppercase tracking-[.16em] text-muted-foreground">SentinelOps / {activeLabel}</div><div className="mt-1 flex items-center gap-2 text-sm font-bold"><span className="h-2 w-2 rounded-full bg-primary animate-pulse-soft" />Live operations stream</div></div></div><div className="flex items-center gap-2 md:gap-4"><label className="hidden items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-muted-foreground md:flex"><Search className="h-3.5 w-3.5" /><input aria-label="Search operations" data-testid="input-search-operations" className="w-36 bg-transparent text-xs outline-none placeholder:text-muted-foreground" placeholder="Search operations" /></label><div className="hidden items-center gap-2 text-[11px] font-semibold text-muted-foreground sm:flex"><span className={cn('h-2 w-2 rounded-full', healthQuery.data?.status === 'ok' ? 'bg-primary' : 'bg-accent')} />{healthQuery.data?.status === 'ok' ? 'All systems nominal' : 'Control plane checking'}</div><Link href="/settings" data-testid="link-user-settings" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#314253] text-[10px] font-bold text-white">AR</Link></div></header><main className="grid-cockpit min-h-[calc(100dvh-76px)] px-4 py-6 md:px-8 md:py-8">{children}</main></div>
  </div>;
}

function Home() {
  const [replaying, setReplaying] = useState(false);
  const replay = [{ time: '10:40', label: 'Deployment detected', service: 'Release Controller', state: 'signal' }, { time: '10:42', label: 'Incident detected', service: 'Payment Service', state: 'evidence' }, { time: '10:44', label: 'AI investigation started', service: 'SentinelOps AI', state: 'finding' }, { time: '10:45', label: 'Root cause identified', service: 'Database', state: 'finding' }, { time: '10:46', label: 'Human approval', service: 'Command Center', state: 'approval' }, { time: '10:46', label: 'Rollback executed', service: 'Sandbox', state: 'approval' }, { time: '10:47', label: 'Health restored', service: 'Verification Agent', state: 'resolved' }];
  return <div className="mx-auto max-w-[1240px] py-4 md:py-12"><div className="grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr]"><div className="animate-rise"><div className="mb-7 flex items-center gap-3 text-[10px] font-extrabold uppercase tracking-[.2em] text-primary"><span className="flex h-7 w-7 items-center justify-center rounded border border-primary/30 bg-primary/10"><ShieldCheck className="h-4 w-4" /></span>SentinelOps AI · trusted autonomy</div><h1 data-testid="heading-sentinelops-ai" className="max-w-3xl font-display text-[48px] font-bold leading-[.98] tracking-[-.06em] text-foreground md:text-[76px]">The calm inside<br /><span className="text-primary">the incident.</span></h1><p className="mt-7 max-w-xl text-[15px] leading-7 text-muted-foreground">An incident command center that shows its work. SentinelOps follows the signal, lays out the evidence, and waits for a human before anything changes production.</p><div className="mt-9 flex flex-wrap items-center gap-3"><Button href="/command-center" testId="link-launch-command-center">Launch command center <ArrowRight className="h-4 w-4" /></Button><button type="button" onClick={() => setReplaying((value) => !value)} data-testid="button-replay-incident" className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-[12px] font-bold text-foreground hover:bg-muted"><Play className="h-3.5 w-3.5" />{replaying ? 'Pause replay' : 'Watch incident replay'}</button></div><div className="mt-10 flex items-center gap-5 text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground"><span className="flex items-center gap-2"><LockKeyhole className="h-3.5 w-3.5 text-primary" />Human approval required</span><span className="flex items-center gap-2"><RotateCcw className="h-3.5 w-3.5 text-primary" />Rollback ready</span></div></div><div className="scanline relative rounded-xl border border-border bg-card p-5 panel-shadow animate-rise [animation-delay:120ms]"><div className="flex items-center justify-between border-b border-border pb-4"><div><div className="text-[10px] font-extrabold uppercase tracking-[.16em] text-muted-foreground">Deterministic replay</div><div className="mt-1 font-display text-lg font-bold">INC-1042 / Payment API latency spike</div></div><Badge tone="red">CRITICAL</Badge></div><div className="relative mt-5 max-h-[440px] space-y-5 overflow-hidden pl-7">{replay.map((event, index) => <div key={`${event.time}-${event.label}`} className={cn('relative transition-opacity duration-500', replaying || index < 4 ? 'opacity-100' : 'opacity-45')}><span className={cn('absolute -left-7 top-0.5 h-3.5 w-3.5 rounded-full border-2 border-card', event.state === 'approval' ? 'bg-accent' : event.state === 'finding' ? 'bg-primary' : event.state === 'resolved' ? 'bg-primary' : 'bg-sky-500')} /><span className="absolute -left-[25px] top-4 h-12 w-px bg-border last:hidden" /><div className="font-mono text-[10px] text-muted-foreground">{event.time}</div><div className="mt-1 text-sm font-bold">{event.label}</div><div className="mt-1 text-[11px] text-muted-foreground">{event.service}</div></div>)}</div><div className="mt-6 rounded-md bg-[hsl(216_33%_96%)] p-3 text-[11px] leading-5 text-muted-foreground"><Sparkles className="mr-1 inline h-3.5 w-3.5 text-primary" />AI reasoning is visible at every step. No black boxes in the critical path.</div></div></div><div className="mt-20 grid gap-3 md:grid-cols-3"><div className="rounded-lg border border-border bg-card p-5"><div className="font-mono text-[11px] text-primary">01 / DETECT</div><div className="mt-4 font-display text-lg font-bold">See the signal before the noise.</div><p className="mt-2 text-sm leading-6 text-muted-foreground">Bring alerts, traces, logs, and service health into one operational picture.</p></div><div className="rounded-lg border border-border bg-card p-5"><div className="font-mono text-[11px] text-primary">02 / EXPLAIN</div><div className="mt-4 font-display text-lg font-bold">Follow the evidence.</div><p className="mt-2 text-sm leading-6 text-muted-foreground">Every hypothesis carries its supporting spans, log lines, and confidence shift.</p></div><div className="rounded-lg border border-border bg-card p-5"><div className="font-mono text-[11px] text-primary">03 / RECOVER</div><div className="mt-4 font-display text-lg font-bold">Change only what is safe.</div><p className="mt-2 text-sm leading-6 text-muted-foreground">Sandbox, approve, execute, verify — with a rollback path visible all the way through.</p></div></div></div>;
}

function CommandCenter() {
  const summaryQuery = useGetDashboardSummary();
  const incidentsQuery = useGetIncidents();
  const summary = (summaryQuery.data && typeof summaryQuery.data === 'object' && !Array.isArray(summaryQuery.data) && 'systemHealth' in summaryQuery.data) ? (summaryQuery.data as typeof fallbackSummary) : fallbackSummary;
  const incidents = Array.isArray(incidentsQuery.data) ? incidentsQuery.data : fallbackIncidents;
  if (summaryQuery.isLoading && !summaryQuery.data) return <LoadingState label="Loading command center telemetry" />;
  return <div className="mx-auto max-w-[1400px]"><PageHeader eyebrow="Live operational picture" title="Command center" description="One view for the moments when the system is telling you something is wrong." actions={<Button href="/incidents">View all incidents <ArrowRight className="h-3.5 w-3.5" /></Button>} /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Metric label="System health" value={`${summary.systemHealth}%`} detail="within operating envelope" icon={Activity} tone="good" /><Metric label="Active incidents" value={String(summary.activeIncidents)} detail="one needs your attention" icon={AlertTriangle} tone="warn" /><Metric label="Services healthy" value={`${summary.servicesHealthy}/${summary.servicesTotal}`} detail="across production" icon={Server} tone="good" /><Metric label="AI confidence" value={`${summary.aiConfidence}%`} detail="evidence-backed" icon={Bot} tone="good" /><Metric label="Error rate" value={`${summary.errorRate}%`} detail={`recovery avg ${summary.recoveryTime}m`} icon={ArrowDownRight} tone={summary.errorRate > 2 ? 'warn' : 'default'} /></div><div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_.8fr]"><Panel title="Attention queue" action={<Badge tone="red">{incidents.length} active</Badge>}><div className="divide-y divide-border">{incidents.slice(0, 4).map((incident) => <IncidentRow key={incident.id} incident={incident} />)}</div>{!incidents.length && <EmptyState title="No active incidents" copy="The queue is clear. SentinelOps is still watching." icon={ShieldCheck} />}</Panel><Panel title="System posture"><div className="p-5"><div className="flex items-end justify-between"><div><div className="font-display text-5xl font-bold">{summary.systemHealth}</div><div className="mt-1 text-xs text-muted-foreground">health index / 100</div></div><Badge tone="green"><CheckCircle2 className="h-3 w-3" /> Stable</Badge></div><div className="mt-6 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${summary.systemHealth}%` }} /></div><div className="mt-6 grid grid-cols-2 gap-3 text-xs"><div className="rounded-md bg-muted p-3"><div className="font-mono text-[10px] text-muted-foreground">LATENCY P95</div><div className="mt-1 font-bold">184 ms</div></div><div className="rounded-md bg-muted p-3"><div className="font-mono text-[10px] text-muted-foreground">DEPLOYMENTS</div><div className="mt-1 font-bold">3 today</div></div></div></div></Panel></div><div className="mt-6 grid gap-6 lg:grid-cols-2"><Panel title="Service pressure"><ServicePressure /></Panel><Panel title="Recent control activity"><ControlActivity /></Panel></div></div>;
}

function IncidentRow({ incident }: { incident: Incident }) {
  const tone = incident?.severity === 'SEV-1' || incident?.severity === 'CRITICAL' ? 'red' : incident?.severity === 'SEV-2' ? 'amber' : 'blue';
  const workflowLabel = (incident?.workflowState || 'awaiting_approval').replaceAll('_', ' ').replaceAll('-', ' ');
  const confidence = typeof incident?.confidence === 'number' ? (incident.confidence > 1 ? Math.round(incident.confidence) : Math.round(incident.confidence * 100)) : 94;
  const affected = Array.isArray(incident?.affectedServices) ? incident.affectedServices : ['Payment Service', 'Database'];
  return <Link href={`/incidents/${incident.id}`} data-testid={`link-incident-${incident.id}`} className="group flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-muted/55 sm:flex-row sm:items-center"><span className={cn('h-2 w-2 shrink-0 rounded-full', tone === 'red' ? 'bg-destructive' : tone === 'amber' ? 'bg-accent' : 'bg-sky-500')} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Badge tone={tone}>{incident.severity || 'CRITICAL'}</Badge><span className="font-mono text-[10px] text-muted-foreground">{incident.id}</span><Badge tone={incident.workflowState === 'awaiting_approval' || incident.workflowState === 'awaiting-approval' ? 'amber' : 'blue'}>{workflowLabel}</Badge></div><div className="mt-2 truncate text-sm font-bold">{incident.title}</div><div className="mt-1 text-xs text-muted-foreground">{affected.join(' · ')}</div></div><div className="flex items-center gap-3"><span className="text-right text-[11px] text-muted-foreground"><span className="block font-bold text-foreground">{confidence}%</span>confidence</span><ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" /></div></Link>;
}

function ServicePressure() {
  const rows = [['Payment Service', 91, 'elevated'], ['Database', 74, 'watch'], ['API Gateway', 38, 'nominal'], ['Auth Service', 18, 'nominal']];
  return <div className="divide-y divide-border">{rows.map(([name, pressure, state]) => <div key={name} className="flex items-center gap-4 px-5 py-3.5"><div className="w-32 truncate text-xs font-bold">{name}</div><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className={cn('h-full rounded-full', Number(pressure) > 85 ? 'bg-destructive' : Number(pressure) > 60 ? 'bg-accent' : 'bg-primary')} style={{ width: `${pressure}%` }} /></div><span className="w-16 text-right text-[10px] font-mono text-muted-foreground">{state}</span></div>)}</div>;
}

function ControlActivity() {
  return <div className="divide-y divide-border">{[['14:22:31', 'Investigation agent', 'correlated 18 traces'], ['14:20:08', 'Alex Rivera', 'opened approval gate'], ['14:18:44', 'Detection agent', 'attached 42 log lines']].map(([time, actor, action]) => <div key={time} className="flex gap-3 px-5 py-3.5"><div className="font-mono text-[10px] text-muted-foreground">{time}</div><div className="text-xs"><span className="font-bold">{actor}</span> <span className="text-muted-foreground">{action}</span></div></div>)}</div>;
}

function EmptyState({ title, copy, icon: Icon }: { title: string; copy: string; icon: React.ElementType }) {
  return <div data-testid="empty-state" className="flex flex-col items-center justify-center px-6 py-16 text-center"><Icon className="h-8 w-8 text-primary/60" /><div className="mt-4 font-display text-lg font-bold">{title}</div><p className="mt-1 max-w-xs text-sm text-muted-foreground">{copy}</p></div>;
}

function Incidents() {
  const query = useGetIncidents();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const incidents = Array.isArray(query.data) ? query.data : fallbackIncidents;
  const filtered = useMemo(() => incidents.filter((incident) => (filter === 'all' || incident.severity === filter) && `${incident.id} ${incident.title} ${(Array.isArray(incident.affectedServices) ? incident.affectedServices : []).join(' ')}`.toLowerCase().includes(search.toLowerCase())), [filter, incidents, search]);
  return <div className="mx-auto max-w-[1240px]"><PageHeader eyebrow="Operational history" title="Incidents" description="Every signal, hypothesis, decision, and outcome — preserved for the next on-call engineer." actions={<Button href="/investigation" variant="secondary"><Bot className="h-3.5 w-3.5" />Open investigation</Button>} /><Panel><div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-1 overflow-x-auto">{['all', 'SEV-1', 'SEV-2', 'SEV-3'].map((item) => <button key={item} type="button" onClick={() => setFilter(item)} data-testid={`button-filter-${item}`} className={cn('rounded px-3 py-2 text-[10px] font-extrabold uppercase tracking-[.12em]', filter === item ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted')}>{item === 'all' ? 'All incidents' : item}</button>)}</div><label className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs"><Search className="h-3.5 w-3.5 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} data-testid="input-filter-incidents" className="w-full bg-transparent outline-none placeholder:text-muted-foreground" placeholder="Filter incidents" /></label></div>{query.isError ? <ErrorState retry={() => query.refetch()} /> : query.isLoading ? <LoadingState /> : filtered.length ? <div className="divide-y divide-border">{filtered.map((incident) => <IncidentRow key={incident.id} incident={incident} />)}</div> : <EmptyState title="No incidents match" copy="Try a different severity or search term." icon={Search} />}</Panel></div>;
}

function IncidentDetail() {
  const { id } = useParams<{ id: string }>();
  const incidentId = id ?? fallbackIncidents[0].id;
  const incidentQuery = useGetIncident(incidentId);
  const logsQuery = useGetIncidentLogs(incidentId);
  const metricsQuery = useGetIncidentMetrics(incidentId);
  const tracesQuery = useGetIncidentTraces(incidentId);
  const timelineQuery = useGetIncidentTimeline(incidentId);
  const incident = (incidentQuery.data && typeof incidentQuery.data === 'object' && !Array.isArray(incidentQuery.data) && 'id' in incidentQuery.data) ? incidentQuery.data : fallbackIncidents[0];
  const metrics = (metricsQuery.data && typeof metricsQuery.data === 'object' && !Array.isArray(metricsQuery.data)) ? metricsQuery.data : null;
  const logs = Array.isArray(logsQuery.data) ? logsQuery.data : [{ timestamp: '14:09:11', service: 'checkout-api', level: 'ERROR', message: 'redis pool acquire timeout after 250ms' }, { timestamp: '14:09:14', service: 'checkout-api', level: 'WARN', message: 'connection pool at 98% utilization' }];
  const traces = Array.isArray(tracesQuery.data) ? tracesQuery.data : [{ service: 'checkout-api', dependency: 'redis-primary', latency: 842, status: 'degraded' }, { service: 'payments-worker', dependency: 'checkout-api', latency: 284, status: 'degraded' }];
  const affected = Array.isArray(incident.affectedServices) ? incident.affectedServices : ['checkout-api'];
  if (incidentQuery.isLoading && !incidentQuery.data) return <LoadingState label="Loading incident evidence" />;
  return <div className="mx-auto max-w-[1400px]"><PageHeader eyebrow={`Incident ${incident.id}`} title={incident.title} description={`${affected.join(' · ')} · opened ${new Date(incident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC`} actions={<><Button href="/investigation" variant="secondary"><Bot className="h-3.5 w-3.5" />Investigate</Button><Button href="/remediation"><Zap className="h-3.5 w-3.5" />Remediation gate</Button></>} /><div className="mb-6 flex flex-wrap items-center gap-2"><Badge tone="red">{incident.severity}</Badge><Badge tone="amber">{incident.status}</Badge><Badge tone="blue">{(incident.workflowState || '').replaceAll('_', ' ')}</Badge><span className="ml-1 text-xs text-muted-foreground">Last updated {new Date(incident.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC</span></div><div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]"><div className="space-y-6"><Panel title="Root cause assessment"><div className="p-5"><div className="flex items-start gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Sparkles className="h-5 w-5" /></span><div><div className="text-[10px] font-extrabold uppercase tracking-[.14em] text-primary">AI synthesis · {Math.round((typeof incident.confidence === 'number' && incident.confidence <= 1 ? incident.confidence * 100 : incident.confidence) || 94)}% confidence</div><p data-testid="text-root-cause" className="mt-2 font-display text-xl font-bold leading-7">{incident.rootCause}</p><div className="mt-4 rounded-md border border-primary/20 bg-primary/5 p-3 text-xs leading-5 text-foreground/75"><strong>Why this is likely:</strong> Request latency rose immediately after the deployment, and trace spans show pool wait time concentrated at the redis dependency.</div></div></div></div></Panel><Panel title="Evidence stream" action={<span className="font-mono text-[10px] text-muted-foreground">{logs.length} artifacts attached</span>}><div className="grid divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0"><div className="p-5"><div className="mb-4 flex items-center gap-2 text-xs font-bold"><FileSearch className="h-4 w-4 text-primary" />Logs</div><div className="space-y-3">{logs.slice(0, 4).map((log, index) => <div key={`${log.timestamp}-${index}`} className="rounded border border-border bg-muted/45 p-3"><div className="flex justify-between font-mono text-[9px] text-muted-foreground"><span>{log.timestamp}</span><span className={log.level === 'ERROR' ? 'text-destructive' : 'text-accent-foreground'}>{log.level}</span></div><div className="mt-2 text-[11px] leading-5">{log.message}</div></div>)}</div></div><div className="p-5"><div className="mb-4 flex items-center gap-2 text-xs font-bold"><GitBranch className="h-4 w-4 text-primary" />Trace path</div><div className="space-y-3">{traces.map((span, index) => <div key={`${span.service}-${index}`} className="flex items-center gap-3 rounded border border-border p-3"><div className="h-2 w-2 rounded-full bg-destructive" /><div className="min-w-0 flex-1"><div className="text-[11px] font-bold">{span.service} <span className="font-normal text-muted-foreground">→ {span.dependency}</span></div><div className="mt-1 font-mono text-[10px] text-muted-foreground">{span.latency}ms span latency</div></div><Badge tone="red">{span.status}</Badge></div>)}</div></div></div></Panel></div><div className="space-y-6"><Panel title="Live metrics"><div className="grid grid-cols-2 gap-px bg-border">{[['CPU', metrics?.cpu ?? 82, '%'], ['Memory', metrics?.memory ?? 71, '%'], ['P95 latency', metrics?.latency ?? 842, 'ms'], ['Error rate', metrics?.errorRate ?? 4.6, '%'], ['Connections', metrics?.connections ?? 1842, 'open']].map(([label, value, unit]) => <div key={label} className="bg-card p-4"><div className="text-[10px] font-extrabold uppercase tracking-[.12em] text-muted-foreground">{label}</div><div className="mt-2 font-display text-xl font-bold">{value}<span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span></div></div>)}</div></Panel><Panel title="Lifecycle"><div className="p-5"><Lifecycle state={incident.workflowState || 'investigating'} /></div></Panel><Panel title="Timeline" action={<Button href="/timeline" variant="ghost" className="px-0 py-0">Full timeline <ArrowRight className="h-3 w-3" /></Button>}><div className="p-5"><MiniTimeline events={Array.isArray(timelineQuery.data) ? timelineQuery.data : []} /></div></Panel></div></div></div>;
}

function Lifecycle({ state }: { state: string }) {
  const steps = ['detected', 'investigating', 'awaiting approval', 'executing', 'verified'];
  const normalized = (state || '').replaceAll('_', ' ');
  const active = Math.max(0, steps.findIndex((step) => normalized.includes(step)));
  return <div className="space-y-4">{steps.map((step, index) => <div key={step} className="flex items-center gap-3"><span className={cn('flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold', index <= active ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground')}>{index < active ? <Check className="h-3 w-3" /> : index + 1}</span><span className={cn('text-xs font-bold capitalize', index === active ? 'text-foreground' : 'text-muted-foreground')}>{step}</span>{index === active && <span className="ml-auto text-[9px] font-extrabold uppercase tracking-[.12em] text-primary">current</span>}</div>)}</div>;
}

function MiniTimeline({ events }: { events: TimelineEvent[] }) {
  const values = Array.isArray(events) && events.length ? events.slice(0, 4) : [{ timestamp: '14:06', type: 'detected', description: 'Alert threshold breached', service: 'checkout-api', status: 'open' }, { timestamp: '14:09', type: 'evidence', description: 'Trace correlation complete', service: 'investigator', status: 'complete' }, { timestamp: '14:11', type: 'proposal', description: 'Rollback recommendation generated', service: 'remediation-agent', status: 'pending' }] as TimelineEvent[];
  return <div className="space-y-4">{values.map((event, index) => <div key={`${event.timestamp}-${index}`} className="flex gap-3"><div className="relative flex w-3 justify-center"><span className={cn('z-10 mt-1.5 h-2 w-2 rounded-full', event.status === 'complete' ? 'bg-primary' : event.status === 'pending' ? 'bg-accent' : 'bg-destructive')} />{index < values.length - 1 && <span className="absolute top-3 h-full w-px bg-border" />}</div><div className="pb-1"><div className="font-mono text-[10px] text-muted-foreground">{event.timestamp}</div><div className="mt-1 text-xs font-bold">{event.description}</div><div className="mt-1 text-[10px] text-muted-foreground">{event.service}</div></div></div>)}</div>;
}

function Investigation() {
  const incidentsQuery = useGetIncidents();
  const incidentsList = Array.isArray(incidentsQuery.data) ? incidentsQuery.data : fallbackIncidents;
  const selectedId = incidentsList[0]?.id ?? fallbackIncidents[0].id;
  const incidentQuery = useGetIncident(selectedId);
  const logsQuery = useGetIncidentLogs(selectedId);
  const tracesQuery = useGetIncidentTraces(selectedId);
  const investigate = useInvestigateIncident();
  const recommend = useGenerateRecommendation();
  const incident = (incidentQuery.data && typeof incidentQuery.data === 'object' && !Array.isArray(incidentQuery.data) && 'id' in incidentQuery.data) ? incidentQuery.data : fallbackIncidents[0];
  return (
    <div className="mx-auto max-w-[1400px] space-y-7">
      <PageHeader
        eyebrow="Evidence before action"
        title="AI Incident Investigation Swarm"
        description="Collaborative 7-agent investigation rail with autonomous handoffs, live telemetry, and human-in-the-loop remediation control."
        actions={
          <>
            <Button
              onClick={() => investigate.mutate({ id: selectedId })}
              disabled={investigate.isPending}
              variant="secondary"
              testId="button-run-investigation"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', investigate.isPending && 'animate-spin')} />
              {investigate.isPending ? 'Investigating…' : 'Run investigation'}
            </Button>
            <Button
              onClick={() => recommend.mutate({ id: selectedId })}
              disabled={recommend.isPending}
              testId="button-generate-recommendation"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Generate recommendation
            </Button>
          </>
        }
      />

      {/* AI Chat 6 Multi-Agent Swarm Component */}
      <AIIncidentChat incidentId={selectedId} />

      {/* Evidence & Leading Hypothesis */}
      <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <Panel
          title="Leading hypothesis"
          action={
            <Badge tone="green">
              {typeof incident?.confidence === 'number'
                ? incident.confidence <= 1
                  ? Math.round(incident.confidence * 100)
                  : Math.round(incident.confidence)
                : 94}% confidence
            </Badge>
          }
        >
          <div className="p-5">
            <div className="flex gap-4">
              <div className="mt-1 h-8 w-1 rounded-full bg-primary" />
              <div>
                <h2 className="font-display text-2xl font-bold leading-8">{incident.rootCause}</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  The causal chain is consistent across {Array.isArray(logsQuery.data) ? logsQuery.data.length : 18} log artifacts and{' '}
                  {Array.isArray(tracesQuery.data) ? tracesQuery.data.length : 7} trace spans. No competing hypothesis currently exceeds 22%
                  probability.
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-border p-3">
                <div className="font-mono text-[10px] text-muted-foreground">SUPPORTING</div>
                <div className="mt-1 font-display text-lg font-bold">18 logs</div>
              </div>
              <div className="rounded-md border border-border p-3">
                <div className="font-mono text-[10px] text-muted-foreground">CORRELATED</div>
                <div className="mt-1 font-display text-lg font-bold">7 spans</div>
              </div>
              <div className="rounded-md border border-border p-3">
                <div className="font-mono text-[10px] text-muted-foreground">CONFLICTING</div>
                <div className="mt-1 font-display text-lg font-bold">0 signals</div>
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Hypothesis ledger">
          <div className="divide-y divide-border">
            {[
              ['Connection pool regression', 94, 'Strong support'],
              ['Redis node saturation', 22, 'Weak support'],
              ['Regional network degradation', 8, 'Contradicted'],
            ].map(([hypothesis, confidence, note]) => (
              <div key={hypothesis as string} className="flex items-center gap-4 p-4">
                <div className="flex-1">
                  <div className="text-xs font-bold">{hypothesis as string}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{note as string}</div>
                </div>
                <div className="w-24">
                  <div className="mb-1 text-right font-mono text-[10px]">{confidence}%</div>
                  <div className="h-1.5 rounded-full bg-muted">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        Number(confidence) > 70 ? 'bg-primary' : 'bg-muted-foreground/40'
                      )}
                      style={{ width: `${confidence}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function ServiceMap() {
  const summaryQuery = useGetDashboardSummary();
  const incidentQuery = useGetIncidents();
  const incidents = Array.isArray(incidentQuery.data) ? incidentQuery.data : fallbackIncidents;
  const affected = Array.isArray(incidents[0]?.affectedServices) ? incidents[0].affectedServices : ['checkout-api', 'redis-primary', 'payment-gateway'];
  const services = ['edge-router', 'checkout-api', 'payments-worker', 'redis-primary', 'ledger-db', 'notifications'];
  return <div className="mx-auto max-w-[1320px]"><PageHeader eyebrow="Dependency health" title="Service map" description="Understand the blast radius at a glance. Node status reflects current production telemetry." actions={<Button variant="secondary" onClick={() => summaryQuery.refetch()}><RefreshCw className="h-3.5 w-3.5" />Refresh map</Button>} /><div className="grid gap-6 xl:grid-cols-[1.45fr_.55fr]"><Panel title="Production topology" action={<div className="flex gap-3 text-[10px] text-muted-foreground"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" />Healthy</span><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />Watch</span><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-400 animate-ping" />Degraded</span></div>}><div className="relative min-h-[490px] overflow-hidden rounded-xl border border-cyan-500/25 bg-[#050a14] p-6 shadow-inner"><div className="absolute left-[18%] right-[18%] top-[50%] h-px bg-cyan-500/20" /><div className="absolute bottom-[22%] left-[30%] top-[24%] w-px bg-cyan-500/20" /><div className="absolute bottom-[22%] right-[30%] top-[24%] w-px bg-cyan-500/20" /><div className="relative grid h-full grid-cols-3 gap-5"><ServiceNode name="edge-router" status="healthy" icon={Cloud} position="col-start-2" /><ServiceNode name="checkout-api" status="degraded" icon={Code2} position="col-start-1 row-start-2" detail="p95 842ms" /><ServiceNode name="payments-worker" status="watch" icon={Zap} position="col-start-2 row-start-2" detail="queue depth 74%" /><ServiceNode name="notifications" status="healthy" icon={Activity} position="col-start-3 row-start-2" /><ServiceNode name="redis-primary" status="watch" icon={Database} position="col-start-1 row-start-3" detail="pool 68%" /><ServiceNode name="ledger-db" status="healthy" icon={Server} position="col-start-3 row-start-3" /></div></div></Panel><Panel title="Blast radius"><div className="p-5"><div className="flex items-end gap-3"><div className="font-display text-5xl font-extrabold text-rose-400 drop-shadow-[0_0_12px_rgba(244,63,94,0.4)]">{affected.length}</div><div className="pb-1 text-xs text-slate-400">services in active blast radius</div></div><div className="mt-6 space-y-3">{affected.map((service) => <div key={service} className="flex items-center gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5"><span className="h-2 w-2 rounded-full bg-rose-400 animate-ping" /><div className="flex-1 text-xs font-bold text-white">{service}</div><span className="font-mono text-[10px] font-bold text-rose-300">degraded</span></div>)}</div><div className="mt-8 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-5 text-amber-200"><AlertTriangle className="mr-1.5 inline h-3.5 w-3.5 text-amber-400" />Changes to <strong>checkout-api</strong> may cascade to payment authorization.</div></div></Panel></div></div>;
}

function ServiceNode({ name, status, icon: Icon, position, detail }: { name: string; status: string; icon: React.ElementType; position: string; detail?: string }) {
  return <div className={cn('z-10 self-center rounded-xl border bg-[#0d162a]/95 p-3.5 shadow-lg backdrop-blur-md transition-all hover:scale-105', position, status === 'degraded' ? 'border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.3)]' : status === 'watch' ? 'border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]')}><div className="flex items-center gap-2.5"><span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', status === 'degraded' ? 'bg-rose-500/20 text-rose-400' : status === 'watch' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400')}><Icon className="h-4 w-4" /></span><div className="min-w-0"><div className="truncate text-xs font-bold text-white">{name}</div><div className="mt-0.5 flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-slate-400"><span className={cn('h-1.5 w-1.5 rounded-full', status === 'degraded' ? 'bg-rose-400 animate-ping' : status === 'watch' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400')} />{detail ?? status}</div></div></div></div>;
}

function Timeline() {
  const incidentsQuery = useGetIncidents();
  const incidentsList = Array.isArray(incidentsQuery.data) ? incidentsQuery.data : fallbackIncidents;
  const id = incidentsList[0]?.id ?? fallbackIncidents[0].id;
  const timelineQuery = useGetIncidentTimeline(id);
  const events = Array.isArray(timelineQuery.data) ? timelineQuery.data : [];
  const rows = events.length ? events : [{ timestamp: '14:06:12', type: 'detected', description: 'Error rate exceeded 2% threshold in us-east-1', service: 'checkout-api', status: 'open' }, { timestamp: '14:07:41', type: 'investigated', description: 'Agent correlated elevated pool wait with deployment 8f42c1', service: 'investigation-agent', status: 'complete' }, { timestamp: '14:09:03', type: 'finding', description: 'Root cause confidence crossed 90%', service: 'investigation-agent', status: 'complete' }, { timestamp: '14:11:26', type: 'proposed', description: 'Reversible rollback prepared for human approval', service: 'remediation-agent', status: 'pending' }] as TimelineEvent[];
  return <div className="mx-auto max-w-[1050px]"><PageHeader eyebrow="The incident, in order" title="Timeline" description="A precise operational record from first signal through recovery verification." actions={<Button variant="secondary" onClick={() => timelineQuery.refetch()}><RefreshCw className="h-3.5 w-3.5" />Refresh timeline</Button>} /><Panel title={`Incident ${id}`}><div className="p-6 md:p-8"><div className="relative space-y-0">{rows.map((event, index) => <div key={`${event.timestamp}-${index}`} className="relative flex gap-5 pb-9 last:pb-0"><div className="relative flex w-5 shrink-0 justify-center"><span className={cn('z-10 mt-1 h-3 w-3 rounded-full border-4 border-card', event.status === 'complete' ? 'bg-primary' : event.status === 'pending' ? 'bg-accent' : 'bg-destructive')} />{index < rows.length - 1 && <span className="absolute top-4 h-full w-px bg-border" />}</div><div className="flex-1 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/35 md:flex md:items-center md:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[10px] text-muted-foreground">{event.timestamp} UTC</span><Badge tone={event.status === 'complete' ? 'green' : event.status === 'pending' ? 'amber' : 'red'}>{event.type}</Badge></div><div className="mt-2 text-sm font-bold">{event.description}</div><div className="mt-1 text-xs text-muted-foreground">{event.service}</div></div><span className="mt-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground md:mt-0">{event.status}</span></div></div>)}</div></div></Panel></div>;
}

function Remediation() {
  const incidentsQuery = useGetIncidents();
  const incidentsList = Array.isArray(incidentsQuery.data) ? incidentsQuery.data : fallbackIncidents;
  const id = incidentsList[0]?.id ?? fallbackIncidents[0].id;
  const incidentQuery = useGetIncident(id);
  const incident = (incidentQuery.data && typeof incidentQuery.data === 'object' && !Array.isArray(incidentQuery.data) && 'recommendation' in incidentQuery.data) ? incidentQuery.data : fallbackIncidents[0];
  const [stage, setStage] = useState(incident?.workflowState ?? 'awaiting_approval');
  const [note, setNote] = useState('');
  const approve = useApproveIncident();
  const reject = useRejectIncident();
  const execute = useExecuteIncident();
  const rollback = useRollbackIncident();
  const verify = useVerifyIncident();
  const busy = approve.isPending || reject.isPending || execute.isPending || rollback.isPending || verify.isPending;
  const act = (action: 'approve' | 'reject' | 'execute' | 'rollback' | 'verify') => {
    const data = { actor: 'Alex Rivera', note: note || 'Approved from SentinelOps command center.' };
    if (action === 'approve') { approve.mutate({ id, data }, { onSuccess: () => setStage('approved') }); }
    if (action === 'reject') { reject.mutate({ id, data }, { onSuccess: () => setStage('rejected') }); }
    if (action === 'execute') { execute.mutate({ id }, { onSuccess: () => setStage('executing') }); }
    if (action === 'rollback') { rollback.mutate({ id }, { onSuccess: () => setStage('rolled_back') }); }
    if (action === 'verify') { verify.mutate({ id }, { onSuccess: () => setStage('verified') }); }
  };
  const normalizedStage = (stage || '').replaceAll('-', '_');
  const current = normalizedStage.replaceAll('_', ' ');
  return <div className="mx-auto max-w-[1240px]"><PageHeader eyebrow="Human-in-the-loop control" title="Remediation" description="A safe action is not just reversible. It is understood, sandboxed, approved, executed, and verified." actions={<Badge tone={current === 'verified' ? 'green' : 'amber'}><LockKeyhole className="h-3 w-3" />Approval boundary active</Badge>} /><div className="grid gap-6 xl:grid-cols-[1fr_.75fr]"><div className="space-y-6"><Panel title="Action proposal" action={<Badge tone="amber">{incident.risk}</Badge>}><div className="p-5"><div className="flex items-start gap-4"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20 text-accent-foreground"><Zap className="h-5 w-5" /></span><div><div className="font-mono text-[10px] uppercase tracking-[.13em] text-muted-foreground">{id} · proposed action</div><h2 className="mt-2 font-display text-2xl font-bold">{incident.recommendation}</h2><div className="mt-4 flex flex-wrap gap-2"><Badge tone="green"><RotateCcw className="h-3 w-3" />Reversible</Badge><Badge tone="green"><CheckCircle2 className="h-3 w-3" />Rollback available</Badge><Badge tone="blue">Sandbox passed</Badge></div></div></div><div className="mt-6 rounded-md border border-border bg-muted/45 p-4 text-xs leading-5 text-muted-foreground"><strong className="text-foreground">Expected result:</strong> return payment API latency to baseline within 60 seconds; no schema or data-plane changes. Verification watches error rate, p95 latency, and authorization success.</div><label className="mt-5 block text-xs font-bold">Operator note <span className="font-normal text-muted-foreground">(optional)</span><textarea value={note} onChange={(event) => setNote(event.target.value)} data-testid="input-remediation-note" className="mt-2 min-h-20 w-full resize-none rounded-md border border-input bg-card p-3 text-xs outline-none ring-primary focus:ring-2" placeholder="Add context for the audit trail…" /></label></div></Panel><Panel title="Action controls"><div className="flex flex-wrap gap-3 p-5">{normalizedStage === 'awaiting_approval' || normalizedStage === 'rejected' ? <><Button onClick={() => act('approve')} disabled={busy} testId="button-approve-remediation"><Check className="h-4 w-4" />Approve action</Button><Button onClick={() => act('reject')} disabled={busy} variant="danger" testId="button-reject-remediation"><X className="h-4 w-4" />Reject</Button></> : normalizedStage === 'approved' ? <Button onClick={() => act('execute')} disabled={busy} testId="button-execute-remediation"><Play className="h-4 w-4" />Execute in sandbox</Button> : normalizedStage === 'executing' ? <><Button onClick={() => act('verify')} disabled={busy} testId="button-verify-recovery"><ShieldCheck className="h-4 w-4" />Verify recovery</Button><Button onClick={() => act('rollback')} disabled={busy} variant="secondary" testId="button-rollback-remediation"><RotateCcw className="h-4 w-4" />Rollback</Button></> : normalizedStage === 'verified' ? <div className="flex items-center gap-2 rounded-md bg-primary/10 px-4 py-2 text-xs font-bold text-primary"><CheckCircle2 className="h-4 w-4" />Recovery verified and recorded</div> : <Button onClick={() => act('verify')} disabled={busy} testId="button-finish-verification"><ShieldCheck className="h-4 w-4" />Complete verification</Button>}</div></Panel></div><div className="space-y-6"><Panel title="Workflow"><div className="p-5"><Lifecycle state={normalizedStage} /></div></Panel><Panel title="Guardrails"><div className="divide-y divide-border">{[['Scope', 'Payment API deployment only', CheckCircle2], ['Data impact', 'No schema or data writes', Database], ['Rollback', 'Previous stable image ready', RotateCcw], ['Approver', incident.approvedBy ?? 'Awaiting Alex Rivera', Users]].map(([label, value, Icon]) => <div key={label as string} className="flex items-center gap-3 p-4"><Icon className="h-4 w-4 text-primary" /><div className="flex-1"><div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">{label as string}</div><div className="mt-1 text-xs font-bold">{value as string}</div></div></div>)}</div></Panel></div></div></div>;
}

function Sandbox() {
  const [running, setRunning] = useState(false);
  const checks = [['Traffic replay', '12,400 requests sampled', true], ['Previous image', 'checkout-api:7b19d2', true], ['Dependency health', 'redis-primary stable', true], ['Error budget', 'within safe threshold', true]];
  return <div className="mx-auto max-w-[1100px]"><PageHeader eyebrow="No-risk execution rehearsal" title="Sandbox" description="The proposed action runs against a simulated environment before production. Inspect the result, then return to the approval gate." actions={<Button onClick={() => setRunning(true)} disabled={running} testId="button-run-sandbox"><Play className="h-3.5 w-3.5" />{running ? 'Simulation complete' : 'Run simulation'}</Button>} /><div className="grid gap-6 md:grid-cols-[1fr_.8fr]"><Panel title="Simulation status"><div className="p-5"><div className="flex items-center gap-4 rounded-lg border border-primary/25 bg-primary/5 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground"><Cloud className="h-5 w-5" /></div><div><div className="text-sm font-bold">{running ? 'Simulation passed' : 'Environment ready'}</div><div className="mt-1 text-xs text-muted-foreground">{running ? 'Rollback returned all signals to baseline.' : 'Ephemeral environment · us-east-1 · isolated'}</div></div><Badge tone={running ? 'green' : 'blue'}>{running ? 'passed' : 'ready'}</Badge></div><div className="mt-6 space-y-3">{checks.map(([label, value, done]) => <div key={label as string} className="flex items-center gap-3 rounded-md border border-border p-3"><CheckCircle2 className={cn('h-4 w-4', running || done ? 'text-primary' : 'text-muted-foreground')} /><div className="flex-1 text-xs font-bold">{label as string}</div><span className="font-mono text-[10px] text-muted-foreground">{value as string}</span></div>)}</div></div></Panel><Panel title="Environment manifest"><div className="divide-y divide-border font-mono text-[11px]"><div className="flex justify-between p-4"><span className="text-muted-foreground">cluster</span><span>sentinel-sim-04</span></div><div className="flex justify-between p-4"><span className="text-muted-foreground">image</span><span>checkout-api:8f42c1</span></div><div className="flex justify-between p-4"><span className="text-muted-foreground">traffic</span><span>12.4k req/min</span></div><div className="flex justify-between p-4"><span className="text-muted-foreground">expires</span><span>14:42 UTC</span></div></div></Panel></div></div>;
}

function Evaluations() {
  const query = useGetEvaluations();
  const run = useRunEvaluations();
  const data = (query.data && typeof query.data === 'object' && !Array.isArray(query.data)) ? query.data : null;
  const scenarios = Array.isArray(data?.scenarios) ? data.scenarios : [{ id: 'checkout-pool', name: 'Connection pool regression', groundTruth: 'pool exhaustion', agentRootCause: 'pool exhaustion', baselineRootCause: 'redis saturation', agentConfidence: 94, diagnosisSeconds: 186, remediationSuccess: true }, { id: 'cache-eviction', name: 'Cache eviction storm', groundTruth: 'eviction policy', agentRootCause: 'eviction policy', baselineRootCause: 'memory pressure', agentConfidence: 88, diagnosisSeconds: 241, remediationSuccess: true }];
  const agent = (data?.agent && typeof data.agent === 'object') ? data.agent : { rootCauseAccuracy: 91.4, timeToDiagnosis: 212, remediationSuccessRate: 89.2, falsePositiveRate: 4.8, confidenceCalibration: 93 };
  const baseline = (data?.baseline && typeof data.baseline === 'object') ? data.baseline : { rootCauseAccuracy: 67.2, timeToDiagnosis: 488, remediationSuccessRate: 61.8, falsePositiveRate: 16.7, confidenceCalibration: 71 };
  return <div className="mx-auto max-w-[1240px]"><PageHeader eyebrow="Trust, measured" title="Evaluations" description="Compare agent performance to the current baseline using the same incident scenarios and guardrails." actions={<Button onClick={() => run.mutate(undefined, { onSuccess: () => query.refetch() })} disabled={run.isPending} testId="button-run-evaluations"><RefreshCw className={cn('h-3.5 w-3.5', run.isPending && 'animate-spin')} />{run.isPending ? 'Running suite…' : 'Run evaluation suite'}</Button>} /><div className="grid gap-3 md:grid-cols-5">{[['Root cause accuracy', `${agent.rootCauseAccuracy}%`, `${baseline.rootCauseAccuracy}% baseline`], ['Time to diagnosis', `${agent.timeToDiagnosis}s`, `${baseline.timeToDiagnosis}s baseline`], ['Remediation success', `${agent.remediationSuccessRate}%`, `${baseline.remediationSuccessRate}% baseline`], ['False positives', `${agent.falsePositiveRate}%`, `${baseline.falsePositiveRate}% baseline`], ['Confidence calibration', `${agent.confidenceCalibration}%`, `${baseline.confidenceCalibration}% baseline`]].map(([label, value, detail]) => <div key={label} className="rounded-lg border border-border bg-card p-4 panel-shadow"><div className="text-[10px] font-extrabold uppercase tracking-[.1em] text-muted-foreground">{label}</div><div className="mt-3 font-display text-2xl font-bold text-primary">{value}</div><div className="mt-1 text-[10px] text-muted-foreground">{detail}</div></div>)}</div><Panel title="Scenario runs" className="mt-6"><div className="divide-y divide-border">{scenarios.map((scenario) => <div key={scenario.id} className="grid gap-3 p-5 md:grid-cols-[1.3fr_1fr_1fr_.6fr] md:items-center"><div><div className="text-sm font-bold">{scenario.name}</div><div className="mt-1 font-mono text-[10px] text-muted-foreground">{scenario.id} · truth: {scenario.groundTruth}</div></div><div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">SentinelOps</div><div className="mt-1 text-xs font-bold">{scenario.agentRootCause}</div></div><div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Baseline</div><div className="mt-1 text-xs text-muted-foreground">{scenario.baselineRootCause}</div></div><div className="text-left md:text-right"><Badge tone={scenario.remediationSuccess ? 'green' : 'red'}>{scenario.remediationSuccess ? 'passed' : 'failed'}</Badge><div className="mt-1 font-mono text-[10px] text-muted-foreground">{scenario.diagnosisSeconds}s</div></div></div>)}</div></Panel></div>;
}

function Audit() {
  const query = useGetAudit();
  const rows = Array.isArray(query.data) ? query.data : [{ id: 'aud-1', timestamp: '14:22:31', actor: 'Alex Rivera', action: 'opened approval gate', target: 'INC-2048', result: 'pending', risk: 'low', incidentId: 'INC-2048' }, { id: 'aud-2', timestamp: '14:11:26', actor: 'remediation-agent', action: 'generated rollback proposal', target: 'checkout-api', result: 'success', risk: 'low', incidentId: 'INC-2048' }, { id: 'aud-3', timestamp: '14:09:03', actor: 'investigation-agent', action: 'updated root cause confidence', target: 'INC-2048', result: 'success', risk: 'none', incidentId: 'INC-2048' }];
  return <div className="mx-auto max-w-[1240px]"><PageHeader eyebrow="Accountability by default" title="Audit log" description="An append-only record of what the agents observed, what operators approved, and what changed." actions={<Button variant="secondary" onClick={() => query.refetch()}><RefreshCw className="h-3.5 w-3.5" />Refresh log</Button>} /><Panel><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="border-b border-border bg-muted/45 text-[10px] font-extrabold uppercase tracking-[.12em] text-muted-foreground"><tr><th className="px-5 py-3">Time</th><th className="px-5 py-3">Actor</th><th className="px-5 py-3">Action</th><th className="px-5 py-3">Target</th><th className="px-5 py-3">Risk</th><th className="px-5 py-3">Result</th></tr></thead><tbody className="divide-y divide-border">{rows.map((row) => <tr key={row.id} data-testid={`row-audit-${row.id}`} className="text-xs hover:bg-muted/35"><td className="px-5 py-4 font-mono text-[10px] text-muted-foreground">{row.timestamp}</td><td className="px-5 py-4 font-bold">{row.actor}</td><td className="px-5 py-4">{row.action}</td><td className="px-5 py-4 font-mono text-[10px]">{row.target}</td><td className="px-5 py-4"><Badge tone={row.risk === 'low' ? 'green' : row.risk === 'high' ? 'red' : 'neutral'}>{row.risk}</Badge></td><td className="px-5 py-4"><span className={cn('font-bold', row.result === 'success' ? 'text-primary' : row.result === 'pending' ? 'text-accent-foreground' : 'text-muted-foreground')}>{row.result}</span></td></tr>)}</tbody></table></div></Panel></div>;
}

function Settings() {
  const [refresh, setRefresh] = useState(true);
  const [autonomy, setAutonomy] = useState(false);
  const [density, setDensity] = useState('comfortable');
  return <div className="mx-auto max-w-[900px]"><PageHeader eyebrow="Control plane preferences" title="Settings" description="Tune how SentinelOps presents risk and keeps you in the loop. Changes apply to this operator profile." /><div className="space-y-6"><Panel title="Operator profile"><div className="flex items-center gap-4 p-5"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-sidebar text-sm font-bold text-white">AR</div><div><div className="font-display text-lg font-bold">Alex Rivera</div><div className="mt-1 text-xs text-muted-foreground">Platform engineering · primary on-call</div></div><Button variant="secondary" className="ml-auto">Edit profile</Button></div></Panel><Panel title="Operational preferences"><div className="divide-y divide-border"><SettingRow title="Live incident refresh" copy="Keep the command center synchronized with the control plane." checked={refresh} onChange={() => setRefresh(!refresh)} testId="switch-live-refresh" /><SettingRow title="Autonomy previews" copy="Show what an agent would do before it asks for approval." checked={autonomy} onChange={() => setAutonomy(!autonomy)} testId="switch-autonomy-previews" /><div className="flex items-center justify-between gap-5 p-5"><div><div className="text-sm font-bold">Information density</div><div className="mt-1 text-xs text-muted-foreground">Choose the default spacing for evidence tables.</div></div><select value={density} onChange={(event) => setDensity(event.target.value)} data-testid="select-information-density" className="rounded-md border border-input bg-card px-3 py-2 text-xs font-bold outline-none"><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></div></div></Panel><Panel title="Safety defaults"><div className="grid gap-3 p-5 sm:grid-cols-2"><div className="rounded-md border border-primary/25 bg-primary/5 p-4"><ShieldCheck className="h-4 w-4 text-primary" /><div className="mt-3 text-xs font-bold">Human approval required</div><div className="mt-1 text-[11px] leading-5 text-muted-foreground">Always on for production changes. This policy cannot be disabled here.</div></div><div className="rounded-md border border-primary/25 bg-primary/5 p-4"><RotateCcw className="h-4 w-4 text-primary" /><div className="mt-3 text-xs font-bold">Rollback verification</div><div className="mt-1 text-[11px] leading-5 text-muted-foreground">Every executed action must expose a tested recovery path.</div></div></div></Panel></div></div>;
}

function SettingRow({ title, copy, checked, onChange, testId }: { title: string; copy: string; checked: boolean; onChange: () => void; testId: string }) {
  return <div className="flex items-center justify-between gap-5 p-5"><div><div className="text-sm font-bold">{title}</div><div className="mt-1 text-xs text-muted-foreground">{copy}</div></div><button type="button" role="switch" aria-checked={checked} onClick={onChange} data-testid={testId} className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', checked ? 'bg-primary' : 'bg-muted-foreground/35')}><span className={cn('absolute top-1 h-4 w-4 rounded-full bg-white transition-transform', checked ? 'left-6' : 'left-1')} /></button></div>;
}

function Router() {
  const [location] = useLocation();
  const publicPage = location === '/';
  return publicPage ? <Home /> : <AppShell><Switch><Route path="/command-center" component={CommandCenter} /><Route path="/incidents" component={Incidents} /><Route path="/incidents/:id" component={IncidentDetail} /><Route path="/investigation" component={Investigation} /><Route path="/service-map" component={ServiceMap} /><Route path="/timeline" component={Timeline} /><Route path="/remediation" component={Remediation} /><Route path="/sandbox" component={Sandbox} /><Route path="/evaluations" component={Evaluations} /><Route path="/audit" component={Audit} /><Route path="/settings" component={Settings} /><Route component={NotFound} /></Switch></AppShell>;
}

function RoutedErrorBoundary({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><RoutedErrorBoundary><Router /></RoutedErrorBoundary></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;