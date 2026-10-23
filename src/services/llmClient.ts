import type { CustomTargetAnalysis } from '@/types/engine';
import type { ProofOfWorkProfile } from '@/types/optimus';

export interface StreamDossierOptions {
  profile: ProofOfWorkProfile;
  target?: CustomTargetAnalysis | null;
  onToken: (token: string) => void;
  signal?: AbortSignal;
}

interface OpenAiChunk {
  choices?: { delta?: { content?: string }; message?: { content?: string } }[];
}

export function buildDossierPrompt(
  profile: ProofOfWorkProfile,
  target?: CustomTargetAnalysis | null
): string {
  const flagship = [...profile.repos]
    .filter((repo) => !repo.fork)
    .sort((a, b) => b.stargazers_count - a.stargazers_count)[0];
  const targetLine = target
    ? `Active Firecrawl target: ${target.title} @ ${target.org}. Kind: ${target.kind}. Jev P(Accept) ${target.pAccept}% (±${100 - target.confidence}). Missing signals: ${target.missingSignals.join('; ') || 'none'}.`
    : 'No custom Firecrawl target is loaded. Synthesize against the current opportunity feed.';
  return [
    `Builder: ${profile.user.login} (${profile.user.name ?? 'no display name'}).`,
    `Classification: ${profile.jev.classification}.`,
    `Jev: P(Offer) ${profile.jev.pOffer}%, P(Shortlist) ${profile.jev.pShortlist}%, calibration ${profile.jev.calibration}%, ${profile.jev.latencyMs}ms across 24 heads.`,
    `Telemetry: ${profile.user.public_repos} public repos, ${profile.totalStars.toLocaleString()} stars, ${profile.freshRepos} repos pushed in 90 days.`,
    `Languages: ${profile.languages.map((language) => `${language.name} ${language.share}%`).join(', ') || 'none parsed'}.`,
    `Flagship artifact: ${flagship ? `${flagship.name} (${flagship.stargazers_count} stars, ${flagship.language ?? 'mixed stack'}) — ${flagship.description ?? 'no description'}` : 'none'}.`,
    `Competency: ${Object.entries(profile.competency).map(([axis, score]) => `${axis} ${score}`).join(', ')}.`,
    `Weak axes: ${profile.gaps.join(', ') || 'none'}. Strong axes: ${profile.strengths.join(', ') || 'none'}.`,
    `Forge candidates: ${profile.forge.map((item) => `${item.title} (+${item.deltaP} pts)`).join('; ') || 'none'}.`,
    `Top targets: ${profile.jobs.slice(0, 2).map((job) => `${job.role} @ ${job.org} (${job.pAccept}%)`).join('; ') || 'none'}.`,
    targetLine,
    'Return only the dossier text.',
  ].join('\n');
}

function extractOpenAiText(chunk: unknown): string {
  const parsed = chunk as OpenAiChunk;
  return parsed.choices?.[0]?.delta?.content ?? '';
}

function extractOpenAiMessage(chunk: unknown): string {
  const parsed = chunk as OpenAiChunk;
  return parsed.choices?.[0]?.message?.content ?? '';
}

function extractErrorText(text: string): string {
  try {
    const parsed = JSON.parse(text) as { error?: { message?: string } | string; message?: string };
    if (typeof parsed.error === 'string') return parsed.error;
    if (parsed.error?.message) return parsed.error.message;
    if (parsed.message) return parsed.message;
  } catch {
    return text.slice(0, 220);
  }
  return text.slice(0, 220);
}

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/llm-stream`;

export async function streamDossier({
  profile,
  target,
  onToken,
  signal,
}: StreamDossierOptions): Promise<string> {
  if (signal?.aborted) throw new DOMException('Synthesis aborted', 'AbortError');

  const user = buildDossierPrompt(profile, target);

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ prompt: user }),
    signal,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`River AI ${response.status}: ${extractErrorText(text)}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const parsed = (await response.json()) as unknown;
    const full = extractOpenAiMessage(parsed);
    if (!full) throw new Error('River AI returned no completion text.');
    onToken(full);
    return full;
  }

  if (!response.body) throw new Error('River AI returned an empty stream.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  while (true) {
    if (signal?.aborted) {
      await reader.cancel();
      throw new DOMException('Synthesis aborted', 'AbortError');
    }
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(data);
      } catch {
        continue;
      }
      const token = extractOpenAiText(parsed);
      if (token) {
        full += token;
        onToken(token);
      }
    }
  }

  if (!full) throw new Error('River AI streamed zero tokens.');
  return full;
}
