import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  Briefcase,
  FileCode2,
  Github,
  Linkedin,
  Link as LinkIcon,
  Lock,
  Radio,
  Volume2,
  VolumeX,
  Wrench,
  X,
} from 'lucide-react';
import type { OptiRemark, ProofOfWorkProfile } from '@/types/optimus';
import { generateProfile, applyCounterfactual, type ProfileInputs } from '@/services/optimusEngine';
import { soundEngine, SOUND_LABELS, type SoundName } from '@/utils/soundEngine';
import PalantirOrb from '@/components/PalantirOrb';
import TacticalBriefingHUD from '@/components/TacticalBriefingHUD';
import OpportunityFeed from '@/components/OpportunityFeed';
import PortfolioForge from '@/components/PortfolioForge';
import AGENTS_MD from '@/agents/AGENTS.md?raw';

type Phase = 'onboarding' | 'incinerating' | 'deployed' | 'error';

const PRESETS = [
  { username: 'torvalds', label: 'torvalds', note: 'Linux · Tier-0' },
  { username: 'shadcn', label: 'shadcn', note: 'shadcn/ui · Tier-0' },
  { username: 'yyx990803', label: 'yyx990803', note: 'Vue/Vite · Tier-0' },
  { username: 'KingdomJoe', label: 'KingdomJoe', note: 'Builder profile' },
];

type MobileTab = 'palantir' | 'briefing' | 'ops' | 'forge';

function buildRemarks(profile: ProofOfWorkProfile): OptiRemark[] {
  const remarks: OptiRemark[] = [];
  const topLang = profile.languages[0];
  const topRepo = [...profile.repos]
    .filter((r) => !r.fork)
    .sort((a, b) => b.stargazers_count - a.stargazers_count)[0];

  if (topLang)
    remarks.push({
      id: 1,
      tone: 'strength',
      text: `Ooh — ${topLang.name} dominates ${topLang.share}% of your original repos. I'm pointing my little arm right at that language badge orbiting your Palantir. Lead with it.`,
      target: { language: topLang.name },
    });
  if (topRepo)
    remarks.push({
      id: 2,
      tone: 'strength',
      text: `${topRepo.name} is your gravity well — ${topRepo.stargazers_count.toLocaleString()} stars. It's the brightest node on your sphere; every application should link it first.`,
      target: { repo: topRepo.name },
    });
  remarks.push({
    id: 3,
    tone: 'neutral',
    text: `${profile.freshRepos} repos pushed in the last 90 days. Recruiters read recency first — keep that orbit spinning.`,
  });
  if (profile.gaps[0])
    remarks.push({
      id: 4,
      tone: 'gap',
      text: `Heads up: ${profile.gaps[0]} is your weakest axis at ${profile.competency[profile.gaps[0]]}/100. Check the Forge panel — I found counterfactuals that patch this.`,
    });
  return remarks;
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('onboarding');
  const [inputs, setInputs] = useState<ProfileInputs>({ username: '' });
  const [profile, setProfile] = useState<ProofOfWorkProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(soundEngine.isMuted());
  const [toasts, setToasts] = useState<{ id: number; name: SoundName }[]>([]);
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [scouting, setScouting] = useState(false);
  const [agentsOpen, setAgentsOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('palantir');
  const toastId = useRef(0);
  const deployedAt = useRef(0);

  useEffect(() => soundEngine.onMuteChange(setMuted), []);

  const pushToast = useCallback((name: SoundName) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-3), { id, name }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 1800);
  }, []);

  const playKey = useCallback(() => {
    soundEngine.playKeyClick();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAgentsOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const counterfactual = useMemo(() => {
    if (!profile) return { boostedPOffer: 0, totalDelta: 0 };
    return applyCounterfactual(profile.jev.pOffer, profile.forge, activeIds);
  }, [profile, activeIds]);

  const auraLevel = useMemo(() => {
    if (!profile) return 20;
    return Math.min(100, counterfactual.boostedPOffer + counterfactual.totalDelta);
  }, [profile, counterfactual]);

  const remarks = useMemo(() => (profile ? buildRemarks(profile) : []), [profile]);

  const deploy = useCallback(
    async (raw: ProfileInputs) => {
      const username = raw.username.trim();
      if (!username) {
        setError('Enter a GitHub username or tap a preset to deploy Optimus.');
        return;
      }
      setInputs({ ...raw, username });
      setError(null);
      setPhase('incinerating');
      soundEngine.playLockInEngage();
      pushToast('lockInEngage');

      const started = Date.now();
      try {
        const p = await generateProfile(raw);
        // hold the incineration sequence for its dramatic beat (0–2s)
        const elapsed = Date.now() - started;
        if (elapsed < 2000) await new Promise((r) => setTimeout(r, 2000 - elapsed));
        setProfile(p);
        setActiveIds([]);
        deployedAt.current = Date.now();
        setPhase('deployed');
        soundEngine.playJevMatrixLock();
        pushToast('jevMatrixLock');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Optimus deployment failed. Retry.');
        setPhase('error');
      }
    },
    [pushToast]
  );

  const runScout = useCallback(async () => {
    if (!profile) return;
    setScouting(true);
    soundEngine.playSonarPing();
    pushToast('sonarPing');
    await new Promise((r) => setTimeout(r, 900));
    setProfile({ ...profile, scout: { ...profile.scout } });
    setScouting(false);
  }, [profile, pushToast]);

  const toggleForge = useCallback(
    (id: string, next: boolean) => {
      setActiveIds((prev) => (next ? [...prev, id] : prev.filter((x) => x !== id)));
    },
    []
  );

  useEffect(() => {
    if (counterfactual.totalDelta > 0) {
      const t = window.setTimeout(() => soundEngine.playCounterfactualBoost(), 60);
      return () => window.clearTimeout(t);
    }
  }, [counterfactual.totalDelta]);

  // ---------------------------------------------------------------------
  // Onboarding screen
  // ---------------------------------------------------------------------
  if (phase === 'onboarding' || phase === 'error' || phase === 'incinerating') {
    return (
      <div className="relative min-h-screen grid-bg overflow-x-hidden bg-obsidian-950">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.12),transparent_55%)]" />

        <header className="relative z-10 flex items-center justify-between border-b border-emerald-900/40 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-emerald-400" />
            <span className="font-display text-lg font-bold tracking-tight text-gray-100">
              Locked<span className="text-emerald-400">In</span>
            </span>
            <span className="hidden font-mono text-[9px] uppercase tracking-[0.2em] text-gray-500 sm:inline">
              Resumes Lie. Proof-of-Work Ships.
            </span>
          </div>
          <button
            onClick={() => setAgentsOpen(true)}
            className="btn-ghost !px-2.5 !py-1.5 !text-[10px]"
          >
            <Bot className="h-3.5 w-3.5" /> Inspect Optimus Architecture
          </button>
        </header>

        <main className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-4 py-10 sm:py-16">
          <div className="mono-label mb-3 flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Optimus Agentic Engine · v3.1 · Jev System-1 armed
          </div>

          <h1 className="text-center font-display text-4xl font-bold leading-[1.1] tracking-tight text-gray-50 sm:text-6xl">
            Resumes lie.
            <br />
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              Proof-of-work ships.
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-center text-sm leading-relaxed text-gray-400 sm:text-base">
            LockedIn doesn't read your buzzwords — it reads your commits. Drop any GitHub handle and
            the Optimus engine fuses live repository telemetry with your LinkedIn, X, and portfolio
            signals, runs TypeSafe AI's <span className="text-emerald-300">Jev System-1</span>{' '}
            classifier across 24 calibrated probability heads in about 140 milliseconds, and
            projects the whole picture onto a 3D Palantir with Opti, your tactical co-pilot. Then it
            doesn't just diagnose — it simulates the counterfactual: toggle a certificate or an
            open-source contribution and watch every acceptance probability recalibrate live.
          </p>

          <form
            className="mt-8 w-full space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void deploy(inputs);
            }}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mono-label mb-1 flex items-center gap-1.5">
                  <Github className="h-3 w-3" /> GitHub username *
                </span>
                <input
                  value={inputs.username}
                  onChange={(e) => setInputs((v) => ({ ...v, username: e.target.value }))}
                  onKeyDown={() => playKey()}
                  placeholder="e.g. torvalds"
                  className="field-input"
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
              <label className="block">
                <span className="mono-label mb-1 flex items-center gap-1.5">
                  <Linkedin className="h-3 w-3" /> LinkedIn URL
                </span>
                <input
                  value={inputs.linkedinUrl ?? ''}
                  onChange={(e) => setInputs((v) => ({ ...v, linkedinUrl: e.target.value }))}
                  onKeyDown={() => playKey()}
                  placeholder="linkedin.com/in/you"
                  className="field-input"
                  autoComplete="off"
                />
              </label>
              <label className="block">
                <span className="mono-label mb-1 flex items-center gap-1.5">
                  <span className="font-mono text-[10px] text-gray-400">𝕏</span> X handle
                </span>
                <input
                  value={inputs.xHandle ?? ''}
                  onChange={(e) => setInputs((v) => ({ ...v, xHandle: e.target.value }))}
                  onKeyDown={() => playKey()}
                  placeholder="@yourhandle"
                  className="field-input"
                  autoComplete="off"
                />
              </label>
              <label className="block">
                <span className="mono-label mb-1 flex items-center gap-1.5">
                  <LinkIcon className="h-3 w-3" /> Portfolio URL
                </span>
                <input
                  value={inputs.portfolioUrl ?? ''}
                  onChange={(e) => setInputs((v) => ({ ...v, portfolioUrl: e.target.value }))}
                  onKeyDown={() => playKey()}
                  placeholder="you.dev"
                  className="field-input"
                  autoComplete="off"
                />
              </label>
              <label className="block">
                <span className="mono-label mb-1 flex items-center gap-1.5">
                  <FileCode2 className="h-3 w-3" /> Current certificates
                </span>
                <input
                  value={inputs.certificates ?? ''}
                  onChange={(e) => setInputs((v) => ({ ...v, certificates: e.target.value }))}
                  onKeyDown={() => playKey()}
                  placeholder="AWS SAA, CKAD…"
                  className="field-input"
                  autoComplete="off"
                />
              </label>
            </div>

            {error && (
              <p className="flex items-start gap-2 rounded-lg border border-red-800/70 bg-red-950/30 p-3 text-xs text-red-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={phase === 'incinerating'}
              className="btn-primary w-full !py-4 !text-sm"
            >
              <Lock className="h-4 w-4" />
              {phase === 'incinerating' ? 'DEPLOYING OPTIMUS…' : 'LOCK IN & DEPLOY OPTIMUS'}
            </button>
          </form>

          <div className="mt-6 w-full">
            <p className="mono-label mb-2 text-center">Instant judge presets</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PRESETS.map((p) => (
                <button
                  key={p.username}
                  disabled={phase === 'incinerating'}
                  onClick={() => void deploy({ username: p.username })}
                  className="group rounded-lg border border-emerald-900/60 bg-obsidian-900/80 px-3 py-2.5 text-left transition-all hover:border-emerald-500 hover:bg-obsidian-800 disabled:opacity-50"
                >
                  <p className="truncate font-mono text-xs font-bold text-emerald-300 group-hover:text-emerald-200">
                    {p.label}
                  </p>
                  <p className="truncate font-mono text-[9px] text-gray-500">{p.note}</p>
                </button>
              ))}
            </div>
          </div>
        </main>

        {/* Incineration overlay */}
        {phase === 'incinerating' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian-950/95 backdrop-blur">
            <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-red-900/60 bg-obsidian-900 p-5">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] animate-scanline bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_20px_rgba(16,185,129,0.8)]" />
              <p className="mono-label text-red-400">Legacy LinkedIn fluff card detected</p>
              <div className="mt-3 space-y-1.5">
                {['"Passionate about technology"', '"Results-driven team player"', '"Thought leader & ninja"', '"Excellent communicator"'].map(
                  (b) => (
                    <p key={b} className="font-mono text-xs text-gray-500 line-through decoration-red-500/70">
                      {b}
                    </p>
                  )
                )}
              </div>
              <p className="mt-4 font-mono text-[11px] text-emerald-400">
                ▸ EMERALD LASER ACTIVE — INCINERATING FLUFF…
              </p>
              <p className="mt-1.5 font-mono text-[11px] text-gray-400">
                ▸ Pulling live GitHub REST telemetry for{' '}
                <span className="text-emerald-300">{inputs.username}</span>…
              </p>
              <div className="mt-4 h-1 overflow-hidden rounded-full bg-obsidian-700">
                <div className="h-full w-1/2 animate-laser-sweep bg-emerald-400" />
              </div>
            </div>
          </div>
        )}

        {agentsOpen && <AgentsModal onClose={() => setAgentsOpen(false)} />}

        <footer className="relative z-10 border-t border-emerald-900/30 px-4 py-3 text-center font-mono text-[10px] text-gray-600">
          LockedIn · Optimus Agentic Engine · Jev System-1 × System-2 Strategist × Firecrawl Scout
        </footer>
      </div>
    );
  }

  // ---------------------------------------------------------------------
  // War Room (deployed)
  // ---------------------------------------------------------------------
  if (!profile) return null;
  const mobileTabs: { id: MobileTab; label: string; icon: React.ReactNode }[] = [
    { id: 'palantir', label: 'Palantir', icon: <Radio className="h-4 w-4" /> },
    { id: 'briefing', label: 'Briefing', icon: <FileCode2 className="h-4 w-4" /> },
    { id: 'ops', label: 'Ops', icon: <Briefcase className="h-4 w-4" /> },
    { id: 'forge', label: 'Forge', icon: <Wrench className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen grid-bg bg-obsidian-950 pb-16 sm:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-emerald-900/40 bg-obsidian-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-3 py-2.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Lock className="h-5 w-5 shrink-0 text-emerald-400" />
            <span className="truncate font-display text-base font-bold text-gray-100 sm:text-lg">
              Locked<span className="text-emerald-400">In</span>
            </span>
            <span className="hidden truncate font-mono text-[10px] text-gray-500 md:inline">
              WAR ROOM · {profile.user.login} · {profile.jev.classification}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => {
                const next = !muted;
                soundEngine.setMuted(next);
                if (!next) soundEngine.playJevMatrixLock();
              }}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[10px] font-bold tracking-widest transition-colors ${
                muted
                  ? 'border-gray-700 bg-obsidian-800 text-gray-400'
                  : 'border-emerald-600/70 bg-emerald-950/40 text-emerald-300'
              }`}
            >
              {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              AUDIO: {muted ? 'SILENT' : 'ARMED'}
            </button>
            <button
              onClick={() => setAgentsOpen(true)}
              className="btn-ghost !px-2.5 !py-1.5 !text-[10px]"
            >
              <Bot className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Inspect Optimus</span>
              <span className="sm:hidden">Optimus</span>
            </button>
          </div>
        </div>
      </header>

      {/* Signal strip */}
      <div className="border-b border-emerald-900/30 bg-obsidian-900/60">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-1 px-3 py-1.5 font-mono text-[10px] text-gray-500 sm:px-6">
          <span>
            JEV: <b className="text-emerald-400">{profile.jev.latencyMs}ms</b> · 24 heads · {profile.jev.schemaErrorRate}% schema err
          </span>
          <span className="hidden sm:inline">·</span>
          <span>
            P(OFFER): <b className="text-emerald-400">{counterfactual.boostedPOffer}%</b>
            {counterfactual.totalDelta > 0 && (
              <b className="text-cyan-400"> (+{counterfactual.totalDelta})</b>
            )}
          </span>
          <span className="hidden md:inline">·</span>
          <span className="hidden md:inline">
            STARS: <b className="text-emerald-400">{profile.totalStars.toLocaleString()}</b>
          </span>
          <span className="hidden md:inline">·</span>
          <span className="hidden md:inline">
            FIRECRAWL: <b className="text-cyan-400">{profile.scout.urlsInspected} URLs</b>
          </span>
          <span className="ml-auto hidden text-gray-600 lg:inline">
            {profile.signals.length} merged signals · {profile.languages[0]?.name ?? '—'} primary
          </span>
        </div>
      </div>

      {/* 12-column War Room grid */}
      <main className="mx-auto grid max-w-[1600px] grid-cols-1 gap-4 p-3 sm:p-4 lg:grid-cols-12">
        <div className={`lg:col-span-5 xl:col-span-4 ${mobileTab !== 'palantir' ? 'hidden lg:block' : ''}`}>
          <div className="lg:sticky lg:top-[104px]">
            <PalantirOrb
              avatarUrl={profile.user.avatar_url}
              username={profile.user.login}
              repos={profile.repos}
              languages={profile.languages}
              boostedPOffer={counterfactual.boostedPOffer}
              auraLevel={auraLevel}
              remarks={remarks}
            />
          </div>
        </div>

        <div className={`lg:col-span-4 xl:col-span-4 ${mobileTab !== 'briefing' ? 'hidden lg:block' : ''}`}>
          <div className="h-[calc(100vh-160px)] min-h-[560px] lg:max-h-[820px]">
            <TacticalBriefingHUD profile={profile} />
          </div>
        </div>

        <div className={`space-y-0 lg:col-span-3 xl:col-span-4 ${mobileTab !== 'ops' && mobileTab !== 'forge' ? 'hidden lg:block' : ''}`}>
          <div className={`${mobileTab === 'forge' ? 'hidden lg:block' : mobileTab === 'ops' ? '' : ''}`}>
            <div className={mobileTab !== 'ops' ? 'hidden lg:block' : ''}>
              <OpportunityFeed
                profile={profile}
                boostedPOffer={counterfactual.boostedPOffer}
                onRunScout={runScout}
                scouting={scouting}
              />
            </div>
          </div>
          <div className={`mt-4 ${mobileTab !== 'forge' ? 'hidden lg:mt-4 lg:block' : ''}`}>
            <PortfolioForge
              profile={profile}
              activeIds={activeIds}
              boostedPOffer={counterfactual.boostedPOffer}
              onToggle={toggleForge}
            />
          </div>
        </div>
      </main>

      {/* Desktop footer */}
      <footer className="hidden border-t border-emerald-900/30 px-6 py-3 text-center font-mono text-[10px] text-gray-600 sm:block">
        LockedIn · Optimus Agentic Engine · Jev System-1 ({profile.jev.latencyMs}ms measured) ×
        System-2 Forge Strategist × Firecrawl Scout · deployed {new Date(deployedAt.current).toLocaleTimeString()}
      </footer>

      {/* Mobile bottom dock */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-emerald-900/50 bg-obsidian-950/95 backdrop-blur sm:hidden">
        <div className="grid grid-cols-4">
          {mobileTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setMobileTab(t.id)}
              className={`flex flex-col items-center gap-0.5 py-2.5 font-mono text-[9px] uppercase tracking-wider transition-colors ${
                mobileTab === t.id ? 'text-emerald-400' : 'text-gray-500'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Sound toasts */}
      <div className="pointer-events-none fixed bottom-20 right-3 z-50 flex flex-col items-end gap-1.5 sm:bottom-4 sm:right-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-rise-in rounded-full border border-emerald-700/70 bg-obsidian-900/95 px-3 py-1.5 font-mono text-[10px] font-bold tracking-widest text-emerald-300 shadow-lg"
          >
            ♪ {SOUND_LABELS[t.name]}
          </div>
        ))}
      </div>

      {agentsOpen && <AgentsModal onClose={() => setAgentsOpen(false)} />}
    </div>
  );
}

function AgentsModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-obsidian-950/85 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Optimus architecture"
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl animate-rise-in overflow-hidden rounded-t-2xl border border-emerald-700/60 bg-obsidian-900 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-emerald-900/50 px-4 py-3">
          <p className="mono-label flex items-center gap-2">
            <Bot className="h-4 w-4 text-emerald-400" />
            Inspect Optimus Architecture (AGENTS.md)
          </p>
          <button
            onClick={onClose}
            className="rounded-lg border border-emerald-800 p-1.5 text-emerald-300 hover:border-emerald-500"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap px-4 py-3 font-mono text-[11px] leading-relaxed text-gray-300">
          {AGENTS_MD}
        </pre>
      </div>
    </div>
  );
}
