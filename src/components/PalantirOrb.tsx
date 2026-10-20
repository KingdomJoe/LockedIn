import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CompetencyAxis, GitHubRepo } from '@/types/optimus';
import { langColor } from '@/services/langColors';
import { soundEngine } from '@/utils/soundEngine';

interface PalantirOrbProps {
  avatarUrl: string;
  username: string;
  repos: GitHubRepo[];
  languages: { name: string; share: number }[];
  boostedPOffer: number;
  auraLevel: number;
  strengths: CompetencyAxis[];
  gaps: CompetencyAxis[];
  scanning?: boolean;
  scanTarget?: string | null;
  onSpin?: () => void;
  compact?: boolean;
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface Satellite {
  id: string;
  kind: 'language' | 'star' | 'opti';
  label: string;
  detail: string;
  color: string;
  theta: number;
  phi: number;
  speed: number;
  pinned?: { x: number; y: number };
}

const TAU = Math.PI * 2;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function rotate3D(point: Vec3, tilt: number, spin: number): Vec3 {
  const cosY = Math.cos(spin);
  const sinY = Math.sin(spin);
  const x = point.x * cosY + point.z * sinY;
  const z = -point.x * sinY + point.z * cosY;
  const cosX = Math.cos(tilt);
  const sinX = Math.sin(tilt);
  return { x, y: point.y * cosX - z * sinX, z: point.y * sinX + z * cosX };
}

function rgba(hex: string, alpha: number) {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map((char) => char + char).join('') : value;
  const parsed = Number.parseInt(full, 16);
  return `rgba(${(parsed >> 16) & 255}, ${(parsed >> 8) & 255}, ${parsed & 255}, ${alpha})`;
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function starPath(ctx: CanvasRenderingContext2D, x: number, y: number, outer: number, inner: number) {
  ctx.beginPath();
  for (let index = 0; index < 10; index += 1) {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (index === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function fitText(ctx: CanvasRenderingContext2D, value: string, maxWidth: number) {
  if (ctx.measureText(value).width <= maxWidth) return value;
  let text = value;
  while (text.length > 2 && ctx.measureText(`${text}…`).width > maxWidth) {
    text = text.slice(0, -1);
  }
  return `${text}…`;
}

function formatCompact(value: number) {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function strokeDepthPath(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number; z: number }[],
  front: string,
  back: string,
  frontWidth: number,
  backWidth: number
) {
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let index = 1; index < points.length; index += 1) {
    const current = points[index];
    const previous = points[index - 1];
    if ((current.z + previous.z) / 2 >= 0) {
      ctx.moveTo(previous.x, previous.y);
      ctx.lineTo(current.x, current.y);
    }
  }
  ctx.strokeStyle = front;
  ctx.lineWidth = frontWidth;
  ctx.stroke();

  ctx.beginPath();
  for (let index = 1; index < points.length; index += 1) {
    const current = points[index];
    const previous = points[index - 1];
    if ((current.z + previous.z) / 2 < 0) {
      ctx.moveTo(previous.x, previous.y);
      ctx.lineTo(current.x, current.y);
    }
  }
  ctx.strokeStyle = back;
  ctx.lineWidth = backWidth;
  ctx.stroke();
}

export default function PalantirOrb({
  avatarUrl,
  username,
  repos,
  languages,
  boostedPOffer,
  auraLevel,
  strengths,
  gaps,
  scanning = false,
  scanTarget,
  onSpin,
  compact = false,
}: PalantirOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const avatarImgRef = useRef<HTMLImageElement | null>(null);
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 });
  const spinRef = useRef(0.35);
  const tiltRef = useRef(-0.2);
  const dragRef = useRef({ active: false, lastX: 0, lastY: 0, vx: 0 });
  const hoverRef = useRef({ x: 0, y: 0 });
  const hoveredRef = useRef(false);
  const scanningRef = useRef(scanning);
  const auraRef = useRef(auraLevel);
  const boostedRef = useRef(boostedPOffer);
  const reducedMotionRef = useRef(false);
  const lastFrameRef = useRef(0);
  const frameRef = useRef(0);
  const [hovered, setHovered] = useState(false);

  scanningRef.current = scanning;
  auraRef.current = auraLevel;
  boostedRef.current = boostedPOffer;

  const totalStars = useMemo(
    () => repos.reduce((total, repo) => total + repo.stargazers_count, 0),
    [repos]
  );

  const satellites = useMemo<Satellite[]>(() => {
    const languagePositions = [
      { x: -0.97, y: 0.1 },
      { x: -0.85, y: -0.52 },
      { x: 0.58, y: 0.8 },
    ];
    const languageSatellites = languages.slice(0, 3).map((language, index) => ({
      id: `language-${language.name}`,
      kind: 'language' as const,
      label: language.name,
      detail: `${Math.round(language.share)}%`,
      color: langColor(language.name),
      theta: 0.25 + index * 2.15,
      phi: index === 1 ? 0.55 : index === 2 ? -0.62 : 0.05,
      speed: 0.028 + index * 0.006,
      pinned: languagePositions[index] ?? languagePositions[0],
    }));

    return [
      ...languageSatellites,
      {
        id: 'stars',
        kind: 'star',
        label: 'STARS',
        detail: formatCompact(totalStars),
        color: '#F59E0B',
        theta: 1.4,
        phi: -1.08,
        speed: 0.022,
        pinned: { x: -0.14, y: -0.85 },
      },
      {
        id: 'opti',
        kind: 'opti',
        label: 'OPTI',
        detail: 'CORE',
        color: '#00D2D3',
        theta: 3.9,
        phi: 0.8,
        speed: 0.034,
        pinned: { x: 0.72, y: -0.24 },
      },
    ];
  }, [languages, totalStars]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      sizeRef.current = { width: rect.width, height: rect.height, dpr };
      const nextWidth = Math.round(rect.width * dpr);
      const nextHeight = Math.round(rect.height * dpr);
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
      }
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    window.addEventListener('resize', resize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, []);

  useEffect(() => {
    const image = new Image();
    image.decoding = 'async';
    image.src = avatarUrl;
    avatarImgRef.current = image;
  }, [avatarUrl]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      reducedMotionRef.current = media.matches;
    };
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const draw = useCallback(
    (timestamp: number) => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');
      if (!canvas || !context) return;

      const { width, height, dpr } = sizeRef.current;
      if (!width || !height) {
        frameRef.current = requestAnimationFrame(draw);
        return;
      }

      const last = lastFrameRef.current || timestamp;
      const dt = Math.min((timestamp - last) / 1000, 0.05);
      lastFrameRef.current = timestamp;

      if (!dragRef.current.active) {
        const speed = reducedMotionRef.current
          ? 0
          : scanningRef.current
            ? 0.42
            : hoveredRef.current
              ? 0.15
              : 0.075;
        spinRef.current += speed * dt + dragRef.current.vx;
        dragRef.current.vx *= Math.pow(0.9, dt * 60);
        const targetTilt = -0.2 + hoverRef.current.y * 0.12;
        tiltRef.current += (targetTilt - tiltRef.current) * Math.min(1, dt * 5);
      }

      const ctx = context;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2 - height * 0.015;
      const R = Math.min(width, height) * 0.252;
      const outerR = Math.min(width, height) * 0.445;
      const edgeInset = Math.max(36, outerR * 0.39);
      const tilt = tiltRef.current;
      const spin = spinRef.current;
      const elapsed = timestamp / 1000;
      const aura = auraRef.current / 100;

      const auraGradient = ctx.createRadialGradient(cx, cy, R * 0.45, cx, cy, R * 2.7);
      auraGradient.addColorStop(0, `rgba(18, 204, 15, ${0.08 + aura * 0.12})`);
      auraGradient.addColorStop(0.5, `rgba(0, 210, 211, ${0.03 + aura * 0.05})`);
      auraGradient.addColorStop(1, 'rgba(9, 8, 8, 0)');
      ctx.fillStyle = auraGradient;
      ctx.fillRect(0, 0, width, height);

      const projected = satellites.map((satellite) => {
        if (satellite.pinned) {
          const bob = Math.sin(elapsed * 0.85 + (satellite.kind === 'star' ? 0 : 1.8)) * 1.6;
          return {
            satellite,
            x: cx + satellite.pinned.x * R * 1.58,
            y: cy + satellite.pinned.y * R * 1.4 + bob,
            z: 0.9,
            depth: 0.95,
          };
        }
        const theta = satellite.theta + elapsed * satellite.speed;
        const point = rotate3D(
          {
            x: Math.cos(satellite.phi) * Math.cos(theta),
            y: Math.sin(satellite.phi),
            z: Math.cos(satellite.phi) * Math.sin(theta),
          },
          tilt,
          spin
        );
        return {
          satellite,
          x: cx + point.x * R * 1.58,
          y: cy + point.y * R * 1.4,
          z: point.z,
          depth: (point.z + 1) / 2,
        };
      });

      const drawConnector = (node: (typeof projected)[number], front: boolean) => {
        const alpha = front ? 0.1 + node.depth * 0.22 : 0.035;
        ctx.beginPath();
        ctx.setLineDash([2, 5]);
        ctx.moveTo(cx + (node.x - cx) * 0.32, cy + (node.y - cy) * 0.32);
        ctx.lineTo(node.x, node.y);
        ctx.strokeStyle = rgba(node.satellite.color, alpha);
        ctx.lineWidth = 0.9;
        ctx.stroke();
        ctx.setLineDash([]);
      };

      const drawLanguageNode = (node: (typeof projected)[number], alpha: number) => {
        const { satellite } = node;
        ctx.font = '700 8px "JetBrains Mono", monospace';
        const text = fitText(ctx, `${satellite.label.toUpperCase()} ${satellite.detail}`, 68);
        const widthOfNode = Math.max(48, ctx.measureText(text).width + 21);
        const heightOfNode = 18;
        const x = clamp(node.x - widthOfNode / 2, edgeInset, width - widthOfNode - edgeInset);
        const y = node.y - heightOfNode / 2;

        roundRectPath(ctx, x, y, widthOfNode, heightOfNode, 9);
        ctx.fillStyle = 'rgba(12, 14, 16, 0.9)';
        ctx.fill();
        ctx.strokeStyle = rgba(satellite.color, 0.48 * alpha);
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x + 9, y + heightOfNode / 2, 2.8, 0, TAU);
        ctx.fillStyle = satellite.color;
        ctx.globalAlpha = alpha;
        ctx.fill();

        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = `rgba(244, 245, 248, ${0.9 * alpha})`;
        ctx.fillText(text, x + 16, y + heightOfNode / 2 + 0.5);
        ctx.globalAlpha = 1;
      };

      const drawStarNode = (node: (typeof projected)[number], alpha: number) => {
        const { satellite } = node;
        ctx.font = '700 8px "JetBrains Mono", monospace';
        const text = `${satellite.detail} STARS`;
        const widthOfNode = Math.max(62, ctx.measureText(text).width + 29);
        const x = clamp(node.x - widthOfNode / 2, edgeInset, width - widthOfNode - edgeInset);
        const y = node.y - 10;

        roundRectPath(ctx, x, y, widthOfNode, 20, 10);
        ctx.fillStyle = 'rgba(17, 19, 23, 0.94)';
        ctx.fill();
        ctx.strokeStyle = rgba(satellite.color, 0.55 * alpha);
        ctx.lineWidth = 1;
        ctx.stroke();

        starPath(ctx, x + 10, y + 10, 4.5, 2.1);
        ctx.fillStyle = satellite.color;
        ctx.globalAlpha = alpha;
        ctx.fill();

        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = `rgba(244, 245, 248, ${0.9 * alpha})`;
        ctx.fillText(text, x + 18, y + 10.5);
        ctx.globalAlpha = 1;
      };

      const drawOptiNode = (node: (typeof projected)[number], alpha: number) => {
        const { satellite } = node;
        const x = clamp(node.x - 25, edgeInset, width - 50 - edgeInset);
        const y = node.y - 10;

        roundRectPath(ctx, x, y, 50, 20, 5);
        ctx.fillStyle = 'rgba(8, 15, 16, 0.95)';
        ctx.fill();
        ctx.strokeStyle = rgba(satellite.color, 0.75 * alpha);
        ctx.lineWidth = 1.1;
        ctx.stroke();

        ctx.fillStyle = satellite.color;
        ctx.globalAlpha = alpha;
        ctx.fillRect(x + 8, y + 6, 2.5, 5);
        ctx.fillRect(x + 13, y + 6, 2.5, 5);
        ctx.globalAlpha = 1;

        ctx.font = '700 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = `rgba(0, 210, 211, ${0.95 * alpha})`;
        ctx.fillText('OPTI', x + 21, y + 10.5);
      };

      projected.filter((node) => node.z < 0).forEach((node) => {
        drawConnector(node, false);
      });

      const coreGradient = ctx.createRadialGradient(
        cx - R * 0.32,
        cy - R * 0.36,
        R * 0.08,
        cx,
        cy,
        R * 1.05
      );
      coreGradient.addColorStop(0, 'rgba(24, 224, 20, 0.3)');
      coreGradient.addColorStop(0.48, 'rgba(10, 48, 27, 0.82)');
      coreGradient.addColorStop(1, 'rgba(7, 12, 11, 0.98)');
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, TAU);
      ctx.fillStyle = coreGradient;
      ctx.fill();
      ctx.strokeStyle = rgba('#12cc0f', 0.62 + aura * 0.24);
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, R + 3, 0, TAU);
      ctx.strokeStyle = 'rgba(18, 204, 15, 0.1)';
      ctx.lineWidth = 5;
      ctx.stroke();

      const latitudes = 6;
      for (let index = 1; index <= latitudes; index += 1) {
        const latitude = -Math.PI / 2 + (index / (latitudes + 1)) * Math.PI;
        const ringRadius = Math.cos(latitude);
        const ringY = Math.sin(latitude);
        const points = Array.from({ length: 65 }, (_, pointIndex) => {
          const theta = (pointIndex / 64) * TAU;
          const point = rotate3D(
            { x: ringRadius * Math.cos(theta), y: ringY, z: ringRadius * Math.sin(theta) },
            tilt,
            spin
          );
          return { x: cx + point.x * R, y: cy + point.y * R, z: point.z };
        });
        strokeDepthPath(ctx, points, 'rgba(18, 204, 15, 0.26)', 'rgba(18, 204, 15, 0.085)', 0.8, 0.6);
      }

      const meridians = 12;
      for (let index = 0; index < meridians; index += 1) {
        const longitude = (index / meridians) * Math.PI;
        const points = Array.from({ length: 33 }, (_, pointIndex) => {
          const latitude = -Math.PI / 2 + (pointIndex / 32) * Math.PI;
          const point = rotate3D(
            {
              x: Math.cos(latitude) * Math.cos(longitude),
              y: Math.sin(latitude),
              z: Math.cos(latitude) * Math.sin(longitude),
            },
            tilt,
            spin
          );
          return { x: cx + point.x * R, y: cy + point.y * R, z: point.z };
        });
        strokeDepthPath(ctx, points, 'rgba(0, 210, 211, 0.22)', 'rgba(0, 210, 211, 0.07)', 0.72, 0.55);
      }

      const sphereDots = 68;
      for (let index = 0; index < sphereDots; index += 1) {
        const y = 1 - (index / (sphereDots - 1)) * 2;
        const radius = Math.sqrt(Math.max(0, 1 - y * y));
        const theta = GOLDEN_ANGLE * index;
        const point = rotate3D(
          { x: radius * Math.cos(theta), y, z: radius * Math.sin(theta) },
          tilt,
          spin
        );
        if (point.z < -0.1) continue;
        const depth = (point.z + 1) / 2;
        ctx.beginPath();
        ctx.arc(cx + point.x * R, cy + point.y * R, 0.65 + depth * 0.9, 0, TAU);
        ctx.fillStyle = index % 4 === 0 ? rgba('#00D2D3', 0.2 + depth * 0.4) : rgba('#12cc0f', 0.14 + depth * 0.38);
        ctx.fill();
      }

      const avatar = avatarImgRef.current;
      const avatarRadius = R * 0.41;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, avatarRadius, 0, TAU);
      ctx.clip();
      ctx.fillStyle = 'rgba(9, 20, 14, 0.96)';
      ctx.fillRect(cx - avatarRadius, cy - avatarRadius, avatarRadius * 2, avatarRadius * 2);
      if (avatar?.complete && avatar.naturalWidth > 0) {
        ctx.drawImage(avatar, cx - avatarRadius, cy - avatarRadius, avatarRadius * 2, avatarRadius * 2);
      } else {
        ctx.fillStyle = 'rgba(18, 204, 15, 0.9)';
        ctx.font = `700 ${Math.round(R * 0.28)}px "Space Grotesk", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(username.slice(0, 2).toUpperCase(), cx, cy + 1);
      }
      ctx.restore();

      ctx.beginPath();
      ctx.arc(cx, cy, avatarRadius, 0, TAU);
      ctx.strokeStyle = 'rgba(18, 204, 15, 0.9)';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, avatarRadius + 5, 0, TAU);
      ctx.strokeStyle = 'rgba(0, 210, 211, 0.2)';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      const offerProgress = clamp(boostedRef.current, 0, 100) / 100;
      const offerRadius = avatarRadius + 10;
      ctx.beginPath();
      ctx.arc(cx, cy, offerRadius, 0, TAU);
      ctx.strokeStyle = 'rgba(46, 52, 64, 0.75)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, offerRadius, -Math.PI / 2, -Math.PI / 2 + TAU * offerProgress);
      ctx.strokeStyle = 'rgba(18, 204, 15, 0.92)';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      const offerAngle = -Math.PI / 2 + TAU * offerProgress;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(offerAngle) * offerRadius, cy + Math.sin(offerAngle) * offerRadius, 1.7, 0, TAU);
      ctx.fillStyle = '#00D2D3';
      ctx.fill();

      const orbitRadius = R * 1.25;
      const rings: { axis: 'xy' | 'xz' | 'yz'; color: string }[] = [
        { axis: 'xy', color: '#12cc0f' },
        { axis: 'xz', color: '#00D2D3' },
        { axis: 'yz', color: '#F59E0B' },
      ];

      rings.forEach((ring, ringIndex) => {
        const points = Array.from({ length: 97 }, (_, index) => {
          const angle = (index / 96) * TAU;
          const base: Vec3 =
            ring.axis === 'xy'
              ? { x: Math.cos(angle), y: Math.sin(angle), z: 0 }
              : ring.axis === 'xz'
                ? { x: Math.cos(angle), y: 0, z: Math.sin(angle) }
                : { x: 0, y: Math.cos(angle), z: Math.sin(angle) };
          const point = rotate3D(base, tilt, spin);
          return { x: cx + point.x * orbitRadius, y: cy + point.y * orbitRadius, z: point.z };
        });

        strokeDepthPath(ctx, points, rgba(ring.color, 0.78), rgba(ring.color, 0.18), 1.25, 0.8);

        for (let bead = 0; bead < 3; bead += 1) {
          const angle = elapsed * (0.16 + ringIndex * 0.035) + bead * (TAU / 3) + ringIndex;
          const base: Vec3 =
            ring.axis === 'xy'
              ? { x: Math.cos(angle), y: Math.sin(angle), z: 0 }
              : ring.axis === 'xz'
                ? { x: Math.cos(angle), y: 0, z: Math.sin(angle) }
                : { x: 0, y: Math.cos(angle), z: Math.sin(angle) };
          const point = rotate3D(base, tilt, spin);
          if (point.z < 0) continue;
          const beadX = cx + point.x * orbitRadius;
          const beadY = cy + point.y * orbitRadius;
          ctx.beginPath();
          ctx.arc(beadX, beadY, 2.2, 0, TAU);
          ctx.fillStyle = ring.color;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(beadX, beadY, 5.2, 0, TAU);
          ctx.strokeStyle = rgba(ring.color, 0.22);
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });

      if (scanningRef.current) {
        const sweep = (elapsed * 0.46) % 1;
        const scanY = cy - R + sweep * R * 2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, TAU);
        ctx.clip();
        const scanGradient = ctx.createLinearGradient(0, scanY - 18, 0, scanY + 18);
        scanGradient.addColorStop(0, 'rgba(0, 210, 211, 0)');
        scanGradient.addColorStop(0.5, 'rgba(0, 210, 211, 0.22)');
        scanGradient.addColorStop(1, 'rgba(0, 210, 211, 0)');
        ctx.fillStyle = scanGradient;
        ctx.fillRect(cx - R, scanY - 18, R * 2, 36);
        ctx.beginPath();
        ctx.moveTo(cx - R, scanY);
        ctx.lineTo(cx + R, scanY);
        ctx.strokeStyle = 'rgba(0, 210, 211, 0.9)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        const scanAngle = elapsed * 1.35;
        ctx.beginPath();
        ctx.arc(cx, cy, orbitRadius + 5, scanAngle, scanAngle + 0.75);
        ctx.strokeStyle = 'rgba(0, 210, 211, 0.85)';
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }

      projected
        .slice()
        .sort((a, b) => a.z - b.z)
        .forEach((node) => {
          if (node.z >= 0) drawConnector(node, true);
          const alpha = 0.46 + node.depth * 0.54;
          if (node.satellite.kind === 'language') drawLanguageNode(node, alpha);
          else if (node.satellite.kind === 'star') drawStarNode(node, alpha);
          else drawOptiNode(node, alpha);
        });

      ctx.beginPath();
      ctx.arc(cx, cy, outerR, 0, TAU);
      ctx.strokeStyle = rgba('#2E3440', 0.9);
      ctx.lineWidth = 1;
      ctx.stroke();

      if (hoveredRef.current) {
        ctx.beginPath();
        ctx.arc(cx, cy, outerR + 3, 0, TAU);
        ctx.strokeStyle = 'rgba(18, 204, 15, 0.22)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      const tickCount = 72;
      for (let index = 0; index < tickCount; index += 1) {
        const angle = (index / tickCount) * TAU;
        const major = index % 18 === 0;
        const inner = outerR * (major ? 0.91 : 0.94);
        const outer = outerR * 0.965;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
        ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
        ctx.strokeStyle = major ? '#12cc0f' : 'rgba(46, 52, 64, 0.9)';
        ctx.lineWidth = major ? 1.4 : 0.8;
        ctx.stroke();
      }

      ctx.font = '700 8px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      [0, 90, 180, 270].forEach((degree) => {
        const angle = (degree / 180) * Math.PI;
        const labelRadius = outerR * 0.845;
        const labelX = cx + Math.cos(angle) * labelRadius;
        const labelY = cy + Math.sin(angle) * labelRadius;
        ctx.fillStyle = degree === 0 ? '#12cc0f' : '#8C92A4';
        ctx.fillText(`${degree}°`, labelX, labelY + 0.5);
      });

      frameRef.current = requestAnimationFrame(draw);
    },
    [satellites, username]
  );

  useEffect(() => {
    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [draw]);

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    dragRef.current = {
      active: true,
      lastX: event.clientX,
      lastY: event.clientY,
      vx: 0,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus();
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    hoverRef.current = {
      x: ((event.clientX - rect.left) / rect.width - 0.5) * 2,
      y: ((event.clientY - rect.top) / rect.height - 0.5) * 2,
    };

    const drag = dragRef.current;
    if (!drag.active) return;
    const dx = event.clientX - drag.lastX;
    const dy = event.clientY - drag.lastY;
    spinRef.current += dx * 0.008;
    tiltRef.current = clamp(tiltRef.current + dy * 0.005, -1.05, 1.05);
    drag.vx = dx * 0.0012;
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
  };

  const finishDrag = () => {
    if (dragRef.current.active) {
      dragRef.current.active = false;
      soundEngine.playPalantirSpin();
      onSpin?.();
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    const step = 0.12;
    if (event.key === 'ArrowLeft') spinRef.current -= step;
    else if (event.key === 'ArrowRight') spinRef.current += step;
    else if (event.key === 'ArrowUp') tiltRef.current = clamp(tiltRef.current - step, -1.05, 1.05);
    else if (event.key === 'ArrowDown') tiltRef.current = clamp(tiltRef.current + step, -1.05, 1.05);
    else return;
    event.preventDefault();
  };

  const scanHost = scanTarget
    ? (() => {
        try {
          return new URL(scanTarget).hostname.replace(/^www\./i, '');
        } catch {
          return scanTarget.slice(0, 24);
        }
      })()
    : '';

  const strength = strengths[0] ?? 'Systems';
  const growth = gaps[0] ?? 'Distributed';

  return (
    <div
      className={
        compact
          ? 'relative h-full w-full'
          : 'panel relative h-full min-h-[420px] w-full overflow-hidden'
      }
    >
      <canvas
        ref={canvasRef}
        tabIndex={0}
        className="absolute inset-0 h-full w-full cursor-grab touch-none select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onPointerEnter={() => {
          hoveredRef.current = true;
          setHovered(true);
        }}
        onPointerLeave={() => {
          hoveredRef.current = false;
          setHovered(false);
          hoverRef.current = { x: 0, y: 0 };
          finishDrag();
        }}
        onKeyDown={onKeyDown}
        aria-label={`Interactive 3D Palantir orbital index for ${username}. Drag or use arrow keys to rotate.`}
      >
        3D orbital index for {username}
      </canvas>

      <div className="pointer-events-none absolute bottom-[32px] left-1 z-20 w-[112px] rounded border-1.5 border-primary/35 bg-canvas/95 p-1.5 shadow-hard">
        <span className="absolute -right-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 border-r border-t border-primary/35 bg-canvas" />
        <div className="flex items-center gap-1">
          <span className={`h-1.5 w-1.5 rounded-full ${hovered ? 'animate-pulse bg-primary' : 'bg-primary/70'}`} />
          <p className="font-mono text-[6.5px] font-bold uppercase tracking-[0.08em] text-primary">
            Opti //
          </p>
        </div>
        <div className="mt-1 space-y-1">
          <div>
            <p className="font-mono text-[5.5px] uppercase tracking-[0.08em] text-muted">#1 strength</p>
            <p className="mt-px truncate font-mono text-[8px] font-bold uppercase leading-none tracking-[0.02em] text-content">
              {strength}
            </p>
          </div>
          <div>
            <p className="font-mono text-[5.5px] uppercase tracking-[0.08em] text-muted">#1 growth</p>
            <p className="mt-px truncate font-mono text-[8px] font-bold uppercase leading-none tracking-[0.02em] text-accent-amber">
              {growth}
            </p>
          </div>
        </div>
      </div>

      {scanning && (
        <div className="pointer-events-none absolute right-2 top-2 z-20 max-w-[104px] truncate rounded border border-accent-cyan/30 bg-canvas/95 px-1.5 py-0.5 font-mono text-[6.5px] uppercase tracking-[0.06em] text-accent-cyan">
          Scan // {scanHost}
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-1.5 z-20 flex justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-canvas/95 px-2 py-1 font-mono text-[6.5px] font-bold uppercase tracking-[0.08em] text-primary">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          Optimus Core // Active
        </span>
      </div>
    </div>
  );
}
