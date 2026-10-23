import type { EngineConfig, EngineMode } from '@/types/engine';

const STORAGE_KEY = 'lockedin.engine.v1';

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  llmModel: 'deepseek-ai/DeepSeek-V4.1-Flash',
};

export function loadEngineConfig(): EngineConfig {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_ENGINE_CONFIG };
    const parsed = JSON.parse(raw) as Partial<EngineConfig>;
    return {
      ...DEFAULT_ENGINE_CONFIG,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_ENGINE_CONFIG };
  }
}

export function saveEngineConfig(config: EngineConfig) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    return;
  }
}

export function clearStoredEngineConfig() {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
}

export function getEngineMode(): EngineMode {
  return 'live';
}
