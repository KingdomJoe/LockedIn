import { useEffect, useMemo, useRef, useState } from 'react';
import { Flame, Radar, ShieldCheck, Timer } from 'lucide-react';
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
    let li = 0;
    let ci = 0;
    let tick = 0;

    const id = window.setInterval(() => {
      if (li >= lines.length) {
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
      ci += 3;
      const current = lines[li];
      if (ci >= current.length) {
        setOut(lines.slice(0, li + 1));
        li++;
        ci = 0;
      } else {
        setOut([...lines.slice(0, li), current.slice(0, ci)]);
      }
    }, 42);

    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines]);

  return out;
}

export default function TacticalBriefingHUD({ profile, onStamp }: Props) {
  const { jev, user, competency } = profile;
  const [stamped, setStamped] = useState(false);
  const lines = useMemo(() => profile.briefing, [profile.briefing]);
  const out = useTypewriter(lines, () => {
    setStamped(true);
    onStamp?.();
  });

  const axes = jev.axisDecisions;
  const maxLen = Math.max(...lines.map((l) => l.length));

  return (
    <section className="panel flex h-full flex-col overflow-hidden">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <Radar className="h-4 w-4 text-emerald-400" />
          <h2 className="mono-label">Special-Forces Briefing · JSOC Dossier</h2>
        </div>
        <span
          className={`font-mono text-[10px] font-bold uppercase tracking-widest ${
            stamped ? 'text-emerald-400' : 'text-amber-400'
          }`}
        >
          {stamped ? 'SEALED' : 'DECRYPTING…'}
        </span>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {/* Jev telemetry banner */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-cyan-900/60 bg-cyan-950/30 px-3 py-2">
          <ShieldCheck className="h-4 w-4 text-cyan-400" />
          <span className="font-mono text-[11px] font-bold text-cyan-300">
            TypeSafe AI · JEV SYSTEM-1 · PARALLEL MATRIX
          </span>
          <span className="ml-auto flex items-center gap-1 font-mono text-[10px] text-cyan-400/90">
            <Timer className="h-3 w-3" />
            {jev.latencyMs}ms · {jev.schemaErrorRate}% schema error · RLCD calibrated · 24 heads
          </span>
        </div>

        {/* Classification */}
        <div className="rounded-lg border border-emerald-900/60 bg-obsidian-800/60 p-3">
          <p className="mono-label text-emerald-500">Subject classification</p>
          <p className="crt-flicker mt-1 font-mono text-sm font-bold text-emerald-300">
            {jev.classification}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-gray-400">
            <span>P(SHORTLIST) <b className="text-emerald-300">{jev.pShortlist}%</b></span>
            <span>P(OFFER) <b className="text-emerald-300">{jev.pOffer}%</b></span>
            <span>CALIB <b className="text-cyan-300">{jev.calibration}% Conf.</b></span>
          </div>
        </div>

        {/* Buzzword incinerator */}
        <div className="relative overflow-hidden rounded-lg border border-red-900/50 bg-red-950/10 p-3">
          <div className="mb-2 flex items-center gap-2">
            <Flame className="h-4 w-4 text-red-400" />
            <p className="mono-label text-red-400">LinkedIn Buzzword Incinerator</p>
            <span className="ml-auto font-mono text-[10px] text-red-300">
              {jev.buzzwordsIncinerated} phrases purged
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {profile.buzzwordAudit.map((b) => (
              <span
                key={b.phrase}
                className={`rounded border px-1.5 py-0.5 font-mono text-[10px] line-through decoration-red-500/80 ${
                  b.count > 0
                    ? 'border-red-800/70 bg-red-950/40 text-red-300'
                    : 'border-obsidian-600/60 bg-obsidian-800/50 text-gray-500'
                }`}
              >
                {b.phrase}
              </span>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] animate-scanline bg-gradient-to-r from-transparent via-red-500/80 to-transparent" />
        </div>

        {/* Competency radar bars */}
        <div>
          <p className="mono-label mb-2">6-axis competency radar · calibrated</p>
          <div className="space-y-2">
            {axes.map((d) => (
              <div key={d.axis} className="group">
                <div className="flex items-baseline justify-between font-mono text-[11px]">
                  <span className="text-gray-300">{d.axis}</span>
                  <span className="text-emerald-400">
                    {d.score}
                    <span className="text-gray-600"> ±{Math.round(100 - d.confidence)} ({d.confidence}% Conf.)</span>
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-obsidian-700">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-700"
                    style={{ width: `${d.score}%` }}
                  />
                </div>
                <p className="mt-0.5 text-[10px] leading-snug text-gray-500">{d.verdict}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Decrypted briefing text */}
        <div className="rounded-lg border border-emerald-900/60 bg-obsidian-950/80 p-3">
          <p className="mono-label mb-2 flex items-center justify-between">
            Decrypted transmission
            <span className="text-gray-600">{maxLen * lines.length} chars · AES-256 narrative</span>
          </p>
          <div className="space-y-1.5 font-mono text-[11px] leading-relaxed">
            {out.map((line, i) => (
              <p key={i} className={i === 0 ? 'text-emerald-300' : 'text-gray-300'}>
                <span className="mr-1.5 text-emerald-700">{String(i + 1).padStart(2, '0')}▸</span>
                {line}
                {i === out.length - 1 && !stamped && (
                  <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-emerald-400 align-middle" />
                )}
              </p>
            ))}
          </div>
          {stamped && (
            <div className="mt-2 inline-flex animate-rise-in items-center gap-1.5 rounded border border-emerald-600/70 bg-emerald-950/40 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-300">
              <ShieldCheck className="h-3 w-3" /> Dossier sealed · {user.login}
            </div>
          )}
        </div>

        {/* Strengths / gaps */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/20 p-3">
            <p className="mono-label text-emerald-400">Strengths</p>
            <ul className="mt-1 space-y-0.5 text-xs text-gray-300">
              {profile.strengths.map((s) => (
                <li key={s}>▸ {s} — {competency[s]}/100</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-amber-900/60 bg-amber-950/10 p-3">
            <p className="mono-label text-amber-400">Gap vectors</p>
            <ul className="mt-1 space-y-0.5 text-xs text-gray-300">
              {profile.gaps.map((g) => (
                <li key={g}>▸ {g} — {competency[g]}/100</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
