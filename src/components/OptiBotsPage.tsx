import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  ArrowUpRight,
  Bot,
  Clock3,
  Globe,
  Loader2,
  Plus,
  Radar,
  Send,
  Sparkles,
  Target,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ProofOfWorkProfile } from '@/types/optimus';
import type { AppView } from '@/components/Sidebar';
import type { ProfileInputs } from '@/services/optimusEngine';
import ViewHeader from '@/components/ViewHeader';
import { soundEngine } from '@/utils/soundEngine';

type BotSource = 'github' | 'x' | 'linkedin' | 'firecrawl' | 'hackernews' | 'arxiv';

interface CustomBot {
  id: string;
  name: string;
  source: BotSource;
  objective: string;
  targetUrl?: string;
  createdAt: number;
}

interface Agent {
  id: string;
  name: string;
  role: string;
  objective: string;
  icon: LucideIcon;
  accent: string;
  custom?: boolean;
}

interface ChatAction {
  label: string;
  view: AppView;
}

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  agent: string;
  body: string;
  time: string;
  action?: ChatAction;
}

interface OptiBotsPageProps {
  profile: ProofOfWorkProfile;
  inputs: ProfileInputs;
  onNavigate: (view: AppView) => void;
}

const SOURCES: {
  id: BotSource;
  label: string;
  short: string;
  icon: LucideIcon;
  accent: string;
}[] = [
  { id: 'github', label: 'GitHub', short: 'GitHub', icon: Bot, accent: 'text-primary' },
  { id: 'x', label: 'X / Twitter', short: 'X', icon: Sparkles, accent: 'text-accent-cyan' },
  {
    id: 'firecrawl',
    label: 'Firecrawl URL',
    short: 'Firecrawl',
    icon: Globe,
    accent: 'text-accent-amber',
  },
  {
    id: 'hackernews',
    label: 'Hacker News',
    short: 'Hacker News',
    icon: Radar,
    accent: 'text-accent-indigo',
  },
  { id: 'arxiv', label: 'arXiv', short: 'arXiv', icon: Target, accent: 'text-accent-coral' },
];

const CORE_AGENTS: Agent[] = [
  {
    id: 'forge',
    name: 'Forge',
    role: 'Career strategy',
    objective: 'Find the shortest path from current evidence to a stronger offer.',
    icon: Target,
    accent: 'text-primary',
  },
  {
    id: 'scout',
    name: 'Scout',
    role: 'Live sources',
    objective: 'Watch live sources for hackathons, roles, and fresh developer signals.',
    icon: Radar,
    accent: 'text-accent-cyan',
  },
  {
    id: 'opti',
    name: 'Opti',
    role: 'Profile synthesis',
    objective: 'Synthesize the proof-of-work profile into clear, grounded answers.',
    icon: Bot,
    accent: 'text-accent-indigo',
  },
];

const SUGGESTIONS = [
  'Find high-fit roles',
  'Where am I weakest?',
  'Draft a 7-day proof plan',
  'Summarize this week\u2019s signals',
];

const STORAGE_KEY = 'lockedin.optibots.custom.v1';

function sourceDefinition(source: BotSource) {
  return SOURCES.find((item) => item.id === source) ?? SOURCES[0];
}

function formatClock() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
      .slice(0, 8);
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

function buildReply(prompt: string, agent: Agent, profile: ProofOfWorkProfile) {
  const query = prompt.toLowerCase();
  const jobs = [...profile.jobs].sort((a, b) => b.pAccept - a.pAccept);
  const topJob = jobs[0];
  const secondJob = jobs[1];
  const gap = profile.gaps[0] ?? 'system depth';
  const secondGap = profile.gaps[1];
  const forge = profile.forge.slice(0, 3);
  const hackathon = profile.scout.hackathons[0];

  if (/(role|job|hire|match|high-fit|position|work)/.test(query)) {
    if (!topJob) {
      return {
        body: 'No role matches are loaded yet. Rebuild your profile, then ask again.',
        action: { label: 'Open Job & Role Matcher', view: 'eligibility' as AppView },
      };
    }
    const lines = [
      `Best fit: ${topJob.role} at ${topJob.org} \u2014 ${Math.round(topJob.pAccept)}% accept, ${Math.round(topJob.pShortlist)}% shortlist.`,
    ];
    if (secondJob) {
      lines.push(
        `Next: ${secondJob.role} at ${secondJob.org} \u2014 ${Math.round(secondJob.pAccept)}% accept.`
      );
    }
    lines.push('Your evidence clears the strongest requirements on both. Start with the first.');
    return {
      body: lines.join('\n'),
      action: { label: 'Open Job & Role Matcher', view: 'eligibility' as AppView },
    };
  }

  if (/(weak|gap|missing|improve|behind)/.test(query)) {
    return {
      body: [
        `The clearest gap is ${gap}.${secondGap ? ` Then ${secondGap}.` : ''}`,
        forge[0]
          ? `Forge suggests "${forge[0].title}" for a +${forge[0].deltaP} pt lift.`
          : 'Add one shipped artifact with measurable scope to close it.',
        'Open Job & Role Matcher to see which requirements depend on it.',
      ].join('\n'),
      action: { label: 'Review role gaps', view: 'eligibility' as AppView },
    };
  }

  if (/(plan|week|roadmap|next|steps|prepare)/.test(query)) {
    if (!forge.length) {
      return {
        body: `Spend seven days closing ${gap}: ship one focused artifact, document the tradeoffs, and link it from your profile.`,
      };
    }
    return {
      body: [
        'Seven-day proof plan:',
        ...forge.map(
          (item, index) =>
            `${index + 1}. ${item.title} \u2014 ${item.effort}, +${item.deltaP} pts on P(Offer).`
        ),
        'Ship in that order. Each item compounds the previous one.',
      ].join('\n'),
      action: { label: 'Open your proof plan', view: 'eligibility' as AppView },
    };
  }

  if (/(signal|news|scout|source|hackathon|scan|fresh|week)/.test(query)) {
    return {
      body: [
        `${profile.signals.length} linked sources and ${profile.repos.length} repos are in the profile.`,
        `${profile.scout.urlsInspected} source URLs were inspected on the last scan.`,
        hackathon
          ? `Best live shortlist: ${hackathon.name} \u2014 ${hackathon.fitScore}% fit.`
          : 'No hackathon shortlist is loaded right now.',
      ].join('\n'),
      action: { label: 'Open Live Firecrawl Scouts', view: 'scout' as AppView },
    };
  }

  if (agent.id === 'forge') {
    return {
      body: `Your strongest axis is ${profile.strengths[0] ?? 'execution'}. Point it at roles that need ${gap} next. Ask for high-fit roles or a seven-day plan.`,
    };
  }

  if (agent.id === 'scout') {
    return {
      body: `I watch ${profile.signals.length} linked sources and the live shortlist. Ask me what changed this week or which hackathon fits best.`,
      action: { label: 'Open Live Firecrawl Scouts', view: 'scout' as AppView },
    };
  }

  if (agent.custom) {
    return {
      body: `I\u2019m ${agent.name}. My objective is: ${agent.objective} I can use your profile evidence to answer questions about it.`,
    };
  }

  return {
    body: `I have your profile locked in: ${profile.repos.length} repos, ${profile.totalStars} stars, ${profile.jobs.length} role matches. Ask for a fit, a gap, or a plan.`,
  };
}

export default function OptiBotsPage({ profile, inputs, onNavigate }: OptiBotsPageProps) {
  const [customBots, setCustomBots] = useState<CustomBot[]>(loadCustomBots);
  const [activeAgentId, setActiveAgentId] = useState('forge');
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftSource, setDraftSource] = useState<BotSource>('firecrawl');
  const [draftObjective, setDraftObjective] = useState('');
  const [draftUrl, setDraftUrl] = useState('');
  const [draftError, setDraftError] = useState<string | null>(null);
  const messageId = useRef(2);
  const timers = useRef<number[]>([]);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const agents = useMemo<Agent[]>(
    () => [
      ...CORE_AGENTS,
      ...customBots.map((bot) => {
        const source = sourceDefinition(bot.source);
        return {
          id: bot.id,
          name: bot.name,
          role: source.short,
          objective: bot.objective,
          icon: source.icon,
          accent: source.accent,
          custom: true,
        };
      }),
    ],
    [customBots]
  );

  const activeAgent = agents.find((agent) => agent.id === activeAgentId) ?? agents[0];
  const topMatch = Math.max(0, ...profile.jobs.map((job) => Math.round(job.pAccept)));
  const linkedSources = [
    inputs.username,
    inputs.linkedinUrl,
    inputs.xHandle,
    inputs.portfolioUrl,
    inputs.certificates,
  ].filter((value) => Boolean(value?.trim())).length;
  const linkedSignalLabel = `${profile.signals.length} linked source${
    profile.signals.length === 1 ? '' : 's'
  }`;

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: 'assistant',
      agent: 'OptiBots',
      body: `Locked in on @${profile.user.login}. ${profile.repos.length} repos and ${linkedSignalLabel} are loaded. Ask me to find a fit, expose a gap, or draft a proof plan.`,
      time: formatClock(),
    },
  ]);

  useEffect(() => {
    saveCustomBots(customBots);
  }, [customBots]);

  useEffect(() => {
    setMessages([
      {
        id: 1,
        role: 'assistant',
        agent: 'OptiBots',
        body: `Locked in on @${profile.user.login}. ${profile.repos.length} repos and ${linkedSignalLabel} are loaded. Ask me to find a fit, expose a gap, or draft a proof plan.`,
        time: formatClock(),
      },
    ]);
    messageId.current = 2;
  }, [
    profile.user.login,
    profile.generatedAt,
    profile.repos.length,
    profile.signals.length,
    linkedSignalLabel,
  ]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, pending]);

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

  const selectAgent = (agentId: string) => {
    setActiveAgentId(agentId);
    soundEngine.playKeyClick();
  };

  const sendMessage = (raw: string) => {
    const text = raw.trim();
    if (!text || pending) return;
    soundEngine.playKeyClick();
    messageId.current += 1;
    setMessages((current) => [
      ...current,
      {
        id: messageId.current,
        role: 'user',
        agent: 'You',
        body: text,
        time: formatClock(),
      },
    ]);
    setDraft('');
    setPending(true);
    const responder = activeAgent;
    const timer = window.setTimeout(() => {
      const reply = buildReply(text, responder, profile);
      messageId.current += 1;
      setMessages((current) => [
        ...current,
        {
          id: messageId.current,
          role: 'assistant',
          agent: responder.name,
          body: reply.body,
          time: formatClock(),
          action: reply.action,
        },
      ]);
      setPending(false);
      soundEngine.playSonarPing();
    }, 520);
    timers.current.push(timer);
  };

  const submitMessage = (event: FormEvent) => {
    event.preventDefault();
    sendMessage(draft);
  };

  const removeCustomBot = (botId: string) => {
    setCustomBots((current) => current.filter((bot) => bot.id !== botId));
    if (activeAgentId === botId) setActiveAgentId('forge');
    soundEngine.playKeyClick();
  };

  const deployCustomBot = (event: FormEvent) => {
    event.preventDefault();
    const name = draftName.trim();
    const objective = draftObjective.trim();
    if (!name) {
      setDraftError('Give the agent a name.');
      return;
    }
    if (objective.length < 12) {
      setDraftError('Describe the objective with at least 12 characters.');
      return;
    }
    if (draftSource === 'firecrawl' && !draftUrl.trim()) {
      setDraftError('Firecrawl agents need a target URL.');
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
    setActiveAgentId(bot.id);
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
        index="04"
        title="Autonomous OptiBots"
        description="A small crew grounded in your proof of work. Ask for roles, gaps, or a plan, and keep the answer in one place."
        actions={
          <button
            onClick={() => {
              setBuilderOpen(true);
              soundEngine.playKeyClick();
            }}
            className="btn-ghost !px-3 !py-2 !text-[10px]"
          >
            <Plus className="h-3.5 w-3.5" />
            New agent
          </button>
        }
        metrics={[
          { label: 'Crew', value: `${agents.length} active` },
          { label: 'Linked sources', value: `${linkedSources}` },
          { label: 'Signals', value: `${profile.signals.length}` },
          { label: 'Top match', value: `${topMatch}%` },
        ]}
      />

      <div className="mx-auto mt-5 w-full max-w-[980px]">
        <section className="flex min-h-[520px] max-h-[680px] flex-col overflow-hidden rounded-lg border-1.5 border-ink bg-surface shadow-hard">
          <header className="flex items-center justify-between gap-3 border-b border-subtle px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded border-1.5 border-ink bg-well shadow-hard">
                <Bot className="h-4 w-4 text-primary" />
              </span>
              <div className="min-w-0">
                <p className="font-display text-[13px] font-bold tracking-[-0.02em] text-content">
                  OptiBots
                </p>
                <p className="truncate font-mono text-[8px] uppercase tracking-[0.06em] text-muted">
                  {activeAgent.name} // {activeAgent.role}
                </p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/35 bg-primary/5 px-2 py-1 font-mono text-[7px] font-bold uppercase tracking-[0.08em] text-primary">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              Local + live
            </span>
          </header>

          <div className="flex flex-wrap items-center gap-1.5 border-b border-subtle bg-well/40 px-3 py-2.5">
            <span className="mr-1 font-mono text-[7px] font-bold uppercase tracking-[0.1em] text-muted">
              Crew
            </span>
            {agents.map((agent) => {
              const Icon = agent.icon;
              const active = agent.id === activeAgent.id;
              return (
                <div
                  key={agent.id}
                  className={`inline-flex items-center rounded-full border transition-colors ${
                    active
                      ? 'border-primary/60 bg-primary/10 text-primary'
                      : 'border-ink bg-well text-muted hover:text-content'
                  }`}
                >
                  <button
                    onClick={() => selectAgent(agent.id)}
                    className="inline-flex items-center gap-1.5 py-1.5 pl-2.5 pr-2 font-mono text-[8px] font-bold uppercase tracking-[0.05em]"
                    aria-pressed={active}
                  >
                    <Icon className={`h-3 w-3 ${active ? '' : agent.accent}`} />
                    {agent.name}
                  </button>
                  {agent.custom && (
                    <button
                      onClick={() => removeCustomBot(agent.id)}
                      className="pr-2 pl-1 text-muted transition-colors hover:text-accent-coral"
                      aria-label={`Remove ${agent.name}`}
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div
            ref={transcriptRef}
            className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4"
            aria-live="polite"
          >
            {messages.map((message) => {
              const isUser = message.role === 'user';
              const action = message.action;
              return (
                <div
                  key={message.id}
                  className={`flex animate-rise-in ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[86%] rounded-lg border px-3.5 py-2.5 sm:max-w-[78%] ${
                      isUser
                        ? 'border-primary/30 bg-primary/10'
                        : 'border-subtle bg-well/70'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[7px] font-bold uppercase tracking-[0.08em] text-muted">
                        {message.agent}
                      </span>
                      <Clock3 className="h-2.5 w-2.5 text-muted/60" />
                      <span className="font-mono text-[7px] text-muted/70">{message.time}</span>
                    </div>
                    <p className="mt-1.5 whitespace-pre-line text-[12px] leading-[1.6] text-content">
                      {message.body}
                    </p>
                    {action && (
                      <button
                        onClick={() => onNavigate(action.view)}
                        className="mt-2 inline-flex items-center gap-1 font-mono text-[8px] font-bold uppercase tracking-[0.06em] text-primary transition-colors hover:text-primary-bright"
                      >
                        {action.label}
                        <ArrowUpRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {pending && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-lg border border-subtle bg-well/70 px-3.5 py-2.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-muted">
                    {activeAgent.name} is reading your profile
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-subtle bg-well/30 px-3 pt-3">
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => sendMessage(suggestion)}
                  disabled={pending}
                  className="rounded-full border border-ink bg-surface px-2.5 py-1 font-mono text-[8px] text-muted transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <form onSubmit={submitMessage} className="mt-2.5 flex items-end gap-2 pb-3">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage(draft);
                  }
                }}
                rows={2}
                placeholder={`Ask ${activeAgent.name} about the profile\u2026`}
                aria-label="Message the OptiBots"
                className="min-h-[52px] flex-1 resize-none rounded border border-subtle bg-surface px-3 py-2 text-[12px] leading-relaxed text-content outline-none transition-colors placeholder:text-muted/60 focus:border-primary/60"
              />
              <button
                type="submit"
                disabled={!draft.trim() || pending}
                className="btn-primary !h-[52px] !w-[52px] !p-0 disabled:cursor-not-allowed disabled:opacity-45"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </section>
        <p className="mt-2 text-center font-mono text-[7px] uppercase tracking-[0.08em] text-muted">
          Answers stay grounded in your proof of work. Enter to send, Shift + Enter for a new line.
        </p>
      </div>

      {builderOpen && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-canvas/85 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setBuilderOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-lg border-1.5 border-ink bg-surface p-5 shadow-hard-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="label-caps text-primary">Optional</p>
                <h2 className="mt-1 font-display text-[20px] font-bold tracking-[-0.025em] text-content">
                  New agent
                </h2>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">
                  Give it a source and a clear objective. It will sit beside the core crew.
                </p>
              </div>
              <button
                onClick={() => setBuilderOpen(false)}
                className="grid h-7 w-7 shrink-0 place-items-center rounded border border-subtle bg-well text-muted transition-colors hover:text-content"
                aria-label="Close agent builder"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <form onSubmit={deployCustomBot} className="mt-4 space-y-3">
              <label className="block">
                <span className="font-mono text-[8px] font-bold uppercase tracking-[0.08em] text-muted">
                  Name
                </span>
                <input
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  placeholder="Launch scout"
                  className="mt-1 w-full rounded border border-subtle bg-well px-3 py-2 text-[12px] text-content outline-none transition-colors placeholder:text-muted/60 focus:border-primary/60"
                />
              </label>

              <label className="block">
                <span className="font-mono text-[8px] font-bold uppercase tracking-[0.08em] text-muted">
                  Source
                </span>
                <select
                  value={draftSource}
                  onChange={(event) => setDraftSource(event.target.value as BotSource)}
                  className="mt-1 w-full rounded border border-subtle bg-well px-3 py-2 text-[12px] text-content outline-none transition-colors focus:border-primary/60"
                >
                  {SOURCES.map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.label}
                    </option>
                  ))}
                </select>
              </label>

              {draftSource === 'firecrawl' && (
                <label className="block">
                  <span className="font-mono text-[8px] font-bold uppercase tracking-[0.08em] text-muted">
                    Target URL
                  </span>
                  <input
                    value={draftUrl}
                    onChange={(event) => setDraftUrl(event.target.value)}
                    placeholder="https://example.com/jobs"
                    className="mt-1 w-full rounded border border-subtle bg-well px-3 py-2 text-[12px] text-content outline-none transition-colors placeholder:text-muted/60 focus:border-primary/60"
                  />
                </label>
              )}

              <label className="block">
                <span className="font-mono text-[8px] font-bold uppercase tracking-[0.08em] text-muted">
                  Objective
                </span>
                <textarea
                  value={draftObjective}
                  onChange={(event) => setDraftObjective(event.target.value)}
                  rows={3}
                  placeholder="Watch this source for roles that match my strongest evidence."
                  className="mt-1 w-full resize-none rounded border border-subtle bg-well px-3 py-2 text-[12px] leading-relaxed text-content outline-none transition-colors placeholder:text-muted/60 focus:border-primary/60"
                />
              </label>

              {draftError && (
                <p className="rounded border border-accent-coral/40 bg-accent-coral/10 px-2.5 py-2 text-[10px] text-accent-coral">
                  {draftError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setBuilderOpen(false)}
                  className="btn-ghost !px-3 !py-2 !text-[10px]"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary !px-3 !py-2 !text-[10px]">
                  <Plus className="h-3.5 w-3.5" />
                  Create agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
