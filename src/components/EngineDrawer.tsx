import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  Check,
  Copy,
  Cpu,
  Eye,
  EyeOff,
  Flame,
  KeyRound,
  Play,
  ShieldCheck,
  SlidersHorizontal,
  Square,
  X,
  Zap,
} from 'lucide-react';
import type { AgentSpec, CustomTargetAnalysis, EngineConfig, LlmProvider } from '@/types/engine';
import type { ProofOfWorkProfile } from '@/types/optimus';
import { getEngineMode, LLM_PROVIDERS } from '@/services/engineConfig';
import { buildDossierPrompt, streamDossier } from '@/services/llmClient';
import { buildJevRequest, buildJevResponse, runJevEndpoint } from '@/services/jev';
import { soundEngine } from '@/utils/soundEngine';
import AGENTS_MD from '@/agents/AGENTS.md?raw';
import ORCHESTRATOR_MD from '@/agents/optimus-orchestrator.md?raw';
import JE_V_MD from '@/agents/jev-system1-classifier.md?raw';
import FIRECRAWL_MD from '@/agents/firecrawl-scout.md?raw';
import FORGE_MD from '@/agents/forge-strategist.md?raw';

const AGENT_SPECS: AgentSpec[] = [
  {
    id: 'agents',
    fileName: 'AGENTS.md',
    title: 'Optimus Agentic Engine',
    role: 'Stacked architecture specification · v3.2 dual-mode',
    content: AGENTS_MD,
  },
  {
    id: 'orchestrator',
    fileName: 'optimus-orchestrator.md',
    title: 'Optimus Orchestrator',
    role: 'State machine, routing, reliability contracts',
    content: ORCHESTRATOR_MD,
  },
  {
    id: 'jev',
    fileName: 'jev-system1-classifier.md',
    title: 'Jev System-1 Classifier',
    role: 'Parallel RLCD heads, calibration, live endpoint mode',
    content: JE_V_MD,
  },
  {
    id: 'firecrawl',
    fileName: 'firecrawl-scout.md',
    title: 'Firecrawl Scout',
    role: 'URL autopsy pipeline, provenance, cached dataset',
    content: FIRECRAWL_MD,
  },
  {
    id: 'forge',
    fileName: 'forge-strategist.md',
    title: 'Forge Strategist',
    role: 'System-2 streaming, dossier + pitch contract',
    content: FORGE_MD,
  },
];

type DrawerTab = 'config' | 'agents';

interface EngineDrawerProps {
  open: boolean;
  initialTab: DrawerTab;
  config: EngineConfig;
  onChange: (config: EngineConfig) => void;
  onClose: () => void;
  profile: ProofOfWorkProfile | null;
  target: CustomTargetAnalysis | null;
}

function SecretInput({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
}) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="relative">
      <input
        type={revealed ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="field-input !pr-10"
        autoComplete="off"
        spellCheck={false}
        aria-label={label}
      />
      <button
        type="button"
        onClick={() => setRevealed((prev) => !prev)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-primary"
        aria-label={revealed ? 'Hide key' : 'Reveal key'}
      >
        {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function Section({
  icon,
  title,
  status,
  statusTone,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  status: string;
  statusTone: 'live' | 'judge';
  children: React.ReactNode;
}) {
  return (
    <section className="rounded border-1.5 border-ink bg-well p-3.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-content">
          {icon}
          {title}
        </h3>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.06em] ${
            statusTone === 'live'
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-accent-amber/40 bg-accent-amber/10 text-accent-amber'
          }`}
        >
          {status}
        </span>
      </div>
      <div className="mt-3 space-y-2.5">{children}</div>
    </section>
  );
}

export default function EngineDrawer({
  open,
  initialTab,
  config,
  onChange,
  onClose,
  profile,
  target,
}: EngineDrawerProps) {
  const [tab, setTab] = useState<DrawerTab>(initialTab);
  const [docId, setDocId] = useState('agents');
  const [copied, setCopied] = useState(false);
  const [jevView, setJevView] = useState<'request' | 'response'>('request');
  const [jevResult, setJevResult] = useState<unknown>(null);
  const [jevError, setJevError] = useState<string | null>(null);
  const [jevRunning, setJevRunning] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [streamError, setStreamError] = useState<string | null>(null);
  const jevAbortRef = useRef<AbortController | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const profileStamp = profile?.generatedAt ?? 0;

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  useEffect(() => {
    if (open) return;
    jevAbortRef.current?.abort();
    streamAbortRef.current?.abort();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  useEffect(() => {
    setJevResult(null);
    setJevError(null);
  }, [profileStamp]);

  const mode = getEngineMode(config);
  const liveCount = [config.firecrawlKey, config.llmKey, config.jevEndpoint].filter((value) =>
    value.trim()
  ).length;

  const jevRequest = useMemo(
    () => (profile ? buildJevRequest(profile, target) : null),
    [profile, target]
  );
  const localJevResponse = useMemo(() => (profile ? buildJevResponse(profile) : null), [profile]);
  const jevDisplay = jevView === 'request' ? jevRequest : (jevResult ?? localJevResponse);

  const activeSpec = AGENT_SPECS.find((spec) => spec.id === docId) ?? AGENT_SPECS[0];
  const provider = LLM_PROVIDERS[config.llmProvider];

  const changeProvider = (next: LlmProvider) => {
    const previousDefault = LLM_PROVIDERS[config.llmProvider].model;
    const keepModel = config.llmModel.trim() && config.llmModel !== previousDefault;
    setStreamText('');
    setStreamError(null);
    onChange({
      ...config,
      llmProvider: next,
      llmModel: keepModel ? config.llmModel : LLM_PROVIDERS[next].model,
    });
  };

  const copySpec = () => {
    soundEngine.playKeyClick();
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(activeSpec.content).catch(() => undefined);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const runStream = async () => {
    if (!profile) return;
    const controller = new AbortController();
    streamAbortRef.current = controller;
    setStreaming(true);
    setStreamText('');
    setStreamError(null);
    soundEngine.playSonarPing();
    try {
      await streamDossier({
        provider: config.llmProvider,
        apiKey: config.llmKey,
        model: config.llmModel,
        profile,
        target,
        onToken: (token) => setStreamText((prev) => prev + token),
        signal: controller.signal,
      });
      soundEngine.playJevMatrixLock();
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        setStreamError(e instanceof Error ? e.message : 'Live synthesis failed.');
      }
    } finally {
      setStreaming(false);
    }
  };

  const runJev = async () => {
    if (!profile || !jevRequest) return;
    const controller = new AbortController();
    jevAbortRef.current = controller;
    setJevRunning(true);
    setJevError(null);
    try {
      const result = await runJevEndpoint(config.jevEndpoint, config.jevKey, jevRequest, controller.signal);
      setJevResult(result);
      setJevView('response');
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        setJevError(e instanceof Error ? e.message : 'Jev endpoint request failed.');
      }
    } finally {
      setJevRunning(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-canvas/85 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Engine configuration and agent specs"
    >
      <div
        className="flex h-[94vh] w-full max-w-4xl animate-rise-in flex-col overflow-hidden rounded-t-lg border-1.5 border-ink bg-surface shadow-hard-lg sm:h-auto sm:max-h-[90vh] sm:rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-subtle px-4 py-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 font-display text-[14px] font-bold tracking-[-0.02em] text-content">
              <Zap className="h-4 w-4 shrink-0 text-primary" />
              Engine Config &amp; AGENTS.md
            </h2>
            <p className="mt-1 hidden text-[10px] leading-relaxed text-muted sm:block">
              Dual-mode engine: zero-config judge path plus optional live Firecrawl, Jev, and
              System-2 provider keys.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`rounded-full border px-2 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.06em] ${
                mode === 'live'
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-accent-amber/40 bg-accent-amber/10 text-accent-amber'
              }`}
            >
              {mode === 'live' ? `Live keys · ${liveCount}/3` : 'Judge mode'}
            </span>
            <button
              onClick={onClose}
              className="grid h-7 w-7 place-items-center rounded border-1.5 border-ink bg-well text-muted hover:text-content"
              aria-label="Close engine drawer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 border-b border-subtle px-3 py-2">
          <button
            onClick={() => setTab('config')}
            className={`flex items-center gap-1.5 rounded border px-2.5 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.06em] transition-colors ${
              tab === 'config'
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-transparent text-muted hover:bg-well hover:text-content'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Engine Config
          </button>
          <button
            onClick={() => setTab('agents')}
            className={`flex items-center gap-1.5 rounded border px-2.5 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.06em] transition-colors ${
              tab === 'agents'
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-transparent text-muted hover:bg-well hover:text-content'
            }`}
          >
            <Bot className="h-3.5 w-3.5" />
            AGENTS.md · {AGENT_SPECS.length} specs
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3.5">
          {tab === 'config' ? (
            <div className="space-y-3.5">
              <div
                className={`rounded border-1.5 p-3 text-[10px] leading-relaxed ${
                  mode === 'live'
                    ? 'border-accent-cyan/40 bg-accent-cyan/5 text-accent-cyan'
                    : 'border-primary/30 bg-primary/5 text-primary'
                }`}
              >
                {mode === 'live' ? (
                  <>
                    <b>Live API Key Mode active.</b> {liveCount} of 3 integrations configured.
                    Firecrawl scrapes the Autopsy URLs, System-2 streams the dossier, and Jev
                    forwards the exact structured payload. Keys stay in this browser session only.
                  </>
                ) : (
                  <>
                    <b>Zero-Config Judge Mode active.</b> No keys required: live unauthenticated
                    GitHub REST telemetry + built-in deterministic RLCD calibration + cached
                    Firecrawl dataset. Every first click works offline of any key.
                  </>
                )}
              </div>

              <Section
                icon={<Flame className="h-3.5 w-3.5 text-accent-amber" />}
                title="Firecrawl scrape"
                status={config.firecrawlKey.trim() ? 'Configured' : 'Judge fallback'}
                statusTone={config.firecrawlKey.trim() ? 'live' : 'judge'}
              >
                <SecretInput
                  label="Firecrawl API key"
                  value={config.firecrawlKey}
                  onChange={(value) => onChange({ ...config, firecrawlKey: value })}
                  placeholder="Paste Firecrawl key"
                />
                <p className="font-mono text-[9px] leading-relaxed text-muted">
                  POST https://api.firecrawl.dev/v1/scrape · markdown extraction · paste any role or
                  hackathon URL into the Autopsy bar to route it through this key.
                </p>
                {!config.firecrawlKey.trim() && (
                  <p className="font-mono text-[9px] leading-relaxed text-primary">
                    No key: the Autopsy bar still returns a full calibrated card from the cached
                    dataset, labeled CACHED.
                  </p>
                )}
              </Section>

              <Section
                icon={<Cpu className="h-3.5 w-3.5 text-accent-cyan" />}
                title="System-2 LLM · streaming dossier"
                status={config.llmKey.trim() ? provider.label : 'Deterministic'}
                statusTone={config.llmKey.trim() ? 'live' : 'judge'}
              >
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {(Object.keys(LLM_PROVIDERS) as LlmProvider[]).map((id) => (
                    <button
                      key={id}
                      onClick={() => changeProvider(id)}
                      className={`rounded border px-2 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.06em] transition-colors ${
                        config.llmProvider === id
                          ? 'border-accent-cyan/50 bg-accent-cyan/10 text-accent-cyan'
                          : 'border-subtle text-muted hover:bg-surface hover:text-content'
                      }`}
                    >
                      {LLM_PROVIDERS[id].short}
                    </button>
                  ))}
                </div>
                <p className="font-mono text-[9px] text-accent-cyan">{provider.blurb}</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="block">
                    <span className="mono-label mb-1 block">Model</span>
                    <input
                      value={config.llmModel}
                      onChange={(e) => onChange({ ...config, llmModel: e.target.value })}
                      className="field-input !py-2 text-xs"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </label>
                  <label className="block">
                    <span className="mono-label mb-1 block">API key</span>
                    <SecretInput
                      label="LLM API key"
                      value={config.llmKey}
                      onChange={(value) => onChange({ ...config, llmKey: value })}
                      placeholder={`Paste ${provider.short} API key`}
                    />
                  </label>
                </div>
                <p className="truncate font-mono text-[8px] text-muted">{provider.endpoint}</p>
                <div className="flex flex-wrap gap-2">
                  {streaming ? (
                    <button
                      onClick={() => streamAbortRef.current?.abort()}
                      className="btn-ghost !px-3 !py-2 !text-[10px]"
                    >
                      <Square className="h-3.5 w-3.5" />
                      Abort Stream
                    </button>
                  ) : (
                    <button
                      onClick={() => void runStream()}
                      disabled={!profile || !config.llmKey.trim()}
                      className="btn-primary !px-3 !py-2 !text-[10px]"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Run Live System-2 Synthesis
                    </button>
                  )}
                  {!profile && (
                    <span className="self-center font-mono text-[9px] text-muted">
                      Build a GitHub index to unlock.
                    </span>
                  )}
                  {profile && !config.llmKey.trim() && (
                    <span className="self-center font-mono text-[9px] text-accent-amber">
                      Add a key to stream; deterministic dossier stays active.
                    </span>
                  )}
                </div>
                {(streamText || streamError || streaming) && (
                  <div className="rounded border border-subtle bg-canvas p-2.5">
                    <p className="label-caps mb-1 text-accent-cyan">
                      {provider.label} · {config.llmModel || provider.model} · live stream
                    </p>
                    {streamError ? (
                      <p className="flex items-start gap-1.5 font-mono text-[9px] text-accent-coral">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {streamError}
                      </p>
                    ) : (
                      <pre className="max-h-[220px] overflow-y-auto whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-content">
                        {streamText}
                        {streaming && <span className="animate-pulse text-primary">▌</span>}
                      </pre>
                    )}
                  </div>
                )}
                {profile && config.llmKey.trim() && !streaming && !streamText && !streamError && (
                  <p className="font-mono text-[8px] text-muted">
                    Prompt preview: {buildDossierPrompt(profile, target).split('\n')[0]}
                  </p>
                )}
              </Section>

              <Section
                icon={<KeyRound className="h-3.5 w-3.5 text-primary" />}
                title="TypeSafe AI Jev · System-1 endpoint"
                status={config.jevEndpoint.trim() ? 'Endpoint active' : 'Local RLCD'}
                statusTone={config.jevEndpoint.trim() ? 'live' : 'judge'}
              >
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="block">
                    <span className="mono-label mb-1 block">Endpoint URL</span>
                    <input
                      value={config.jevEndpoint}
                      onChange={(e) => onChange({ ...config, jevEndpoint: e.target.value })}
                      placeholder="https://jev.typesafe.ai/v1/score"
                      className="field-input !py-2 text-xs"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </label>
                  <label className="block">
                    <span className="mono-label mb-1 block">Endpoint key</span>
                    <SecretInput
                      label="Jev endpoint key"
                      value={config.jevKey}
                      onChange={(value) => onChange({ ...config, jevKey: value })}
                      placeholder="Paste Jev endpoint key"
                    />
                  </label>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setJevView('request')}
                    className={`rounded border px-2.5 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.06em] transition-colors ${
                      jevView === 'request'
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-subtle text-muted hover:text-content'
                    }`}
                  >
                    Sent to Jev
                  </button>
                  <button
                    onClick={() => setJevView('response')}
                    className={`rounded border px-2.5 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.06em] transition-colors ${
                      jevView === 'response'
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-subtle text-muted hover:text-content'
                    }`}
                  >
                    RLCD distribution returned
                  </button>
                  <span className="ml-auto font-mono text-[8px] uppercase tracking-[0.06em] text-muted">
                    {jevResult ? 'live response' : 'deterministic local'}
                  </span>
                </div>
                <pre className="max-h-[260px] overflow-auto rounded border border-subtle bg-canvas p-2.5 font-mono text-[9px] leading-relaxed text-content">
                  {jevDisplay
                    ? JSON.stringify(jevDisplay, null, 2)
                    : '{\n  "status": "awaiting_profile",\n  "hint": "Build a GitHub index, then reopen this drawer to inspect the exact Jev payload and RLCD distribution."\n}'}
                </pre>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => void runJev()}
                    disabled={!profile || !config.jevEndpoint.trim() || jevRunning}
                    className="btn-ghost !px-3 !py-2 !text-[10px]"
                  >
                    {jevRunning ? 'Posting payload…' : 'Test Jev Endpoint'}
                  </button>
                  {jevError && (
                    <span className="flex items-start gap-1.5 font-mono text-[9px] text-accent-coral">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {jevError}
                    </span>
                  )}
                  {!config.jevEndpoint.trim() && (
                    <span className="font-mono text-[9px] text-muted">
                      No endpoint: the displayed distribution is the built-in calibrated math.
                    </span>
                  )}
                </div>
              </Section>
            </div>
          ) : (
            <div className="flex min-h-[420px] flex-col gap-3 sm:flex-row">
              <div className="flex gap-1.5 overflow-x-auto pb-1 sm:w-56 sm:shrink-0 sm:flex-col sm:overflow-visible sm:pb-0">
                {AGENT_SPECS.map((spec) => (
                  <button
                    key={spec.id}
                    onClick={() => {
                      soundEngine.playKeyClick();
                      setDocId(spec.id);
                      setCopied(false);
                    }}
                    className={`min-w-[168px] shrink-0 rounded border-1.5 px-3 py-2 text-left transition-colors sm:min-w-0 sm:shrink ${
                      docId === spec.id
                        ? 'border-primary/60 bg-primary/5'
                        : 'border-ink bg-well hover:bg-surface'
                    }`}
                  >
                    <p className="truncate font-mono text-[9px] font-bold uppercase tracking-[0.06em] text-primary">
                      {spec.fileName}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-muted">{spec.title}</p>
                  </button>
                ))}
              </div>
              <div className="flex min-w-0 flex-1 flex-col rounded border-1.5 border-ink bg-well">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-subtle px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-display text-[12px] font-semibold text-content">
                      {activeSpec.title}
                    </p>
                    <p className="truncate font-mono text-[8px] text-muted">{activeSpec.role}</p>
                  </div>
                  <button onClick={copySpec} className="btn-primary !px-3 !py-1.5 !text-[10px]">
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copied' : 'Copy Agent Spec'}
                  </button>
                </div>
                <pre className="max-h-[52vh] flex-1 overflow-auto whitespace-pre-wrap px-3.5 py-3 font-mono text-[10px] leading-relaxed text-muted sm:max-h-[56vh]">
                  {activeSpec.content}
                </pre>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-subtle px-3.5 py-2.5">
          <p className="flex items-center gap-1.5 font-mono text-[9px] text-muted">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
            Keys stay in this browser session and go only to the selected provider. Route through your
            backend for production.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                soundEngine.playKeyClick();
                setStreamText('');
                setStreamError(null);
                setJevResult(null);
                setJevError(null);
                setJevView('request');
                onChange({
                  ...config,
                  firecrawlKey: '',
                  llmKey: '',
                  jevEndpoint: '',
                  jevKey: '',
                });
              }}
              className="btn-ghost !px-3 !py-1.5 !text-[10px]"
            >
              Clear keys
            </button>
            <button onClick={onClose} className="btn-ghost !px-3 !py-1.5 !text-[10px]">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
