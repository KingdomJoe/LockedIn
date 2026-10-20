import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowUpRight,
  BookOpen,
  Bot,
  Building2,
  Check,
  CheckCircle2,
  Clipboard,
  Copy,
  Cpu,
  Database,
  ExternalLink,
  FileCode2,
  FileText,
  Github,
  HelpCircle,
  Keyboard,
  Link as LinkIcon,
  Linkedin,
  Loader2,
  MessageSquare,
  Palette,
  Save,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import type { EngineConfig, EngineMode } from '@/types/engine';
import type { ProofOfWorkProfile } from '@/types/optimus';
import type { ProfileInputs } from '@/services/optimusEngine';
import type { AccentColor, AppearanceSettings, ThemeDensity } from '@/types/appearance';
import { ACCENTS, DENSITIES } from '@/services/appearance';
import { LLM_PROVIDERS } from '@/services/engineConfig';
import { soundEngine } from '@/utils/soundEngine';
import ViewHeader from '@/components/ViewHeader';
import AGENTS_MD from '@/agents/AGENTS.md?raw';

const TABS = [
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'about', label: 'About', icon: BookOpen },
  { id: 'help', label: 'Help & Feedback', icon: HelpCircle },
  { id: 'billing', label: 'Billing', icon: Building2 },
  { id: 'appearance', label: 'Appearance', icon: Palette },
] as const;

type SettingsTab = (typeof TABS)[number]['id'];

interface SettingsPageProps {
  profile: ProofOfWorkProfile;
  inputs: ProfileInputs;
  config: EngineConfig;
  engineMode: EngineMode;
  appearance: AppearanceSettings;
  muted: boolean;
  onSaveProfile: (inputs: ProfileInputs) => Promise<{ ok: boolean; message?: string }>;
  onAppearanceChange: (next: AppearanceSettings) => void;
  onToggleSound: () => void;
  onOpenEngine: (tab: 'config' | 'agents') => void;
}

interface Notice {
  tone: 'success' | 'error';
  message: string;
}

function ProfileField({
  icon,
  label,
  value,
  onChange,
  placeholder,
  hint,
  required,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  hint?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="label-caps mb-1.5 flex items-center gap-1.5">
        {icon}
        {label}
        {required && <span className="text-primary">*</span>}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="field-input"
        autoComplete="off"
        spellCheck={false}
        required={required}
      />
      {hint && <span className="mt-1 block font-mono text-[8px] text-muted/80">{hint}</span>}
    </label>
  );
}

function ProfilePanel({
  profile,
  inputs,
  onSaveProfile,
}: {
  profile: ProofOfWorkProfile;
  inputs: ProfileInputs;
  onSaveProfile: SettingsPageProps['onSaveProfile'];
}) {
  const [draft, setDraft] = useState<ProfileInputs>({ ...inputs });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    setDraft({ ...inputs });
  }, [inputs]);

  const normalized = {
    ...draft,
    username: draft.username.trim(),
    xHandle: (draft.xHandle ?? '').replace(/^@/, '').trim(),
    linkedinUrl: (draft.linkedinUrl ?? '').trim(),
    portfolioUrl: (draft.portfolioUrl ?? '').trim(),
    certificates: (draft.certificates ?? '').trim(),
  };
  const dirty =
    normalized.username !== inputs.username ||
    normalized.xHandle !== (inputs.xHandle ?? '') ||
    normalized.linkedinUrl !== (inputs.linkedinUrl ?? '') ||
    normalized.portfolioUrl !== (inputs.portfolioUrl ?? '') ||
    normalized.certificates !== (inputs.certificates ?? '');
  const rebuilding = normalized.username.toLowerCase() !== profile.user.login.toLowerCase();
  const linked = [
    { label: 'GitHub', value: `github.com/${profile.user.login}`, connected: true, icon: Github },
    {
      label: 'X / Twitter',
      value: normalized.xHandle ? `x.com/${normalized.xHandle}` : 'No handle linked',
      connected: Boolean(normalized.xHandle),
      icon: Sparkles,
    },
    {
      label: 'LinkedIn',
      value: normalized.linkedinUrl || 'No profile linked',
      connected: Boolean(normalized.linkedinUrl),
      icon: Linkedin,
    },
    {
      label: 'Portfolio',
      value: normalized.portfolioUrl || 'No portfolio linked',
      connected: Boolean(normalized.portfolioUrl),
      icon: LinkIcon,
    },
    {
      label: 'Certificates',
      value: normalized.certificates || 'No credentials added',
      connected: Boolean(normalized.certificates),
      icon: FileCode2,
    },
  ];

  const save = async () => {
    if (!normalized.username) {
      setNotice({ tone: 'error', message: 'A GitHub handle is required to rebuild the index.' });
      return;
    }
    setSaving(true);
    setNotice(null);
    const result = await onSaveProfile(normalized);
    setSaving(false);
    setNotice({
      tone: result.ok ? 'success' : 'error',
      message:
        result.message ??
        (result.ok
          ? 'Profile links synced. Palantir and default Opti-Bots are being re-keyed.'
          : 'Profile sync failed.'),
    });
    if (result.ok) soundEngine.playJevMatrixLock();
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
      <section className="card-hard">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-subtle px-4 py-3">
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-primary" />
            <h2 className="mono-label text-content">Connected proof-of-work</h2>
          </div>
          <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-muted">
            Session-linked · zero-auth
          </span>
        </div>

        <form
          className="space-y-4 p-4 sm:p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <ProfileField
              icon={<Github className="h-3 w-3" />}
              label="GitHub handle"
              value={draft.username}
              onChange={(username) => setDraft((current) => ({ ...current, username }))}
              placeholder="torvalds"
              hint={rebuilding ? 'Saving rebuilds the full index from GitHub.' : 'Primary identity source.'}
              required
            />
            <ProfileField
              icon={<Sparkles className="h-3 w-3" />}
              label="X handle"
              value={draft.xHandle ?? ''}
              onChange={(xHandle) => setDraft((current) => ({ ...current, xHandle }))}
              placeholder="@yourhandle"
              hint="Feeds the X/Twitter Opti-Bot signal stream."
            />
            <ProfileField
              icon={<Linkedin className="h-3 w-3" />}
              label="LinkedIn URL"
              value={draft.linkedinUrl ?? ''}
              onChange={(linkedinUrl) => setDraft((current) => ({ ...current, linkedinUrl }))}
              placeholder="linkedin.com/in/you"
              hint="Used for leadership and peer-cohort verification."
            />
            <ProfileField
              icon={<LinkIcon className="h-3 w-3" />}
              label="Portfolio URL"
              value={draft.portfolioUrl ?? ''}
              onChange={(portfolioUrl) => setDraft((current) => ({ ...current, portfolioUrl }))}
              placeholder="you.dev"
              hint="Deployed work inspected as shipped evidence."
            />
          </div>

          <ProfileField
            icon={<FileCode2 className="h-3 w-3" />}
            label="Certificates"
            value={draft.certificates ?? ''}
            onChange={(certificates) => setDraft((current) => ({ ...current, certificates }))}
            placeholder="AWS SAA, CKAD, CKA…"
            hint="Comma-separated credentials added to the proof-of-work graph."
          />

          {notice && (
            <div
              className={`flex items-start gap-2 rounded border p-3 text-[10px] leading-relaxed ${
                notice.tone === 'success'
                  ? 'border-primary/40 bg-primary/5 text-primary'
                  : 'border-accent-coral/40 bg-accent-coral/5 text-accent-coral'
              }`}
            >
              {notice.tone === 'success' ? (
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              ) : (
                <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              )}
              {notice.message}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-subtle pt-4">
            <p className="max-w-[48ch] text-[10px] leading-relaxed text-muted">
              Saving re-merges link signals, updates the Overview Palantir identity, and re-provisions
              the default Opti-Bots from the connected sources.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setDraft({ ...inputs });
                  setNotice(null);
                }}
                disabled={!dirty || saving}
                className="btn-ghost !px-3 !py-2 !text-[9px]"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={!dirty || saving}
                className="btn-primary !px-3 !py-2 !text-[9px]"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {saving ? 'Saving profile…' : rebuilding ? 'Rebuild & save' : 'Save profile'}
              </button>
            </div>
          </div>
        </form>
      </section>

      <div className="space-y-5">
        <section className="card-hard overflow-hidden">
          <div className="flex items-center gap-3 border-b border-subtle bg-well p-4">
            <img
              src={profile.user.avatar_url}
              alt={profile.user.login}
              className="h-14 w-14 rounded border-1.5 border-ink object-cover"
            />
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-display text-[18px] font-bold tracking-[-0.02em] text-content">
                {profile.user.name ?? profile.user.login}
              </h2>
              <p className="font-mono text-[9px] text-muted">@{profile.user.login}</p>
              <p className="mt-1 line-clamp-1 font-mono text-[8px] uppercase tracking-[0.06em] text-primary">
                {profile.jev.classification}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 p-4">
            {[
              ['P(Offer)', `${profile.jev.pOffer}%`],
              ['Calibration', `${profile.jev.calibration}%`],
              ['Merged sources', `${profile.signals.length}`],
              ['Fresh repos', `${profile.freshRepos}`],
            ].map(([label, value]) => (
              <div key={label} className="rounded border border-subtle bg-well px-3 py-2">
                <p className="label-caps">{label}</p>
                <p className="mt-1 font-mono text-[12px] font-bold text-content">{value}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-subtle px-4 py-3">
            <p className="font-mono text-[8px] uppercase tracking-[0.06em] text-muted">
              Last index rebuild · {new Date(profile.generatedAt).toLocaleString()}
            </p>
          </div>
        </section>

        <section className="card-hard">
          <div className="flex items-center justify-between border-b border-subtle px-4 py-3">
            <h2 className="mono-label text-content">Source sync</h2>
            <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-primary">
              {linked.filter((item) => item.connected).length} / {linked.length} linked
            </span>
          </div>
          <div className="divide-y divide-subtle">
            {linked.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-3 px-4 py-2.5">
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded border ${
                      item.connected
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-subtle bg-well text-muted'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[9px] font-semibold text-content">{item.label}</p>
                    <p className="truncate font-mono text-[8px] text-muted">{item.value}</p>
                  </div>
                  <span
                    className={`shrink-0 font-mono text-[7px] font-bold uppercase tracking-[0.08em] ${
                      item.connected ? 'text-primary' : 'text-muted'
                    }`}
                  >
                    {item.connected ? 'Synced' : 'Missing'}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function parseAgentDoc(raw: string) {
  const chunks = raw.split(/^## /m);
  const intro = chunks.shift() ?? '';
  return [
    {
      id: 'overview',
      title: 'Operating Overview',
      body: intro.replace(/^# .*\n?/m, '').trim(),
    },
    ...chunks.map((chunk, index) => {
      const lineBreak = chunk.indexOf('\n');
      const title = (lineBreak === -1 ? chunk : chunk.slice(0, lineBreak)).trim();
      const body = lineBreak === -1 ? '' : chunk.slice(lineBreak + 1).trim();
      return { id: `section-${index}`, title, body };
    }),
  ];
}

function AboutPanel({
  profile,
  config,
  engineMode,
}: {
  profile: ProofOfWorkProfile;
  config: EngineConfig;
  engineMode: EngineMode;
}) {
  const sections = useMemo(() => parseAgentDoc(AGENTS_MD), []);
  const [selectedId, setSelectedId] = useState(sections[0]?.id ?? 'overview');
  const [copied, setCopied] = useState(false);
  const selected = sections.find((section) => section.id === selectedId) ?? sections[0];
  const provider = LLM_PROVIDERS[config.llmProvider];

  const copySection = async () => {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(`## ${selected.title}\n\n${selected.body}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const openRaw = () => {
    const blob = new Blob([AGENTS_MD], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const architecture = [
    {
      icon: Zap,
      label: 'System-1 · Jev',
      badge: `${profile.jev.latencyMs}ms`,
      body: '24 parallel RLCD heads calibrate eligibility across six competency axes, P(Shortlist), and P(Offer).',
    },
    {
      icon: Cpu,
      label: 'System-2 · LLM',
      badge: provider.short,
      body: 'Streaming synthesis turns calibrated evidence into dossiers, outreach drafts, and application strategy.',
    },
    {
      icon: Database,
      label: 'Firecrawl',
      badge: engineMode === 'live' ? 'LIVE' : 'CACHED',
      body: 'Page evidence, role leads, hackathons, and dispatch signals enter through a provenance-first scrape layer.',
    },
  ];

  return (
    <div className="space-y-5">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="card-hard relative overflow-hidden p-5">
          <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
          <div className="relative">
            <p className="label-caps text-primary">Mission</p>
            <h2 className="mt-3 max-w-[15ch] font-display text-[30px] font-bold leading-[1.02] tracking-[-0.035em] text-content sm:text-[36px]">
              Proof-of-work should speak before the resume does.
            </h2>
            <p className="mt-4 max-w-[52ch] text-[12px] leading-[1.7] text-muted">
              LockedIn is a technical evidence engine for engineers who ship. It merges public
              repositories, source signals, calibrated decisions, and autonomous research agents into one
              inspectable index. No resume theatre. No black-box score without a contract.
            </p>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {[
                ['Merged signals', `${profile.signals.length}`],
                ['RLCD heads', '24'],
                ['Schema error', `${profile.jev.schemaErrorRate}%`],
              ].map(([label, value]) => (
                <div key={label} className="rounded border border-subtle bg-well px-3 py-2">
                  <p className="label-caps">{label}</p>
                  <p className="mt-1 font-mono text-[12px] font-bold text-content">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          {architecture.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.label} className="card-hard flex items-start gap-3 p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded border-1.5 border-ink bg-well">
                  <Icon className="h-4 w-4 text-primary" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-[13px] font-semibold text-content">{item.label}</h3>
                    <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[7px] font-bold uppercase tracking-[0.06em] text-primary">
                      {item.badge}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-muted">{item.body}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="card-hard overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-subtle px-4 py-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-accent-cyan" />
            <h2 className="mono-label text-content">AGENTS.md contract viewer</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-muted">
              {sections.length} sections
            </span>
            <button onClick={copySection} className="btn-ghost !px-2.5 !py-1.5 !text-[8px]">
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied' : 'Copy section'}
            </button>
            <button
              onClick={() => {
                soundEngine.playKeyClick();
                openRaw();
              }}
              className="btn-ghost !px-2.5 !py-1.5 !text-[8px]"
            >
              <ExternalLink className="h-3 w-3" />
              Open raw
            </button>
          </div>
        </div>

        <div className="grid min-h-[430px] grid-cols-1 md:grid-cols-[230px_minmax(0,1fr)]">
          <div className="border-b border-subtle bg-well p-2 md:border-b-0 md:border-r">
            <p className="label-caps px-2 py-2">Document index</p>
            <div className="max-h-[330px] space-y-1 overflow-y-auto md:max-h-[500px]">
              {sections.map((section, index) => (
                <button
                  key={section.id}
                  onClick={() => {
                    setSelectedId(section.id);
                    soundEngine.playKeyClick();
                  }}
                  className={`flex w-full items-center gap-2 rounded px-2 py-2 text-left transition-colors ${
                    selected?.id === section.id
                      ? 'border border-primary/40 bg-primary/10 text-content'
                      : 'border border-transparent text-muted hover:bg-subtle hover:text-content'
                  }`}
                >
                  <span className="w-5 shrink-0 font-mono text-[8px] text-primary">
                    {String(index).padStart(2, '0')}
                  </span>
                  <span className="min-w-0 truncate font-mono text-[9px]">{section.title}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="min-w-0 p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="label-caps text-primary">Selected contract</p>
                <h3 className="mt-1 font-display text-[18px] font-bold text-content">{selected?.title}</h3>
              </div>
              <Clipboard className="h-4 w-4 text-muted" />
            </div>
            <pre className="max-h-[390px] overflow-auto whitespace-pre-wrap rounded border border-subtle bg-canvas p-3 font-mono text-[9px] leading-[1.7] text-muted">
              {selected?.body || 'No contract body found.'}
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
}

const CALIBRATION_GUIDES = [
  {
    id: 'shortlist',
    title: 'P(Shortlist)',
    summary: 'The evidence screen before a human reads the narrative.',
    body: 'Six calibrated heads score Systems, Frontend, Distributed, OSS Impact, Velocity, and Collaboration. The aggregate is weighted by original-repo volume, star gravity, and 90-day shipping cadence.',
  },
  {
    id: 'offer',
    title: 'P(Accept)',
    summary: 'The probability of an interview or programme acceptance.',
    body: 'P(Offer) is a calibrated regression over the shortlist state plus target-specific language overlap. It is not a promise; it is a probability with a visible confidence band.',
  },
  {
    id: 'band',
    title: 'Calibration ± Band',
    summary: 'How much uncertainty the current evidence supports.',
    body: 'The band widens when repo recency, source coverage, or language evidence is thin. A narrow band means the model has seen enough public proof to be confident in its estimate.',
  },
  {
    id: 'heads',
    title: 'Parallel RLCD heads',
    summary: 'Why 24 heads beat one black-box score.',
    body: 'Each head observes the same evidence from a different axis and records its own confidence. Disagreement is surfaced as schema variance, not hidden behind a single number.',
  },
] as const;

const SHORTCUTS = [
  ['Ctrl / ⌘ K', 'Focus the GitHub profile search'],
  ['Alt + 1 … 6', 'Jump across Overview, Opti-Bots, Eligibility, Scout, News, and Dispatch'],
  ['Esc', 'Dismiss the Engine Drawer, Opti-Bot builder, or mobile navigation'],
  ['Enter', 'Submit the active form'],
  ['Tab', 'Move through interactive controls'],
];

function HelpPanel({ profile }: { profile: ProofOfWorkProfile }) {
  const [openGuide, setOpenGuide] = useState<string>('shortlist');
  const [category, setCategory] = useState('Calibration');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const submitFeedback = () => {
    if (message.trim().length < 8) return;
    const entry = {
      id: `feedback-${Date.now()}`,
      category,
      message: message.trim(),
      createdAt: Date.now(),
    };
    try {
      const raw = window.localStorage.getItem('lockedin.feedback.v1');
      const existing = raw ? (JSON.parse(raw) as unknown[]) : [];
      window.localStorage.setItem(
        'lockedin.feedback.v1',
        JSON.stringify([entry, ...existing].slice(0, 25))
      );
    } catch {
      return;
    }
    setSent(true);
    setMessage('');
    soundEngine.playDossierStamp();
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div className="space-y-5">
        <section className="card-hard">
          <div className="flex items-center justify-between border-b border-subtle px-4 py-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <h2 className="mono-label text-content">Jev RLCD calibration guide</h2>
            </div>
            <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-accent-cyan">
              {profile.jev.calibration}% conf
            </span>
          </div>
          <div className="divide-y divide-subtle">
            {CALIBRATION_GUIDES.map((guide) => {
              const open = openGuide === guide.id;
              return (
                <div key={guide.id}>
                  <button
                    onClick={() => {
                      setOpenGuide(open ? '' : guide.id);
                      soundEngine.playKeyClick();
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-subtle"
                    aria-expanded={open}
                  >
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border font-mono text-[8px] font-bold ${
                        open
                          ? 'border-primary/50 bg-primary/10 text-primary'
                          : 'border-subtle bg-well text-muted'
                      }`}
                    >
                      {open ? '−' : '+'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-[12px] font-semibold text-content">
                        {guide.title}
                      </span>
                      <span className="block font-mono text-[8px] text-muted">{guide.summary}</span>
                    </span>
                  </button>
                  {open && (
                    <div className="border-t border-subtle bg-well px-12 py-3">
                      <p className="text-[10px] leading-[1.7] text-muted">{guide.body}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="border-t border-subtle bg-well px-4 py-3">
            <p className="font-mono text-[8px] leading-relaxed text-muted">
              Current read: P(Shortlist) {profile.jev.pShortlist}% · P(Offer) {profile.jev.pOffer}% ·
              calibration ±{Math.max(2, 100 - profile.jev.calibration)} pts · schema error{' '}
              {profile.jev.schemaErrorRate}%.
            </p>
          </div>
        </section>

        <section className="card-hard">
          <div className="flex items-center gap-2 border-b border-subtle px-4 py-3">
            <Keyboard className="h-4 w-4 text-accent-cyan" />
            <h2 className="mono-label text-content">Keyboard shortcuts</h2>
          </div>
          <div className="divide-y divide-subtle">
            {SHORTCUTS.map(([keys, action]) => (
              <div key={keys} className="flex items-center gap-3 px-4 py-2.5">
                <span className="min-w-[110px] shrink-0 rounded border border-subtle bg-well px-2 py-1 font-mono text-[8px] font-bold text-content">
                  {keys}
                </span>
                <span className="text-[10px] leading-snug text-muted">{action}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card-hard flex flex-col">
        <div className="flex items-center gap-2 border-b border-subtle px-4 py-3">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h2 className="mono-label text-content">Feedback channel</h2>
          <span className="ml-auto font-mono text-[8px] uppercase tracking-[0.06em] text-muted">
            Local queue
          </span>
        </div>
        {sent ? (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full border-1.5 border-primary/40 bg-primary/10">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </span>
            <h3 className="mt-4 font-display text-[18px] font-bold text-content">Feedback queued.</h3>
            <p className="mt-2 max-w-[34ch] text-[11px] leading-relaxed text-muted">
              Your note is stored in this browser for the next judge-mode review. No backend
              transmission is attempted without a configured review endpoint.
            </p>
            <button
              onClick={() => setSent(false)}
              className="btn-ghost mt-4 !px-3 !py-2 !text-[9px]"
            >
              Send another note
            </button>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-3 p-4">
            <label className="block">
              <span className="label-caps mb-1.5 block">Feedback type</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="field-input"
              >
                {['Calibration', 'Bug report', 'Feature request', 'General'].map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-1 flex-col">
              <span className="label-caps mb-1.5 block">What should the engine improve?</span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Describe the signal, calibration behavior, or workflow that needs work…"
                className="field-input min-h-[150px] flex-1 resize-y leading-relaxed"
              />
            </label>
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-[8px] text-muted">
                {message.trim().length}/500 · stored locally
              </p>
              <button
                onClick={submitFeedback}
                disabled={message.trim().length < 8}
                className="btn-primary !px-3 !py-2 !text-[9px]"
              >
                <Send className="h-3.5 w-3.5" />
                Submit feedback
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

const PLANS = [
  {
    id: 'free',
    name: 'Free Explorer',
    price: '$0',
    cadence: 'forever',
    description: 'The complete proof-of-work index for one linked profile.',
    features: [
      '1 GitHub-linked research index',
      '3 auto-spawned profile Opti-Bots',
      'Jev RLCD eligibility calibration',
      'Cached Firecrawl scouting',
      '1 custom Opti-Bot',
    ],
    cta: 'Current plan',
    featured: false,
  },
  {
    id: 'pro',
    name: 'LockedIn Pro',
    price: '$19',
    cadence: '/mo',
    description: 'For engineers treating their portfolio like an operating system.',
    features: [
      'Unlimited Opti-Bots',
      'Auto-Apply and application drafting',
      'Live Firecrawl and X signal streams',
      'Unlimited custom bot objectives',
      'Priority Jev calibration queue',
      'Dispatch automation and exports',
    ],
    cta: 'Start Pro',
    featured: true,
  },
  {
    id: 'b2b',
    name: 'B2B Recruiter API',
    price: 'Custom',
    cadence: 'annual contract',
    description: 'Calibrated technical evidence for sourcing and credential review.',
    features: [
      'Recruiter API access',
      'Cohort benchmark endpoints',
      'Credential verification contracts',
      'Audit logs and provenance',
      'Dedicated SLA and onboarding',
    ],
    cta: 'Request API access',
    featured: false,
  },
];

function BillingPanel() {
  const [selectedPlan, setSelectedPlan] = useState('free');

  return (
    <div className="space-y-5">
      <section className="card-hard relative overflow-hidden p-5">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-25" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label-caps text-primary">Business model // SaaS</p>
            <h2 className="mt-2 font-display text-[26px] font-bold tracking-[-0.03em] text-content">
              Free to prove. Pro to automate. API to scale.
            </h2>
            <p className="mt-2 max-w-[60ch] text-[11px] leading-relaxed text-muted">
              The index stays inspectable in judge mode. Paid tiers monetize autonomous execution,
              live source coverage, and recruiter-grade verification rather than hiding the core model.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              ['Target margin', '82%'],
              ['Pro conversion', '4.8%'],
              ['B2B ACV', '$24k'],
            ].map(([label, value]) => (
              <div key={label} className="rounded border border-subtle bg-well px-3 py-2">
                <p className="label-caps">{label}</p>
                <p className="mt-1 font-mono text-[12px] font-bold text-primary">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        {PLANS.map((plan) => {
          const active = selectedPlan === plan.id;
          return (
            <article
              key={plan.id}
              className={`relative flex flex-col rounded-lg border-1.5 bg-surface p-5 shadow-hard ${
                plan.featured ? 'border-primary/70' : 'border-ink'
              }`}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-4 rounded-full border border-primary/50 bg-primary px-2 py-1 font-mono text-[7px] font-bold uppercase tracking-[0.1em] text-primary-ink">
                  Most popular
                </span>
              )}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="label-caps">{plan.name}</p>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="font-display text-[32px] font-bold tracking-[-0.04em] text-content">
                      {plan.price}
                    </span>
                    <span className="font-mono text-[9px] text-muted">{plan.cadence}</span>
                  </div>
                </div>
                {plan.id === 'free' && (
                  <span className="rounded-full border border-subtle bg-well px-2 py-1 font-mono text-[7px] font-bold uppercase tracking-[0.06em] text-muted">
                    Current
                  </span>
                )}
                {plan.id === 'pro' && <Sparkles className="h-5 w-5 text-primary" />}
                {plan.id === 'b2b' && <Building2 className="h-5 w-5 text-accent-cyan" />}
              </div>
              <p className="mt-3 min-h-[40px] text-[11px] leading-relaxed text-muted">
                {plan.description}
              </p>
              <div className="mt-4 space-y-2 border-t border-subtle pt-4">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                    <span className="text-[10px] leading-snug text-content/85">{feature}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  setSelectedPlan(plan.id);
                  soundEngine.playKeyClick();
                }}
                className={`mt-5 w-full ${
                  plan.featured ? 'btn-primary' : 'btn-ghost'
                } !py-2.5 !text-[10px] ${active && plan.id !== 'free' ? 'ring-2 ring-primary/30' : ''}`}
              >
                {active && plan.id !== 'free' ? 'Preview selected' : plan.cta}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </article>
          );
        })}
      </div>

      <div className="rounded border-1.5 border-ink bg-subtle p-4 shadow-hard">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-content">
              Judge-mode billing preview
            </p>
          </div>
          <p className="max-w-[64ch] text-[10px] leading-relaxed text-muted">
            Plan selection is local to this session. Checkout, entitlements, and recruiter API keys
            activate only after a production billing backend is connected.
          </p>
        </div>
      </div>
    </div>
  );
}

function AppearancePanel({
  profile,
  appearance,
  muted,
  onAppearanceChange,
  onToggleSound,
}: {
  profile: ProofOfWorkProfile;
  appearance: AppearanceSettings;
  muted: boolean;
  onAppearanceChange: (next: AppearanceSettings) => void;
  onToggleSound: () => void;
}) {
  const accent = ACCENTS[appearance.accent];

  const selectDensity = (density: ThemeDensity) => {
    onAppearanceChange({ ...appearance, density });
    soundEngine.playKeyClick();
  };

  const selectAccent = (next: AccentColor) => {
    onAppearanceChange({ ...appearance, accent: next });
    soundEngine.playKeyClick();
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div className="space-y-5">
        <section className="card-hard">
          <div className="flex items-center justify-between border-b border-subtle px-4 py-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <h2 className="mono-label text-content">Workspace density</h2>
            </div>
            <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-muted">
              {appearance.density}
            </span>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {DENSITIES.map((density) => {
              const active = appearance.density === density.id;
              return (
                <button
                  key={density.id}
                  onClick={() => selectDensity(density.id)}
                  aria-pressed={active}
                  className={`rounded border-1.5 p-3 text-left transition-colors ${
                    active
                      ? 'border-primary/60 bg-primary/5 shadow-hard'
                      : 'border-ink bg-well hover:bg-subtle'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-[12px] font-semibold text-content">
                      {density.label}
                    </span>
                    <span
                      className={`grid h-4 w-4 place-items-center rounded-full border ${
                        active ? 'border-primary bg-primary text-primary-ink' : 'border-ink'
                      }`}
                    >
                      {active && <Check className="h-2.5 w-2.5" />}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[10px] leading-relaxed text-muted">{density.description}</p>
                  <div className={`mt-3 space-y-1 ${density.id === 'compact' ? 'gap-0.5' : 'gap-2'}`}>
                    <span className="block h-1.5 w-full rounded bg-ink" />
                    <span className="block h-1.5 w-4/5 rounded bg-ink" />
                    <span className="block h-1.5 w-2/3 rounded bg-ink" />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="card-hard">
          <div className="flex items-center justify-between border-b border-subtle px-4 py-3">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-accent-cyan" />
              <h2 className="mono-label text-content">Accent color</h2>
            </div>
            <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-muted">
              {accent.label}
            </span>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-3">
            {(Object.values(ACCENTS) as typeof ACCENTS[AccentColor][]).map((option) => {
              const active = appearance.accent === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => selectAccent(option.id)}
                  aria-pressed={active}
                  className={`rounded border-1.5 p-3 text-left transition-colors ${
                    active
                      ? 'border-primary/60 bg-primary/5 shadow-hard'
                      : 'border-ink bg-well hover:bg-subtle'
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span
                      className="h-7 w-7 rounded border border-black/40"
                      style={{ backgroundColor: option.hex }}
                    />
                    {active && <Check className="h-3.5 w-3.5 text-primary" />}
                  </span>
                  <span className="mt-2 block font-display text-[11px] font-semibold text-content">
                    {option.label}
                  </span>
                  <span className="mt-0.5 block font-mono text-[8px] uppercase text-muted">
                    {option.hex}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="card-hard">
          <div className="flex items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded border-1.5 border-ink bg-well">
                {muted ? (
                  <VolumeX className="h-4 w-4 text-muted" />
                ) : (
                  <Volume2 className="h-4 w-4 text-primary" />
                )}
              </span>
              <div>
                <h2 className="font-display text-[13px] font-semibold text-content">
                  Web Audio telemetry
                </h2>
                <p className="mt-0.5 text-[10px] leading-snug text-muted">
                  Mechanical key clicks, sonar pings, and calibration locks.
                </p>
              </div>
            </div>
            <button
              onClick={onToggleSound}
              role="switch"
              aria-checked={!muted}
              aria-label="Toggle interface sounds"
              className={`relative h-6 w-11 shrink-0 rounded-full border-1.5 transition-colors ${
                muted ? 'border-ink bg-well' : 'border-primary/50 bg-primary/20'
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full transition-[left,background-color] ${
                  muted ? 'left-0.5 bg-muted' : 'left-[22px] bg-primary'
                }`}
              />
            </button>
          </div>
        </section>
      </div>

      <section className="card-hard sticky top-[72px] self-start overflow-hidden">
        <div className="flex items-center justify-between border-b border-subtle px-4 py-3">
          <h2 className="mono-label text-content">Live preview</h2>
          <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-primary">
            {accent.label}
          </span>
        </div>
        <div className="bg-canvas p-4">
          <div
            className={`overflow-hidden rounded-lg border-1.5 border-ink bg-surface shadow-hard ${
              appearance.density === 'comfortable' ? 'p-4' : 'p-3'
            }`}
          >
            <div className="flex items-center justify-between border-b border-subtle pb-2">
              <div className="flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded border border-primary/50 bg-primary/10">
                  <Bot className="h-3 w-3 text-primary" />
                </span>
                <span className="font-display text-[11px] font-semibold text-content">
                  Opti-Bot output
                </span>
              </div>
              <span className="rounded-full border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-mono text-[7px] font-bold text-primary">
                ACTIVE
              </span>
            </div>
            <div className={`mt-3 ${appearance.density === 'comfortable' ? 'space-y-3' : 'space-y-1.5'}`}>
              {[
                ['High-impact issue matched', '+12% depth'],
                ['Founder hiring signal', '94% match'],
                ['Calibration locked', `${profile.jev.calibration}%`],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className={`flex items-center justify-between gap-2 rounded border border-subtle bg-well ${
                    appearance.density === 'comfortable' ? 'px-3 py-2.5' : 'px-2 py-1.5'
                  }`}
                >
                  <span className="font-mono text-[8px] text-muted">{label}</span>
                  <span className="font-mono text-[8px] font-bold text-primary">{value}</span>
                </div>
              ))}
            </div>
            <div className={`flex gap-2 ${appearance.density === 'comfortable' ? 'mt-4' : 'mt-2'}`}>
              <span className="h-6 flex-1 rounded border border-primary/40 bg-primary/10" />
              <span className="h-6 w-14 rounded border border-ink bg-well" />
            </div>
          </div>
          <p className="mt-3 font-mono text-[8px] leading-relaxed text-muted">
            Density and accent persist to localStorage and apply across the research index. Sound
            preference syncs with the header audio control.
          </p>
        </div>
      </section>
    </div>
  );
}

export default function SettingsPage({
  profile,
  inputs,
  config,
  engineMode,
  appearance,
  muted,
  onSaveProfile,
  onAppearanceChange,
  onToggleSound,
  onOpenEngine,
}: SettingsPageProps) {
  const [tab, setTab] = useState<SettingsTab>('profile');
  const provider = LLM_PROVIDERS[config.llmProvider];
  const accent = ACCENTS[appearance.accent];

  return (
    <div className="mx-auto max-w-[1440px] p-4 sm:p-5">
      <ViewHeader
        index="07"
        title="Settings"
        description="Profile linkage, engine architecture, calibration help, commercial tiers, and the workspace controls that shape every research loop."
        actions={
          <>
            <button onClick={() => onOpenEngine('agents')} className="btn-ghost !px-3 !py-2 !text-[10px]">
              <FileText className="h-3.5 w-3.5" />
              Agent Specs
            </button>
            <button onClick={() => onOpenEngine('config')} className="btn-primary !px-3 !py-2 !text-[10px]">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Engine Config
            </button>
          </>
        }
        metrics={[
          { label: 'Engine mode', value: engineMode === 'live' ? 'Live keys' : 'Judge mode' },
          { label: 'Provider', value: provider.short },
          { label: 'Plan', value: 'Free Explorer' },
          { label: 'Theme', value: accent.label },
        ]}
      />

      <div
        role="tablist"
        aria-label="Settings sections"
        className="mt-5 flex flex-wrap gap-1.5 rounded-lg border-1.5 border-ink bg-surface p-1.5 shadow-hard"
      >
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              role="tab"
              id={`settings-tab-${item.id}`}
              aria-selected={active}
              aria-controls={`settings-panel-${item.id}`}
              onClick={() => {
                setTab(item.id);
                soundEngine.playKeyClick();
              }}
              className={`flex shrink-0 items-center gap-2 rounded border-1.5 px-3 py-2 font-display text-[11px] font-semibold transition-colors ${
                active
                  ? 'border-primary/50 bg-primary/10 text-primary shadow-hard'
                  : 'border-transparent text-muted hover:border-ink hover:bg-subtle hover:text-content'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`settings-panel-${tab}`}
        aria-labelledby={`settings-tab-${tab}`}
        className="mt-5 animate-rise-in"
      >
        {tab === 'profile' && (
          <ProfilePanel profile={profile} inputs={inputs} onSaveProfile={onSaveProfile} />
        )}
        {tab === 'about' && <AboutPanel profile={profile} config={config} engineMode={engineMode} />}
        {tab === 'help' && <HelpPanel profile={profile} />}
        {tab === 'billing' && <BillingPanel />}
        {tab === 'appearance' && (
          <AppearancePanel
            profile={profile}
            appearance={appearance}
            muted={muted}
            onAppearanceChange={onAppearanceChange}
            onToggleSound={onToggleSound}
          />
        )}
      </div>
    </div>
  );
}
