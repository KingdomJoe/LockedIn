// Optimus Agentic Engine — core type contracts

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  updated_at: string;
  pushed_at: string;
  topics: string[];
  fork: boolean;
  size: number;
}

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  name: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  location: string | null;
  company: string | null;
}

export type LinkedSignalSource = 'github' | 'linkedin' | 'x' | 'certificate' | 'portfolio';

export interface LinkedSignal {
  source: LinkedSignalSource;
  label: string;
  detail: string;
  weight: number; // 0–1 confidence contribution
}

export type CompetencyAxis =
  | 'Systems'
  | 'Frontend'
  | 'Distributed'
  | 'OSS Impact'
  | 'Velocity'
  | 'Collaboration';

export type CompetencyMap = Record<CompetencyAxis, number>; // 0–100

export interface JevAxisDecision {
  axis: CompetencyAxis;
  score: number;
  confidence: number; // 0–100
  verdict: string;
}

/** System 1 — TypeSafe AI Jev parallel calibrated classification/regression */
export interface JevDecision {
  axisDecisions: JevAxisDecision[];
  pShortlist: number; // 0–100
  pOffer: number; // 0–100
  calibration: number; // 0–100 confidence
  schemaErrorRate: number; // percent
  latencyMs: number;
  classification: string;
  buzzwordsIncinerated: number;
}

export interface ForgeRecommendation {
  id: string;
  kind: 'certificate' | 'oss_issue';
  title: string;
  provider: string;
  url: string;
  axis: CompetencyAxis;
  deltaP: number; // percentage-point gain on P(Offer) when active
  effort: string;
}

export interface JobMatch {
  id: string;
  role: string;
  org: string;
  kind: 'role' | 'grant';
  location: string;
  compensation: string;
  tags: string[];
  pAccept: number; // 0–100, Jev calibrated
  pShortlist: number;
  confidence: number; // ± band
  eligibility: { label: string; met: boolean }[];
  pitch: string;
}

export interface HackathonMatch {
  id: string;
  name: string;
  organizer: string;
  prize: string;
  date: string;
  url: string;
  fitScore: number; // 0–100
  fitReason: string;
  discoveredBy: 'firecrawl';
}

export interface DeveloperNewsStory {
  id: string;
  headline: string;
  source: string;
  signal: string;
}

export interface NewsletterEdition {
  edition: string;
  headline: string;
  lede: string;
  sections: { title: string; body: string }[];
}

export interface FirecrawlScout {
  hackathons: HackathonMatch[];
  news: DeveloperNewsStory[];
  lastScanMs: number;
  urlsInspected: number;
}

/** Counterfactual Forge state */
export interface CounterfactualState {
  activeIds: string[];
  boostedPOffer: number;
  totalDelta: number;
}

/** Multi-Source Proof-of-Work Profile — the final merged dossier */
export interface ProofOfWorkProfile {
  user: GitHubUser;
  repos: GitHubRepo[];
  signals: LinkedSignal[];
  languages: { name: string; share: number; count: number }[];
  totalStars: number;
  totalForks: number;
  freshRepos: number; // pushed in last 90 days
  competency: CompetencyMap;
  jev: JevDecision;
  buzzwordAudit: { phrase: string; count: number }[];
  gaps: CompetencyAxis[];
  strengths: CompetencyAxis[];
  forge: ForgeRecommendation[];
  jobs: JobMatch[];
  scout: FirecrawlScout;
  newsletter: NewsletterEdition;
  briefing: string[];
  generatedAt: number;
}

export interface OptiRemark {
  id: number;
  text: string;
  tone: 'strength' | 'gap' | 'neutral';
  target?: { language?: string; repo?: string };
}

export interface SoundCue {
  key: string;
  label: string;
}
