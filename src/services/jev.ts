import type { CustomTargetAnalysis, JevRequestPayload, JevResponsePayload } from '@/types/engine';
import type { ProofOfWorkProfile } from '@/types/optimus';

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

export function buildJevRequest(
  profile: ProofOfWorkProfile,
  target?: CustomTargetAnalysis | null
): JevRequestPayload {
  return {
    schema: 'lockedin.jev.system1.v3',
    mode: 'parallel_rlcd',
    request_id: `jev-${profile.generatedAt.toString(36)}`,
    target: target
      ? { url: target.url, kind: target.kind, title: target.title }
      : null,
    subject: {
      login: profile.user.login,
      classification: profile.jev.classification,
      repo_count: profile.user.public_repos,
      total_stars: profile.totalStars,
      fresh_repos_90d: profile.freshRepos,
      languages: profile.languages.map((language) => ({
        name: language.name,
        share: language.share,
      })),
      competency: Object.fromEntries(
        Object.entries(profile.competency).map(([axis, score]) => [axis, score])
      ),
      signals: profile.signals.map((signal) => ({
        source: signal.source,
        weight: Math.round(signal.weight * 100) / 100,
      })),
      artifacts: [...profile.repos]
        .filter((repo) => !repo.fork)
        .sort((a, b) => b.stargazers_count - a.stargazers_count)
        .slice(0, 4)
        .map((repo) => ({
          name: repo.name,
          stars: repo.stargazers_count,
          language: repo.language,
        })),
    },
    heads: profile.jev.axisDecisions.map((decision) => ({
      head: slug(decision.axis),
      score: decision.score,
      confidence: decision.confidence,
    })),
  };
}

export function buildJevResponse(profile: ProofOfWorkProfile): JevResponsePayload {
  return {
    request_id: `jev-${profile.generatedAt.toString(36)}`,
    model: 'jev-system1-rlcd',
    latency_ms: profile.jev.latencyMs,
    schema_error_rate: profile.jev.schemaErrorRate,
    classification: profile.jev.classification,
    probabilities: {
      p_shortlist: profile.jev.pShortlist,
      p_offer: profile.jev.pOffer,
      calibration: profile.jev.calibration,
    },
    rlcd: profile.jev.axisDecisions.map((decision) => ({
      axis: decision.axis,
      probability: decision.score,
      confidence: decision.confidence,
      verdict: decision.verdict,
    })),
  };
}

function normalizeEndpoint(endpoint: string) {
  const trimmed = endpoint.trim();
  if (!trimmed) throw new Error('Add a Jev endpoint URL first.');
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export async function runJevEndpoint(
  endpoint: string,
  apiKey: string,
  payload: JevRequestPayload,
  signal?: AbortSignal
): Promise<unknown> {
  const url = normalizeEndpoint(endpoint);
  const key = apiKey.trim();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
    },
    body: JSON.stringify(payload),
    signal,
  });
  const text = await response.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text.slice(0, 400);
  }
  if (!response.ok) {
    const detail =
      typeof parsed === 'string'
        ? parsed
        : parsed && typeof parsed === 'object' && 'error' in parsed
          ? String((parsed as { error: unknown }).error)
          : text.slice(0, 220);
    throw new Error(`Jev endpoint ${response.status}: ${detail}`);
  }
  return parsed;
}
