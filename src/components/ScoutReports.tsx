import { ExternalLink, Radar, RefreshCw, TrendingUp } from 'lucide-react';
import type { ProofOfWorkProfile } from '@/types/optimus';
import type { AppView } from '@/components/Sidebar';
import ViewHeader from '@/components/ViewHeader';
import { soundEngine } from '@/utils/soundEngine';

interface ScoutReportsProps {
  profile: ProofOfWorkProfile;
  scouting: boolean;
  firecrawlLive: boolean;
  onRunScout: () => Promise<void>;
  onNavigate: (view: AppView) => void;
}

function hostOf(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return value;
  }
}

function ScoutRadar({ profile }: { profile: ProofOfWorkProfile }) {
  const points = profile.scout.hackathons.slice(0, 5).map((item, index) => {
    const angle = (index / 5) * Math.PI * 2 - Math.PI / 2;
    const radius = 20 + (100 - item.fitScore) * 0.8;
    return {
      id: item.id,
      x: 110 + Math.cos(angle) * radius,
      y: 110 + Math.sin(angle) * radius,
      fit: item.fitScore,
    };
  });

  return (
    <div className="relative grid place-items-center overflow-hidden rounded border border-subtle bg-canvas p-4">
      <svg viewBox="0 0 220 220" className="h-[210px] w-[210px]" role="img" aria-label="Hackathon fit radar">
        {[38, 68, 98].map((radius) => (
          <circle
            key={radius}
            cx="110"
            cy="110"
            r={radius}
            fill="none"
            stroke="#2E3440"
            strokeWidth="1"
          />
        ))}
        <line x1="110" y1="12" x2="110" y2="208" stroke="#252932" strokeWidth="1" />
        <line x1="12" y1="110" x2="208" y2="110" stroke="#252932" strokeWidth="1" />
        <line x1="42" y1="42" x2="178" y2="178" stroke="#252932" strokeWidth="1" />
        <line x1="178" y1="42" x2="42" y2="178" stroke="#252932" strokeWidth="1" />
        <g className="origin-center animate-orb-spin">
          <line x1="110" y1="110" x2="110" y2="18" stroke="#00D2D3" strokeWidth="1.5" opacity="0.75" />
          <circle cx="110" cy="22" r="2" fill="#00D2D3" />
        </g>
        <circle cx="110" cy="110" r="3" fill="#12cc0f" />
        {points.map((point) => (
          <g key={point.id}>
            <circle cx={point.x} cy={point.y} r={point.fit >= 80 ? 4 : 3} fill="#12cc0f" />
            <circle cx={point.x} cy={point.y} r="8" fill="none" stroke="#12cc0f" opacity="0.2" />
          </g>
        ))}
        <text x="110" y="8" textAnchor="middle" fill="#8C92A4" fontSize="7" fontFamily="JetBrains Mono">
          OSS
        </text>
        <text x="110" y="218" textAnchor="middle" fill="#8C92A4" fontSize="7" fontFamily="JetBrains Mono">
          TEAM
        </text>
        <text x="8" y="112" textAnchor="start" fill="#8C92A4" fontSize="7" fontFamily="JetBrains Mono">
          SHIP
        </text>
        <text x="212" y="112" textAnchor="end" fill="#8C92A4" fontSize="7" fontFamily="JetBrains Mono">
          IMPACT
        </text>
      </svg>
      <p className="label-caps mt-1">Hackathon fit topology</p>
    </div>
  );
}

export default function ScoutReports({
  profile,
  scouting,
  firecrawlLive,
  onRunScout,
  onNavigate,
}: ScoutReportsProps) {
  const highMatch = profile.scout.hackathons.filter((item) => item.fitScore >= 70).length;
  const topJobs = profile.jobs.slice(0, 3);

  const runScout = () => {
    if (scouting) return;
    soundEngine.playSonarPing();
    void onRunScout();
  };

  return (
    <div className="mx-auto max-w-[1440px] p-4 sm:p-5">
      <ViewHeader
        index="04"
        title="Live Firecrawl Scouts"
        description="Firecrawl research across live opportunity surfaces, scored against your current proof-of-work profile. Every row carries a source domain and a calibrated match."
        actions={
          <button onClick={runScout} disabled={scouting} className="btn-primary !px-3 !py-2 !text-[10px]">
            <RefreshCw className={`h-3.5 w-3.5 ${scouting ? 'animate-spin' : ''}`} />
            {scouting ? 'Scanning sources…' : 'Run Live Scrape'}
          </button>
        }
        metrics={[
          { label: 'Source mode', value: firecrawlLive ? 'Live key' : 'Cached' },
          { label: 'Sources inspected', value: `${profile.scout.urlsInspected}` },
          { label: 'High-match targets', value: `${highMatch}` },
          { label: 'Last scan', value: `${profile.scout.lastScanMs}ms` },
        ]}
      />

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
        <section className="panel">
          <div className="panel-header">
            <div className="flex items-center gap-2">
              <Radar className="h-4 w-4 text-accent-cyan" />
              <h2 className="mono-label text-content">Opportunity radar</h2>
            </div>
            <span className="font-mono text-[9px] text-muted">Fit by programme</span>
          </div>
          <div className="p-4">
            <ScoutRadar profile={profile} />
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded border border-subtle bg-well p-2.5">
                <p className="label-caps">Median fit</p>
                <p className="mt-1 font-mono text-[16px] font-bold text-primary">
                  {Math.round(
                    profile.scout.hackathons.reduce((sum, item) => sum + item.fitScore, 0) /
                      Math.max(profile.scout.hackathons.length, 1)
                  )}
                  %
                </p>
              </div>
              <div className="rounded border border-subtle bg-well p-2.5">
                <p className="label-caps">Programmes</p>
                <p className="mt-1 font-mono text-[16px] font-bold text-content">
                  {profile.scout.hackathons.length}
                </p>
              </div>
              <div className="rounded border border-subtle bg-well p-2.5">
                <p className="label-caps">Lead roles</p>
                <p className="mt-1 font-mono text-[16px] font-bold text-content">
                  {profile.jobs.length}
                </p>
              </div>
            </div>
            <p className="mt-3 rounded border border-subtle bg-well p-3 font-mono text-[9px] leading-relaxed text-muted">
              Cached evidence remains fully available without a Firecrawl key. Live page fetches
              unlock when a source key is configured.
            </p>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2 className="mono-label text-content">Hackathon shortlist</h2>
            <span className="font-mono text-[9px] text-accent-amber">
              {profile.scout.hackathons.length} programmes
            </span>
          </div>
          <div className="divide-y divide-subtle">
            {profile.scout.hackathons.map((item, index) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="group grid grid-cols-[28px_minmax(0,1fr)_auto] items-start gap-3 px-4 py-3 transition-colors hover:bg-subtle"
              >
                <span className="font-mono text-[10px] font-bold text-primary">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-display text-[13px] font-semibold text-content group-hover:text-primary">
                      {item.name}
                    </span>
                    <span className="rounded-full border border-subtle bg-well px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-[0.06em] text-muted">
                      {hostOf(item.url)}
                    </span>
                  </span>
                  <span className="mt-0.5 block font-mono text-[9px] text-muted">
                    {item.organizer} · {item.date}
                  </span>
                  <span className="mt-1.5 flex items-center gap-2">
                    <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded bg-ink">
                      <span
                        className="block h-full bg-accent-cyan"
                        style={{ width: `${item.fitScore}%` }}
                      />
                    </span>
                    <span className="shrink-0 font-mono text-[9px] text-muted">{item.fitScore}% fit</span>
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-mono text-[10px] font-bold text-content">{item.prize}</span>
                  <ExternalLink className="ml-auto mt-1 h-3 w-3 text-muted group-hover:text-primary" />
                </span>
              </a>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <section className="panel">
          <div className="panel-header">
            <h2 className="mono-label text-content">Live role leads</h2>
            <button
              onClick={() => onNavigate('eligibility')}
              className="font-mono text-[9px] font-bold uppercase tracking-[0.06em] text-primary hover:text-primary-bright"
            >
              Open eligibility
            </button>
          </div>
          <div className="divide-y divide-subtle">
            {topJobs.map((job) => (
              <div key={job.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-[13px] font-semibold text-content">
                    {job.role}
                  </p>
                  <p className="font-mono text-[9px] text-muted">
                    {job.org} · {job.location} · {job.compensation}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-[12px] font-bold text-primary">{job.pAccept}%</p>
                  <p className="font-mono text-[8px] uppercase tracking-[0.06em] text-muted">
                    P(Accept)
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h2 className="mono-label text-content">Signal watch</h2>
            </div>
            <span className="font-mono text-[9px] text-muted">Scraped headlines</span>
          </div>
          <div className="space-y-3 p-4">
            {profile.scout.news.slice(0, 4).map((story) => (
              <div key={story.id} className="border-l-2 border-primary/40 pl-3">
                <p className="text-[11px] leading-snug text-content">{story.headline}</p>
                <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.06em] text-muted">
                  {story.source} · {story.signal}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
