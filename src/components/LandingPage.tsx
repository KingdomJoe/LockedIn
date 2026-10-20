import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  ChevronDown,
  Globe2,
  Github,
  Linkedin,
  Sparkles,
  Terminal,
} from 'lucide-react';
import type { ProfileInputs } from '@/services/optimusEngine';

type Phase = 'onboarding' | 'incinerating' | 'deployed' | 'error';

interface LandingPageProps {
  inputs: ProfileInputs;
  phase: Phase;
  error: string | null;
  onInputsChange: (inputs: ProfileInputs) => void;
  onDeploy: (inputs: ProfileInputs) => void;
}

const presets = ['torvalds', 'shadcn', 'yyx990803', 'KingdomJoe'];

const faqs = [
  {
    question: 'What is LockedIn and why does it replace LinkedIn?',
    answer:
      'LinkedIn is built for corporate theatre and keyword-stuffed resumes. LockedIn is an autonomous career intelligence platform for developers, designers, and tech pros who actually build. When you drop your GitHub, X, LinkedIn, and portfolio links and hit Lock In, the Optimus Agentic Engine turns your verified proof-of-work into live job matches, hackathon targets, and autonomous applications.',
  },
  {
    question: 'What happens in the first 10 seconds after I hit <•> to Lock In?',
    answer:
      'Your repositories, commit velocity, languages, and social footprint project onto an interactive 3D Palantir centerpiece surrounded by four live command cards: your personalized Dev News Carousel, the TypeSafe Jev Probability Curve Simulator, your Firecrawl Scout Report, and Eligibility & Auto-Apply.',
  },
  {
    question: "How does TypeSafe AI's Jev System-1 model calculate my hiring odds?",
    answer:
      'Standard LLMs guess probabilities and hallucinate. LockedIn pairs a System-2 LLM with TypeSafe AI’s System-1 Jev model—trained via Reinforcement Learning for Calibrated Decisions (RLCD)—to compute 24 parallel, type-safe hiring and hackathon acceptance probabilities in ~140ms with ± confidence intervals and 0.0% schema error.',
  },
  {
    question: 'What are Opti-Bots and how do they work automatically?',
    answer:
      'Every link you drop in the hero bar spawns a dedicated mini-agent. Your GitHub Opti-Bot hunts high-leverage open-source issues to deepen your portfolio; your X Opti-Bot scrapes founder hiring threads and flash hackathons; and your LinkedIn Opti-Bot tracks high-fit engineering roles without feed noise. You can also deploy custom Opti-Bots on demand.',
  },
  {
    question: 'How does the Counterfactual Simulator help me level up?',
    answer:
      'Inside the Jev Simulator, you can toggle recommended Open-Source PRs or Certificates and watch your calibrated job acceptance curve shift from μ₀ to μ₁ in real time—showing you which exact 4-hour contribution increases your hiring odds the most before you write a line of code.',
  },
  {
    question: 'Can I test LockedIn right now without creating an account or adding API keys?',
    answer:
      'Yes. Drop any public GitHub username or link into the command bar, or click one of the 1-click presets, to experience live GitHub REST profiling, deterministic Jev probability curves, and Firecrawl opportunity scouting immediately.',
  },
];

const news = [
  ['SYSTEMS', 'Async I/O is changing the throughput economics of read-heavy services and the teams that operate them.'],
  ['AI AGENTS', 'Agent review workflows are moving closer to the merge path, changing how production judgment is evaluated.'],
  ['OPEN SOURCE', 'Maintainer funding is becoming a visible hiring signal, not a side note in the application stack.'],
];

function parseSmartInput(value: string): ProfileInputs {
  const github = value.match(/github\.com\/@?([A-Za-z0-9-]+)/i);
  const x = value.match(/(?:^|\s)@([A-Za-z0-9_]{2,30})/);
  const linkedin = value.match(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[^\s,]+/i);
  const urls = value.match(/https?:\/\/[^\s,]+/gi) ?? [];
  const portfolio = urls.find((url) => !/github\.com|linkedin\.com/i.test(url));
  return {
    username: github?.[1] ?? value.trim().split(/[\s,]+/)[0].replace(/^@/, ''),
    xHandle: x ? `@${x[1]}` : undefined,
    linkedinUrl: linkedin?.[0],
    portfolioUrl: portfolio,
  };
}

function PlatformBadge() {
  const [index, setIndex] = useState(0);
  const platforms = [
    <Github key="github" className="h-4 w-4" aria-label="GitHub" />,
    <span key="x" className="font-mono text-sm font-bold" aria-label="X">X</span>,
    <Linkedin key="linkedin" className="h-4 w-4" aria-label="LinkedIn" />,
    <Globe2 key="globe" className="h-4 w-4" aria-label="Portfolio" />,
  ];

  useEffect(() => {
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % platforms.length), 1500);
    return () => window.clearInterval(timer);
  }, [platforms.length]);

  return (
    <span className="relative grid h-10 w-10 place-items-center rounded-full border-[1.5px] border-[#2E3440] bg-[#111317] text-[#12cc0f] shadow-[2px_2px_0_rgba(0,0,0,.6)]">
      <span key={index} className="animate-platform-morph">{platforms[index]}</span>
    </span>
  );
}

export default function LandingPage({ inputs, phase, error, onInputsChange, onDeploy }: LandingPageProps) {
  const [command, setCommand] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const lockIn = (event?: FormEvent) => {
    event?.preventDefault();
    const parsed = parseSmartInput(command);
    const next = { ...inputs, ...parsed };
    onInputsChange(next);
    onDeploy(next);
  };

  const focusCommand = () => textareaRef.current?.focus();

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#090808] text-[#F4F5F8] selection:bg-[#12cc0f]/30">
      <header className="sticky top-0 z-40 h-16 border-b border-[#2E3440] bg-[#090808]/95 backdrop-blur">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-5 sm:px-8">
          <a href="#top" className="flex items-center gap-2.5">
            <span className="font-mono text-base font-bold text-[#12cc0f]">&lt;•&gt;</span>
            <span className="font-display text-xl font-bold tracking-[-0.03em]">LockedIn</span>
          </a>
          <nav className="hidden items-center gap-8 md:flex" aria-label="Landing navigation">
            <a href="#faqs" className="text-sm text-[#8C92A4] transition-colors hover:text-[#F4F5F8]">FAQs</a>
            <a href="#pricing" className="text-sm text-[#8C92A4] transition-colors hover:text-[#F4F5F8]">Pricing</a>
            <a href="#devnews" className="text-sm text-[#8C92A4] transition-colors hover:text-[#F4F5F8]">DevNews</a>
          </nav>
          <button onClick={focusCommand} className="rounded border-[1.5px] border-[#43e935] bg-[#12cc0f] px-3.5 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[#002200] shadow-[2px_2px_0_rgba(0,0,0,.75)] transition active:translate-x-px active:translate-y-px hover:bg-[#43e935]">
            [ Lock In Now ]
          </button>
        </div>
      </header>

      <main id="top">
        <section className="relative flex min-h-[82vh] flex-col items-center justify-center px-5 py-20 text-center sm:px-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(18,204,15,.08),transparent_34%)]" />
          <div className="relative z-10 mb-5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#8C92A4]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#12cc0f]" />
            Optimus Agentic Engine · live proof-of-work telemetry
          </div>
          <h1 className="relative z-10 max-w-4xl font-display text-[clamp(2.35rem,6.4vw,4.75rem)] font-bold leading-[1.08] tracking-[-0.04em]">
            Resumes lie.<br />
            Proof-of-work ships.<br />
            <span className="border-b-4 border-[#12cc0f] pb-1">Time to lock in.</span>
          </h1>

          <form onSubmit={lockIn} className="relative z-10 mt-10 flex w-full max-w-2xl items-stretch gap-2.5">
            <textarea
              ref={textareaRef}
              rows={2}
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') lockIn(event);
              }}
              placeholder="github.com/username, @x_handle, linkedin.com/in/you, or portfolio.dev..."
              aria-label="Drop your GitHub, X, LinkedIn, or portfolio links"
              className="min-w-0 flex-1 resize-none rounded-lg border-[1.5px] border-[#2E3440] bg-[#111317] px-4 py-3.5 font-mono text-sm text-[#F4F5F8] shadow-[2px_2px_0_rgba(0,0,0,.6)] outline-none transition-colors placeholder:text-[#8C92A4]/60 focus:border-[#12cc0f]"
            />
            <button type="submit" disabled={phase === 'incinerating'} className="flex w-[76px] shrink-0 items-center justify-center rounded-lg border-[1.5px] border-[#43e935] bg-[#12cc0f] text-xl font-mono font-extrabold text-[#002200] shadow-[2px_2px_0_rgba(0,0,0,.75)] transition active:translate-x-px active:translate-y-px hover:bg-[#43e935] disabled:opacity-60">
              {phase === 'incinerating' ? <Sparkles className="h-5 w-5 animate-spin" /> : '<•>'}
            </button>
          </form>

          <div className="relative z-10 mt-5 flex items-center justify-center gap-3 text-lg font-medium text-[#8C92A4] sm:text-xl">
            <span>Drop your links. Lock in</span><PlatformBadge />
          </div>
          <div className="relative z-10 mt-6 flex flex-wrap items-center justify-center gap-2 font-mono text-[11px] text-[#8C92A4]">
            <span className="mr-1">Instant presets:</span>
            {presets.map((preset) => (
              <button key={preset} type="button" onClick={() => { setCommand(`github.com/${preset}`); onInputsChange({ ...inputs, username: preset }); onDeploy({ ...inputs, username: preset }); }} className="rounded border border-[#2E3440] bg-[#111317] px-2 py-1 text-[#F4F5F8] transition-colors hover:border-[#12cc0f] hover:text-[#12cc0f]">[{preset}]</button>
            ))}
          </div>
          {error && <p className="relative z-10 mt-4 max-w-lg rounded border border-[#FF5252]/50 bg-[#FF5252]/10 px-3 py-2 font-mono text-xs text-[#FF8A8A]">{error}</p>}
        </section>

        <section className="border-t border-[#252932] px-5 py-14 sm:px-6" aria-label="Optimus pipeline">
          <div className="mx-auto grid max-w-6xl gap-3 md:grid-cols-3">
            {[
              ['01 // THE SIGNAL', '3D Palantir Scan', 'Repositories, commit velocity, and code footprint become a readable proof layer.'],
              ['02 // THE MODEL', 'Jev System-1', '24 calibrated hiring probabilities computed in parallel with confidence intervals.'],
              ['03 // THE ACTION', 'Opti-Bots', 'Profile-linked agents surface issues, roles, hackathons, and high-leverage next moves.'],
            ].map(([eyebrow, title, body]) => (
              <article key={title} className="border-[1.5px] border-[#2E3440] bg-[#111317] p-5 shadow-[2px_2px_0_rgba(0,0,0,.65)]">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[#12cc0f]">{eyebrow}</p>
                <h2 className="mt-3 font-display text-xl font-bold tracking-[-0.03em]">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-[#8C92A4]">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="devnews" className="border-t border-[#252932] px-5 py-16 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="mb-7 flex items-end justify-between gap-4"><div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[#12cc0f]">02 // Live intelligence strip</p><h2 className="mt-2 font-display text-3xl font-bold tracking-[-0.03em]">DevNews with signal.</h2></div><Terminal className="h-5 w-5 text-[#00D2D3]" /></div>
            <div className="grid gap-3 md:grid-cols-3">{news.map(([tag, body]) => <article key={tag} className="border border-[#252932] bg-[#111317] p-5"><p className="font-mono text-[10px] font-bold tracking-[0.08em] text-[#00D2D3]">{tag}</p><p className="mt-3 text-sm leading-relaxed text-[#F4F5F8]">{body}</p><p className="mt-5 font-mono text-[10px] text-[#8C92A4]">CURATED BY OPTIMUS</p></article>)}</div>
          </div>
        </section>

        <section id="pricing" className="border-t border-[#252932] px-5 py-16 sm:px-6">
          <div className="mx-auto max-w-6xl"><p className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[#12cc0f]">03 // Scale your career</p><h2 className="mt-2 font-display text-3xl font-bold tracking-[-0.03em]">Clear, deterministic telemetry tiers.</h2><div className="mt-8 grid gap-4 lg:grid-cols-3">
            {[
              ['Free Builder', '$0', 'forever', ['Instant multi-link Lock In', '3D Palantir overview', 'Baseline Jev probability curve', 'Weekly Dev Dispatch']],
              ['LockedIn Pro', '$19', '/ mo', ['24/7 GitHub, X & LinkedIn Opti-Bots', 'Unlimited Firecrawl live scans', 'Full Jev counterfactual simulator', '1-click proof-of-work applications']],
              ['Hiring Teams & API', '$199', '/ mo', ['Source by shipped architecture', 'Calibrated Jev match scores', 'Talent search API & webhooks', 'Direct outreach to locked-in talent']],
            ].map(([name, price, suffix, bullets], index) => <article key={String(name)} className={`relative border-[1.5px] bg-[#111317] p-6 shadow-[2px_2px_0_rgba(0,0,0,.65)] ${index === 1 ? 'border-[#12cc0f]' : 'border-[#2E3440]'}`}>{index === 1 && <span className="absolute -top-3 right-4 bg-[#12cc0f] px-2 py-1 font-mono text-[9px] font-bold uppercase text-[#002200]">Most popular</span>}<p className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[#8C92A4]">{name}</p><div className="mt-4 flex items-baseline gap-1"><span className="font-display text-4xl font-bold">{price}</span><span className="font-mono text-xs text-[#8C92A4]">{suffix}</span></div><ul className="mt-6 space-y-3">{(bullets as string[]).map((bullet) => <li key={bullet} className="flex gap-2 text-sm text-[#F4F5F8]"><span className="text-[#12cc0f]">✓</span>{bullet}</li>)}</ul><button onClick={focusCommand} className={`mt-8 w-full border-[1.5px] px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] ${index === 1 ? 'border-[#43e935] bg-[#12cc0f] text-[#002200]' : 'border-[#2E3440] bg-[#1C1E24] text-[#F4F5F8]'}`}>{index === 2 ? 'Request API keys' : index === 1 ? 'Lock in with Pro' : 'Get started free'} <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></button></article>)}
          </div></div>
        </section>

        <section id="faqs" className="border-t border-[#252932] px-5 py-16 sm:px-6"><div className="mx-auto max-w-4xl"><p className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[#12cc0f]">04 // Frequently asked questions</p><h2 className="mt-2 font-display text-3xl font-bold tracking-[-0.03em]">The builder architecture.</h2><p className="mt-2 text-sm text-[#8C92A4]">Deep-dive answers for the telemetry core, agents, and model.</p><div className="mt-8 space-y-2">{faqs.map((faq, index) => { const open = openFaq === index; return <div key={faq.question} className="border-[1.5px] border-[#2E3440] bg-[#111317]"><button onClick={() => setOpenFaq(open ? null : index)} className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"><span className="font-mono text-xs font-bold text-[#F4F5F8]"><span className="mr-3 text-[#12cc0f]">{String(index + 1).padStart(2, '0')} //</span>{faq.question}</span><ChevronDown className={`h-4 w-4 shrink-0 text-[#8C92A4] transition-transform ${open ? 'rotate-180' : ''}`} /></button>{open && <div className="border-t border-[#252932] px-4 pb-5 pt-4 text-sm leading-relaxed text-[#8C92A4]">{faq.answer}</div>}</div>; })}</div></div></section>
      </main>

      <footer className="border-t border-[#252932] px-5 py-6 sm:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-3 font-mono text-[10px] text-[#8C92A4] sm:flex-row sm:items-center sm:justify-between"><span className="font-bold text-[#F4F5F8]">&lt;•&gt; LockedIn</span><span>PROOF-OF-WORK ENGINE // OPTIMUS TELEMETRY</span><span className="text-[#12cc0f]">● ALL OPTI-BOT FLEETS OPERATIONAL</span></div></footer>
    </div>
  );
}
