import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Briefcase,
  Check,
  Copy,
  ExternalLink,
  FileText,
  GraduationCap,
  RefreshCw,
  ScanSearch,
  Sparkles,
  X,
} from 'lucide-react';
import type { CustomTargetAnalysis } from '@/types/engine';
import type { JobMatch, ProofOfWorkProfile } from '@/types/optimus';
import { soundEngine } from '@/utils/soundEngine';

interface Props {
  profile: ProofOfWorkProfile;
  boostedPOffer: number;
  onRunScout: () => Promise<void>;
  scouting: boolean;
  firecrawlLive: boolean;
  customMatches: CustomTargetAnalysis[];
  analyzingUrl: boolean;
  urlError: string | null;
  onAnalyzeUrl: (url: string) => Promise<void>;
  focusJobId?: string | null;
  onFocusConsumed?: () => void;
}

function ProbabilityDial({
  label,
  value,
  conf,
  delta,
}: {
  label: string;
  value: number;
  conf?: number;
  delta?: number;
}) {
  return (
    <div className="rounded border border-subtle bg-well px-2.5 py-2 text-center">
      <p className="font-mono text-[16px] font-bold leading-none text-primary">{value}%</p>
      <p className="mt-1 font-mono text-[7px] uppercase tracking-[0.06em] text-muted">{label}</p>
      {delta !== undefined && delta > 0 && (
        <p className="mt-0.5 font-mono text-[8px] font-bold text-accent-cyan">+{delta} pts</p>
      )}
      {conf !== undefined && (
        <p className="mt-0.5 font-mono text-[7px] text-muted">
          ±{Math.round(100 - conf)} · {conf}% Conf.
        </p>
      )}
    </div>
  );
}

function KindBadge({ kind }: { kind: string }) {
  const tone =
    kind === 'hackathon'
      ? 'border-accent-cyan/40 bg-accent-cyan/10 text-accent-cyan'
      : kind === 'grant'
        ? 'border-accent-amber/40 bg-accent-amber/10 text-accent-amber'
        : kind === 'portfolio'
          ? 'border-accent-indigo/40 bg-accent-indigo/10 text-accent-indigo'
          : 'border-primary/40 bg-primary/10 text-primary';
  return (
    <span
      className={`rounded px-1.5 py-0.5 font-mono text-[7px] font-bold uppercase tracking-[0.06em] ${tone}`}
    >
      {kind}
    </span>
  );
}

export default function OpportunityFeed({
  profile,
  boostedPOffer,
  onRunScout,
  scouting,
  firecrawlLive,
  customMatches,
  analyzingUrl,
  urlError,
  onAnalyzeUrl,
  focusJobId,
  onFocusConsumed,
}: Props) {
  const [pitchJob, setPitchJob] = useState<JobMatch | null>(null);
  const [autopsyUrl, setAutopsyUrl] = useState('');
  const [payloadCopied, setPayloadCopied] = useState(false);
  const [copiedMatch, setCopiedMatch] = useState<string | null>(null);

  const highFit = useMemo(
    () => profile.scout.hackathons.filter((item) => item.fitScore >= 70).length,
    [profile.scout.hackathons]
  );

  const boost = Math.max(0, boostedPOffer - profile.jev.pOffer);

  useEffect(() => {
    if (!focusJobId) return;
    const job = profile.jobs.find((item) => item.id === focusJobId);
    if (job) {
      setPayloadCopied(false);
      setPitchJob(job);
    }
    onFocusConsumed?.();
  }, [focusJobId, profile.jobs, onFocusConsumed]);

  const runAutopsy = () => {
    if (!autopsyUrl.trim() || analyzingUrl) return;
    soundEngine.playKeyClick();
    void onAnalyzeUrl(autopsyUrl);
  };

  const copyMatchPitch = (match: CustomTargetAnalysis) => {
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(match.pitch).catch(() => undefined);
    }
    soundEngine.playKeyClick();
    setCopiedMatch(match.id);
    window.setTimeout(() => setCopiedMatch(null), 1500);
  };

  return (
    <div className="space-y-4">
      <section className="panel">
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <ScanSearch className="h-4 w-4 text-accent-cyan" />
            <h2 className="mono-label text-content">URL Autopsy · Firecrawl + Jev</h2>
          </div>
          <span
            className={`rounded-full border px-2 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.06em] ${
              firecrawlLive
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-accent-amber/40 bg-accent-amber/10 text-accent-amber'
            }`}
          >
            {firecrawlLive ? 'Live key active' : 'Cached · judge mode'}
          </span>
        </div>
        <div className="p-3.5">
          <p className="text-[11px] leading-relaxed text-muted">
            Paste any role, grant, hackathon, or portfolio URL to run a calibrated Firecrawl and Jev
            eligibility analysis. Without a key, the cached dataset still returns a complete card.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={autopsyUrl}
              onChange={(event) => setAutopsyUrl(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && runAutopsy()}
              placeholder="https://jobs.company.com/senior-engineer"
              className="field-input flex-1 !py-2.5 text-xs"
              aria-label="Job, hackathon, grant, or portfolio URL"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              onClick={runAutopsy}
              disabled={!autopsyUrl.trim() || analyzingUrl}
              className="btn-primary shrink-0 !px-3 !py-2.5 !text-[9px]"
            >
              {analyzingUrl ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ScanSearch className="h-3.5 w-3.5" />
              )}
              {analyzingUrl ? 'Analyzing…' : 'Run Autopsy'}
            </button>
          </div>

          {analyzingUrl && (
            <p className="mt-2 flex items-center gap-2 rounded border border-accent-cyan/30 bg-accent-cyan/5 px-2.5 py-2 font-mono text-[9px] text-accent-cyan">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Palantir scan · Firecrawl → Jev calibration…
            </p>
          )}
          {urlError && (
            <p className="mt-2 flex items-start gap-1.5 rounded border border-accent-coral/40 bg-accent-coral/5 px-2.5 py-2 font-mono text-[9px] leading-relaxed text-accent-coral">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {urlError}
            </p>
          )}

          {customMatches.length > 0 && (
            <div className="mt-3 space-y-2.5">
              {customMatches.map((match) => (
                <article
                  key={match.id}
                  className="animate-rise-in rounded border-1.5 border-ink bg-well p-3 shadow-hard"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="truncate font-display text-[13px] font-semibold text-content">
                          {match.title}
                        </h3>
                        <KindBadge kind={match.kind} />
                        <span className="rounded border border-subtle bg-surface px-1.5 py-0.5 font-mono text-[7px] font-bold uppercase tracking-[0.06em] text-muted">
                          {match.source === 'firecrawl' ? 'Live' : 'Cached'}
                        </span>
                      </div>
                      <p className="mt-1 truncate font-mono text-[8px] text-muted">
                        {match.org} · {match.latencyMs}ms ·{' '}
                        {new Date(match.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <ProbabilityDial label="P(Accept)" value={match.pAccept} />
                      <ProbabilityDial
                        label="P(Shortlist)"
                        value={match.pShortlist}
                        conf={match.confidence}
                      />
                    </div>
                  </div>

                  {match.matchedSkills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {match.matchedSkills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded border border-primary/30 bg-primary/5 px-1.5 py-0.5 font-mono text-[8px] text-primary"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="rounded border border-accent-amber/30 bg-accent-amber/5 p-2">
                      <p className="label-caps text-accent-amber">Missing proof-of-work</p>
                      <ul className="mt-1 space-y-0.5">
                        {match.missingSignals.map((signal) => (
                          <li
                            key={signal}
                            className="flex items-start gap-1 font-mono text-[9px] leading-snug text-muted"
                          >
                            <span className="mt-[1px] shrink-0 text-accent-amber">△</span>
                            {signal}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded border border-subtle bg-surface p-2">
                      <p className="label-caps text-accent-cyan">Calibration</p>
                      <p className="mt-1 font-mono text-[9px] leading-relaxed text-muted">
                        Jev P(Accept) {match.pAccept}% · Δ{' '}
                        {match.deltaVsBaseline >= 0 ? '+' : ''}
                        {match.deltaVsBaseline} pts vs baseline {profile.jev.pOffer}%.
                      </p>
                      <p className="mt-0.5 font-mono text-[8px] text-muted">
                        Confidence ±{100 - match.confidence} · {match.confidence}% Conf.
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 rounded border border-subtle bg-surface p-2.5">
                    <p className="label-caps">Tailored application pitch</p>
                    <p className="mt-1 text-[10px] leading-relaxed text-content">{match.pitch}</p>
                    <button
                      onClick={() => copyMatchPitch(match)}
                      className="mt-2 inline-flex items-center gap-1 font-mono text-[8px] font-bold uppercase tracking-[0.06em] text-primary hover:text-primary-bright"
                    >
                      {copiedMatch === match.id ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      {copiedMatch === match.id ? 'Pitch copied' : 'Copy pitch'}
                    </button>
                  </div>

                  <details className="mt-2 rounded border border-subtle bg-surface px-2.5 py-2">
                    <summary className="cursor-pointer font-mono text-[8px] font-bold uppercase tracking-[0.06em] text-muted hover:text-content">
                      View scraped excerpt
                    </summary>
                    <p className="mt-1.5 text-[9px] leading-relaxed text-muted">{match.excerpt}</p>
                  </details>

                  {match.notice && (
                    <p className="mt-2 flex items-start gap-1.5 rounded border border-accent-amber/30 bg-accent-amber/5 px-2 py-1.5 font-mono text-[9px] leading-snug text-accent-amber">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {match.notice}
                    </p>
                  )}

                  <a
                    href={match.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 font-mono text-[8px] font-bold uppercase tracking-[0.06em] text-accent-cyan hover:text-primary"
                  >
                    Open target <ExternalLink className="h-3 w-3" />
                  </a>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            <h2 className="mono-label text-content">Eligibility & opportunity list</h2>
          </div>
          <span className="font-mono text-[8px] text-muted">
            BASELINE {profile.jev.pOffer}% → BOOSTED {boostedPOffer}%
          </span>
        </div>
        <div className="space-y-3 p-3">
          {profile.jobs.map((job) => {
            const boostedAccept = Math.min(99, job.pAccept + boost);
            return (
              <article
                key={job.id}
                className="rounded border-1.5 border-ink bg-well p-3 transition-colors hover:border-primary/50"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-display text-[14px] font-semibold text-content">
                        {job.role}
                      </h3>
                      <span
                        className={`rounded px-1.5 py-0.5 font-mono text-[7px] font-bold uppercase tracking-[0.06em] ${
                          job.kind === 'grant'
                            ? 'border border-accent-amber/40 bg-accent-amber/10 text-accent-amber'
                            : 'border border-accent-cyan/40 bg-accent-cyan/10 text-accent-cyan'
                        }`}
                      >
                        {job.kind === 'grant' ? 'Grant' : 'Role'}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-muted">
                      {job.org} · {job.location} ·{' '}
                      <span className="font-medium text-content">{job.compensation}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <ProbabilityDial label="P(Accept)" value={boostedAccept} delta={boost} />
                    <ProbabilityDial
                      label="P(Shortlist)"
                      value={job.pShortlist}
                      conf={job.confidence}
                    />
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {job.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded border border-subtle bg-surface px-1.5 py-0.5 font-mono text-[8px] text-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <ul className="mt-2 grid grid-cols-1 gap-x-3 gap-y-0.5 sm:grid-cols-3">
                  {job.eligibility.map((item) => (
                    <li
                      key={item.label}
                      className={`font-mono text-[9px] ${
                        item.met ? 'text-primary' : 'text-accent-amber'
                      }`}
                    >
                      {item.met ? '✓' : '△'} {item.label}
                    </li>
                  ))}
                </ul>

                {boost > 0 && (
                  <p className="mt-2 font-mono text-[9px] text-accent-cyan">
                    Forge counterfactuals active · P(Accept) +{boost} pts on this target.
                  </p>
                )}

                <button
                  onClick={() => {
                    soundEngine.playKeyClick();
                    setPayloadCopied(false);
                    setPitchJob(job);
                  }}
                  className="btn-ghost mt-3 w-full !py-2 !text-[9px]"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Generate application draft
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent-cyan" />
            <h2 className="mono-label text-content">Live scout feed</h2>
          </div>
          <button
            onClick={() => void onRunScout()}
            disabled={scouting}
            className="btn-ghost !px-2.5 !py-1.5 !text-[8px]"
          >
            <RefreshCw className={`h-3 w-3 ${scouting ? 'animate-spin' : ''}`} />
            {scouting ? 'Crawling…' : 'Run Live Scrape'}
          </button>
        </div>
        <div className="p-3">
          <p className="mb-2.5 font-mono text-[9px] text-muted">
            Last scan: {profile.scout.lastScanMs}ms · {profile.scout.urlsInspected} URLs inspected ·{' '}
            <span className="text-accent-cyan">{highFit} high-match targets</span>
          </p>

          <div className="space-y-2">
            {profile.scout.hackathons.map((hackathon) => {
              const boostedFit = Math.min(99, hackathon.fitScore + Math.round(boost * 0.8));
              return (
                <a
                  key={hackathon.id}
                  href={hackathon.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded border border-subtle bg-surface p-2.5 transition-colors hover:border-accent-cyan/50"
                >
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <h3 className="font-display text-[12px] font-semibold text-content">
                      {hackathon.name}
                    </h3>
                    <span className="rounded border border-primary/30 bg-primary/5 px-1.5 py-0.5 font-mono text-[8px] font-bold text-primary">
                      {hackathon.prize}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[9px] text-muted">
                    {hackathon.organizer} · {hackathon.date}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded bg-ink">
                      <div
                        className="h-full rounded bg-accent-cyan transition-all duration-500"
                        style={{ width: `${boostedFit}%` }}
                      />
                    </div>
                    <span className="font-mono text-[8px] font-bold text-accent-cyan">
                      {boostedFit}% fit
                      {boost > 0 && (
                        <span className="text-primary"> (+{boostedFit - hackathon.fitScore})</span>
                      )}
                    </span>
                  </div>
                  <p className="mt-1 text-[9px] leading-snug text-muted">{hackathon.fitReason}</p>
                </a>
              );
            })}
          </div>

          <div className="mt-3">
            <p className="label-caps mb-1.5">Live developer news</p>
            <ul className="space-y-1.5">
              {profile.scout.news.map((story) => (
                <li key={story.id} className="flex items-start gap-2 text-[10px] text-content">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                  <span>
                    {story.headline} <span className="text-muted">— {story.source}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-3 rounded border border-subtle bg-well p-2.5 font-mono text-[9px] leading-relaxed text-muted">
            Need a specific target? Paste a role, hackathon, grant, or portfolio URL into the autopsy
            above. The resulting card returns P(Accept), missing signals, and a draft.
          </p>
        </div>
      </section>

      {pitchJob && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-canvas/85 p-0 sm:items-center sm:p-4"
          onClick={() => setPitchJob(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="max-h-[88vh] w-full max-w-lg animate-rise-in overflow-y-auto rounded-t-lg border-1.5 border-ink bg-surface p-5 shadow-hard-lg sm:rounded-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="label-caps text-primary">Auto-drafted proposal · Forge Strategist</p>
                <h3 className="mt-1 font-display text-[18px] font-bold text-content">
                  {pitchJob.role}
                </h3>
                <p className="font-mono text-[9px] text-muted">
                  {pitchJob.org} · Jev P(Accept) {pitchJob.pAccept}%
                </p>
              </div>
              <button
                onClick={() => setPitchJob(null)}
                className="grid h-7 w-7 place-items-center rounded border-1.5 border-ink bg-well text-muted hover:text-content"
                aria-label="Close draft"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 font-mono text-[10px] leading-relaxed text-content">
              <div className="rounded border border-subtle bg-well p-3">
                <p className="label-caps mb-1">Proof-of-work pitch</p>
                <p className="text-muted">
                  {profile.user.login} — {profile.jev.classification}. {pitchJob.pitch} Anchor
                  artifact: flagship repo with {profile.totalStars.toLocaleString()} stars across
                  original work and {profile.freshRepos} repos shipped in the last 90 days.{' '}
                  {profile.languages[0] ? `${profile.languages[0].name} ` : ''}
                  is the primary stack; the linked telemetry is the reference check.
                </p>
              </div>
              <div className="rounded border border-subtle bg-well p-3">
                <p className="label-caps mb-1">Application subject line</p>
                <p className="text-primary">
                  Proof-of-work, not promises: {profile.user.login} × {pitchJob.org}
                </p>
              </div>
              <div className="rounded border border-subtle bg-well p-3">
                <p className="label-caps mb-1">Eligibility claims (Jev-verified)</p>
                <ul className="space-y-0.5">
                  {pitchJob.eligibility.map((item) => (
                    <li
                      key={item.label}
                      className={item.met ? 'text-primary' : 'text-accent-amber'}
                    >
                      {item.met ? '✓' : '△'} {item.label}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => {
                  const payload = [
                    `Subject: Proof-of-work, not promises: ${profile.user.login} × ${pitchJob.org}`,
                    '',
                    `${profile.user.login} — ${profile.jev.classification}. ${pitchJob.pitch}`,
                    `Anchor artifact: flagship repo with ${profile.totalStars.toLocaleString()} stars; ${profile.freshRepos} repos shipped in the last 90 days.`,
                    `Primary stack: ${profile.languages[0]?.name ?? 'polyglot'} · GitHub: ${profile.user.html_url}`,
                    '',
                    'Jev-verified eligibility:',
                    ...pitchJob.eligibility.map((item) => `${item.met ? '✓' : '△'} ${item.label}`),
                  ].join('\n');
                  if (navigator.clipboard) {
                    void navigator.clipboard.writeText(payload).catch(() => undefined);
                  }
                  soundEngine.playJevMatrixLock();
                  setPayloadCopied(true);
                  window.setTimeout(() => {
                    setPitchJob(null);
                    setPayloadCopied(false);
                  }, 750);
                }}
                className="btn-primary w-full !py-2.5 !text-[9px]"
              >
                {payloadCopied ? <Check className="h-4 w-4" /> : <GraduationCap className="h-4 w-4" />}
                {payloadCopied ? 'Draft copied' : 'Copy application draft'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
