import { CheckSquare, GitPullRequest, Mail, Square, TrendingUp, Wrench } from 'lucide-react';
import type { ForgeRecommendation, ProofOfWorkProfile } from '@/types/optimus';
import { soundEngine } from '@/utils/soundEngine';

interface Props {
  profile: ProofOfWorkProfile;
  activeIds: string[];
  boostedPOffer: number;
  onToggle: (id: string, next: boolean) => void;
}

export default function PortfolioForge({ profile, activeIds, boostedPOffer, onToggle }: Props) {
  const base = profile.jev.pOffer;
  const delta = boostedPOffer - base;
  const recent = delta > 0;

  const toggle = (rec: ForgeRecommendation) => {
    const next = !activeIds.includes(rec.id);
    onToggle(rec.id, next);
    if (next) soundEngine.playCounterfactualBoost();
    else soundEngine.playKeyClick();
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto pr-0.5">
      {/* ---------------- LOOP 4 · COUNTERFACTUAL SIMULATOR ---------------- */}
      <section className="panel">
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-amber-400" />
            <h2 className="mono-label text-amber-500/90">Loop 4 · Jev Counterfactual Simulator</h2>
          </div>
          <span className="font-mono text-[10px] text-gray-500">RECALC &lt;150MS · CACHED HEADS</span>
        </div>

        <div className="p-3">
          <div className="mb-3 flex items-center justify-center gap-4 rounded-lg border border-emerald-900/60 bg-obsidian-950/70 px-4 py-4">
            <div className="text-center">
              <p className="font-mono text-[9px] uppercase tracking-widest text-gray-500">Baseline</p>
              <p className="font-mono text-2xl font-bold text-gray-400">{base}%</p>
            </div>
            <TrendingUp
              className={`h-6 w-6 transition-all duration-300 ${
                delta > 0 ? 'text-emerald-400 animate-pulse-glow' : 'text-gray-700'
              }`}
            />
            <div className="text-center">
              <p className="font-mono text-[9px] uppercase tracking-widest text-gray-500">Simulated</p>
              <p
                className={`font-mono text-3xl font-bold transition-all duration-300 ${
                  delta > 0 ? 'text-emerald-300 drop-shadow-[0_0_12px_rgba(16,185,129,0.6)]' : 'text-gray-300'
                }`}
              >
                {boostedPOffer}%
              </p>
            </div>
            <div
              className={`rounded-lg px-3 py-2 font-mono text-sm font-bold transition-all duration-300 ${
                delta > 0
                  ? 'bg-emerald-500/15 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  : 'bg-obsidian-800 text-gray-600'
              }`}
            >
              +{delta}pts
            </div>
          </div>

          <p className="mono-label mb-2">Toggle a forge item — every P(Accept) recalculates live</p>
          <div className="space-y-2">
            {profile.forge.map((rec) => {
              const active = activeIds.includes(rec.id);
              return (
                <button
                  key={rec.id}
                  onClick={() => toggle(rec)}
                  className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-all duration-200 ${
                    active
                      ? 'border-emerald-500/70 bg-emerald-950/30 shadow-[0_0_16px_rgba(16,185,129,0.15)]'
                      : 'border-emerald-900/50 bg-obsidian-800/40 hover:border-emerald-700/70'
                  }`}
                >
                  {active ? (
                    <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  ) : (
                    <Square className="mt-0.5 h-4 w-4 shrink-0 text-gray-600" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {rec.kind === 'oss_issue' ? (
                        <GitPullRequest className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
                      ) : (
                        <span className="rounded bg-amber-500/15 px-1 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider text-amber-300">
                          Cert
                        </span>
                      )}
                      <p className={`text-xs font-semibold ${active ? 'text-emerald-200' : 'text-gray-200'}`}>
                        {rec.title}
                      </p>
                    </div>
                    <p className="mt-0.5 font-mono text-[10px] text-gray-500">
                      {rec.provider} · {rec.effort} · targets <b className="text-gray-400">{rec.axis}</b>
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded px-2 py-1 font-mono text-[11px] font-bold ${
                      active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-obsidian-700 text-gray-400'
                    }`}
                  >
                    +{rec.deltaP}%
                  </span>
                </button>
              );
            })}
          </div>
          {recent && delta > 0 && (
            <p className="mt-2 font-mono text-[10px] text-emerald-400/90">
              ⚡ Jev heads re-weighted · delta surge propagating to Loop 1 feed and Palantir aura.
            </p>
          )}
        </div>
      </section>

      {/* ---------------- LOOP 3 · FORGE & NEWSLETTER ---------------- */}
      <section className="panel">
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-emerald-400" />
            <h2 className="mono-label">Loop 3 · LockedIn Personalized Dev Dispatch</h2>
          </div>
          <span className="font-mono text-[10px] text-gray-500">{profile.newsletter.edition}</span>
        </div>
        <div className="p-4">
          <h3 className="text-base font-bold text-gray-100">{profile.newsletter.headline}</h3>
          <p className="mt-1 text-xs leading-relaxed text-gray-400">{profile.newsletter.lede}</p>
          <div className="mt-3 space-y-3">
            {profile.newsletter.sections.map((s) => (
              <article key={s.title} className="border-l-2 border-emerald-700/60 pl-3">
                <h4 className="text-sm font-semibold text-emerald-300">{s.title}</h4>
                <p className="mt-0.5 text-xs leading-relaxed text-gray-400">{s.body}</p>
              </article>
            ))}
          </div>
          <button
            onClick={() => soundEngine.playJevMatrixLock()}
            className="btn-primary mt-4 w-full"
          >
            <Mail className="h-4 w-4" />
            Subscribe to My Proof-of-Work Dispatch
          </button>
        </div>
      </section>
    </div>
  );
}
