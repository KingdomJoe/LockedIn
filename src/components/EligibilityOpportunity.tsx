import { FileSearch, Gauge, Layers3 } from 'lucide-react';
import type { CustomTargetAnalysis } from '@/types/engine';
import type { ProofOfWorkProfile } from '@/types/optimus';
import OpportunityFeed from '@/components/OpportunityFeed';
import PortfolioForge from '@/components/PortfolioForge';
import ViewHeader from '@/components/ViewHeader';

interface EligibilityOpportunityProps {
  profile: ProofOfWorkProfile;
  boostedPOffer: number;
  onRunScout: () => Promise<void>;
  scouting: boolean;
  firecrawlLive: boolean;
  customMatches: CustomTargetAnalysis[];
  analyzingUrl: boolean;
  urlError: string | null;
  onAnalyzeUrl: (url: string) => Promise<void>;
  activeForgeIds: string[];
  onToggleForge: (id: string, next: boolean) => void;
  focusJobId?: string | null;
  onFocusConsumed?: () => void;
  onOpenDispatch: () => void;
}

export default function EligibilityOpportunity({
  profile,
  boostedPOffer,
  onRunScout,
  scouting,
  firecrawlLive,
  customMatches,
  analyzingUrl,
  urlError,
  onAnalyzeUrl,
  activeForgeIds,
  onToggleForge,
  focusJobId,
  onFocusConsumed,
  onOpenDispatch,
}: EligibilityOpportunityProps) {
  return (
    <div className="mx-auto max-w-[1440px] p-4 sm:p-5">
      <ViewHeader
        index="03"
        title="Eligibility & Opportunity"
        description="Calibrated eligibility for every lead, plus a counterfactual portfolio simulator. Paste any role, grant, hackathon, or portfolio URL for a live Firecrawl and Jev autopsy."
        metrics={[
          { label: 'Baseline P(Accept)', value: `${profile.jev.pOffer}%` },
          { label: 'Boosted P(Accept)', value: `${boostedPOffer}%` },
          { label: 'Open targets', value: `${profile.jobs.length}` },
          { label: 'Custom autopsies', value: `${customMatches.length}` },
        ]}
      />

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.38fr)_minmax(0,0.62fr)]">
        <div className="min-w-0">
          <OpportunityFeed
            profile={profile}
            boostedPOffer={boostedPOffer}
            onRunScout={onRunScout}
            scouting={scouting}
            firecrawlLive={firecrawlLive}
            customMatches={customMatches}
            analyzingUrl={analyzingUrl}
            urlError={urlError}
            onAnalyzeUrl={onAnalyzeUrl}
            focusJobId={focusJobId}
            onFocusConsumed={onFocusConsumed}
          />
        </div>

        <aside className="min-w-0 space-y-4">
          <PortfolioForge
            profile={profile}
            activeIds={activeForgeIds}
            boostedPOffer={boostedPOffer}
            onToggle={onToggleForge}
            onOpenDispatch={onOpenDispatch}
          />

          <section className="panel">
            <div className="panel-header">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-primary" />
                <h2 className="mono-label text-content">Reading the calibration</h2>
              </div>
            </div>
            <div className="space-y-3 p-4">
              {[
                ['P(Shortlist)', 'Probability of clearing the initial evidence screen.'],
                ['P(Accept)', 'Probability of receiving an interview or programme acceptance.'],
                ['Confidence band', 'Uncertainty range around Jev’s calibrated decision.'],
              ].map(([label, detail]) => (
                <div key={label} className="flex items-start gap-2.5">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <div>
                    <p className="font-display text-[12px] font-semibold text-content">{label}</p>
                    <p className="mt-0.5 text-[10px] leading-snug text-muted">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded border-1.5 border-ink bg-subtle p-4 shadow-hard">
            <div className="flex items-center gap-2">
              <Layers3 className="h-4 w-4 text-accent-cyan" />
              <p className="label-caps text-accent-cyan">Source contract</p>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              Firecrawl retrieves page evidence; Jev calibrates the six-axis decision. Cached judge
              data remains available with no keys, so every control stays inspectable.
            </p>
            <div className="mt-3 flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.06em] text-muted">
              <FileSearch className="h-3 w-3" />
              {firecrawlLive ? 'Live source key present' : 'Cached dataset active'}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
