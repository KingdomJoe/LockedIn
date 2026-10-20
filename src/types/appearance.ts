export type ThemeDensity = 'compact' | 'comfortable';

export type AccentColor = 'green' | 'cyan' | 'amber';

export interface AppearanceSettings {
  density: ThemeDensity;
  accent: AccentColor;
}
