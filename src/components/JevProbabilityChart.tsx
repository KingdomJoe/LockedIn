import { useId } from 'react';

interface JevProbabilityChartProps {
  baseline: number;
  projected: number;
  calibration: number;
  shortlist: number;
  latencyMs?: number;
  schemaError?: string;
}

const WIDTH = 420;
const HEIGHT = 150;
const PLOT_LEFT = 34;
const PLOT_RIGHT = 410;
const PLOT_TOP = 14;
const PLOT_BOTTOM = 124;
const SIGMA = 12;
const CURVE_POINTS = 81;

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

function xFor(probability: number) {
  return PLOT_LEFT + (clamp(probability) / 100) * (PLOT_RIGHT - PLOT_LEFT);
}

function curveFor(mean: number) {
  return Array.from({ length: CURVE_POINTS }, (_, index) => {
    const probability = (index / (CURVE_POINTS - 1)) * 100;
    const density = Math.exp(-0.5 * ((probability - mean) / SIGMA) ** 2);
    const x = xFor(probability);
    const y = PLOT_BOTTOM - density * (PLOT_BOTTOM - PLOT_TOP) * 0.86;
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
}

function areaFor(mean: number) {
  return `${curveFor(mean)} L${xFor(100).toFixed(2)},${PLOT_BOTTOM} L${xFor(0).toFixed(2)},${PLOT_BOTTOM} Z`;
}

function bandFor(mean: number, spread: number) {
  const start = (mean - spread) / 100;
  const end = (mean + spread) / 100;
  const points = Array.from({ length: 37 }, (_, index) => {
    const t = index / 36;
    const probability = (start + (end - start) * t) * 100;
    const density = Math.exp(-0.5 * ((probability - mean) / SIGMA) ** 2);
    return [xFor(probability), PLOT_BOTTOM - density * (PLOT_BOTTOM - PLOT_TOP) * 0.86] as const;
  });
  const top = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  return `${top} L${points[points.length - 1][0].toFixed(2)},${PLOT_BOTTOM} L${points[0][0].toFixed(2)},${PLOT_BOTTOM} Z`;
}

function StatBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-ink bg-well px-2 py-1.5">
      <p className="font-mono text-[7px] uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className="mt-0.5 font-mono text-[10px] font-bold tabular-nums text-content">{value}</p>
    </div>
  );
}

export default function JevProbabilityChart({
  baseline,
  projected,
  calibration,
  shortlist,
  latencyMs = 134,
  schemaError = '0.0%',
}: JevProbabilityChartProps) {
  const clipId = `${useId().replace(/:/g, '')}-clip`;
  const base = clamp(baseline);
  const target = clamp(projected);
  const delta = Math.round(target - base);
  const band = Math.max(2, Math.round(100 - calibration));
  const shift = xFor(target) - xFor(base);
  const baselineArea = areaFor(base);
  const baselineBand = bandFor(base, SIGMA);
  const curvePath = curveFor(base);
  const curveArea = areaFor(base);

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="label-caps">P(Accept)</p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="font-mono text-[30px] font-bold leading-none tracking-[-0.04em] tabular-nums text-primary">
              {Math.round(target)}%
            </p>
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.04em] text-accent-cyan">
              {delta > 0 ? `+${delta}% lift` : 'calibrated'}
            </span>
          </div>
          <p className="mt-1.5 font-mono text-[8px] tabular-nums text-muted">
            ±{band} pts · {Math.round(shortlist)}% shortlist · {calibration}% conf.
          </p>
        </div>

        <div className="flex gap-1.5">
          <StatBadge label="Latency" value={`${latencyMs}ms`} />
          <StatBadge label="Schema error" value={schemaError} />
        </div>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-1.5 h-auto w-full shrink-0"
        role="img"
        aria-label={`Jev calibrated probability distribution. Baseline ${Math.round(base)} percent, projected ${Math.round(target)} percent.`}
      >
        <defs>
          <clipPath id={clipId}>
            <rect
              x={PLOT_LEFT}
              y={PLOT_TOP}
              width={PLOT_RIGHT - PLOT_LEFT}
              height={PLOT_BOTTOM - PLOT_TOP}
            />
          </clipPath>
        </defs>

        <g aria-hidden>
          {[PLOT_TOP, (PLOT_TOP + PLOT_BOTTOM) / 2, PLOT_BOTTOM].map((y) => (
            <line
              key={y}
              x1={PLOT_LEFT}
              x2={PLOT_RIGHT}
              y1={y}
              y2={y}
              stroke="#252932"
              strokeWidth="1"
            />
          ))}
          <line
            x1={PLOT_LEFT}
            x2={PLOT_LEFT}
            y1={PLOT_TOP}
            y2={PLOT_BOTTOM}
            stroke="#2E3440"
            strokeWidth="1"
          />

          <g clipPath={`url(#${clipId})`}>
            <rect
              x={xFor(base - SIGMA)}
              y={PLOT_TOP}
              width={xFor(base + SIGMA) - xFor(base - SIGMA)}
              height={PLOT_BOTTOM - PLOT_TOP}
              fill="#8C92A4"
              fillOpacity="0.045"
            />
            <path d={baselineBand} fill="#8C92A4" fillOpacity="0.12" />
            <path d={baselineArea} fill="#8C92A4" fillOpacity="0.06" />
            <line
              x1={xFor(base - SIGMA)}
              x2={xFor(base - SIGMA)}
              y1={PLOT_TOP}
              y2={PLOT_BOTTOM}
              stroke="#8C92A4"
              strokeWidth="0.8"
              strokeDasharray="2 4"
              strokeOpacity="0.32"
            />
            <line
              x1={xFor(base + SIGMA)}
              x2={xFor(base + SIGMA)}
              y1={PLOT_TOP}
              y2={PLOT_BOTTOM}
              stroke="#8C92A4"
              strokeWidth="0.8"
              strokeDasharray="2 4"
              strokeOpacity="0.32"
            />
            <path
              d={curvePath}
              fill="none"
              stroke="#8C92A4"
              strokeWidth="1.25"
              strokeDasharray="4 4"
            />

            <g
              style={{
                transform: `translateX(${shift}px)`,
                transition: 'transform 620ms cubic-bezier(0.22, 0.8, 0.24, 1)',
                willChange: 'transform',
              }}
            >
              <path d={curveArea} fill="#12cc0f22" />
              <path d={curvePath} fill="none" stroke="#12cc0f" strokeWidth="1.9" />
              <line
                x1={xFor(base)}
                x2={xFor(base)}
                y1={PLOT_TOP + 8}
                y2={PLOT_BOTTOM}
                stroke="#12cc0f"
                strokeWidth="1"
                strokeDasharray="2 4"
                opacity="0.65"
              />
              <circle cx={xFor(base)} cy={PLOT_TOP + 8} r="2.4" fill="#12cc0f" />
              <circle cx={xFor(base)} cy={PLOT_TOP + 8} r="5" fill="none" stroke="#12cc0f" strokeOpacity="0.32" />
            </g>
            <text
              x={xFor(base - SIGMA) + 4}
              y={PLOT_BOTTOM - 6}
              fill="#8C92A4"
              fillOpacity="0.72"
              fontSize="7"
              fontFamily="JetBrains Mono, monospace"
              letterSpacing="0.05em"
            >
              ±1σ BAND
            </text>
          </g>

          {[0, 25, 50, 75, 100].map((tick) => (
            <g key={tick}>
              <line
                x1={xFor(tick)}
                x2={xFor(tick)}
                y1={PLOT_BOTTOM}
                y2={PLOT_BOTTOM + 4}
                stroke="#2E3440"
                strokeWidth="1"
              />
              <text
                x={xFor(tick)}
                y={PLOT_BOTTOM + 16}
                fill="#8C92A4"
                fontSize="9"
                fontFamily="JetBrains Mono, monospace"
                textAnchor="middle"
              >
                {tick}%
              </text>
            </g>
          ))}

          <text
            x="8"
            y={(PLOT_TOP + PLOT_BOTTOM) / 2}
            fill="#8C92A4"
            fontSize="6.5"
            fontFamily="JetBrains Mono, monospace"
            textAnchor="middle"
            transform={`rotate(-90 8 ${(PLOT_TOP + PLOT_BOTTOM) / 2})`}
            letterSpacing="0.04em"
          >
            EPISTEMIC PROBABILITY DENSITY
          </text>

          <text x={PLOT_LEFT} y="10" fill="#686F80" fontSize="8" fontFamily="JetBrains Mono, monospace">
            μ0 BASELINE
          </text>
          <text
            x={PLOT_RIGHT}
            y="10"
            fill="#12cc0f"
            fontSize="8"
            fontFamily="JetBrains Mono, monospace"
            textAnchor="end"
          >
            μ1 PROJECTED
          </text>
        </g>
      </svg>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
        <span className="rounded border border-primary/40 bg-primary/10 px-2 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.06em] tabular-nums text-primary">
          {delta > 0 ? `+${delta}% calibrated lift` : 'baseline calibrated'}
        </span>
        <span className="font-mono text-[8px] uppercase tracking-[0.06em] tabular-nums text-muted">
          μ0 {Math.round(base)}% → μ1 {Math.round(target)}%
        </span>
      </div>
    </div>
  );
}
