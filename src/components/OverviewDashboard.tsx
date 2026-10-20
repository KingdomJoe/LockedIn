import {
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { ArrowRight, ArrowUpRight, ExternalLink, FileText, Radar, RefreshCw } from 'lucide-react';
import type { ProofOfWorkProfile } from '@/types/optimus';
import type { AppView } from '@/components/Sidebar';
import PalantirOrb from '@/components/PalantirOrb';
import JevProbabilityChart from '@/components/JevProbabilityChart';
import { soundEngine } from '@/utils/soundEngine';

interface OverviewDashboardProps {
  profile: ProofOfWorkProfile;
  boostedPOffer: number;
  auraLevel: number;
  scanning: boolean;
  scanTarget: string | null;
  onRunScout: () => Promise<void>;
  scouting: boolean;
  onNavigate: (view: AppView) => void;
  onDraftJob: (jobId: string) => void;
}

const CARD_BASE =
  'relative z-10 flex min-h-[320px] flex-col overflow-hidden rounded-lg border-1.5 border-ink bg-surface shadow-hard';

const SIMULATIONS = [
  { id: 'oss', label: '+OSS PR', delta: 5 },
  { id: 'cert', label: '+System Cert', delta: 4 },
  { id: 'demo', label: '+Edge Demo', delta: 3 },
];

function newsCategory(signal: string) {
  if (signal === 'ai' || signal === 'research') return 'REASONING';
  if (signal === 'oss' || signal === 'frontend') return 'OPEN SOURCE';
  return 'SYSTEMS';
}

function newsImpact(signal: string) {
  if (signal === 'ai')
    return 'Agent review workflows are moving closer to the merge path, changing how production judgment is evaluated.';
  if (signal === 'backend')
    return 'Async I/O shifts throughput economics for read-heavy services and the teams that operate them.';
  if (signal === 'oss')
    return 'Maintainer funding is becoming a visible hiring signal, not a side note in the application stack.';
  if (signal === 'frontend')
    return 'Type-level APIs are stabilizing enough to become a production migration decision rather than a preview bet.';
  return 'Interoperability standards are changing how edge deployments are benchmarked and compared.';
}

function sourceDomain(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return value;
  }
}

function jobDomain(org: string) {
  const slug = org
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 24);
  return `careers.${slug}.com`;
}

function ConnectorLines() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 z-0 hidden h-full w-full xl:block"
      preserveAspectRatio="none"
      aria-hidden
    >
      <line x1="50%" y1="50%" x2="25%" y2="25%" stroke="#2E3440" strokeWidth="1" strokeDasharray="5 7" />
      <line x1="50%" y1="50%" x2="75%" y2="25%" stroke="#2E3440" strokeWidth="1" strokeDasharray="5 7" />
      <line x1="50%" y1="50%" x2="25%" y2="75%" stroke="#2E3440" strokeWidth="1" strokeDasharray="5 7" />
      <line x1="50%" y1="50%" x2="75%" y2="75%" stroke="#2E3440" strokeWidth="1" strokeDasharray="5 7" />
      <circle cx="50%" cy="50%" r="3" fill="#12cc0f" />
    </svg>
  );
}

export default function OverviewDashboard({
  profile,
  boostedPOffer,
  auraLevel,
  scanning,
  scanTarget,
  onRunScout,
  scouting,
  onNavigate,
  onDraftJob,
}: OverviewDashboardProps) {
  const [newsIndex, setNewsIndex] = useState(0);
  const [activeSims, setActiveSims] = useState<string[]>(['oss']);
  const boost = Math.max(0, boostedPOffer - profile.jev.pOffer);
  const stories = useMemo(() => profile.scout.news.slice(0, 8), [profile.scout.news]);
  const story = stories[newsIndex] ?? stories[0];

  useEffect(() => {
    setNewsIndex(0);
    setActiveSims(['oss']);
  }, [profile.generatedAt]);

  useEffect(() => {
    if (stories.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      setNewsIndex((current) => (current + 1) % stories.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [stories.length]);

  const simDelta = activeSims.reduce(
    (sum, id) => sum + (SIMULATIONS.find((item) => item.id === id)?.delta ?? 0),
    0
  );
  const simulatedAccept = Math.min(97, profile.jev.pOffer + simDelta);
  const simulatedBand = Math.max(2, Math.round(100 - profile.jev.calibration));
  const simulatedShortlist = Math.min(99, profile.jev.pShortlist + Math.round(simDelta * 0.8));

  const scoutLeads = useMemo(() => {
    const hackathons = profile.scout.hackathons.slice(0, 2).map((item) => ({
      id: item.id,
      kind: 'HACKATHON',
      title: item.name,
      value: item.prize,
      match: Math.min(99, item.fitScore + Math.round(boost * 0.8)),
      source: sourceDomain(item.url),
    }));
    const roles = profile.jobs.slice(0, 3).map((job) => ({
      id: `lead-${job.id}`,
      kind: 'ROLE',
      title: `${job.role} — ${job.org}`,
      value: job.compensation,
      match: Math.min(99, job.pAccept + boost),
      source: jobDomain(job.org),
    }));
    return [...hackathons, ...roles].slice(0, 5);
  }, [profile.scout.hackathons, profile.jobs, boost]);

  const topJobs = profile.jobs.slice(0, 4);

  const runQuickScrape = () => {
    if (scouting) return;
    soundEngine.playSonarPing();
    void onRunScout();
  };

  const cardNavigation = (view: AppView, label: string) => ({
    role: 'link' as const,
    tabIndex: 0,
    'aria-label': label,
    onClick: (event: MouseEvent<HTMLElement>) => {
      if ((event.target as HTMLElement).closest('button, a, input, select, textarea')) return;
      soundEngine.playKeyClick();
      onNavigate(view);
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.target !== event.currentTarget) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      soundEngine.playKeyClick();
      onNavigate(view);
    },
  });

  return (
    <div className="h-full overflow-y-auto bg-canvas">
      <div className="relative grid grid-cols-1 gap-5 p-4 xl:h-full xl:min-h-[840px] xl:grid-cols-2 xl:grid-rows-2 xl:p-5">
        <ConnectorLines />

        <section
          className={`${CARD_BASE} cursor-pointer transition-colors hover:border-[#3B4250] xl:pr-36`}
          {...cardNavigation('news', 'Open Dev Pulse')}
        >
          <header className="flex items-center justify-between gap-3 border-b border-subtle px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="font-mono text-[10px] font-bold text-primary">01 //</span>
              <h2 className="truncate font-display text-[12px] font-bold uppercase tracking-[0.02em] text-content min-[1400px]:text-[13px]">
                Dev Pulse
              </h2>
            </div>
            <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.08em] text-muted">
              Personalized
            </span>
          </header>

          <div
            key={story?.id ?? 'empty'}
            className="flex min-h-0 flex-1 animate-news-in flex-col p-4"
          >
            {story ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-accent-indigo/40 bg-accent-indigo/10 px-2 py-1 font-mono text-[8px] font-bold tracking-[0.08em] text-accent-indigo">
                    {newsCategory(story.signal)}
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-muted">
                    {story.source}
                  </span>
                  <span className="ml-auto font-mono text-[9px] text-muted">
                    {String(newsIndex + 1).padStart(2, '0')} / {String(stories.length).padStart(2, '0')}
                  </span>
                </div>

                <h3 className="mt-3 font-display text-[21px] font-bold leading-[1.05] tracking-[-0.02em] text-content xl:text-[23px]">
                  {story.headline}
                </h3>
                <p className="mt-2 max-w-[52ch] text-[12px] leading-[1.55] text-muted">
                  {newsImpact(story.signal)}
                </p>
                <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.06em] text-muted">
                  Curated for @{profile.user.login} · {profile.languages[0]?.name ?? 'polyglot'} stack
                </p>

                <div className="mt-auto space-y-3 pt-4">
                  <div className="h-1 overflow-hidden rounded-full bg-ink">
                    <div
                      key={story.id}
                      className="h-full w-full origin-left animate-news-progress bg-primary"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex gap-1.5">
                      {stories.map((item, index) => (
                        <span
                          key={item.id}
                          className={`h-1.5 rounded-full transition-all ${
                            index === newsIndex ? 'w-5 bg-primary' : 'w-1.5 bg-ink'
                          }`}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => onNavigate('news')}
                      className="inline-flex shrink-0 items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-primary transition-colors hover:text-primary-bright"
                    >
                      Open Dev Pulse <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <p className="font-mono text-[11px] text-muted">No Dev Pulse stories yet.</p>
            )}
          </div>
        </section>

        <section
          className={`${CARD_BASE} cursor-pointer transition-colors hover:border-[#3B4250] xl:pl-36`}
          {...cardNavigation('eligibility', 'Open Jev Calibration Simulator')}
        >
          <header className="flex items-center justify-between gap-3 border-b border-subtle px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="font-mono text-[10px] font-bold text-primary">02 //</span>
              <h2 className="truncate font-display text-[12px] font-bold uppercase tracking-[0.02em] text-content min-[1400px]:text-[13px]">
                Jev Calibration Simulator
              </h2>
            </div>
            <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.08em] text-accent-cyan">
              Live model
            </span>
          </header>

          <div className="flex min-h-0 flex-1 flex-col p-3.5">
            <JevProbabilityChart
              baseline={profile.jev.pOffer}
              projected={simulatedAccept}
              calibration={profile.jev.calibration}
              shortlist={simulatedShortlist}
              latencyMs={134}
            />

            <p className="density-detail mt-auto max-w-[58ch] pb-2 pt-2 text-[9px] leading-[1.45] text-muted">
              Projected band is ±{simulatedBand} pts at {profile.jev.calibration}% confidence.
            </p>

            <div className="flex flex-wrap gap-1.5">
              {SIMULATIONS.map((sim) => {
                const active = activeSims.includes(sim.id);
                return (
                  <button
                    key={sim.id}
                    onClick={() => {
                      soundEngine.playKeyClick();
                      setActiveSims((current) =>
                        current.includes(sim.id)
                          ? current.filter((id) => id !== sim.id)
                          : [...current, sim.id]
                      );
                    }}
                    aria-pressed={active}
                    className={`rounded-full border px-2.5 py-1 font-mono text-[8px] font-bold tracking-[0.02em] transition-colors ${
                      active
                        ? 'border-primary/60 bg-primary/10 text-primary'
                        : 'border-ink bg-well text-muted hover:bg-subtle hover:text-content'
                    }`}
                  >
                    {sim.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section
          className={`${CARD_BASE} cursor-pointer transition-colors hover:border-[#3B4250] xl:pr-36`}
          {...cardNavigation('scout', 'Open Live Firecrawl Scouts')}
        >
          <header className="flex items-center justify-between gap-3 border-b border-subtle px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="font-mono text-[10px] font-bold text-primary">03 //</span>
              <h2 className="truncate font-display text-[12px] font-bold uppercase tracking-[0.02em] text-content min-[1400px]:text-[13px]">
                Live Firecrawl Scouts
              </h2>
            </div>
            <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.08em] text-accent-amber">
              {profile.scout.urlsInspected} sources
            </span>
          </header>

          <div className="flex min-h-0 flex-1 flex-col p-4">
            <div className="grid grid-cols-[minmax(0,1fr)_72px_48px] gap-2 border-b border-subtle pb-1.5 font-mono text-[8px] font-bold uppercase tracking-[0.08em] text-muted sm:grid-cols-[minmax(0,1fr)_82px_54px_92px]">
              <span>Signal</span>
              <span className="text-right">Value</span>
              <span className="text-right">Match</span>
              <span className="hidden text-right sm:block">Source</span>
            </div>

            <div className="divide-y divide-subtle">
              {scoutLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="grid grid-cols-[minmax(0,1fr)_72px_48px] items-center gap-2 py-2 sm:grid-cols-[minmax(0,1fr)_82px_54px_92px]"
                >
                  <div className="min-w-0">
                    <p className="truncate font-display text-[12px] font-semibold text-content">
                      {lead.title}
                    </p>
                    <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.08em] text-muted">
                      {lead.kind}
                    </p>
                  </div>
                  <p className="truncate text-right font-mono text-[9px] text-content">{lead.value}</p>
                  <p className="text-right font-mono text-[10px] font-bold text-primary">{lead.match}%</p>
                  <p className="hidden truncate text-right font-mono text-[8px] text-muted sm:block">
                    {lead.source}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
              <button
                onClick={runQuickScrape}
                disabled={scouting}
                className="btn-ghost !px-2.5 !py-1.5 !text-[9px]"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${scouting ? 'animate-spin' : ''}`} />
                {scouting ? 'Scanning…' : 'Run Quick Scrape'}
              </button>
              <button
                onClick={() => onNavigate('scout')}
                className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-accent-cyan transition-colors hover:text-primary"
              >
                Full Scout Console <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </section>

        <section
          className={`${CARD_BASE} cursor-pointer transition-colors hover:border-[#3B4250] xl:pl-36`}
          {...cardNavigation('eligibility', 'Open Job & Role Matcher')}
        >
          <header className="flex items-center justify-between gap-3 border-b border-subtle px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="font-mono text-[10px] font-bold text-primary">04 //</span>
              <h2 className="truncate font-display text-[12px] font-bold uppercase tracking-[0.02em] text-content min-[1400px]:text-[13px]">
                Job &amp; Role Matcher
              </h2>
            </div>
            <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.08em] text-primary">
              Ready now
            </span>
          </header>

          <div className="flex min-h-0 flex-1 flex-col p-4">
            <div className="space-y-2">
              {topJobs.map((job) => {
                const match = Math.min(99, job.pAccept + boost);
                return (
                  <div
                    key={job.id}
                    className="flex items-center gap-2 rounded border border-subtle bg-well p-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-[12px] font-semibold text-content">
                        {job.role}
                      </p>
                      <p className="truncate font-mono text-[9px] text-muted">
                        {job.org} · {job.location}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-primary/40 bg-primary/10 px-2 py-1 font-mono text-[9px] font-bold text-primary">
                      {match}%
                    </span>
                    <button
                      onClick={() => {
                        soundEngine.playJevMatrixLock();
                        onDraftJob(job.id);
                      }}
                      className="btn-primary shrink-0 !px-2.5 !py-2 !text-[9px]"
                    >
                      <FileText className="h-3 w-3" />
                      Draft &amp; Apply
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
              <p className="density-detail font-mono text-[8px] uppercase tracking-[0.08em] text-muted">
                {profile.jobs.length} calibrated roles · {profile.gaps[0]} focus
              </p>
              <button
                onClick={() => onNavigate('eligibility')}
                className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-primary transition-colors hover:text-primary-bright"
              >
                Open Job &amp; Role Matcher <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </section>

        <div className="z-20 hidden xl:absolute xl:left-1/2 xl:top-1/2 xl:block xl:h-[280px] xl:w-[280px] xl:-translate-x-1/2 xl:-translate-y-1/2">
          <div className="relative h-full w-full overflow-visible rounded-full border-2 border-ink bg-surface shadow-hard-lg">
            <div className="absolute inset-[11px] rounded-full border border-subtle bg-canvas" />
            <div className="absolute inset-[11px]">
              <PalantirOrb
                avatarUrl={profile.user.avatar_url}
                username={profile.user.login}
                repos={profile.repos}
                languages={profile.languages}
                signals={profile.signals}
                boostedPOffer={boostedPOffer}
                auraLevel={auraLevel}
                strengths={profile.strengths}
                gaps={profile.gaps}
                scanning={scanning}
                scanTarget={scanTarget}
                compact
              />
            </div>
          </div>
        </div>

        <div className="xl:hidden">
          <div className="mb-3 flex items-center justify-between border-b border-subtle pb-3">
            <p className="label-caps flex items-center gap-2">
              <Radar className="h-3.5 w-3.5 text-primary" />
              Palantir overview
            </p>
            <a
              href={profile.user.html_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-mono text-[9px] text-muted"
            >
              GitHub <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="relative mx-auto h-[280px] w-[280px]">
            <div className="relative h-full w-full overflow-visible rounded-full border-2 border-ink bg-surface shadow-hard-lg">
              <div className="absolute inset-[11px] rounded-full border border-subtle bg-canvas" />
              <div className="absolute inset-[11px]">
                <PalantirOrb
                  avatarUrl={profile.user.avatar_url}
                  username={profile.user.login}
                  repos={profile.repos}
                  languages={profile.languages}
                  signals={profile.signals}
                  boostedPOffer={boostedPOffer}
                  auraLevel={auraLevel}
                  strengths={profile.strengths}
                  gaps={profile.gaps}
                  scanning={scanning}
                  scanTarget={scanTarget}
                  compact
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
