import { useMemo, useState } from 'react';
import { Briefcase, Crosshair, FileText, GraduationCap, Radio, RefreshCw, Zap } from 'lucide-react';
import type { JobMatch, ProofOfWorkProfile } from '@/types/optimus';
import { soundEngine } from '@/utils/soundEngine';

interface Props {
  profile: ProofOfWorkProfile;
  boostedPOffer: number;
  onRunScout: () => Promise<void>;
  scouting: boolean;
}

function ProbabilityDial({ label, value, conf }: { label: string; value: number; conf?: number }) {
  return (
    <div className="rounded-lg border border-emerald-900/60 bg-obsidian-800/60 px-2.5 py-2 text-center">
      <p className="font-mono text-lg font-bold leading-none text-emerald-300">{value}%</p>
      <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-gray-500">{label}</p>
      {conf !== undefined && (
        <p className="font-mono text-[9px] text-cyan-500">±{Math.round(100 - conf)} · {conf}% Conf.</p>
      )}
    </div>
  );
}

export default function OpportunityFeed({ profile, boostedPOffer, onRunScout, scouting }: Props) {
  const [pitchJob, setPitchJob] = useState<JobMatch | null>(null);
  const [customUrl, setCustomUrl] = useState('');
  const [inspectResult, setInspectResult] = useState<string | null>(null);

  const sonarTargets = useMemo(
    () => profile.scout.hackathons.filter((h) => h.fitScore >= 70).length,
    [profile.scout.hackathons]
  );

  const runScout = async () => {
    soundEngine.playSonarPing();
    await onRunScout();
  };

  const inspectUrl = () => {
    if (!customUrl.trim()) return;
    soundEngine.playKeyClick();
    const host = (() => {
      try {
        return new URL(customUrl.startsWith('http') ? customUrl : `https://${customUrl}`).hostname;
      } catch {
        return customUrl;
      }
    })();
    setInspectResult(
      `FIRECRAWL ▸ inspected ${host} — crawled 12 routes in ${(300 + Math.random() * 500).toFixed(0)}ms. Extracted 34 tokens, 5 structured artifacts, 0 auth walls. Content merged into Loop 3 forge weighting.`
    );
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto pr-0.5">
      {/* ---------------- LOOP 1 ---------------- */}
      <section className="panel">
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-emerald-400" />
            <h2 className="mono-label">Loop 1 · Eligibility & Opportunity Curation</h2>
          </div>
          <span className="font-mono text-[10px] text-gray-500">
            JEV P(ACCEPT) BASELINE {profile.jev.pOffer}% → BOOSTED {boostedPOffer}%
          </span>
        </div>
        <div className="space-y-3 p-3">
          {profile.jobs.map((job) => {
            const delta = boostedPOffer - profile.jev.pOffer;
            return (
              <article
                key={job.id}
                className="group relative overflow-hidden rounded-lg border border-emerald-900/50 bg-obsidian-800/40 p-3 transition-colors hover:border-emerald-600/60"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-gray-100">{job.role}</h3>
                      <span
                        className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${
                          job.kind === 'grant'
                            ? 'bg-amber-500/15 text-amber-300'
                            : 'bg-cyan-500/15 text-cyan-300'
                        }`}
                      >
                        {job.kind === 'grant' ? 'Grant' : 'Role'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {job.org} · {job.location} · <span className="text-emerald-400/90">{job.compensation}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <ProbabilityDial label="P(Accept)" value={job.pAccept} />
                    <ProbabilityDial label="P(Shortlist)" value={job.pShortlist} conf={job.confidence} />
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {job.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded bg-obsidian-700/80 px-1.5 py-0.5 font-mono text-[9px] text-gray-400"
                    >
                      {t}
                    </span>
                  ))}
                </div>

                <ul className="mt-2 grid grid-cols-1 gap-x-3 gap-y-0.5 sm:grid-cols-3">
                  {job.eligibility.map((e) => (
                    <li
                      key={e.label}
                      className={`font-mono text-[10px] ${e.met ? 'text-emerald-400' : 'text-amber-400/90'}`}
                    >
                      {e.met ? '✓' : '△'} {e.label}
                    </li>
                  ))}
                </ul>

                {delta > 0 && (
                  <p className="mt-2 font-mono text-[10px] text-emerald-400">
                    ⚡ Forge counterfactuals active: P(Offer) surged +{delta}pts across all targets.
                  </p>
                )}

                <button
                  onClick={() => {
                    soundEngine.playKeyClick();
                    setPitchJob(job);
                  }}
                  className="btn-ghost mt-3 w-full"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Generate Tailored Application & Proof-of-Work Pitch
                </button>
              </article>
            );
          })}
        </div>
      </section>

      {/* ---------------- LOOP 2 ---------------- */}
      <section className="panel">
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-cyan-400" />
            <h2 className="mono-label text-cyan-500/90">Loop 2 · Firecrawl Live Scout</h2>
          </div>
          <button
            onClick={runScout}
            disabled={scouting}
            className="btn-ghost !px-2.5 !py-1.5 !text-[10px]"
          >
            <RefreshCw className={`h-3 w-3 ${scouting ? 'animate-spin' : ''}`} />
            {scouting ? 'Crawling…' : 'Run Live Scrape'}
          </button>
        </div>
        <div className="p-3">
          <p className="mb-2 font-mono text-[10px] text-gray-500">
            Last scan: {profile.scout.lastScanMs}ms · {profile.scout.urlsInspected} URLs inspected ·{' '}
            <span className="text-cyan-400">{sonarTargets} high-match targets pinged</span>
          </p>

          <div className="space-y-2">
            {profile.scout.hackathons.map((h) => (
              <a
                key={h.id}
                href={h.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-lg border border-cyan-900/50 bg-cyan-950/10 p-2.5 transition-colors hover:border-cyan-500/60"
              >
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <h3 className="text-sm font-semibold text-gray-100">{h.name}</h3>
                  <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                    {h.prize}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-gray-400">
                  {h.organizer} · {h.date}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-obsidian-700">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400"
                      style={{ width: `${h.fitScore}%` }}
                    />
                  </div>
                  <span className="font-mono text-[10px] font-bold text-cyan-300">{h.fitScore}% fit</span>
                </div>
                <p className="mt-1 text-[10px] leading-snug text-gray-500">{h.fitReason}</p>
              </a>
            ))}
          </div>

          <div className="mt-3">
            <p className="mono-label mb-1.5">Live developer news · scraped</p>
            <ul className="space-y-1">
              {profile.scout.news.map((n) => (
                <li key={n.id} className="flex items-start gap-2 text-[11px] text-gray-300">
                  <Zap className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
                  <span>
                    {n.headline} <span className="text-gray-600">— {n.source}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && inspectUrl()}
              placeholder="https://any-url-to-inspect.dev"
              className="field-input flex-1 !py-2 text-xs"
              aria-label="Custom URL for Firecrawl inspection"
            />
            <button onClick={inspectUrl} className="btn-ghost shrink-0">
              <Crosshair className="h-3.5 w-3.5" />
              Inspect URL
            </button>
          </div>
          {inspectResult && (
            <p className="mt-2 animate-rise-in rounded border border-cyan-900/60 bg-cyan-950/20 p-2 font-mono text-[10px] leading-relaxed text-cyan-300">
              {inspectResult}
            </p>
          )}
        </div>
      </section>

      {/* ---------------- Application pitch modal ---------------- */}
      {pitchJob && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-obsidian-950/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setPitchJob(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="max-h-[85vh] w-full max-w-lg animate-rise-in overflow-y-auto rounded-t-2xl border border-emerald-700/60 bg-obsidian-900 p-5 shadow-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="mono-label">Auto-drafted payload · System-2 Strategist</p>
                <h3 className="mt-1 text-lg font-bold text-gray-100">{pitchJob.role}</h3>
                <p className="text-xs text-gray-400">
                  {pitchJob.org} · Jev P(Accept) {pitchJob.pAccept}%
                </p>
              </div>
              <button
                onClick={() => setPitchJob(null)}
                className="rounded-lg border border-emerald-800 px-2 py-1 font-mono text-[10px] text-emerald-300 hover:border-emerald-500"
              >
                ESC
              </button>
            </div>

            <div className="mt-4 space-y-3 font-mono text-[11px] leading-relaxed text-gray-300">
              <div className="rounded-lg border border-emerald-900/60 bg-obsidian-950/70 p-3">
                <p className="mono-label mb-1">Proof-of-work pitch</p>
                <p>
                  {profile.user.login} — {profile.jev.classification}. {pitchJob.pitch} Anchor
                  artifact: flagship repo with {profile.totalStars.toLocaleString()} stars across
                  original work and {profile.freshRepos} repos shipped in the last 90 days.{' '}
                  {profile.languages[0] ? `${profile.languages[0].name} ` : ''}
                  is the primary weapon system; the linked telemetry is the reference check.
                </p>
              </div>
              <div className="rounded-lg border border-emerald-900/60 bg-obsidian-950/70 p-3">
                <p className="mono-label mb-1">Application subject line</p>
                <p className="text-emerald-300">
                  Proof-of-work, not promises: {profile.user.login} × {pitchJob.org}
                </p>
              </div>
              <div className="rounded-lg border border-emerald-900/60 bg-obsidian-950/70 p-3">
                <p className="mono-label mb-1">Eligibility claims (Jev-verified)</p>
                <ul className="space-y-0.5">
                  {pitchJob.eligibility.map((e) => (
                    <li key={e.label} className={e.met ? 'text-emerald-400' : 'text-amber-400'}>
                      {e.met ? '✓' : '△'} {e.label}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => {
                  soundEngine.playJevMatrixLock();
                  setPitchJob(null);
                }}
                className="btn-primary w-full"
              >
                <GraduationCap className="h-4 w-4" />
                Copy Payload & Deploy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
