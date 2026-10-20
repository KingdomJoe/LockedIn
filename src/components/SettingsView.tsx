import {
  Database,
  ExternalLink,
  FileText,
  Github,
  KeyRound,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
} from 'lucide-react';
import type { EngineConfig, EngineMode } from '@/types/engine';
import type { ProofOfWorkProfile } from '@/types/optimus';
import { LLM_PROVIDERS } from '@/services/engineConfig';
import ViewHeader from '@/components/ViewHeader';

interface SettingsViewProps {
  profile: ProofOfWorkProfile;
  config: EngineConfig;
  engineMode: EngineMode;
  onOpenEngine: (tab: 'config' | 'agents') => void;
}

export default function SettingsView({
  profile,
  config,
  engineMode,
  onOpenEngine,
}: SettingsViewProps) {
  const provider = LLM_PROVIDERS[config.llmProvider];
  const credentials = [
    { label: 'Firecrawl', value: config.firecrawlKey, fallback: 'Cached judge data' },
    { label: 'System-2 LLM', value: config.llmKey, fallback: 'Deterministic synthesis' },
    { label: 'Jev endpoint', value: config.jevEndpoint, fallback: 'Local RLCD classifier' },
  ];

  return (
    <div className="mx-auto max-w-[1440px] p-4 sm:p-5">
      <ViewHeader
        index="07"
        title="Settings"
        description="Engine credentials, profile identity, source contracts, and the operating rules behind the research index."
        actions={
          <>
            <button
              onClick={() => onOpenEngine('agents')}
              className="btn-ghost !px-3 !py-2 !text-[10px]"
            >
              <FileText className="h-3.5 w-3.5" />
              Agent Specs
            </button>
            <button
              onClick={() => onOpenEngine('config')}
              className="btn-primary !px-3 !py-2 !text-[10px]"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Engine Config
            </button>
          </>
        }
        metrics={[
          { label: 'Engine mode', value: engineMode === 'live' ? 'Live keys' : 'Judge mode' },
          { label: 'Provider', value: provider.short },
          { label: 'Model', value: config.llmModel },
          { label: 'Storage', value: 'Session only' },
        ]}
      />

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="panel">
          <div className="panel-header">
            <div className="flex items-center gap-2">
              <UserRound className="h-4 w-4 text-primary" />
              <h2 className="mono-label text-content">Profile identity</h2>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-primary">
              Public data
            </span>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <img
                src={profile.user.avatar_url}
                alt={profile.user.login}
                className="h-14 w-14 rounded border-1.5 border-ink object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-[18px] font-bold text-content">
                  {profile.user.name ?? profile.user.login}
                </p>
                <p className="font-mono text-[10px] text-muted">@{profile.user.login}</p>
                <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-muted">
                  {profile.user.bio ?? 'No public bio supplied.'}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                ['Public repos', `${profile.user.public_repos}`],
                ['Followers', `${profile.user.followers}`],
                ['Merged sources', `${profile.signals.length}`],
                ['Fresh repos', `${profile.freshRepos}`],
              ].map(([label, value]) => (
                <div key={label} className="rounded border border-subtle bg-well px-3 py-2">
                  <p className="label-caps">{label}</p>
                  <p className="mt-1 font-mono text-[12px] font-bold text-content">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={profile.user.html_url}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost !px-3 !py-2 !text-[9px]"
              >
                <Github className="h-3.5 w-3.5" />
                Open GitHub
                <ExternalLink className="h-3 w-3" />
              </a>
              <span className="rounded border border-subtle bg-well px-3 py-2 font-mono text-[8px] uppercase tracking-[0.06em] text-muted">
                Switch profiles in the header
              </span>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-accent-cyan" />
              <h2 className="mono-label text-content">Engine credentials</h2>
            </div>
            <span
              className={`font-mono text-[9px] font-bold uppercase tracking-[0.06em] ${
                engineMode === 'live' ? 'text-primary' : 'text-accent-amber'
              }`}
            >
              {engineMode}
            </span>
          </div>
          <div className="divide-y divide-subtle">
            {credentials.map((credential) => (
              <div key={credential.label} className="flex items-center gap-3 px-4 py-3">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    credential.value ? 'bg-primary' : 'bg-accent-amber'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] font-semibold text-content">
                    {credential.label}
                  </p>
                  <p className="truncate font-mono text-[8px] text-muted">
                    {credential.value ? 'Configured for this tab' : credential.fallback}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-[8px] uppercase tracking-[0.06em] text-muted">
                  {credential.value ? 'Present' : 'Not set'}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-subtle p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] font-semibold text-content">
                  {provider.label} · {config.llmModel}
                </p>
                <p className="mt-0.5 font-mono text-[8px] text-muted">{provider.blurb}</p>
              </div>
              <button
                onClick={() => onOpenEngine('config')}
                className="btn-ghost shrink-0 !px-3 !py-2 !text-[9px]"
              >
                Change
              </button>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h2 className="mono-label text-content">Session & privacy</h2>
            </div>
          </div>
          <div className="space-y-3 p-4">
            <p className="text-[12px] leading-[1.65] text-muted">
              Keys live only in this tab’s <span className="font-mono text-content">sessionStorage</span>{' '}
              and are sent directly to the selected providers. Closing the tab clears them. No backend
              stores credentials or profile data.
            </p>
            <div className="rounded border border-accent-amber/30 bg-accent-amber/5 p-3">
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.06em] text-accent-amber">
                Production note
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-muted">
                A production deployment should proxy provider calls through a server so keys are never
                exposed in the browser.
              </p>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-accent-indigo" />
              <h2 className="mono-label text-content">Source contracts</h2>
            </div>
          </div>
          <div className="divide-y divide-subtle">
            {[
              ['GitHub REST', 'Unauthenticated public profile and repositories', 'Zero-auth'],
              ['Firecrawl', 'Opportunity and page evidence retrieval', engineMode === 'live' ? 'Key set' : 'Cached'],
              ['Jev System-1', 'RLCD eligibility calibration', 'Deterministic'],
              ['Forge System-2', 'Narrative synthesis and recommendations', provider.short],
            ].map(([name, detail, status]) => (
              <div key={name} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] font-semibold text-content">{name}</p>
                  <p className="text-[9px] leading-snug text-muted">{detail}</p>
                </div>
                <span className="shrink-0 rounded-full border border-subtle bg-well px-2 py-1 font-mono text-[7px] uppercase tracking-[0.06em] text-muted">
                  {status}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
