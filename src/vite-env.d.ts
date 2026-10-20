/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIRECRAWL_API_KEY?: string;
  readonly VITE_LLM_PROVIDER?: string;
  readonly VITE_LLM_API_KEY?: string;
  readonly VITE_LLM_MODEL?: string;
  readonly VITE_JEV_ENDPOINT?: string;
  readonly VITE_JEV_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
