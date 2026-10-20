import {
  ArrowUpRight,
  CheckSquare,
  GitPullRequest,
  Mail,
  Square,
  TrendingUp,
  Wrench,
} from 'lucide-react';
import type { ForgeRecommendation, ProofOfWorkProfile } from '@/types/optimus';
import { soundEngine } from '@/utils/soundEngine';

interface Props {
  profile: ProofOfWorkProfile;
  activeIds: string[];
  boostedPOffer: number;
  onToggle: (id: string, next: boolean) => void;
  onOpenDispatch: () => void;
}

export default function PortfolioForge({
  profile,
  activeIds,
  boostedPOffer,
  onToggle,
  onOpenDispatch,
}: Props) {
  const base = profile.jev.pOffer;
  const delta = boostedPOffer - base;

  const toggle = (recommendation: ForgeRecommendation) => {
    const next = !activeIds.includes(recommendation.id);
    onToggle(recommendation.id, next);
    if (next) soundEngine.playCounterfactualBoost();
    else soundEngine.playKeyClick();
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="panel">
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-accent-amber" />
            <h2 className="mono-label text-content">Counterfactual simulator</h2>
          </div>
          <span className="font-mono text-[8px] text-muted">RECALC &lt;150MS</span>
        </div>

        <div className="p-3">
          <div className="mb-3 grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 rounded border border-subtle bg-well px-3 py-3">
            <div>
              <p className="label-caps">Baseline</p>
              <p className="mt-1 font-mono text-[20px] font-bold text-muted">{base}%</p>
            </div>
            <TrendingUp
              className={`h-5 w-5 transition-colors ${
                delta > 0 ? 'animate-pulse-glow text-primary' : 'text-muted'
              }`}
            />
            <div>
              <p className="label-caps">Simulated</p>
              <p
                className={`mt-1 font-mono text-[24px] font-bold leading-none ${
                  delta > 0 ? 'text-primary' : 'text-content'
                }`}
              >
                {boostedPOffer}%
              </p>
            </div>
            <span
              className={`rounded px-2 py-1.5 font-mono text-[10px] font-bold ${
                delta > 0
                  ? 'border border-primary/40 bg-primary/10 text-primary'
                  : 'border border-subtle bg-surface text-muted'
              }`}
            >
              +{delta} pts
            </span>
          </div>

          <p className="label-caps mb-2">Toggle evidence — all probabilities recalculate</p>
          <div className="space-y-2">
            {profile.forge.map((recommendation) => {
              const active = activeIds.includes(recommendation.id);
              return (
                <button
                  key={recommendation.id}
                  onClick={() => toggle(recommendation)}
                  aria-pressed={active}
                  className={`flex w-full items-start gap-2.5 rounded border-1.5 p-2.5 text-left transition-colors ${
                    active
                      ? 'border-primary/60 bg-primary/5 shadow-hard'
                      : 'border-ink bg-well hover:bg-subtle'
                  }`}
                >
                  {active ? (
                    <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  ) : (
                    <Square className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {recommendation.kind === 'oss_issue' ? (
                        <GitPullRequest className="h-3.5 w-3.5 shrink-0 text-accent-cyan" />
                      ) : (
                        <span className="rounded border border-accent-amber/40 bg-accent-amber/10 px-1 py-0.5 font-mono text-[7px] font-bold uppercase tracking-[0.06em] text-accent-amber">
                          Cert
                        </span>
                      )}
                      <p
                        className={`font-display text-[11px] font-semibold leading-snug ${
                          active ? 'text-content' : 'text-muted'
                        }`}
                      >
                        {recommendation.title}
                      </p>
                    </div>
                    <p className="mt-1 font-mono text-[8px] leading-relaxed text-muted">
                      {recommendation.provider} · {recommendation.effort} · targets{' '}
                      <span className="text-content">{recommendation.axis}</span>
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded px-1.5 py-1 font-mono text-[9px] font-bold ${
                      active
                        ? 'border border-primary/40 bg-primary/10 text-primary'
                        : 'border border-subtle bg-surface text-muted'
                    }`}
                  >
                    +{recommendation.deltaP}%
                  </span>
                </button>
              );
            })}
          </div>
          {delta > 0 && (
            <p className="mt-2 rounded border border-accent-cyan/30 bg-accent-cyan/5 px-2 py-1.5 font-mono text-[8px] leading-snug text-accent-cyan">
              Jev heads re-weighted · delta propagating to the opportunity list and Palantir aura.
            </p>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            <h2 className="mono-label text-content">Dispatch preview</h2>
          </div>
          <span className="font-mono text-[8px] text-muted">{profile.newsletter.edition}</span>
        </div>
        <div className="p-4">
          <h3 className="font-display text-[14px] font-bold leading-snug text-content">
            {profile.newsletter.headline}
          </h3>
          <p className="mt-1.5 text-[10px] leading-relaxed text-muted">{profile.newsletter.lede}</p>
          <div className="mt-3 space-y-2.5">
            {profile.newsletter.sections.slice(0, 2).map((section) => (
              <article key={section.title} className="border-l-2 border-primary/50 pl-2.5">
                <h4 className="font-display text-[11px] font-semibold text-content">{section.title}</h4>
                <p className="mt-0.5 line-clamp-2 text-[9px] leading-relaxed text-muted">
                  {section.body}
                </p>
              </article>
            ))}
          </div>
          <button
            onClick={() => {
              soundEngine.playKeyClick();
              onOpenDispatch();
            }}
            className="btn-ghost mt-3 w-full !py-2 !text-[8px]"
          >
            Open full dispatch <ArrowUpRight className="h-3 w-3" />
          </button>
        </div>
      </section>
    </div>
  );
}
