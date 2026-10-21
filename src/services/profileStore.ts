import { supabase } from '@/services/supabaseClient';
import type {
  ProofOfWorkProfile,
  GitHubRepo,
  JobMatch,
  ForgeRecommendation,
  JevDecision,
} from '@/types/optimus';
import type { CustomTargetAnalysis } from '@/types/engine';
import type { EngineConfig } from '@/types/engine';

// ---------------------------------------------------------------------------
// Profile persistence — upsert a full proof-of-work profile + children
// ---------------------------------------------------------------------------

type ProfileRow = {
  id?: string;
  login: string;
  github_id: number | null;
  avatar_url: string | null;
  html_url: string | null;
  name: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
  location: string | null;
  company: string | null;
  total_stars: number;
  total_forks: number;
  fresh_repos: number;
  languages: unknown;
  signals: unknown;
  competency: unknown;
  buzzword_audit: unknown;
  gaps: unknown;
  strengths: unknown;
  newsletter: unknown;
  briefing: unknown;
  classification: string;
  generated_at: number;
};

type RepoRow = {
  profile_id: string;
  github_repo_id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  size: number;
  fork: boolean;
  topics: unknown;
  pushed_at: string;
  updated_at: string;
};

type JevRow = {
  profile_id: string;
  p_shortlist: number;
  p_offer: number;
  calibration: number;
  schema_error_rate: number;
  latency_ms: number;
  classification: string;
  buzzwords_incinerated: number;
  axis_decisions: unknown;
};

type JobRow = {
  profile_id: string;
  role: string;
  org: string;
  kind: string;
  location: string;
  compensation: string;
  tags: unknown;
  p_accept: number;
  p_shortlist: number;
  confidence: number;
  eligibility: unknown;
  pitch: string;
};

type ForgeRow = {
  profile_id: string;
  rec_kind: string;
  title: string;
  provider: string;
  url: string;
  axis: string;
  delta_p: number;
  effort: string;
};

type HackathonRow = {
  profile_id: string;
  name: string;
  organizer: string;
  prize: string;
  date: string;
  url: string;
  fit_score: number;
  fit_reason: string;
  discovered_by: string;
};

type NewsRow = {
  profile_id: string;
  headline: string;
  source: string;
  signal: string;
};

function toRepoRow(profileId: string, repo: GitHubRepo): RepoRow {
  return {
    profile_id: profileId,
    github_repo_id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    description: repo.description,
    html_url: repo.html_url,
    language: repo.language,
    stargazers_count: repo.stargazers_count,
    forks_count: repo.forks_count,
    open_issues_count: repo.open_issues_count,
    size: repo.size,
    fork: repo.fork,
    topics: repo.topics,
    pushed_at: repo.pushed_at,
    updated_at: repo.updated_at,
  };
}

function toJevRow(profileId: string, jev: JevDecision): JevRow {
  return {
    profile_id: profileId,
    p_shortlist: jev.pShortlist,
    p_offer: jev.pOffer,
    calibration: jev.calibration,
    schema_error_rate: jev.schemaErrorRate,
    latency_ms: jev.latencyMs,
    classification: jev.classification,
    buzzwords_incinerated: jev.buzzwordsIncinerated,
    axis_decisions: jev.axisDecisions,
  };
}

function toJobRow(profileId: string, job: JobMatch): JobRow {
  return {
    profile_id: profileId,
    role: job.role,
    org: job.org,
    kind: job.kind,
    location: job.location,
    compensation: job.compensation,
    tags: job.tags,
    p_accept: job.pAccept,
    p_shortlist: job.pShortlist,
    confidence: job.confidence,
    eligibility: job.eligibility,
    pitch: job.pitch,
  };
}

function toForgeRow(profileId: string, rec: ForgeRecommendation): ForgeRow {
  return {
    profile_id: profileId,
    rec_kind: rec.kind,
    title: rec.title,
    provider: rec.provider,
    url: rec.url,
    axis: rec.axis,
    delta_p: rec.deltaP,
    effort: rec.effort,
  };
}

function toHackathonRow(profileId: string, h: {
  name: string;
  organizer: string;
  prize: string;
  date: string;
  url: string;
  fitScore: number;
  fitReason: string;
  discoveredBy: string;
}): HackathonRow {
  return {
    profile_id: profileId,
    name: h.name,
    organizer: h.organizer,
    prize: h.prize,
    date: h.date,
    url: h.url,
    fit_score: h.fitScore,
    fit_reason: h.fitReason,
    discovered_by: h.discoveredBy,
  };
}

function toNewsRow(profileId: string, n: {
  headline: string;
  source: string;
  signal: string;
}): NewsRow {
  return {
    profile_id: profileId,
    headline: n.headline,
    source: n.source,
    signal: n.signal,
  };
}

function toProfileRow(profile: ProofOfWorkProfile): ProfileRow {
  return {
    login: profile.user.login,
    github_id: profile.user.id,
    avatar_url: profile.user.avatar_url,
    html_url: profile.user.html_url,
    name: profile.user.name,
    bio: profile.user.bio,
    public_repos: profile.user.public_repos,
    followers: profile.user.followers,
    following: profile.user.following,
    location: profile.user.location,
    company: profile.user.company,
    total_stars: profile.totalStars,
    total_forks: profile.totalForks,
    fresh_repos: profile.freshRepos,
    languages: profile.languages,
    signals: profile.signals,
    competency: profile.competency,
    buzzword_audit: profile.buzzwordAudit,
    gaps: profile.gaps,
    strengths: profile.strengths,
    newsletter: profile.newsletter,
    briefing: profile.briefing,
    classification: profile.jev.classification,
    generated_at: profile.generatedAt,
  };
}

/**
 * Upserts a full proof-of-work profile and all child records to the database.
 * Repeated scans for the same GitHub login update the existing row in place
 * and replace all child rows (repos, jobs, forge, hackathons, news, jev).
 */
export async function saveProfile(profile: ProofOfWorkProfile): Promise<string | null> {
  const row = toProfileRow(profile);

  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('login', profile.user.login)
    .maybeSingle();

  let profileId: string;

  if (existing?.id) {
    const { data, error } = await supabase
      .from('profiles')
      .update(row)
      .eq('id', existing.id)
      .select('id')
      .single();
    if (error) throw error;
    profileId = data.id;

    await Promise.all([
      supabase.from('repos').delete().eq('profile_id', profileId),
      supabase.from('jev_runs').delete().eq('profile_id', profileId),
      supabase.from('job_matches').delete().eq('profile_id', profileId),
      supabase.from('forge_recs').delete().eq('profile_id', profileId),
      supabase.from('scout_hackathons').delete().eq('profile_id', profileId),
      supabase.from('dev_news').delete().eq('profile_id', profileId),
    ]);
  } else {
    const { data, error } = await supabase
      .from('profiles')
      .insert(row)
      .select('id')
      .single();
    if (error) throw error;
    profileId = data.id;
  }

  const inserts: Promise<unknown>[] = [];

  if (profile.repos.length) {
    inserts.push(
      supabase.from('repos').insert(profile.repos.map((r) => toRepoRow(profileId, r)))
    );
  }

  inserts.push(supabase.from('jev_runs').insert(toJevRow(profileId, profile.jev)));

  if (profile.jobs.length) {
    inserts.push(
      supabase.from('job_matches').insert(profile.jobs.map((j) => toJobRow(profileId, j)))
    );
  }

  if (profile.forge.length) {
    inserts.push(
      supabase.from('forge_recs').insert(profile.forge.map((f) => toForgeRow(profileId, f)))
    );
  }

  if (profile.scout.hackathons.length) {
    inserts.push(
      supabase
        .from('scout_hackathons')
        .insert(profile.scout.hackathons.map((h) => toHackathonRow(profileId, h)))
    );
  }

  if (profile.scout.news.length) {
    inserts.push(
      supabase.from('dev_news').insert(profile.scout.news.map((n) => toNewsRow(profileId, n)))
    );
  }

  await Promise.all(inserts);
  return profileId;
}

// ---------------------------------------------------------------------------
// Profile retrieval — rehydrate a saved profile by login
// ---------------------------------------------------------------------------

export async function loadProfileByLogin(login: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id, login, generated_at')
    .eq('login', login)
    .maybeSingle();
  return data?.id ?? null;
}

// ---------------------------------------------------------------------------
// Target analyses persistence
// ---------------------------------------------------------------------------

type TargetRow = {
  profile_id: string;
  url: string;
  title: string;
  org: string;
  kind: string;
  source: string;
  latency_ms: number;
  p_accept: number;
  p_shortlist: number;
  confidence: number;
  delta_vs_baseline: number;
  matched_skills: unknown;
  missing_signals: unknown;
  pitch: string;
  excerpt: string;
  notice: string | null;
};

export async function saveTargetAnalysis(
  profileId: string,
  analysis: CustomTargetAnalysis
): Promise<void> {
  const row: TargetRow = {
    profile_id: profileId,
    url: analysis.url,
    title: analysis.title,
    org: analysis.org,
    kind: analysis.kind,
    source: analysis.source,
    latency_ms: analysis.latencyMs,
    p_accept: analysis.pAccept,
    p_shortlist: analysis.pShortlist,
    confidence: analysis.confidence,
    delta_vs_baseline: analysis.deltaVsBaseline,
    matched_skills: analysis.matchedSkills,
    missing_signals: analysis.missingSignals,
    pitch: analysis.pitch,
    excerpt: analysis.excerpt,
    notice: analysis.notice ?? null,
  };
  const { error } = await supabase.from('target_analyses').insert(row);
  if (error) throw error;
}

export async function loadTargetAnalyses(profileId: string): Promise<CustomTargetAnalysis[]> {
  const { data, error } = await supabase
    .from('target_analyses')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    url: r.url,
    title: r.title,
    org: r.org,
    kind: r.kind,
    source: r.source,
    latencyMs: r.latency_ms,
    pAccept: Number(r.p_accept),
    pShortlist: Number(r.p_shortlist),
    confidence: Number(r.confidence),
    deltaVsBaseline: Number(r.delta_vs_baseline),
    matchedSkills: r.matched_skills ?? [],
    missingSignals: r.missing_signals ?? [],
    pitch: r.pitch,
    excerpt: r.excerpt,
    notice: r.notice ?? undefined,
    createdAt: new Date(r.created_at).getTime(),
  }));
}

// ---------------------------------------------------------------------------
// Engine config persistence
// ---------------------------------------------------------------------------

type EngineConfigRow = {
  id?: string;
  label: string;
  llm_provider: string;
  llm_model: string | null;
  jev_endpoint: string | null;
  firecrawl_key: string | null;
  llm_key: string | null;
  jev_key: string | null;
  is_active: boolean;
};

export async function loadEngineConfigFromDb(): Promise<EngineConfig | null> {
  const { data, error } = await supabase
    .from('engine_configs')
    .select('*')
    .eq('is_active', true)
    .maybeSingle();
  if (error || !data) return null;
  return {
    firecrawlKey: data.firecrawl_key ?? '',
    llmProvider: data.llm_provider as EngineConfig['llmProvider'],
    llmKey: data.llm_key ?? '',
    llmModel: data.llm_model ?? '',
    jevEndpoint: data.jev_endpoint ?? '',
    jevKey: data.jev_key ?? '',
  };
}

export async function saveEngineConfigToDb(
  config: EngineConfig,
  label = 'default'
): Promise<void> {
  const row: EngineConfigRow = {
    label,
    llm_provider: config.llmProvider,
    llm_model: config.llmModel,
    jev_endpoint: config.jevEndpoint,
    firecrawl_key: config.firecrawlKey,
    llm_key: config.llmKey,
    jev_key: config.jevKey,
    is_active: true,
  };

  await supabase.from('engine_configs').update({ is_active: false }).neq('label', label);

  const { data: existing } = await supabase
    .from('engine_configs')
    .select('id')
    .eq('label', label)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase.from('engine_configs').update(row).eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('engine_configs').insert(row);
    if (error) throw error;
  }
}
