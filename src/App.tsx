import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  FileCode2,
  Github,
  Linkedin,
  Link as LinkIcon,
  Loader2,
  LockKeyhole,
  Menu,
  Search,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { CustomTargetAnalysis, EngineConfig } from '@/types/engine';
import type { AppearanceSettings } from '@/types/appearance';
import type { ProofOfWorkProfile } from '@/types/optimus';
import {
  generateProfile,
  applyCounterfactual,
  resyncProfileLinks,
  type ProfileInputs,
} from '@/services/optimusEngine';
import { loadEngineConfig, saveEngineConfig } from '@/services/engineConfig';
import { applyAppearance, loadAppearance, saveAppearance } from '@/services/appearance';
import { analyzeTarget } from '@/services/customAnalysis';
import {
  buildCachedScrape,
  normalizeUrl,
  scrapeWithFirecrawl,
  type ScrapeBundle,
} from '@/services/firecrawl';
import { soundEngine, SOUND_LABELS, type SoundName } from '@/utils/soundEngine';
import Sidebar, { type AppView } from '@/components/Sidebar';
import OverviewDashboard from '@/components/OverviewDashboard';
import OptiBotsPage from '@/components/OptiBotsPage';
import EligibilityOpportunity from '@/components/EligibilityOpportunity';
import ScoutReports from '@/components/ScoutReports';
import DeveloperNews from '@/components/DeveloperNews';
import DispatchNewsletter from '@/components/DispatchNewsletter';
import SettingsPage from '@/components/SettingsPage';
import EngineDrawer from '@/components/EngineDrawer';
import LandingPage from '@/components/LandingPage';

type Phase = 'onboarding' | 'incinerating' | 'deployed' | 'error';
type SidebarView = AppView | 'settings';

const VIEW_LABELS: Record<SidebarView, string> = {
  overview: 'Palantir Overview',
  bots: 'Autonomous OptiBots',
  eligibility: 'Job & Role Matcher',
  scout: 'Live Firecrawl Scouts',
  news: 'Dev Pulse',
  dispatch: 'Your Weekly Dispatch',
  settings: 'Settings',
};

const PRESETS = [
  { username: 'torvalds', label: 'torvalds', note: 'Linux · principal architect' },
  { username: 'shadcn', label: 'shadcn', note: 'shadcn/ui · design systems' },
  { username: 'yyx990803', label: 'yyx990803', note: 'Vue / Vite · tooling' },
  { username: 'KingdomJoe', label: 'KingdomJoe', note: 'Builder profile' },
];

const SHORTCUT_VIEWS: SidebarView[] = [
  'overview',
  'bots',
  'eligibility',
  'scout',
  'news',
  'dispatch',
];

export default function App() {
  const [phase, setPhase] = useState<Phase>('onboarding');
  const [inputs, setInputs] = useState<ProfileInputs>({ username: '' });
  const [profile, setProfile] = useState<ProofOfWorkProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [switchName, setSwitchName] = useState('');
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const [muted, setMuted] = useState(soundEngine.isMuted());
  const [appearance, setAppearance] = useState<AppearanceSettings>(() => loadAppearance());
  const [toasts, setToasts] = useState<{ id: number; name: SoundName }[]>([]);
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [scouting, setScouting] = useState(false);
  const [view, setView] = useState<SidebarView>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const stored = window.localStorage.getItem('lockedin.sidebar.collapsed');
      if (stored === '1' || stored === '0') return stored === '1';
      return window.innerWidth < 1280;
    } catch {
      return window.innerWidth < 1280;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [focusJobId, setFocusJobId] = useState<string | null>(null);
  const [engineConfig, setEngineConfig] = useState<EngineConfig>(() => loadEngineConfig());
  const [engineDrawer, setEngineDrawer] = useState<{ open: boolean; tab: 'config' | 'agents' }>({
    open: false,
    tab: 'config',
  });
  const [customMatches, setCustomMatches] = useState<CustomTargetAnalysis[]>([]);
  const [analyzingUrl, setAnalyzingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [scanTarget, setScanTarget] = useState<string | null>(null);
  const toastId = useRef(0);
  const autopsyAbort = useRef<AbortController | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => soundEngine.onMuteChange(setMuted), []);

  useEffect(() => {
    saveEngineConfig(engineConfig);
  }, [engineConfig]);

  useEffect(() => {
    applyAppearance(appearance);
    saveAppearance(appearance);
  }, [appearance]);

  useEffect(() => {
    try {
      window.localStorage.setItem('lockedin.sidebar.collapsed', sidebarCollapsed ? '1' : '0');
    } catch {
      return;
    }
  }, [sidebarCollapsed]);

  useEffect(() => () => autopsyAbort.current?.abort(), []);

  const pushToast = useCallback((name: SoundName) => {
    const id = ++toastId.current;
    setToasts((current) =>
      current.some((item) => item.name === name)
        ? current
        : [...current.slice(-3), { id, name }]
    );
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 1800);
  }, []);

  useEffect(() => soundEngine.onCue(pushToast), [pushToast]);

  const playKey = useCallback(() => {
    soundEngine.playKeyClick();
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }

      if (event.altKey && !event.ctrlKey && !event.metaKey) {
        const index = Number(event.key);
        if (Number.isInteger(index) && index >= 1 && index <= SHORTCUT_VIEWS.length) {
          event.preventDefault();
          setView(SHORTCUT_VIEWS[index - 1]);
          setMobileOpen(false);
          return;
        }
      }

      if (event.key === 'Escape') {
        setEngineDrawer((drawer) => ({ ...drawer, open: false }));
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const openEngine = useCallback((tab: 'config' | 'agents') => {
    soundEngine.playKeyClick();
    setEngineDrawer({ open: true, tab });
  }, []);

  const toggleSound = useCallback(() => {
    const next = !soundEngine.isMuted();
    soundEngine.setMuted(next);
    if (!next) soundEngine.playJevMatrixLock();
  }, []);

  const counterfactual = useMemo(() => {
    if (!profile) return { boostedPOffer: 0, totalDelta: 0 };
    return applyCounterfactual(profile.jev.pOffer, profile.forge, activeIds);
  }, [profile, activeIds]);

  const auraLevel = useMemo(() => {
    if (!profile) return 20;
    return Math.min(100, counterfactual.boostedPOffer);
  }, [profile, counterfactual]);

  const deploy = useCallback(async (raw: ProfileInputs, options?: { keepShell?: boolean }) => {
    const username = raw.username.trim();
    if (!username) {
      if (options?.keepShell) setSwitchError('Enter a GitHub username to switch profiles.');
      else setError('Enter a GitHub username or choose a preset to start.');
      return;
    }

    setInputs({ ...raw, username });
    setError(null);
    setSwitchError(null);
    if (options?.keepShell) setSwitching(true);
    else setPhase('incinerating');
    soundEngine.playLockInEngage();

    const started = Date.now();
    try {
      const nextProfile = await generateProfile({ ...raw, username });
      const elapsed = Date.now() - started;
      if (elapsed < 1400) await new Promise((resolve) => setTimeout(resolve, 1400 - elapsed));
      setProfile(nextProfile);
      setActiveIds([]);
      setCustomMatches([]);
      setUrlError(null);
      setScanTarget(null);
      setSwitchName('');
      setView('overview');
      if (!options?.keepShell) setPhase('deployed');
      soundEngine.playJevMatrixLock();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'The proof-of-work profile could not be built.';
      if (options?.keepShell) {
        setSwitchError(message);
      } else {
        setError(message);
        setPhase('error');
      }
    } finally {
      if (options?.keepShell) setSwitching(false);
    }
  }, []);

  const saveProfileLinks = useCallback(
    async (raw: ProfileInputs): Promise<{ ok: boolean; message?: string }> => {
      if (!profile) return { ok: false, message: 'No active profile to update.' };
      const username = raw.username.trim();
      if (!username) return { ok: false, message: 'A GitHub handle is required.' };

      const nextInputs: ProfileInputs = { ...raw, username };
      const rebuilding = username.toLowerCase() !== profile.user.login.toLowerCase();
      setSwitching(true);
      setSwitchError(null);
      soundEngine.playLockInEngage();

      try {
        const nextProfile = rebuilding
          ? await generateProfile(nextInputs)
          : resyncProfileLinks(profile, nextInputs);
        setInputs(nextInputs);
        setProfile(nextProfile);
        setActiveIds([]);
        setCustomMatches([]);
        setUrlError(null);
        setScanTarget(null);
        setFocusJobId(null);
        setSwitchName('');
        soundEngine.playJevMatrixLock();
        return {
          ok: true,
          message: rebuilding
            ? `Profile rebuilt from @${username}. Palantir and the default OptiBots have been re-provisioned.`
            : 'Profile links synced. Palantir and the default OptiBots are running against the updated sources.',
        };
      } catch (cause) {
        return {
          ok: false,
          message: cause instanceof Error ? cause.message : 'Profile sync failed. Retry.',
        };
      } finally {
        setSwitching(false);
      }
    },
    [profile]
  );

  const switchProfile = useCallback(() => {
    if (!switchName.trim() || switching || !profile) return;
    if (switchName.trim().toLowerCase() === profile.user.login.toLowerCase()) {
      setSwitchName('');
      return;
    }
    void deploy({ ...inputs, username: switchName.trim() }, { keepShell: true });
  }, [switchName, switching, profile, inputs, deploy]);

  const runScout = useCallback(async () => {
    if (!profile) return;
    setScouting(true);
    soundEngine.playSonarPing();
    await new Promise((resolve) => setTimeout(resolve, 900));
    setProfile({ ...profile, scout: { ...profile.scout } });
    setScouting(false);
  }, [profile]);

  const analyzeUrl = useCallback(
    async (raw: string) => {
      if (!profile) return;
      setUrlError(null);
      let normalized: string;
      try {
        normalized = normalizeUrl(raw);
      } catch (cause) {
        setUrlError(cause instanceof Error ? cause.message : 'That URL could not be parsed.');
        return;
      }

      autopsyAbort.current?.abort();
      const controller = new AbortController();
      autopsyAbort.current = controller;
      setAnalyzingUrl(true);
      setScanTarget(normalized);
      soundEngine.playSonarPing();
      const started = Date.now();

      try {
        let bundle: ScrapeBundle;
        if (engineConfig.firecrawlKey.trim()) {
          try {
            bundle = await scrapeWithFirecrawl(
              normalized,
              engineConfig.firecrawlKey,
              controller.signal
            );
          } catch (cause) {
            if (controller.signal.aborted) return;
            const reason = cause instanceof Error ? cause.message : 'Live crawl failed';
            bundle = {
              ...buildCachedScrape(normalized),
              notice: `${reason} — fell back to the cached dataset.`,
            };
          }
        } else {
          bundle = buildCachedScrape(normalized);
        }

        if (controller.signal.aborted) return;
        const hold = 850 - (Date.now() - started);
        if (hold > 0) await new Promise((resolve) => setTimeout(resolve, hold));
        if (controller.signal.aborted) return;

        const analysis = analyzeTarget(profile, bundle, normalized);
        setCustomMatches((current) =>
          [analysis, ...current.filter((match) => match.url !== analysis.url)].slice(0, 4)
        );
        soundEngine.playJevMatrixLock();
      } catch (cause) {
        if (!controller.signal.aborted) {
          setUrlError(cause instanceof Error ? cause.message : 'Autopsy failed. Retry.');
        }
      } finally {
        if (!controller.signal.aborted) setAnalyzingUrl(false);
        window.setTimeout(() => {
          if (autopsyAbort.current !== controller) return;
          setScanTarget(null);
        }, 1200);
      }
    },
    [profile, engineConfig.firecrawlKey]
  );

  const toggleForge = useCallback((id: string, next: boolean) => {
    setActiveIds((current) =>
      next ? [...current, id] : current.filter((activeId) => activeId !== id)
    );
  }, []);

  const consumeFocusJob = useCallback(() => setFocusJobId(null), []);

  const draftJob = useCallback((jobId: string) => {
    setFocusJobId(jobId);
    setView('eligibility');
    setMobileOpen(false);
  }, []);

  useEffect(() => {
    if (counterfactual.totalDelta > 0) {
      const timer = window.setTimeout(() => soundEngine.playCounterfactualBoost(), 60);
      return () => window.clearTimeout(timer);
    }
  }, [counterfactual.totalDelta]);

  if (!profile) {
    return (
      <LandingPage
        inputs={inputs}
        phase={phase}
        error={error}
        onInputsChange={setInputs}
        onDeploy={(nextInputs) => void deploy(nextInputs)}
      />
    );
  }

  if (!profile) {
    return (
      <div className="relative min-h-screen overflow-x-hidden bg-canvas">
        <header className="flex h-14 items-center justify-between border-b border-subtle px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded border-1.5 border-ink bg-primary text-primary-ink shadow-hard">
              <LockKeyhole className="h-4 w-4" />
            </span>
            <span className="shrink-0 font-display text-[18px] font-bold leading-none tracking-[-0.02em] text-content">
              LockedIn
            </span>
            <span className="hidden font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-muted sm:inline">
              Command Center
            </span>
          </div>
        </header>

        <main className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:py-12">
          <section className="flex flex-col justify-center">
            <p className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Proof-of-Work Engine · v3.1 · Local + live
            </p>
            <h1 className="mt-4 max-w-[13ch] font-display text-[42px] font-bold leading-[0.98] tracking-[-0.04em] text-content sm:text-[56px] lg:text-[64px]">
              Time to lock in.
            </h1>
            <p className="mt-5 max-w-[58ch] text-[13px] leading-[1.7] text-muted sm:text-[14px]">
              LockedIn reads public engineering evidence, not resume adjectives. Drop your footprint
              and get a calibrated proof-of-work profile across repositories, languages, and open
              opportunities.
            </p>

            <div className="mt-6 grid grid-cols-3 gap-2">
              {[
                ['Calibration', '24 signals'],
                ['Speed', '~140ms'],
                ['Setup', 'No keys'],
              ].map(([label, value]) => (
                <div key={label} className="rounded border border-subtle bg-well p-3">
                  <p className="label-caps">{label}</p>
                  <p className="mt-1 font-mono text-[13px] font-bold text-content">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-start gap-3 border-l-2 border-primary/50 pl-3">
              <p className="max-w-[52ch] text-[11px] leading-relaxed text-muted">
                The engine starts without keys: public GitHub telemetry, calibrated eligibility, and
                a cached scout dataset. Live source access is optional.
              </p>
            </div>
          </section>

          <section className="card-hard p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3 border-b border-subtle pb-3">
              <div>
                <p className="label-caps text-primary">Drop your footprint</p>
                <h2 className="mt-1 font-display text-[22px] font-bold tracking-[-0.02em] text-content">
                  Start with your GitHub handle
                </h2>
              </div>
              <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-1 font-mono text-[8px] font-bold tracking-[0.06em] text-primary">
                READY
              </span>
            </div>

            <form
              className="mt-4 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void deploy(inputs);
              }}
            >
              <label className="block">
                <span className="label-caps mb-1 flex items-center gap-1.5">
                  <Github className="h-3 w-3" /> GitHub username *
                </span>
                <input
                  value={inputs.username}
                  onChange={(event) =>
                    setInputs((current) => ({ ...current, username: event.target.value }))
                  }
                  onKeyDown={playKey}
                  placeholder="torvalds"
                  className="field-input"
                  autoComplete="off"
                  spellCheck={false}
                  autoFocus
                />
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="label-caps mb-1 flex items-center gap-1.5">
                    <Linkedin className="h-3 w-3" /> LinkedIn URL
                  </span>
                  <input
                    value={inputs.linkedinUrl ?? ''}
                    onChange={(event) =>
                      setInputs((current) => ({ ...current, linkedinUrl: event.target.value }))
                    }
                    onKeyDown={playKey}
                    placeholder="linkedin.com/in/you"
                    className="field-input"
                    autoComplete="off"
                  />
                </label>
                <label className="block">
                  <span className="label-caps mb-1 flex items-center gap-1.5">
                    <span className="font-mono text-[10px]">𝕏</span> X handle
                  </span>
                  <input
                    value={inputs.xHandle ?? ''}
                    onChange={(event) =>
                      setInputs((current) => ({ ...current, xHandle: event.target.value }))
                    }
                    onKeyDown={playKey}
                    placeholder="@yourhandle"
                    className="field-input"
                    autoComplete="off"
                  />
                </label>
                <label className="block">
                  <span className="label-caps mb-1 flex items-center gap-1.5">
                    <LinkIcon className="h-3 w-3" /> Portfolio URL
                  </span>
                  <input
                    value={inputs.portfolioUrl ?? ''}
                    onChange={(event) =>
                      setInputs((current) => ({ ...current, portfolioUrl: event.target.value }))
                    }
                    onKeyDown={playKey}
                    placeholder="you.dev"
                    className="field-input"
                    autoComplete="off"
                  />
                </label>
                <label className="block">
                  <span className="label-caps mb-1 flex items-center gap-1.5">
                    <FileCode2 className="h-3 w-3" /> Certificates
                  </span>
                  <input
                    value={inputs.certificates ?? ''}
                    onChange={(event) =>
                      setInputs((current) => ({ ...current, certificates: event.target.value }))
                    }
                    onKeyDown={playKey}
                    placeholder="AWS SAA, CKAD…"
                    className="field-input"
                    autoComplete="off"
                  />
                </label>
              </div>

              {error && (
                <p className="flex items-start gap-2 rounded border border-accent-coral/40 bg-accent-coral/5 p-2.5 text-[11px] leading-relaxed text-accent-coral">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={phase === 'incinerating'}
                className="btn-primary w-full !py-3.5 !text-[11px]"
              >
                {phase === 'incinerating' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                {phase === 'incinerating' ? 'Locking in…' : 'Build proof of work'}
              </button>
            </form>

            <div className="mt-5 border-t border-subtle pt-4">
              <p className="label-caps mb-2">Try a builder</p>
              <div className="grid grid-cols-2 gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.username}
                    type="button"
                    disabled={phase === 'incinerating'}
                    onClick={() => void deploy({ username: preset.username })}
                    className="rounded border-1.5 border-ink bg-well px-2.5 py-2 text-left transition-colors hover:bg-subtle disabled:opacity-50"
                  >
                    <span className="block truncate font-mono text-[10px] font-bold text-content">
                      {preset.label}
                    </span>
                    <span className="mt-0.5 block truncate font-mono text-[8px] text-muted">
                      {preset.note}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </main>

        {phase === 'incinerating' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/95 px-4">
            <div className="card-hard w-full max-w-md p-5">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] animate-scanline bg-primary" />
              <p className="label-caps text-accent-coral">Legacy claim filter</p>
              <div className="mt-3 space-y-1.5">
                {[
                  '"Passionate about technology"',
                  '"Results-driven team player"',
                  '"Thought leader & ninja"',
                  '"Excellent communicator"',
                ].map((phrase) => (
                  <p
                    key={phrase}
                    className="font-mono text-[11px] text-muted line-through decoration-accent-coral/70"
                  >
                    {phrase}
                  </p>
                ))}
              </div>
              <p className="mt-4 flex items-center gap-2 font-mono text-[10px] text-primary">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Pulling public GitHub telemetry for{' '}
                <span className="font-bold">{inputs.username}</span>
              </p>
              <div className="mt-4 h-1 overflow-hidden rounded bg-ink">
                <div className="h-full w-1/2 animate-laser-sweep bg-primary" />
              </div>
            </div>
          </div>
        )}

        <EngineDrawer
          open={engineDrawer.open}
          initialTab={engineDrawer.tab}
          config={engineConfig}
          onChange={setEngineConfig}
          onClose={() => setEngineDrawer((drawer) => ({ ...drawer, open: false }))}
          profile={null}
          target={null}
        />

        <footer className="border-t border-subtle px-4 py-3 text-center font-mono text-[9px] text-muted">
          LockedIn · Proof-of-Work Engine · Calibration × Strategy × Live Scouting
        </footer>

        <div className="pointer-events-none fixed bottom-4 right-3 z-50 flex flex-col items-end gap-1.5">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="animate-rise-in rounded border-1.5 border-ink bg-surface px-3 py-1.5 font-mono text-[9px] font-bold tracking-[0.06em] text-primary shadow-hard"
            >
              {SOUND_LABELS[toast.name]}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas lg:flex">
      <Sidebar
        view={view}
        profile={profile}
        collapsed={sidebarCollapsed}
        mobileOpen={mobileOpen}
        onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
        onMobileClose={() => setMobileOpen(false)}
        onViewChange={(next) => setView(next)}
        onSettings={() => setView('settings')}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-subtle bg-canvas px-3 sm:px-5">
          <button
            onClick={() => setMobileOpen(true)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded border-1.5 border-ink bg-well text-content lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </button>

          <div className="min-w-0 shrink-0">
            <p className="hidden font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-muted sm:block">
              LockedIn / Command Center
            </p>
            <p className="truncate font-display text-[13px] font-semibold text-content sm:text-[14px]">
              {VIEW_LABELS[view]}
            </p>
          </div>

          <form
            className="mx-auto flex w-full max-w-[300px] items-center gap-1.5"
            onSubmit={(event) => {
              event.preventDefault();
              switchProfile();
            }}
          >
            <div className="relative min-w-0 flex-1">
              <Github className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              <input
                ref={searchRef}
                value={switchName}
                onChange={(event) => {
                  setSwitchName(event.target.value);
                  if (switchError) setSwitchError(null);
                }}
                placeholder={`Switch from @${profile.user.login}`}
                className="field-input !py-2 !pl-7 !pr-2 font-mono !text-[10px]"
                aria-label="Switch GitHub profile"
                autoComplete="off"
                spellCheck={false}
                list="profile-presets"
              />
              <datalist id="profile-presets">
                {PRESETS.map((preset) => (
                  <option key={preset.username} value={preset.username} />
                ))}
                <option value={profile.user.login} />
              </datalist>
            </div>
            <button
              type="submit"
              disabled={!switchName.trim() || switching}
              className="grid h-8 w-8 shrink-0 place-items-center rounded border-1.5 border-ink bg-surface text-primary shadow-hard transition-colors hover:bg-subtle disabled:opacity-40"
              aria-label="Load GitHub profile"
            >
              {switching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Search className="h-3.5 w-3.5" />
              )}
            </button>
          </form>

          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <button
              onClick={toggleSound}
              className={`grid h-8 w-8 place-items-center rounded border-1.5 transition-colors ${
                muted
                  ? 'border-ink bg-well text-muted hover:text-content'
                  : 'border-primary/40 bg-primary/10 text-primary'
              }`}
              aria-label={muted ? 'Enable audio cues' : 'Mute audio cues'}
              title={muted ? 'Enable audio cues' : 'Mute audio cues'}
            >
              {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>
          </div>
        </header>

        {switching && (
          <div className="fixed inset-x-0 top-0 z-[70] h-0.5 overflow-hidden bg-ink">
            <div className="h-full w-1/2 animate-laser-sweep bg-primary" />
          </div>
        )}

        <main
          className={
            view === 'overview'
              ? 'min-h-[calc(100vh-3.5rem)] lg:h-[calc(100vh-3.5rem)] lg:min-h-0 lg:overflow-hidden'
              : 'min-h-[calc(100vh-3.5rem)]'
          }
        >
          {view === 'overview' && (
            <OverviewDashboard
              profile={profile}
              boostedPOffer={counterfactual.boostedPOffer}
              auraLevel={auraLevel}
              scanning={analyzingUrl}
              scanTarget={scanTarget}
              onRunScout={runScout}
              scouting={scouting}
              onNavigate={(next) => setView(next)}
              onDraftJob={draftJob}
            />
          )}

          {view === 'bots' && (
            <OptiBotsPage
              profile={profile}
              inputs={inputs}
              onNavigate={(next) => setView(next)}
            />
          )}

          {view === 'eligibility' && (
            <EligibilityOpportunity
              profile={profile}
              boostedPOffer={counterfactual.boostedPOffer}
              onRunScout={runScout}
              scouting={scouting}
              firecrawlLive={Boolean(engineConfig.firecrawlKey.trim())}
              customMatches={customMatches}
              analyzingUrl={analyzingUrl}
              urlError={urlError}
              onAnalyzeUrl={analyzeUrl}
              activeForgeIds={activeIds}
              onToggleForge={toggleForge}
              focusJobId={focusJobId}
              onFocusConsumed={consumeFocusJob}
              onOpenDispatch={() => setView('dispatch')}
            />
          )}

          {view === 'scout' && (
            <ScoutReports
              profile={profile}
              scouting={scouting}
              firecrawlLive={Boolean(engineConfig.firecrawlKey.trim())}
              onRunScout={runScout}
              onNavigate={(next) => setView(next)}
            />
          )}

          {view === 'news' && (
            <DeveloperNews profile={profile} onNavigate={(next) => setView(next)} />
          )}

          {view === 'dispatch' && (
            <DispatchNewsletter
              profile={profile}
              onNavigate={(next) => setView(next)}
            />
          )}

          {view === 'settings' && (
            <SettingsPage
              profile={profile}
              inputs={inputs}
              appearance={appearance}
              muted={muted}
              onSaveProfile={saveProfileLinks}
              onAppearanceChange={setAppearance}
              onToggleSound={toggleSound}
              onOpenEngine={openEngine}
            />
          )}
        </main>
      </div>

      {switchError && (
        <div className="fixed bottom-4 left-1/2 z-[75] w-[min(92vw,420px)] -translate-x-1/2 rounded border-1.5 border-accent-coral/60 bg-surface px-3 py-2.5 shadow-hard">
          <p className="flex items-start gap-2 font-mono text-[10px] leading-relaxed text-accent-coral">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {switchError}
          </p>
        </div>
      )}

      <div className="pointer-events-none fixed bottom-4 right-3 z-50 flex flex-col items-end gap-1.5">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="animate-rise-in rounded border-1.5 border-ink bg-surface px-3 py-1.5 font-mono text-[9px] font-bold tracking-[0.06em] text-primary shadow-hard"
          >
            {SOUND_LABELS[toast.name]}
          </div>
        ))}
      </div>

      <EngineDrawer
        open={engineDrawer.open}
        initialTab={engineDrawer.tab}
        config={engineConfig}
        onChange={setEngineConfig}
        onClose={() => setEngineDrawer((drawer) => ({ ...drawer, open: false }))}
        profile={profile}
        target={customMatches[0] ?? null}
      />
    </div>
  );
}
