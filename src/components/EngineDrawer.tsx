import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  Check,
  Copy,
  Cpu,
  Flame,
  Play,
  ShieldCheck,
  SlidersHorizontal,
  Square,
  X,
  Zap,
} from 'lucide-react';
import type { AgentSpec, CustomTargetAnalysis, EngineConfig } from '@/types/engine';
import type { ProofOfWorkProfile } from '@/types/optimus';
import { buildDossierPrompt, streamDossier } from '@/services/llmClient';
import { buildJevRequest, buildJevResponse } from '@/services/jev';
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
    role: 'Stacked architecture specification · v3.2 local + live',
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
    role: 'Parallel calibration heads, deterministic mode',
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
  statusTone: 'live' | 'local';
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
              : 'border-subtle bg-surface text-muted'
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
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [streamError, setStreamError] = useState<string | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const profileStamp = profile?.generatedAt ?? 0;

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  useEffect(() => {
    if (open) return;
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
    setStreamText('');
    setStreamError(null);
  }, [profileStamp]);

  const jevRequest = useMemo(
    () => (profile ? buildJevRequest(profile, target) : null),
    [profile, target]
  );
  const localJevResponse = useMemo(() => (profile ? buildJevResponse(profile) : null), [profile]);
  const jevDisplay = jevView === 'request' ? jevRequest : localJevResponse;

  const activeSpec = AGENT_SPECS.find((spec) => spec.id === docId) ?? AGENT_SPECS[0];

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
              Backend-secured engine. Firecrawl and River AI keys are held server-side.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className="rounded-full border border-primary/40 bg-primary/10 px-2 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.06em] text-primary"
            >
              Live · Backend
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
              <div className="rounded border-1.5 border-primary/30 bg-primary/5 p-3 text-[10px] leading-relaxed text-primary">
                <b>Backend-secured live mode.</b> Firecrawl scraping and River AI synthesis are
                proxied through Supabase Edge Functions. API keys are stored as server-side secrets
                and never reach the browser. GitHub telemetry and Jev calibration remain local.
              </div>

              <Section
                icon={<Flame className="h-3.5 w-3.5 text-accent-amber" />}
                title="Firecrawl scrape"
                status="Live"
                statusTone="live"
              >
                <p className="font-mono text-[9px] leading-relaxed text-muted">
                  POST /functions/v1/firecrawl-scrape · markdown extraction · paste any role or
                  hackathon URL into the Autopsy bar to route it through the server-side Firecrawl key.
                </p>
              </Section>

              <Section
                icon={<Cpu className="h-3.5 w-3.5 text-accent-cyan" />}
                title="System-2 synthesis · streaming dossier"
                status="Live"
                statusTone="live"
              >
                <p className="font-mono text-[9px] leading-relaxed text-muted">
                  River AI · {config.llmModel} · streamed through /functions/v1/llm-stream with the
                  server-side key.
                </p>
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
                      disabled={!profile}
                      className="btn-primary !px-3 !py-2 !text-[10px] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Run Live Synthesis
                    </button>
                  )}
                  {!profile && (
                    <span className="self-center font-mono text-[9px] text-muted">
                      Build a GitHub profile to unlock.
                    </span>
                  )}
                </div>
                {(streamText || streamError || streaming) && (
                  <div className="rounded border border-subtle bg-canvas p-2.5">
                    <p className="label-caps mb-1 text-accent-cyan">Live synthesis</p>
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
                {profile && !streaming && !streamText && !streamError && (
                  <p className="font-mono text-[8px] text-muted">
                    Prompt preview: {buildDossierPrompt(profile, target).split('\n')[0]}
                  </p>
                )}
              </Section>

              <Section
                icon={<Zap className="h-3.5 w-3.5 text-primary" />}
                title="System-1 · Jev calibration"
                status="Local"
                statusTone="local"
              >
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
                    Calibration returned
                  </button>
                  <span className="ml-auto font-mono text-[8px] uppercase tracking-[0.06em] text-muted">
                    deterministic local
                  </span>
                </div>
                <pre className="max-h-[260px] overflow-auto rounded border border-subtle bg-canvas p-2.5 font-mono text-[9px] leading-relaxed text-content">
                  {jevDisplay
                    ? JSON.stringify(jevDisplay, null, 2)
                    : '{\n  "status": "awaiting_profile",\n  "hint": "Build a GitHub profile, then reopen this drawer to inspect the exact calibration payload and distribution."\n}'}
                </pre>
                <p className="font-mono text-[9px] text-muted">
                  Jev runs as a deterministic local classifier. The displayed distribution is the
                  built-in calibrated math.
                </p>
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
            API keys are stored as Supabase Edge Function secrets and never exposed to the browser.
          </p>
          <button onClick={onClose} className="btn-ghost !px-3 !py-1.5 !text-[10px]">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
