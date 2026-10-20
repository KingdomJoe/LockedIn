import type { EngineConfig, EngineMode, LlmProvider } from '@/types/engine';

export interface LlmProviderInfo {
  label: string;
  short: string;
  endpoint: string;
  model: string;
  kind: 'openai' | 'gemini';
  blurb: string;
}

export const LLM_PROVIDERS: Record<LlmProvider, LlmProviderInfo> = {
  zai: {
    label: 'Z.ai',
    short: 'Z.AI',
    endpoint: 'https://api.z.ai/api/paas/v4/chat/completions',
    model: 'glm-5.3-flash',
    kind: 'openai',
    blurb: 'GLM 5.3 Flash · System-2 default',
  },
  openrouter: {
    label: 'OpenRouter',
    short: 'OPENROUTER',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'openai/gpt-4o-mini',
    kind: 'openai',
    blurb: 'Multi-model router · streaming',
  },
  gemini: {
    label: 'Gemini',
    short: 'GEMINI',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    model: 'gemini-2.0-flash',
    kind: 'gemini',
    blurb: 'Google AI Studio · native SSE',
  },
  openai: {
    label: 'OpenAI',
    short: 'OPENAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    kind: 'openai',
    blurb: 'GPT-4o mini · streaming',
  },
};

const STORAGE_KEY = 'lockedin.engine.v1';

function envProvider(): LlmProvider {
  const raw = import.meta.env.VITE_LLM_PROVIDER;
  if (raw === 'zai' || raw === 'openrouter' || raw === 'gemini' || raw === 'openai') return raw;
  return 'zai';
}

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  firecrawlKey: import.meta.env.VITE_FIRECRAWL_API_KEY ?? '',
  llmProvider: envProvider(),
  llmKey: import.meta.env.VITE_LLM_API_KEY ?? '',
  llmModel: import.meta.env.VITE_LLM_MODEL ?? LLM_PROVIDERS[envProvider()].model,
  jevEndpoint: import.meta.env.VITE_JEV_ENDPOINT ?? '',
  jevKey: import.meta.env.VITE_JEV_API_KEY ?? '',
};

export function loadEngineConfig(): EngineConfig {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_ENGINE_CONFIG };
    const parsed = JSON.parse(raw) as Partial<EngineConfig>;
    const provider =
      parsed.llmProvider && parsed.llmProvider in LLM_PROVIDERS
        ? parsed.llmProvider
        : DEFAULT_ENGINE_CONFIG.llmProvider;
    return {
      ...DEFAULT_ENGINE_CONFIG,
      ...parsed,
      llmProvider: provider,
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

export function getEngineMode(config: EngineConfig): EngineMode {
  return config.firecrawlKey.trim() || config.llmKey.trim() || config.jevEndpoint.trim()
    ? 'live'
    : 'judge';
}

export function providerInfo(provider: LlmProvider): LlmProviderInfo {
  return LLM_PROVIDERS[provider];
}
