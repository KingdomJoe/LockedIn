import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  AtSign,
  Bot,
  Check,
  ChevronRight,
  CircleDot,
  Clock3,
  ExternalLink,
  FileText,
  Github,
  Globe,
  Linkedin,
  Loader2,
  Newspaper,
  Pause,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Rss,
  Settings2,
  Sparkles,
  Terminal,
  X,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ProofOfWorkProfile } from '@/types/optimus';
import type { AppView } from '@/components/Sidebar';
import type { ProfileInputs } from '@/services/optimusEngine';
import ViewHeader from '@/components/ViewHeader';
import { soundEngine } from '@/utils/soundEngine';

type BotSource = 'github' | 'x' | 'linkedin' | 'firecrawl' | 'hackernews' | 'arxiv';
type BotStatus = 'ACTIVE' | 'PAUSED';

interface FeedItem {
  title: string;
  meta: string;
  value: string;
  href?: string;
}

interface FleetBot {
  id: string;
  name: string;
  role: string;
  source: BotSource;
  sourceLabel: string;
  handle: string;
  accent: string;
  icon: LucideIcon;
  feed: FeedItem[];
  signalCount: number;
  custom?: boolean;
  objective?: string;
  targetUrl?: string;
}

interface CustomBot {
  id: string;
  name: string;
  source: BotSource;
  objective: string;
  targetUrl?: string;
  createdAt: number;
}

interface BotRuntime {
  status: BotStatus;
  runs: number;
  lastRun: number | null;
}

interface FleetLog {
  id: number;
  time: string;
  bot: string;
  text: string;
}

interface OptiBotsPageProps {
  profile: ProofOfWorkProfile;
  inputs: ProfileInputs;
  engineMode: 'judge' | 'live';
  liveCount: number;
  llmModel: string;
  onOpenAgents: () => void;
  onOpenSettings: () => void;
  onNavigate: (view: AppView) => void;
}

const SOURCES: {
  id: BotSource;
  label: string;
  short: string;
  icon: LucideIcon;
  accent: string;
}[] = [
  { id: 'github', label: 'GitHub', short: 'GitHub', icon: Github, accent: 'text-primary' },
  { id: 'x', label: 'X/Twitter', short: 'X', icon: AtSign, accent: 'text-accent-cyan' },
  {
    id: 'firecrawl',
    label: 'Firecrawl Custom URL',
    short: 'Firecrawl',
    icon: Globe,
    accent: 'text-accent-amber',
  },
  {
    id: 'hackernews',
    label: 'HackerNews',
    short: 'HackerNews',
    icon: Newspaper,
    accent: 'text-accent-indigo',
  },
  { id: 'arxiv', label: 'ArXiv', short: 'ArXiv', icon: FileText, accent: 'text-accent-coral' },
];

const STORAGE_KEY = 'lockedin.optibots.custom.v1';
const BOOSTS = [15, 12, 9];
const X_STAMPS = ['2m ago', '14m ago', '43m ago'];

function sourceDefinition(source: BotSource) {
  return SOURCES.find((item) => item.id === source) ?? SOURCES[0];
}

function normalizeHandle(value?: string) {
  return (value ?? '').replace(/^@/, '').trim();
}

function formatClock(value: number | null) {
  if (!value) return 'Never';
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function loadCustomBots(): CustomBot[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is CustomBot => {
        if (!item || typeof item !== 'object') return false;
        const candidate = item as Partial<CustomBot>;
        return (
          typeof candidate.id === 'string' &&
          typeof candidate.name === 'string' &&
          typeof candidate.objective === 'string' &&
          SOURCES.some((source) => source.id === candidate.source)
        );
      })
      .slice(0, 12);
  } catch {
    return [];
  }
}

function saveCustomBots(bots: CustomBot[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bots));
  } catch {
    return;
  }
}

function BotCard({
  bot,
  runtime,
  running,
  onRun,
  onToggleStatus,
  onRemove,
}: {
  bot: FleetBot;
  runtime: BotRuntime;
  running: boolean;
  onRun: () => void;
  onToggleStatus: () => void;
  onRemove?: () => void;
}) {
  const Icon = bot.icon;
  const active = runtime.status === 'ACTIVE';

  return (
    <article className="group flex min-h-[420px] flex-col overflow-hidden rounded-lg border-1.5 border-ink bg-surface shadow-hard transition-colors hover:border-[#3b4250]">
      <header className="flex items-start gap-3 border-b border-subtle px-4 py-3.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded border-1.5 border-ink bg-well shadow-hard">
          <Icon className={`h-4 w-4 ${bot.accent}`} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-muted">
              {bot.sourceLabel}
            </p>
            {bot.custom && (
              <span className="rounded-full border border-accent-indigo/40 bg-accent-indigo/10 px-1.5 py-0.5 font-mono text-[7px] font-bold uppercase tracking-[0.06em] text-accent-indigo">
                Custom
              </span>
            )}
          </div>
          <h2 className="mt-1 truncate font-display text-[16px] font-bold tracking-[-0.02em] text-content">
            {bot.name}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {onRemove && (
            <button
              onClick={onRemove}
              className="grid h-7 w-7 place-items-center rounded border border-transparent text-muted transition-colors hover:border-ink hover:bg-well hover:text-accent-coral"
              aria-label={`Remove ${bot.name}`}
              title="Remove custom bot"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={onToggleStatus}
            className={`rounded-full border px-2 py-1 font-mono text-[7px] font-bold uppercase tracking-[0.08em] transition-colors ${
              active
                ? 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/15'
                : 'border-ink bg-well text-muted hover:text-content'
            }`}
            aria-pressed={active}
            aria-label={`${active ? 'Pause' : 'Resume'} ${bot.name}`}
          >
            {active ? 'Active' : 'Paused'}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col p-4">
        <p className="text-[11px] leading-relaxed text-muted">{bot.role}</p>

        <div className="mt-3 flex items-center gap-2 rounded border border-subtle bg-well px-2.5 py-2">
          <CircleDot
            className={`h-3 w-3 shrink-0 ${active ? 'text-primary' : 'text-muted'}`}
          />
          <span className="min-w-0 flex-1 truncate font-mono text-[9px] text-content">
            {bot.handle}
          </span>
          {bot.targetUrl ? (
            <a
              href={bot.targetUrl}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-muted transition-colors hover:text-primary"
              aria-label={`Open source for ${bot.name}`}
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <span className="shrink-0 font-mono text-[7px] uppercase tracking-[0.06em] text-muted">
              {active ? 'listening' : 'standby'}
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between border-b border-subtle pb-1.5">
          <p className="font-mono text-[8px] font-bold uppercase tracking-[0.08em] text-muted">
            Signal feed
          </p>
          <span className="font-mono text-[8px] text-muted">
            {String(bot.feed.length).padStart(2, '0')} indexed
          </span>
        </div>

        <div className="divide-y divide-subtle">
          {bot.feed.map((item, index) => {
            const content = (
              <>
                <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-subtle bg-well font-mono text-[7px] font-bold text-muted group-hover:text-primary">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block line-clamp-2 font-display text-[11px] font-semibold leading-snug text-content">
                    {item.title}
                  </span>
                  <span className="mt-1 block truncate font-mono text-[8px] text-muted">
                    {item.meta}
                  </span>
                </span>
                <span className="shrink-0 self-center rounded border border-primary/25 bg-primary/5 px-1.5 py-1 font-mono text-[8px] font-bold text-primary">
                  {item.value}
                </span>
              </>
            );

            return item.href ? (
              <a
                key={`${bot.id}-${index}-${item.title}`}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-2 py-2.5 transition-colors hover:bg-subtle/60"
              >
                {content}
              </a>
            ) : (
              <div
                key={`${bot.id}-${index}-${item.title}`}
                className="flex items-start gap-2 py-2.5"
              >
                {content}
              </div>
            );
          })}
        </div>

        {bot.objective && (
          <p className="mt-3 line-clamp-2 rounded border border-dashed border-ink bg-well/60 px-2.5 py-2 font-mono text-[8px] leading-relaxed text-muted">
            OBJECTIVE // {bot.objective}
          </p>
        )}
      </div>

      <footer className="mt-auto border-t border-subtle bg-well/50 px-4 py-3">
        <div className="mb-2 grid grid-cols-3 gap-1.5">
          {[
            ['Signals', String(bot.signalCount).padStart(2, '0')],
            ['Runs', String(runtime.runs).padStart(2, '0')],
            ['Last run', formatClock(runtime.lastRun)],
          ].map(([label, value]) => (
            <div key={label} className="rounded border border-subtle bg-surface px-2 py-1.5">
              <p className="truncate font-mono text-[6px] uppercase tracking-[0.08em] text-muted">
                {label}
              </p>
              <p className="mt-0.5 truncate font-mono text-[9px] font-bold text-content">{value}</p>
            </div>
          ))}
        </div>
        <button
          onClick={onRun}
          disabled={running || !active}
          className="btn-ghost w-full !py-2 !text-[9px]"
        >
          {running ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : active ? (
            <Play className="h-3.5 w-3.5" />
          ) : (
            <Pause className="h-3.5 w-3.5" />
          )}
          {running ? 'Executing…' : active ? 'Run Bot Now' : 'Fleet paused'}
        </button>
      </footer>
    </article>
  );
}

export default function OptiBotsPage({
  profile,
  inputs,
  engineMode,
  liveCount,
  llmModel,
  onOpenAgents,
  onOpenSettings,
  onNavigate,
}: OptiBotsPageProps) {
  const [customBots, setCustomBots] = useState<CustomBot[]>(() => loadCustomBots());
  const [runtime, setRuntime] = useState<Record<string, BotRuntime>>({});
  const [runningIds, setRunningIds] = useState<string[]>([]);
  const [logs, setLogs] = useState<FleetLog[]>(() => [
    {
      id: 1,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      bot: 'Fleet',
      text: 'Profile agents provisioned. Watching public evidence streams.',
    },
  ]);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftSource, setDraftSource] = useState<BotSource>('firecrawl');
  const [draftObjective, setDraftObjective] = useState('');
  const [draftUrl, setDraftUrl] = useState('');
  const [draftError, setDraftError] = useState<string | null>(null);
  const logId = useRef(1);
  const timers = useRef<number[]>([]);

  const xHandle = normalizeHandle(inputs.xHandle);
  const linkedinUrl = (inputs.linkedinUrl ?? '').trim();
  const certificateCount = (inputs.certificates ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean).length;

  const profileBots = useMemo<FleetBot[]>(() => {
    const githubFeed: FeedItem[] = profile.forge.slice(0, 3).map((item, index) => ({
      title: item.title,
      meta: `${item.provider} · ${item.axis}`,
      value: `+${BOOSTS[index] ?? 9}% depth`,
      href: item.url,
    }));

    const xFeed: FeedItem[] = profile.scout.news.slice(0, 3).map((story, index) => ({
      title: story.headline,
      meta: `${story.source} · ${X_STAMPS[index] ?? '1h ago'}`,
      value: `${Math.min(
        99,
        Math.round((profile.jev.pShortlist + profile.jev.pOffer) / 2) + index * 3
      )}% match`,
    }));

    const linkedinFeed: FeedItem[] = profile.jobs.slice(0, 3).map((job) => ({
      title: `${job.role} — ${job.org}`,
      meta: `Hiring manager · ${job.location}`,
      value: `${Math.min(99, job.pAccept + 4)}% fit`,
    }));

    return [
      {
        id: 'profile-github',
        name: 'GitHub Proof Scout',
        role: 'Tracks merged work, open issues, and maintainer gravity to surface the highest-leverage contribution targets.',
        source: 'github',
        sourceLabel: 'GitHub',
        handle: `github.com/${profile.user.login}`,
        accent: 'text-primary',
        icon: Github,
        feed:
          githubFeed.length > 0
            ? githubFeed
            : [
                {
                  title: 'Repository evidence is loading',
                  meta: profile.languages[0]?.name ?? 'Polyglot',
                  value: 'Pending',
                },
              ],
        signalCount: profile.repos.length,
        targetUrl: profile.user.html_url,
      },
      {
        id: 'profile-x',
        name: 'X Signal Relay',
        role: 'Filters the builder firehose for hiring managers, bounties, hackathons, and high-signal technical launches.',
        source: 'x',
        sourceLabel: 'X / Twitter',
        handle: xHandle
          ? `x.com/${xHandle}`
          : 'Public X proxy · link handle in Settings',
        accent: 'text-accent-cyan',
        icon: AtSign,
        feed:
          xFeed.length > 0
            ? xFeed
            : [
                {
                  title: 'Link an X handle to activate the signal stream',
                  meta: 'Settings → Profile',
                  value: 'Inactive',
                },
              ],
        signalCount: profile.scout.news.length,
        targetUrl: xHandle ? `https://x.com/${xHandle}` : undefined,
      },
      {
        id: 'profile-linkedin',
        name: 'LinkedIn Opportunity Agent',
        role: 'Scans hiring-manager activity, credential requirements, and leadership signals against the calibrated evidence graph.',
        source: 'linkedin',
        sourceLabel: 'LinkedIn',
        handle: linkedinUrl || 'Public opportunity graph · link profile in Settings',
        accent: 'text-accent-indigo',
        icon: Linkedin,
        feed:
          linkedinFeed.length > 0
            ? linkedinFeed
            : [
                {
                  title: 'Add a LinkedIn URL to unlock opportunity signals',
                  meta: 'Settings → Profile',
                  value: 'Inactive',
                },
              ],
        signalCount: profile.jobs.length,
        targetUrl: linkedinUrl ? `https://${linkedinUrl.replace(/^https?:\/\//, '')}` : undefined,
      },
    ];
  }, [profile, xHandle, linkedinUrl]);

  const customFleet = useMemo<FleetBot[]>(
    () =>
      customBots.map((bot) => {
        const definition = sourceDefinition(bot.source);
        const runs = runtime[bot.id]?.runs ?? 0;
        return {
          id: bot.id,
          name: bot.name,
          role: 'Custom objective-driven agent running against the selected evidence source.',
          source: bot.source,
          sourceLabel: 'Custom deployment',
          handle: bot.targetUrl || `${definition.label} · objective armed`,
          accent: definition.accent,
          icon: definition.icon,
          custom: true,
          objective: bot.objective,
          targetUrl: bot.targetUrl,
          signalCount: runs * 3,
          feed: [
            {
              title: bot.objective,
              meta: `${definition.label} · ${runs === 0 ? 'awaiting first run' : 'last run indexed'}`,
              value: runs === 0 ? 'Armed' : `${runs * 3} signals`,
            },
            {
              title: `Source contract: ${definition.label}`,
              meta: bot.targetUrl || 'Native source adapter',
              value: 'Bound',
            },
            {
              title: 'Output routed to the opportunity workspace',
              meta: 'Eligibility + Dispatch',
              value: 'Queued',
            },
          ],
        };
      }),
    [customBots, runtime]
  );

  const fleet = [...profileBots, ...customFleet];
  const runtimeFor = (id: string): BotRuntime =>
    runtime[id] ?? { status: 'ACTIVE', runs: 0, lastRun: null };
  const activeCount = fleet.filter((bot) => runtimeFor(bot.id).status === 'ACTIVE').length;
  const connectedSources = [true, Boolean(xHandle), Boolean(linkedinUrl)].filter(Boolean).length;
  const lastScan = Math.max(
    0,
    ...Object.values(runtime)
      .map((item) => item.lastRun ?? 0)
      .filter(Boolean)
  );

  useEffect(() => {
    saveCustomBots(customBots);
  }, [customBots]);

  useEffect(() => {
    if (!builderOpen) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setBuilderOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [builderOpen]);

  useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
    },
    []
  );

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const pushLog = (bot: string, text: string) => {
    logId.current += 1;
    setLogs((current) =>
      [
        {
          id: logId.current,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          bot,
          text,
        },
        ...current,
      ].slice(0, 24)
    );
  };

  const toggleStatus = (bot: FleetBot) => {
    const current = runtimeFor(bot.id);
    const nextStatus = current.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    setRuntime((state) => ({
      ...state,
      [bot.id]: { ...current, status: nextStatus },
    }));
    pushLog(bot.name, nextStatus === 'ACTIVE' ? 'Agent resumed. Listening for new evidence.' : 'Agent paused. Runtime state preserved.');
    soundEngine.playKeyClick();
  };

  const runBot = (bot: FleetBot) => {
    const current = runtimeFor(bot.id);
    if (current.status !== 'ACTIVE' || runningIds.includes(bot.id)) return;
    setRunningIds((ids) => [...ids, bot.id]);
    soundEngine.playSonarPing();

    const steps =
      bot.source === 'github'
        ? [
            `Reading recent pushes for @${profile.user.login}.`,
            'Scoring 3 contribution targets across six competency axes.',
            'Run complete. Depth deltas locked into the evidence graph.',
          ]
        : bot.source === 'x'
          ? [
              `Opening X firehose for ${xHandle ? `@${xHandle}` : 'the linked builder graph'}.`,
              'Mapped hiring, bounty, and hackathon signals.',
              'Run complete. P(Shortlist) telemetry refreshed.',
            ]
          : bot.source === 'linkedin'
            ? [
                'Inspecting hiring-manager and leadership signals.',
                `Verifying ${certificateCount} credential${certificateCount === 1 ? '' : 's'} against role requirements.`,
                'Run complete. Opportunity queue updated.',
              ]
            : [
                `Executing objective: ${bot.objective ?? bot.role}`,
                `Crawling ${bot.sourceLabel} with provenance checks enabled.`,
                'Run complete. Three evidence rows appended to the fleet ledger.',
              ];

    pushLog(bot.name, steps[0]);
    timers.current.push(
      window.setTimeout(() => pushLog(bot.name, steps[1]), 550),
      window.setTimeout(() => pushLog(bot.name, steps[2]), 1250),
      window.setTimeout(() => {
        setRuntime((state) => ({
          ...state,
          [bot.id]: {
            status: 'ACTIVE',
            runs: current.runs + 1,
            lastRun: Date.now(),
          },
        }));
        setRunningIds((ids) => ids.filter((id) => id !== bot.id));
        soundEngine.playJevMatrixLock();
      }, 1700)
    );
  };

  const runAll = () => {
    fleet
      .filter((bot) => runtimeFor(bot.id).status === 'ACTIVE')
      .slice(0, 6)
      .forEach((bot, index) => {
        timers.current.push(window.setTimeout(() => runBot(bot), index * 180));
      });
  };

  const deployCustomBot = (event: FormEvent) => {
    event.preventDefault();
    const name = draftName.trim();
    const objective = draftObjective.trim();
    if (!name) {
      setDraftError('Give the custom Opti-Bot a name.');
      return;
    }
    if (objective.length < 12) {
      setDraftError('Describe an objective with at least 12 characters.');
      return;
    }
    if (draftSource === 'firecrawl' && !draftUrl.trim()) {
      setDraftError('Firecrawl deployments need a target URL.');
      return;
    }
    const bot: CustomBot = {
      id: `custom-${Date.now()}`,
      name,
      source: draftSource,
      objective,
      targetUrl: draftUrl.trim() || undefined,
      createdAt: Date.now(),
    };
    setCustomBots((current) => [bot, ...current]);
    pushLog(name, `Deployed to the active fleet via ${sourceDefinition(draftSource).label}.`);
    setNotice(`${name} deployed. The agent is now listening for ${sourceDefinition(draftSource).short} evidence.`);
    setDraftName('');
    setDraftSource('firecrawl');
    setDraftObjective('');
    setDraftUrl('');
    setDraftError(null);
    setBuilderOpen(false);
    soundEngine.playJevMatrixLock();
  };

  return (
    <div className="mx-auto max-w-[1440px] p-4 sm:p-5">
      <ViewHeader
        index="02"
        title="Opti-Bots"
        description="A live command grid of autonomous research agents. Each profile-linked bot watches a different source, scores evidence against your calibrated index, and feeds the Eligibility, Scout, and Dispatch workspaces."
        actions={
          <>
            <button onClick={onOpenAgents} className="btn-ghost !px-3 !py-2 !text-[10px]">
              <FileText className="h-3.5 w-3.5" />
              Inspect Agent Specs
            </button>
            <button
              onClick={() => {
                setBuilderOpen(true);
                soundEngine.playKeyClick();
              }}
              className="btn-primary !px-3 !py-2 !text-[10px]"
            >
              <Plus className="h-3.5 w-3.5" />
              + Deploy Custom Opti-Bot
            </button>
          </>
        }
        metrics={[
          { label: 'Active fleet', value: `${activeCount} / ${fleet.length}` },
          { label: 'Source coverage', value: `${connectedSources} / 3 linked` },
          { label: 'Engine mode', value: engineMode === 'live' ? 'Live keys' : 'Judge mode' },
          { label: 'Last execution', value: formatClock(lastScan) },
        ]}
      />

      {notice && (
        <div className="mt-4 flex items-center gap-2 rounded border border-primary/40 bg-primary/5 px-3 py-2.5 text-[10px] text-primary shadow-hard">
          <Check className="h-3.5 w-3.5 shrink-0" />
          {notice}
        </div>
      )}

      <section className="mt-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="label-caps text-primary">Auto-spawned profile fleet</p>
            <h2 className="mt-1 font-display text-[20px] font-bold tracking-[-0.025em] text-content">
              Command grid
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.06em] text-muted sm:flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              3 agents provisioned from your profile
            </span>
            <button
              onClick={runAll}
              disabled={activeCount === 0 || runningIds.length > 0}
              className="btn-ghost !px-2.5 !py-1.5 !text-[8px]"
            >
              <RefreshCw className={`h-3 w-3 ${runningIds.length > 0 ? 'animate-spin' : ''}`} />
              Run active fleet
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {profileBots.map((bot) => (
            <BotCard
              key={bot.id}
              bot={bot}
              runtime={runtimeFor(bot.id)}
              running={runningIds.includes(bot.id)}
              onRun={() => runBot(bot)}
              onToggleStatus={() => toggleStatus(bot)}
            />
          ))}
        </div>

        {customFleet.length > 0 && (
          <>
            <div className="mb-3 mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-subtle pt-5">
              <div>
                <p className="label-caps text-accent-indigo">Custom deployment fleet</p>
                <h2 className="mt-1 font-display text-[18px] font-bold tracking-[-0.02em] text-content">
                  Objective-driven agents
                </h2>
              </div>
              <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-muted">
                {customFleet.length} / 12 slots used
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {customFleet.map((bot) => (
                <BotCard
                  key={bot.id}
                  bot={bot}
                  runtime={runtimeFor(bot.id)}
                  running={runningIds.includes(bot.id)}
                  onRun={() => runBot(bot)}
                  onToggleStatus={() => toggleStatus(bot)}
                  onRemove={() => {
                    setCustomBots((current) => current.filter((item) => item.id !== bot.id));
                    pushLog(bot.name, 'Custom agent removed from the active fleet.');
                  }}
                />
              ))}
            </div>
          </>
        )}
      </section>

      <section className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        <div className="overflow-hidden rounded-lg border-1.5 border-ink bg-surface shadow-hard">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-subtle px-4 py-3">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-primary" />
              <h2 className="mono-label text-content">Fleet execution log</h2>
              <span className="flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-mono text-[7px] font-bold uppercase tracking-[0.06em] text-primary">
                <Radio className="h-2.5 w-2.5 animate-pulse" />
                Live
              </span>
            </div>
            <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-muted">
              {logs.length} events buffered
            </span>
          </div>
          <div className="max-h-[290px] min-h-[290px] overflow-y-auto bg-canvas">
            {logs.map((log) => (
              <div
                key={log.id}
                className="grid grid-cols-[52px_minmax(0,1fr)] gap-2 border-b border-subtle/60 px-4 py-2 font-mono text-[9px] sm:grid-cols-[52px_130px_minmax(0,1fr)]"
              >
                <span className="text-muted/70">{log.time}</span>
                <span className="hidden truncate font-bold text-accent-cyan sm:block">{log.bot}</span>
                <span className="min-w-0 text-muted">
                  <span className="mr-1 text-primary">›</span>
                  {log.text}
                </span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-subtle bg-well px-4 py-2.5">
            <p className="font-mono text-[8px] text-muted">
              <span className="text-primary">$</span> opti fleet run --active --provenance
            </p>
            <button
              onClick={runAll}
              disabled={activeCount === 0 || runningIds.length > 0}
              className="inline-flex items-center gap-1 font-mono text-[8px] font-bold uppercase tracking-[0.06em] text-primary hover:text-primary-bright disabled:opacity-50"
            >
              {runningIds.length > 0 ? 'Fleet executing' : 'Execute all active'}
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <section className="rounded-lg border-1.5 border-ink bg-surface shadow-hard">
            <div className="flex items-center justify-between border-b border-subtle px-4 py-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-accent-cyan" />
                <h2 className="mono-label text-content">Execution protocol</h2>
              </div>
              <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-muted">
                {liveCount} / 3 live keys
              </span>
            </div>
            <div className="divide-y divide-subtle">
              {[
                ['01', 'Observe', 'Pull public evidence with provenance and timestamps.'],
                ['02', 'Calibrate', 'Score each signal against Jev competency axes.'],
                ['03', 'Route', 'Write matches into Eligibility, Scout, or Dispatch.'],
                ['04', 'Verify', 'Log every run with source coverage and depth delta.'],
              ].map(([index, title, body]) => (
                <div key={index} className="flex items-start gap-3 px-4 py-2.5">
                  <span className="font-mono text-[9px] font-bold text-primary">{index}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-[11px] font-semibold text-content">{title}</p>
                    <p className="mt-0.5 text-[9px] leading-snug text-muted">{body}</p>
                  </div>
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-primary/60" />
                </div>
              ))}
            </div>
            <div className="border-t border-subtle bg-well px-4 py-2.5">
              <p className="font-mono text-[8px] uppercase tracking-[0.06em] text-muted">
                Synthesis model · {llmModel || 'deterministic local'}
              </p>
            </div>
          </section>

          <section className="rounded-lg border-1.5 border-ink bg-surface p-4 shadow-hard">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="mono-label text-content">Profile source linkage</h2>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2">
              {[
                {
                  label: 'GitHub',
                  value: `@${profile.user.login}`,
                  connected: true,
                  icon: Github,
                },
                {
                  label: 'X / Twitter',
                  value: xHandle ? `@${xHandle}` : 'Not linked',
                  connected: Boolean(xHandle),
                  icon: AtSign,
                },
                {
                  label: 'LinkedIn',
                  value: linkedinUrl || 'Not linked',
                  connected: Boolean(linkedinUrl),
                  icon: Linkedin,
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 rounded border border-subtle bg-well px-2.5 py-2"
                  >
                    <Icon
                      className={`h-3.5 w-3.5 shrink-0 ${
                        item.connected ? 'text-primary' : 'text-muted'
                      }`}
                    />
                    <span className="min-w-0 flex-1 truncate font-mono text-[8px] text-muted">
                      {item.value}
                    </span>
                    <span
                      className={`shrink-0 font-mono text-[7px] font-bold uppercase tracking-[0.06em] ${
                        item.connected ? 'text-primary' : 'text-muted'
                      }`}
                    >
                      {item.connected ? 'Synced' : 'Missing'}
                    </span>
                  </div>
                );
              })}
            </div>
            <button
              onClick={onOpenSettings}
              className="btn-ghost mt-3 w-full !py-2 !text-[9px]"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Re-key profile sources
            </button>
          </section>

          <section className="rounded-lg border-1.5 border-ink bg-surface p-4 shadow-hard">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-accent-amber" />
                <h2 className="mono-label text-content">Fleet output</h2>
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-muted" />
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-muted">
              {profile.scout.news.length} news signals, {profile.jobs.length} calibrated roles, and{' '}
              {profile.scout.hackathons.length} hackathon programmes are currently indexed.
            </p>
            <button
              onClick={() => {
                soundEngine.playKeyClick();
                onNavigate('eligibility');
              }}
              className="btn-primary mt-3 w-full !py-2 !text-[9px]"
            >
              Open eligibility workspace
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </section>
        </div>
      </section>

      {builderOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-canvas/85 p-4 backdrop-blur-sm"
          onClick={() => setBuilderOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="optibot-builder-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg border-1.5 border-ink bg-surface shadow-hard-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <form onSubmit={deployCustomBot}>
              <div className="flex items-start justify-between gap-3 border-b border-subtle px-5 py-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded border-1.5 border-ink bg-primary text-primary-ink shadow-hard">
                    <Bot className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="label-caps text-primary">Fleet deployment</p>
                    <h2
                      id="optibot-builder-title"
                      className="mt-1 font-display text-[20px] font-bold tracking-[-0.02em] text-content"
                    >
                      Deploy custom Opti-Bot
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBuilderOpen(false)}
                  className="grid h-7 w-7 place-items-center rounded border border-transparent text-muted hover:border-ink hover:bg-well hover:text-content"
                  aria-label="Close custom Opti-Bot builder"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-4 p-5">
                <label className="block">
                  <span className="label-caps mb-1.5 block">Bot name *</span>
                  <input
                    value={draftName}
                    onChange={(event) => {
                      setDraftName(event.target.value);
                      if (draftError) setDraftError(null);
                    }}
                    placeholder="Compiler Watch"
                    className="field-input"
                    autoFocus
                  />
                </label>

                <div>
                  <span className="label-caps mb-1.5 block">Evidence source *</span>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {SOURCES.map((source) => {
                      const Icon = source.icon;
                      const active = draftSource === source.id;
                      return (
                        <button
                          key={source.id}
                          type="button"
                          onClick={() => {
                            setDraftSource(source.id);
                            setDraftError(null);
                          }}
                          aria-pressed={active}
                          className={`flex items-center gap-2 rounded border-1.5 px-3 py-2.5 text-left transition-colors ${
                            active
                              ? 'border-primary/60 bg-primary/10 text-content'
                              : 'border-ink bg-well text-muted hover:bg-subtle hover:text-content'
                          }`}
                        >
                          <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-primary' : ''}`} />
                          <span className="font-mono text-[9px] font-semibold">{source.label}</span>
                          {active && <Check className="ml-auto h-3 w-3 shrink-0 text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="block">
                  <span className="label-caps mb-1.5 block">Objective *</span>
                  <textarea
                    value={draftObjective}
                    onChange={(event) => {
                      setDraftObjective(event.target.value);
                      if (draftError) setDraftError(null);
                    }}
                    placeholder="Watch compiler and runtime repositories for good-first-issues with maintainer responses."
                    className="field-input min-h-[92px] resize-y leading-relaxed"
                  />
                </label>

                <label className="block">
                  <span className="label-caps mb-1.5 flex items-center gap-1.5">
                    <Globe className="h-3 w-3" />
                    {draftSource === 'firecrawl' ? 'Target URL *' : 'Source URL / handle'}
                  </span>
                  <input
                    value={draftUrl}
                    onChange={(event) => {
                      setDraftUrl(event.target.value);
                      if (draftError) setDraftError(null);
                    }}
                    placeholder={
                      draftSource === 'firecrawl'
                        ? 'https://example.com/jobs'
                        : draftSource === 'arxiv'
                          ? 'https://arxiv.org/list/cs.SE/recent'
                          : 'Optional source target'
                    }
                    className="field-input"
                  />
                  <span className="mt-1 block font-mono text-[8px] text-muted/80">
                    Runs against a cached dataset in judge mode; live crawls start when keys are
                    configured.
                  </span>
                </label>

                {draftError && (
                  <p className="rounded border border-accent-coral/40 bg-accent-coral/5 px-3 py-2 font-mono text-[9px] text-accent-coral">
                    {draftError}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-subtle bg-well px-5 py-3.5">
                <p className="font-mono text-[8px] uppercase tracking-[0.06em] text-muted">
                  Adds to active fleet · simulated in judge mode
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBuilderOpen(false)}
                    className="btn-ghost !px-3 !py-2 !text-[9px]"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary !px-3 !py-2 !text-[9px]">
                    <Plus className="h-3.5 w-3.5" />
                    Deploy agent
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded border border-subtle bg-well px-4 py-3">
        <p className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.06em] text-muted">
          <Clock3 className="h-3 w-3 text-primary" />
          Fleet telemetry persists locally · every run is inspectable
        </p>
        <button
          onClick={onOpenAgents}
          className="inline-flex items-center gap-1 font-mono text-[8px] font-bold uppercase tracking-[0.06em] text-accent-cyan hover:text-primary"
        >
          <Rss className="h-3 w-3" />
          Read the agent contract
          <ArrowUpRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
