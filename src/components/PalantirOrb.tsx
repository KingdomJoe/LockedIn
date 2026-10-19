import { useEffect, useRef, useState, useCallback } from 'react';
import type { GitHubRepo, OptiRemark } from '@/types/optimus';
import { langColor } from '@/services/langColors';
import { soundEngine } from '@/utils/soundEngine';

interface OrbitNode {
  repo: GitHubRepo;
  radius: number;
  theta: number;
  phi: number;
  speed: number;
}

interface PalantirOrbProps {
  avatarUrl: string;
  username: string;
  repos: GitHubRepo[];
  languages: { name: string; share: number }[];
  boostedPOffer: number;
  auraLevel: number; // 0–100, drives glow
  remarks: OptiRemark[];
  onSpin?: () => void;
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

function rotateY(p: Vec3, a: number): Vec3 {
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  return { x: p.x * cos + p.z * sin, y: p.y, z: -p.x * sin + p.z * cos };
}
function rotateX(p: Vec3, a: number): Vec3 {
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  return { x: p.x, y: p.y * cos - p.z * sin, z: p.y * sin + p.z * cos };
}

export default function PalantirOrb({
  avatarUrl,
  username,
  repos,
  languages,
  boostedPOffer,
  auraLevel,
  remarks,
  onSpin,
}: PalantirOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<OrbitNode[]>([]);
  const rotRef = useRef({ x: -0.35, y: 0 });
  const autoSpinRef = useRef(0.0035);
  const dragRef = useRef<{ active: boolean; lastX: number; lastY: number; vx: number }>({
    active: false,
    lastX: 0,
    lastY: 0,
    vx: 0,
  });
  const frameRef = useRef(0);
  const auraRef = useRef(auraLevel);
  auraRef.current = auraLevel;
  const boostedRef = useRef(boostedPOffer);
  boostedRef.current = boostedPOffer;

  const [activeRemark, setActiveRemark] = useState<OptiRemark | null>(null);
  const [optiMood, setOptiMood] = useState<'idle' | 'point' | 'alert'>('idle');

  useEffect(() => {
    const owned = repos.filter((r) => !r.fork).slice(0, 8);
    nodesRef.current = owned.map((repo, i) => {
      const golden = (1 + Math.sqrt(5)) / 2;
      const y = 1 - ((i + 0.5) / owned.length) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = golden * i * Math.PI * 2;
      return {
        repo,
        radius: 150,
        theta,
        phi: Math.acos(y) * 0.5 + (r * Math.PI) / 4,
        speed: 0.0016 + (i % 3) * 0.0009,
      };
    });
  }, [repos]);

  useEffect(() => {
    if (!remarks.length) return;
    let idx = 0;
    setActiveRemark(remarks[0]);
    setOptiMood(remarks[0].tone === 'gap' ? 'alert' : 'point');
    const cycle = window.setInterval(() => {
      idx = (idx + 1) % remarks.length;
      const next = remarks[idx];
      setActiveRemark(next);
      setOptiMood(next.tone === 'gap' ? 'alert' : 'point');
      if (next.tone === 'gap') soundEngine.playDeficitAlert();
    }, 6500);
    return () => window.clearInterval(cycle);
  }, [remarks]);

  const draw = useCallback(
    () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const R = Math.min(w, h) * 0.31;

      // Aura — strength scales with auraLevel
      const aura = auraRef.current / 100;
      const gradient = ctx.createRadialGradient(cx, cy, R * 0.4, cx, cy, R * 1.9);
      gradient.addColorStop(0, `rgba(16,185,129,${0.16 + aura * 0.22})`);
      gradient.addColorStop(0.6, `rgba(6,182,212,${0.05 + aura * 0.1})`);
      gradient.addColorStop(1, 'rgba(7,9,14,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      // Sphere core
      const core = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R);
      core.addColorStop(0, 'rgba(52,211,153,0.55)');
      core.addColorStop(0.55, 'rgba(16,185,129,0.22)');
      core.addColorStop(1, 'rgba(7,9,14,0.9)');
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = core;
      ctx.fill();
      ctx.strokeStyle = `rgba(16,185,129,${0.45 + aura * 0.35})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Latitude rings
      for (let i = 1; i <= 3; i++) {
        const latR = R * (0.4 + i * 0.2);
        ctx.beginPath();
        ctx.ellipse(cx, cy, latR, latR * 0.32, rotRef.current.y, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(6,182,212,${0.18 + i * 0.05})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Jev probability ring (P(Offer) arc)
      const p = boostedRef.current / 100;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
      ctx.strokeStyle = 'rgba(16,185,129,0.85)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(16,185,129,0.9)';
      ctx.textAlign = 'center';
      ctx.fillText(`P(OFFER) ${Math.round(boostedRef.current)}%`, cx, cy - R * 1.26);

      // Orbiting nodes
      const drag = dragRef.current;
      if (!drag.active) rotRef.current.y += autoSpinRef.current + Math.abs(drag.vx);
      drag.vx *= 0.95;

      const nodes = nodesRef.current;
      nodes.forEach((node, i) => {
        node.theta += node.speed;
        let p3: Vec3 = {
          x: Math.cos(node.theta) * Math.cos(node.phi),
          y: Math.sin(node.phi),
          z: Math.sin(node.theta) * Math.cos(node.phi),
        };
        p3 = rotateY(p3, rotRef.current.y);
        p3 = rotateX(p3, rotRef.current.x);

        const depth = (p3.z + 1) / 2; // 0 back, 1 front
        const px = cx + p3.x * R * 1.45;
        const py = cy + p3.y * R * 0.85 - R * 0.1;
        const scale = 0.5 + depth * 0.5;
        const size = (14 + Math.min(node.repo.stargazers_count / 120, 22)) * scale;

        const color = langColor(node.repo.language);
        ctx.globalAlpha = 0.35 + depth * 0.65;
        ctx.beginPath();
        ctx.arc(px, py, size / 2, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(7,9,14,0.9)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (depth > 0.55) {
          ctx.globalAlpha = Math.min(depth, 0.95);
          ctx.font = `500 ${Math.round(8 + scale * 3)}px "JetBrains Mono", monospace`;
          ctx.fillStyle = 'rgba(229,231,235,0.92)';
          ctx.textAlign = 'center';
          ctx.fillText(node.repo.name.slice(0, 14), px, py + size / 2 + 11);
        }
        ctx.globalAlpha = 1;
        void i;
      });

      // Avatar at core
      const avatar = new Image();
      avatar.src = avatarUrl;
      if (avatar.complete) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, R * 0.42, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(avatar, cx - R * 0.42, cy - R * 0.42, R * 0.84, R * 0.84);
        ctx.restore();
      }

      // Language badges along equator
      const badges = languages.slice(0, 4);
      badges.forEach((lang, i) => {
        const ang = rotRef.current.y * 0.6 + (i / badges.length) * Math.PI * 2;
        const bx = cx + Math.cos(ang) * R * 1.32;
        const bz = (Math.sin(ang) + 1) / 2;
        const by = cy + R * 0.72;
        ctx.globalAlpha = 0.4 + bz * 0.6;
        ctx.font = '600 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = langColor(lang.name);
        ctx.fillText(lang.name.toUpperCase(), bx, by);
        ctx.globalAlpha = 1;
      });

      frameRef.current = requestAnimationFrame(draw as unknown as FrameRequestCallback);
    },
    [avatarUrl, languages]
  );

  useEffect(() => {
    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [draw]);

  useEffect(() => {
    const img = new Image();
    img.src = avatarUrl;
    img.onload = () => {}; // re-draw picks it up on next frame
  }, [avatarUrl]);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    dragRef.current = { active: true, lastX: e.clientX, lastY: e.clientY, vx: 0 };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = dragRef.current;
    if (!d.active) return;
    const dx = e.clientX - d.lastX;
    const dy = e.clientY - d.lastY;
    rotRef.current.y += dx * 0.008;
    rotRef.current.x = Math.max(-1.2, Math.min(1.2, rotRef.current.x + dy * 0.005));
    d.vx = dx * 0.0015;
    d.lastX = e.clientX;
    d.lastY = e.clientY;
  };

  const onPointerUp = () => {
    if (dragRef.current.active) {
      dragRef.current.active = false;
      soundEngine.playPalantirSpin();
      onSpin?.();
    }
  };

  const moodColor =
    optiMood === 'alert' ? 'text-amber-400' : optiMood === 'point' ? 'text-emerald-400' : 'text-cyan-400';
  const moodRing =
    optiMood === 'alert'
      ? 'border-amber-400/60 shadow-[0_0_18px_rgba(245,158,11,0.4)]'
      : 'border-emerald-400/60 shadow-[0_0_18px_rgba(16,185,129,0.4)]';

  return (
    <div className="relative flex h-full min-h-[420px] flex-col items-center justify-center overflow-hidden rounded-xl border border-emerald-900/50 bg-obsidian-950/60 p-2 grid-bg">
      <div className="mono-label absolute left-3 top-3 z-10">3D Palantir · See-Stone Projection</div>
      <div className="mono-label absolute right-3 top-3 z-10 text-cyan-500/80">
        Drag to rotate · {username}
      </div>

      <canvas
        ref={canvasRef}
        className="h-full w-full max-w-[560px] flex-1 cursor-grab touch-none select-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />

      {/* Opti mini-avatar companion */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex max-w-[85%] items-end gap-2 sm:max-w-[70%]">
        <div
          className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 bg-obsidian-800 transition-all duration-300 ${moodRing} ${
            optiMood === 'idle' ? 'animate-pulse-glow' : 'animate-none'
          }`}
        >
          {/* Opti's animated eyes */}
          <div className="flex items-center gap-1.5">
            <span
              className={`block h-2.5 w-1.5 rounded-full ${moodColor} ${
                optiMood === 'alert' ? 'animate-pulse' : ''
              }`}
            />
            <span
              className={`block h-2.5 w-1.5 rounded-full ${moodColor} ${
                optiMood === 'alert' ? 'animate-pulse' : ''
              }`}
            />
          </div>
          {/* pointing arm */}
          <span
            className={`absolute -right-2 top-1/2 h-1 w-3 origin-left rounded-full ${moodColor} transition-transform duration-300 ${
              optiMood === 'point' ? 'rotate-12 scale-y-150' : 'rotate-0 scale-y-50 opacity-40'
            }`}
          />
        </div>
        <div className="animate-rise-in rounded-lg rounded-bl-none border border-emerald-800/70 bg-obsidian-800/95 px-3 py-2 shadow-lg backdrop-blur">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-500">
            Opti {optiMood === 'alert' ? '· threat flagged' : '· analyzing'}
          </p>
          <p className="mt-0.5 text-xs leading-snug text-gray-200">
            {activeRemark?.text ?? 'Scanning proof-of-work telemetry…'}
          </p>
        </div>
      </div>
    </div>
  );
}
