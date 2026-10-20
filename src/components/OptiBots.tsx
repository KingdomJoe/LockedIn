import { ArrowUpRight, Bot, Cpu, GitPullRequest, Radar, ScanLine } from 'lucide-react';
import type { ProofOfWorkProfile } from '@/types/optimus';
import type { AppView } from '@/components/Sidebar';
import ResearchBriefing from '@/components/ResearchBriefing';
import ViewHeader from '@/components/ViewHeader';

interface OptiBotsProps {
  profile: ProofOfWorkProfile;
  engineMode: 'judge' | 'live';
  liveCount: number;
  llmModel: string;
  onOpenAgents: () => void;
  onNavigate: (view: AppView) => void;
}

export default function OptiBots({
  profile,
  engineMode,
  liveCount,
  llmModel,
  onOpenAgents,
  onNavigate,
}: OptiBotsProps) {
  const bots = [
    {
      id: 'jev',
      name: 'Jev System-1',
      role: 'Calibrated eligibility classifier',
      icon: ScanLine,
      accent: 'text-primary',
      status: 'ACTIVE',
      metrics: [
        { label: 'Latency', value: `${profile.jev.latencyMs}ms` },
        { label: 'Calibration', value: `${profile.jev.calibration}%` },
        { label: 'Heads', value: '24' },
      ],
      detail: 'Parallel RLCD scoring across six competency axes and two application probabilities.',
    },
    {
      id: 'scout',
      name: 'Firecrawl Scout',
      role: 'Live research and opportunity discovery',
      icon: Radar,
      accent: 'text-accent-cyan',
      status: 'ACTIVE',
      metrics: [
        { label: 'Sources', value: `${profile.scout.urlsInspected}` },
        { label: 'Scan time', value: `${profile.scout.lastScanMs}ms` },
        { label: 'Hackathons', value: `${profile.scout.hackathons.length}` },
      ],
      detail: 'Indexes job leads, hackathon programmes, and technical news against the current profile.',
    },
    {
      id: 'forge',
      name: 'Forge Strategist',
      role: 'System-2 synthesis and application drafting',
      icon: Cpu,
      accent: 'text-accent-indigo',
      status: engineMode === 'live' ? 'LIVE' : 'READY',
      metrics: [
        { label: 'Provider', value: engineMode === 'live' ? `${liveCount}/3 live` : 'Deterministic' },
        { label: 'Model', value: llmModel || 'local' },
        { label: 'Drafts', value: `${profile.jobs.length}` },
      ],
      detail: 'Composes research narratives, counterfactual recommendations, and tailored application pitches.',
    },
  ];

  return (
    <div className="mx-auto max-w-[1440px] p-4 sm:p-5">
      <ViewHeader
        index="02"
        title="Opti-Bots"
        description="Three specialist agents operating on one proof-of-work record. Inspect their contracts, live telemetry, and current research output."
        actions={
          <button onClick={onOpenAgents} className="btn-ghost !px-3 !py-2 !text-[10px]">
            <Bot className="h-3.5 w-3.5" />
            Inspect Agent Specs
          </button>
        }
        metrics={[
          { label: 'Active agents', value: '3 / 3' },
          { label: 'Engine mode', value: engineMode === 'live' ? 'Live keys' : 'Judge mode' },
          { label: 'Merged signals', value: `${profile.signals.length}` },
          { label: 'Primary stack', value: profile.languages[0]?.name ?? 'Polyglot' },
        ]}
      />

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {bots.map((bot, index) => {
          const Icon = bot.icon;
          return (
            <article key={bot.id} className="card-hard flex flex-col p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-9 w-9 place-items-center rounded border-1.5 border-ink bg-well">
                  <Icon className={`h-4 w-4 ${bot.accent}`} />
                </span>
                <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-1 font-mono text-[8px] font-bold tracking-[0.08em] text-primary">
                  {bot.status}
                </span>
              </div>
              <p className="mt-3 font-mono text-[8px] font-bold uppercase tracking-[0.08em] text-muted">
                Agent {String(index + 1).padStart(2, '0')}
              </p>
              <h2 className="mt-1 font-display text-[18px] font-bold tracking-[-0.02em] text-content">
                {bot.name}
              </h2>
              <p className="mt-1 text-[11px] leading-snug text-muted">{bot.role}</p>
              <p className="mt-3 text-[11px] leading-[1.55] text-muted">{bot.detail}</p>
              <div className="mt-4 grid grid-cols-3 gap-1.5">
                {bot.metrics.map((metric) => (
                  <div key={metric.label} className="rounded border border-subtle bg-well px-2 py-2">
                    <p className="truncate font-mono text-[7px] uppercase tracking-[0.06em] text-muted">
                      {metric.label}
                    </p>
                    <p className="mt-1 truncate font-mono text-[10px] font-bold text-content">
                      {metric.value}
                    </p>
                  </div>
                ))}
              </div>
              <button
                onClick={onOpenAgents}
                className="mt-4 inline-flex items-center gap-1 self-start font-mono text-[9px] font-bold uppercase tracking-[0.06em] text-primary hover:text-primary-bright"
              >
                Open contract <ArrowUpRight className="h-3 w-3" />
              </button>
            </article>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <ResearchBriefing profile={profile} />

        <div className="space-y-4">
          <section className="panel">
            <div className="panel-header">
              <h2 className="mono-label text-content">Agent stack</h2>
              <span className="font-mono text-[9px] text-muted">Optimized for judge mode</span>
            </div>
            <div className="divide-y divide-subtle">
              {[
                ['01', 'Firecrawl', 'Source retrieval', 'ScrapeTarget → ScrapeBundle'],
                ['02', 'Jev', 'Eligibility calibration', 'Profile + Bundle → RLCD'],
                ['03', 'Forge', 'Synthesis', 'Profile + RLCD → Dossier'],
                ['04', 'Opti', 'Interface commentary', 'Telemetry → narrative'],
              ].map(([index, name, role, contract]) => (
                <div key={name} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="font-mono text-[9px] font-bold text-primary">{index}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-[12px] font-semibold text-content">{name}</p>
                    <p className="font-mono text-[8px] uppercase tracking-[0.06em] text-muted">
                      {role}
                    </p>
                  </div>
                  <span className="hidden shrink-0 font-mono text-[8px] text-muted sm:block">
                    {contract}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2 className="mono-label text-content">Current development brief</h2>
              <GitPullRequest className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-3 p-4">
              <p className="text-[12px] leading-[1.6] text-muted">
                {profile.user.login} currently benchmarks as{' '}
                <span className="font-semibold text-content">{profile.jev.classification}</span>. The
                strongest axis is {profile.strengths[0]} at {profile.competency[profile.strengths[0]]}
                /100; the next improvement target is {profile.gaps[0]}.
              </p>
              <button
                onClick={() => onNavigate('eligibility')}
                className="btn-primary w-full !py-2.5 !text-[10px]"
              >
                Open Eligibility Workspace
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
