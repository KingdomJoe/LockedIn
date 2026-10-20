import { useEffect, useMemo, useRef, useState } from 'react';
import { FileSearch, ScanText, ShieldCheck, Timer } from 'lucide-react';
import type { ProofOfWorkProfile } from '@/types/optimus';
import { soundEngine } from '@/utils/soundEngine';

interface Props {
  profile: ProofOfWorkProfile;
  onStamp?: () => void;
}

const TICKS_PER_FRAME = 2;

function useTypewriter(lines: string[], onDone: () => void): string[] {
  const [out, setOut] = useState<string[]>([]);
  const doneRef = useRef(false);

  useEffect(() => {
    setOut([]);
    doneRef.current = false;
    let lineIndex = 0;
    let characterIndex = 0;
    let tick = 0;

    const id = window.setInterval(() => {
      if (lineIndex >= lines.length) {
        if (!doneRef.current) {
          doneRef.current = true;
          soundEngine.playDossierStamp();
          onDone();
        }
        window.clearInterval(id);
        return;
      }
      tick++;
      if (tick % TICKS_PER_FRAME === 0) soundEngine.playTeletypeTick();
      characterIndex += 3;
      const current = lines[lineIndex];
      if (characterIndex >= current.length) {
        setOut(lines.slice(0, lineIndex + 1));
        lineIndex++;
        characterIndex = 0;
      } else {
        setOut([...lines.slice(0, lineIndex), current.slice(0, characterIndex)]);
      }
    }, 42);

    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines]);

  return out;
}

export default function ResearchBriefing({ profile, onStamp }: Props) {
  const { jev, user, competency } = profile;
  const [verified, setVerified] = useState(false);
  const lines = useMemo(() => profile.briefing, [profile.briefing]);
  const out = useTypewriter(lines, () => {
    setVerified(true);
    onStamp?.();
  });

  return (
    <section className="panel flex h-full min-h-[480px] flex-col overflow-hidden">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <FileSearch className="h-4 w-4 text-primary" />
          <h2 className="mono-label text-content">Research Briefing · Proof-of-Work Dossier</h2>
        </div>
        <span
          className={`font-mono text-[9px] font-bold uppercase tracking-[0.08em] ${
            verified ? 'text-primary' : 'text-accent-amber'
          }`}
        >
          {verified ? 'Verified' : 'Compiling…'}
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        <div className="flex flex-wrap items-center gap-2 rounded border border-subtle bg-well px-3 py-2.5">
          <ScanText className="h-4 w-4 text-accent-cyan" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-accent-cyan">
            TypeSafe AI · Jev System-1 · Parallel Matrix
          </span>
          <span className="ml-auto flex items-center gap-1 font-mono text-[9px] text-muted">
            <Timer className="h-3 w-3" />
            {jev.latencyMs}ms · {jev.schemaErrorRate}% schema error · RLCD · 24 heads
          </span>
        </div>

        <div className="rounded border border-subtle bg-well p-3">
          <p className="label-caps">Benchmark classification</p>
          <p className="crt-flicker mt-1.5 font-display text-[14px] font-bold text-primary">
            {jev.classification}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-muted">
            <span>
              P(Shortlist) <b className="text-content">{jev.pShortlist}%</b>
            </span>
            <span>
              P(Offer) <b className="text-content">{jev.pOffer}%</b>
            </span>
            <span>
              Calibration <b className="text-accent-cyan">{jev.calibration}% Conf.</b>
            </span>
          </div>
        </div>

        <div className="rounded border border-accent-coral/30 bg-accent-coral/5 p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent-coral" />
            <p className="label-caps text-accent-coral">Unverified language audit</p>
            <span className="ml-auto font-mono text-[9px] text-muted">
              {jev.buzzwordsIncinerated} phrases flagged
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {profile.buzzwordAudit.map((item) => (
              <span
                key={item.phrase}
                className={`rounded border px-1.5 py-0.5 font-mono text-[9px] line-through ${
                  item.count > 0
                    ? 'border-accent-coral/40 bg-accent-coral/10 text-accent-coral'
                    : 'border-subtle bg-surface text-muted'
                }`}
              >
                {item.phrase}
              </span>
            ))}
          </div>
        </div>

        <div>
          <p className="label-caps mb-2">6-axis competency index · calibrated</p>
          <div className="space-y-2">
            {jev.axisDecisions.map((decision) => (
              <div key={decision.axis}>
                <div className="flex items-baseline justify-between font-mono text-[10px]">
                  <span className="text-content">{decision.axis}</span>
                  <span className="text-primary">
                    {decision.score}
                    <span className="text-muted">
                      {' '}
                      ±{Math.round(100 - decision.confidence)} ({decision.confidence}% Conf.)
                    </span>
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded bg-ink">
                  <div
                    className="h-full bg-primary transition-all duration-700"
                    style={{ width: `${decision.score}%` }}
                  />
                </div>
                <p className="mt-1 text-[10px] leading-snug text-muted">{decision.verdict}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded border border-subtle bg-canvas p-3">
          <p className="label-caps mb-2 flex items-center justify-between gap-2">
            <span>Research narrative</span>
            <span className="normal-case tracking-normal text-muted">
              {Math.max(...lines.map((line) => line.length)) * lines.length} chars · verified telemetry
            </span>
          </p>
          <div className="space-y-1.5 font-mono text-[10px] leading-relaxed">
            {out.map((line, index) => (
              <p key={index} className={index === 0 ? 'text-primary' : 'text-content'}>
                <span className="mr-1.5 text-muted">{String(index + 1).padStart(2, '0')}▸</span>
                {line}
                {index === out.length - 1 && !verified && (
                  <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-primary align-middle" />
                )}
              </p>
            ))}
          </div>
          {verified && (
            <div className="mt-2 inline-flex animate-rise-in items-center gap-1.5 rounded border border-primary/40 bg-primary/10 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-primary">
              <ShieldCheck className="h-3 w-3" /> Briefing verified · {user.login}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded border border-primary/30 bg-primary/5 p-3">
            <p className="label-caps text-primary">Strengths</p>
            <ul className="mt-1.5 space-y-1 font-mono text-[10px] text-content">
              {profile.strengths.map((strength) => (
                <li key={strength}>
                  {strength} — {competency[strength]}/100
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded border border-accent-amber/30 bg-accent-amber/5 p-3">
            <p className="label-caps text-accent-amber">Improvement areas</p>
            <ul className="mt-1.5 space-y-1 font-mono text-[10px] text-content">
              {profile.gaps.map((gap) => (
                <li key={gap}>
                  {gap} — {competency[gap]}/100
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
