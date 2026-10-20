import type { AccentColor, AppearanceSettings, ThemeDensity } from '@/types/appearance';

const STORAGE_KEY = 'lockedin.appearance.v1';

export interface AccentDefinition {
  id: AccentColor;
  label: string;
  hex: string;
  bright: string;
  ink: string;
  channels: string;
  brightChannels: string;
  inkChannels: string;
}

export const ACCENTS: Record<AccentColor, AccentDefinition> = {
  green: {
    id: 'green',
    label: 'Neon Green',
    hex: '#12cc0f',
    bright: '#43e935',
    ink: '#002200',
    channels: '18 204 15',
    brightChannels: '67 233 53',
    inkChannels: '0 34 0',
  },
  cyan: {
    id: 'cyan',
    label: 'Electric Cyan',
    hex: '#00D2D3',
    bright: '#00E5E6',
    ink: '#002B2B',
    channels: '0 210 211',
    brightChannels: '0 229 230',
    inkChannels: '0 43 43',
  },
  amber: {
    id: 'amber',
    label: 'Warm Amber',
    hex: '#F59E0B',
    bright: '#FBBF24',
    ink: '#2B1204',
    channels: '245 158 11',
    brightChannels: '251 191 36',
    inkChannels: '43 18 4',
  },
};

export const DENSITIES: { id: ThemeDensity; label: string; description: string }[] = [
  {
    id: 'compact',
    label: 'Compact Benchmark',
    description: 'Tighter rows, denser telemetry, more signal above the fold.',
  },
  {
    id: 'comfortable',
    label: 'Comfortable',
    description: 'Fewer secondary details, softer spacing, and a calmer workspace.',
  },
];

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  density: 'compact',
  accent: 'green',
};

export function loadAppearance(): AppearanceSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_APPEARANCE };
    const parsed = JSON.parse(raw) as Partial<AppearanceSettings>;
    return {
      density: parsed.density === 'comfortable' ? 'comfortable' : 'compact',
      accent:
        parsed.accent === 'cyan' || parsed.accent === 'amber' || parsed.accent === 'green'
          ? parsed.accent
          : 'green',
    };
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}

export function saveAppearance(settings: AppearanceSettings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    return;
  }
}

export function applyAppearance(settings: AppearanceSettings) {
  if (typeof document === 'undefined') return;
  const accent = ACCENTS[settings.accent];
  const root = document.documentElement;
  root.dataset.density = settings.density;
  root.dataset.accent = settings.accent;
  root.style.setProperty('--primary', accent.hex);
  root.style.setProperty('--primary-bright', accent.bright);
  root.style.setProperty('--primary-ink', accent.ink);
  root.style.setProperty('--primary-rgb', accent.channels);
  root.style.setProperty('--primary-bright-rgb', accent.brightChannels);
  root.style.setProperty('--primary-ink-rgb', accent.inkChannels);
}
