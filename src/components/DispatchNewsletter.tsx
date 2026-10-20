import { useState } from 'react';
import { ArrowUpRight, Check, Clipboard, Mail, Settings2 } from 'lucide-react';
import type { ProofOfWorkProfile } from '@/types/optimus';
import type { AppView } from '@/components/Sidebar';
import ViewHeader from '@/components/ViewHeader';
import { soundEngine } from '@/utils/soundEngine';

interface DispatchNewsletterProps {
  profile: ProofOfWorkProfile;
  onNavigate: (view: AppView) => void;
  onOpenSettings: () => void;
}

export default function DispatchNewsletter({
  profile,
  onNavigate,
  onOpenSettings,
}: DispatchNewsletterProps) {
  const [copied, setCopied] = useState(false);
  const edition = profile.newsletter;

  const copyDispatch = async () => {
    const text = [
      `LOCKEDIN DISPATCH — ${edition.edition}`,
      edition.headline,
      '',
      edition.lede,
      '',
      ...edition.sections.flatMap((section) => [section.title, section.body, '']),
      `Proof-of-work index: @${profile.user.login}`,
      `Benchmark: ${profile.jev.classification}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      soundEngine.playKeyClick();
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] p-4 sm:p-5">
      <ViewHeader
        index="06"
        title="Dispatch / Newsletter"
        description="A weekly editorial dispatch generated from the current proof-of-work index, open opportunities, and the signals shaping your stack."
        actions={
          <>
            <button onClick={copyDispatch} className="btn-ghost !px-3 !py-2 !text-[10px]">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy Dispatch'}
            </button>
            <button onClick={onOpenSettings} className="btn-primary !px-3 !py-2 !text-[10px]">
              <Settings2 className="h-3.5 w-3.5" />
              Dispatch Config
            </button>
          </>
        }
        metrics={[
          { label: 'Edition', value: edition.edition },
          { label: 'Sections', value: `${edition.sections.length}` },
          { label: 'Delivery', value: 'Browser preview' },
          { label: 'Reader', value: `@${profile.user.login}` },
        ]}
      />

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        <article className="panel overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-subtle px-4 py-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <span className="label-caps text-content">Weekly dispatch</span>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-muted">
              {edition.edition} · Preview
            </span>
          </div>

          <div className="p-5 sm:p-6">
            <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-primary">
              LockedIn Dispatch // {profile.languages[0]?.name ?? 'Engineering'} Desk
            </p>
            <h2 className="mt-3 max-w-[22ch] font-display text-[30px] font-bold leading-[1.04] tracking-[-0.03em] text-content sm:text-[40px]">
              {edition.headline}
            </h2>
            <p className="mt-3 max-w-[70ch] text-[13px] leading-[1.7] text-muted">{edition.lede}</p>

            <div className="mt-6 flex items-center gap-3 border-y border-subtle py-3">
              <img
                src={profile.user.avatar_url}
                alt={profile.user.login}
                className="h-9 w-9 rounded-full border-1.5 border-ink object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="font-display text-[12px] font-semibold text-content">
                  {profile.user.name ?? profile.user.login}
                </p>
                <p className="font-mono text-[8px] uppercase tracking-[0.06em] text-muted">
                  Proof-of-work index · {profile.jev.classification}
                </p>
              </div>
              <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-1 font-mono text-[8px] font-bold tracking-[0.06em] text-primary">
                {profile.jev.pShortlist}% P(Shortlist)
              </span>
            </div>

            <div className="mt-6 space-y-6">
              {edition.sections.map((section, index) => (
                <section key={section.title}>
                  <p className="font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-muted">
                    {String(index + 1).padStart(2, '0')} // {section.title}
                  </p>
                  <p className="mt-2 text-[13px] leading-[1.7] text-content/90">{section.body}</p>
                </section>
              ))}
            </div>

            <div className="mt-7 border-t border-subtle pt-4">
              <p className="font-mono text-[8px] leading-relaxed tracking-[0.04em] text-muted">
                Generated from {profile.scout.urlsInspected} inspected sources and {profile.repos.length}{' '}
                public repositories. Reader: {profile.user.login}. No tracking pixels.
              </p>
            </div>
          </div>
        </article>

        <aside className="space-y-4">
          <section className="panel">
            <div className="panel-header">
              <h2 className="mono-label text-content">Next edition</h2>
              <span className="font-mono text-[9px] text-accent-amber">Draft outline</span>
            </div>
            <div className="space-y-3 p-4">
              <div className="rounded border border-primary/30 bg-primary/5 p-3">
                <p className="label-caps text-primary">Focus axis</p>
                <p className="mt-1 font-display text-[16px] font-bold text-content">
                  {profile.gaps[0] ?? 'Systems'}
                </p>
                <p className="mt-1 text-[11px] leading-snug text-muted">
                  Current score {profile.competency[profile.gaps[0] ?? 'Systems']}/100. The dispatch
                  will prioritize concrete artifacts over claims.
                </p>
              </div>
              {[
                ['Research note', profile.briefing[0] ?? 'Proof-of-work calibration summary'],
                ['Opportunity brief', profile.jobs[0]?.role ?? 'Open role research'],
                ['Scout signal', profile.scout.news[0]?.headline ?? 'Technical news index'],
              ].map(([label, value], index) => (
                <div key={label} className="flex items-start gap-2.5">
                  <span className="mt-0.5 font-mono text-[9px] font-bold text-primary">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <p className="font-mono text-[8px] uppercase tracking-[0.06em] text-muted">
                      {label}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-content">
                      {value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2 className="mono-label text-content">Reading queue</h2>
              <span className="font-mono text-[9px] text-muted">From current profile</span>
            </div>
            <div className="divide-y divide-subtle">
              {profile.scout.news.slice(0, 4).map((story) => (
                <div key={story.id} className="px-4 py-3">
                  <p className="text-[11px] leading-snug text-content">{story.headline}</p>
                  <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.06em] text-muted">
                    {story.source}
                  </p>
                </div>
              ))}
            </div>
            <div className="border-t border-subtle p-3">
              <button
                onClick={() => onNavigate('news')}
                className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-[0.06em] text-primary hover:text-primary-bright"
              >
                Open developer news <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          </section>

          <section className="rounded border-1.5 border-ink bg-subtle p-4 shadow-hard">
            <p className="label-caps text-primary">Dispatch preferences</p>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              Delivery currently runs as an in-app browser preview. Provider and newsletter controls
              live in Engine Config.
            </p>
            <button onClick={onOpenSettings} className="btn-ghost mt-3 w-full !py-2 !text-[9px]">
              Manage preferences
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}
