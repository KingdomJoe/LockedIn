import type { CompetencyAxis } from '@/types/optimus';

export type EngineMode = 'judge' | 'live';

export type CustomTargetKind = 'role' | 'hackathon' | 'portfolio' | 'grant';

export interface EngineConfig {
  llmModel: string;
}

export interface CustomTargetAnalysis {
  id: string;
  url: string;
  title: string;
  org: string;
  kind: CustomTargetKind;
  source: 'firecrawl' | 'cached';
  latencyMs: number;
  pAccept: number;
  pShortlist: number;
  confidence: number;
  deltaVsBaseline: number;
  matchedSkills: string[];
  missingSignals: string[];
  pitch: string;
  excerpt: string;
  notice?: string;
  createdAt: number;
}

export interface JevRequestPayload {
  schema: 'lockedin.jev.system1.v3';
  mode: 'parallel_rlcd';
  request_id: string;
  target: { url: string; kind: string; title: string } | null;
  subject: {
    login: string;
    classification: string;
    repo_count: number;
    total_stars: number;
    fresh_repos_90d: number;
    languages: { name: string; share: number }[];
    competency: Record<string, number>;
    signals: { source: string; weight: number }[];
    artifacts: { name: string; stars: number; language: string | null }[];
  };
  heads: { head: string; score: number; confidence: number }[];
}

export interface JevResponsePayload {
  request_id: string;
  model: 'jev-system1-rlcd';
  latency_ms: number;
  schema_error_rate: number;
  classification: string;
  probabilities: {
    p_shortlist: number;
    p_offer: number;
    calibration: number;
  };
  rlcd: { axis: CompetencyAxis; probability: number; confidence: number; verdict: string }[];
}

export interface AgentSpec {
  id: string;
  fileName: string;
  title: string;
  role: string;
  content: string;
}
