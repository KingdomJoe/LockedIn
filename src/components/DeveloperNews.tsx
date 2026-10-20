import { useMemo, useState } from 'react';
import { ArrowUpRight, Bookmark, Newspaper } from 'lucide-react';
import type { ProofOfWorkProfile } from '@/types/optimus';
import type { AppView } from '@/components/Sidebar';
import ViewHeader from '@/components/ViewHeader';
import { soundEngine } from '@/utils/soundEngine';

interface DeveloperNewsProps {
  profile: ProofOfWorkProfile;
  onNavigate: (view: AppView) => void;
}

function categoryFor(signal: string) {
  if (signal === 'ai' || signal === 'research') return 'REASONING';
  if (signal === 'oss' || signal === 'frontend') return 'OPEN SOURCE';
  return 'SYSTEMS';
}

function impactFor(signal: string) {
  if (signal === 'ai')
    return 'Agent systems are moving into review and merge decisions, which raises the value of auditable engineering judgment.';
  if (signal === 'backend')
    return 'Infrastructure economics shift when databases and runtimes absorb work previously handled by application code.';
  if (signal === 'oss')
    return 'Maintainer funding is turning open-source stewardship into a measurable career and hiring signal.';
  if (signal === 'frontend')
    return 'Type-level APIs are maturing into migration-grade decisions for teams maintaining large production interfaces.';
  return 'Runtime interoperability changes how products are benchmarked, deployed, and compared across edge providers.';
}

function readoutFor(signal: string) {
  if (signal === 'ai')
    return 'Track provenance logs and rollback controls in review agents. Those two features decide whether teams trust automated merges.';
  if (signal === 'backend')
    return 'Audit pool limits before benchmarking. Async I/O gains disappear quickly under cold starts, saturation, or misconfigured clients.';
  if (signal === 'oss')
    return 'Treat stewardship as portfolio evidence. Document review load, downstream impact, and the scope you actually maintain.';
  if (signal === 'frontend')
    return 'Prototype on one boundary before migrating. Decorator metadata is only as safe as the build graph underneath it.';
  return 'Test the same workload across two edge providers. Interoperability claims only matter when cold-start and cache behavior match.';
}

const FILTERS = ['ALL', 'REASONING', 'SYSTEMS', 'OPEN SOURCE'] as const;

export default function DeveloperNews({ profile, onNavigate }: DeveloperNewsProps) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('ALL');
  const stories = useMemo(
    () =>
      profile.scout.news.map((story, index) => ({
        ...story,
        category: categoryFor(story.signal),
        impact: impactFor(story.signal),
        index: String(index + 1).padStart(2, '0'),
      })),
    [profile.scout.news]
  );
  const visible = filter === 'ALL' ? stories : stories.filter((story) => story.category === filter);
  const featured = visible[0] ?? stories[0];

  return (
    <div className="mx-auto max-w-[1440px] p-4 sm:p-5">
      <ViewHeader
        index="05"
        title="Developer News"
        description="A personalized technical newsroom indexed for the current stack, repository cadence, and opportunity profile."
        actions={
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((item) => (
              <button
                key={item}
                onClick={() => {
                  soundEngine.playKeyClick();
                  setFilter(item);
                }}
                className={`rounded-full border px-2.5 py-1.5 font-mono text-[8px] font-bold tracking-[0.06em] transition-colors ${
                  filter === item
                    ? 'border-primary/60 bg-primary/10 text-primary'
                    : 'border-ink bg-well text-muted hover:bg-subtle hover:text-content'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        }
        metrics={[
          { label: 'Stories indexed', value: `${stories.length}` },
          { label: 'Primary stack', value: profile.languages[0]?.name ?? 'Polyglot' },
          { label: 'Fresh repos', value: `${profile.freshRepos}` },
          { label: 'Edition', value: 'Daily' },
        ]}
      />

      {featured && (
        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
          <article className="panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-subtle px-4 py-3">
              <div className="flex items-center gap-2">
                <Newspaper className="h-4 w-4 text-primary" />
                <span className="label-caps text-content">Lead story</span>
              </div>
              <span className="rounded-full border border-accent-indigo/40 bg-accent-indigo/10 px-2 py-1 font-mono text-[8px] font-bold tracking-[0.06em] text-accent-indigo">
                {featured.category}
              </span>
            </div>
            <div className="p-5">
              <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted">
                {featured.index} // {featured.source}
              </p>
              <h2 className="mt-3 max-w-[24ch] font-display text-[28px] font-bold leading-[1.05] tracking-[-0.03em] text-content sm:text-[34px]">
                {featured.headline}
              </h2>
              <p className="mt-3 max-w-[70ch] text-[13px] leading-[1.65] text-muted">
                {featured.impact}
              </p>

              <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="rounded border border-subtle bg-well p-3">
                  <p className="label-caps">Stack relevance</p>
                  <p className="mt-1 font-display text-[12px] font-semibold text-content">
                    {profile.languages[0]?.name ?? 'Polyglot'} production surface
                  </p>
                  <p className="mt-1 text-[10px] leading-[1.5] text-muted">
                    Weighted against your primary language share, repository cadence, and open-source history.
                  </p>
                </div>
                <div className="rounded border border-subtle bg-well p-3">
                  <p className="label-caps">Next action</p>
                  <p className="mt-1 font-display text-[12px] font-semibold text-content">
                    Convert signal into evidence
                  </p>
                  <p className="mt-1 text-[10px] leading-[1.5] text-muted">
                    Pair this brief with one shipped artifact before your next outreach cycle.
                  </p>
                </div>
              </div>

              <div className="mt-4 border-l-2 border-primary bg-well px-3 py-2.5">
                <p className="font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-primary">
                  Editorial readout
                </p>
                <p className="mt-1 text-[11px] leading-[1.55] text-muted">
                  {readoutFor(featured.signal)}
                </p>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-subtle pt-4">
                <p className="font-mono text-[8px] uppercase tracking-[0.08em] text-muted">
                  Personalized for @{profile.user.login} · {profile.languages[0]?.name ?? 'polyglot'} axis
                </p>
                <button
                  onClick={() => onNavigate('dispatch')}
                  className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-[0.06em] text-primary hover:text-primary-bright"
                >
                  Discuss in Dispatch <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </article>

          <section className="panel">
            <div className="panel-header">
              <h2 className="mono-label text-content">Index</h2>
              <span className="font-mono text-[9px] text-muted">{visible.length} notes</span>
            </div>
            <div className="divide-y divide-subtle">
              {visible.map((story) => (
                <div key={story.id} className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <span className="font-mono text-[9px] font-bold text-primary">{story.index}</span>
                    <div className="min-w-0">
                      <p className="text-[11px] leading-snug text-content">{story.headline}</p>
                      <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.06em] text-muted">
                        {story.source} · {story.category}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((story) => (
          <article key={story.id} className="card-hard flex flex-col p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[9px] font-bold text-primary">{story.index}</span>
              <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-muted">
                {story.source}
              </span>
            </div>
            <h3 className="mt-3 font-display text-[17px] font-bold leading-[1.15] tracking-[-0.02em] text-content">
              {story.headline}
            </h3>
            <p className="mt-2 text-[11px] leading-[1.55] text-muted">{story.impact}</p>
            <div className="mt-auto flex items-center justify-between gap-2 pt-4">
              <span className="rounded-full border border-subtle bg-well px-2 py-1 font-mono text-[7px] uppercase tracking-[0.06em] text-muted">
                {story.category}
              </span>
              <Bookmark className="h-3.5 w-3.5 text-muted" aria-hidden />
            </div>
          </article>
        ))}
      </div>

      {visible.length === 0 && (
        <div className="mt-5 rounded border border-subtle bg-well p-6 text-center">
          <p className="font-mono text-[10px] text-muted">No stories in this category yet.</p>
        </div>
      )}
    </div>
  );
}
