import type { CustomTargetAnalysis, LlmProvider } from '@/types/engine';
import type { ProofOfWorkProfile } from '@/types/optimus';
import { LLM_PROVIDERS } from '@/services/engineConfig';

export interface StreamDossierOptions {
  provider: LlmProvider;
  apiKey: string;
  model: string;
  profile: ProofOfWorkProfile;
  target?: CustomTargetAnalysis | null;
  onToken: (token: string) => void;
  signal?: AbortSignal;
}

interface OpenAiChunk {
  choices?: { delta?: { content?: string }; message?: { content?: string } }[];
}

interface GeminiChunk {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

const DOSSIER_SYSTEM_PROMPT =
  'You are Forge Strategist, the System-2 agent inside LockedIn. You synthesize a precise ' +
  'proof-of-work dossier for a specific builder. Use only the supplied telemetry. Never invent ' +
  'metrics, repos, or credentials. Write 6-9 short lines in a calm, precise research-editorial ' +
  'voice. Open with the Jev classification. Name one flagship artifact, one stack move, one gap ' +
  'patch, and one target-specific first action. No markdown headings. No emojis.';

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

function extractGeminiText(chunk: unknown): string {
  const parsed = chunk as GeminiChunk;
  return parsed.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
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

async function readSse(
  response: Response,
  kind: 'openai' | 'gemini',
  onToken: (token: string) => void,
  signal?: AbortSignal
): Promise<string> {
  if (!response.body) throw new Error('The LLM provider returned an empty stream.');
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
      const token = kind === 'gemini' ? extractGeminiText(parsed) : extractOpenAiText(parsed);
      if (token) {
        full += token;
        onToken(token);
      }
    }
  }

  return full;
}

export async function streamDossier({
  provider,
  apiKey,
  model,
  profile,
  target,
  onToken,
  signal,
}: StreamDossierOptions): Promise<string> {
  const info = LLM_PROVIDERS[provider];
  const key = apiKey.trim();
  if (!key) throw new Error(`Add a ${info.label} API key to start live System-2 synthesis.`);
  if (signal?.aborted) throw new DOMException('Synthesis aborted', 'AbortError');

  const system = DOSSIER_SYSTEM_PROMPT;
  const user = buildDossierPrompt(profile, target);
  const resolvedModel = model.trim() || info.model;

  let response: Response;
  if (info.kind === 'gemini') {
    const url = `${info.endpoint}/${encodeURIComponent(resolvedModel)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(key)}`;
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { temperature: 0.5 },
      }),
      signal,
    });
  } else {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      Accept: 'text/event-stream',
    };
    if (provider === 'openrouter') {
      headers['HTTP-Referer'] = window.location.origin;
      headers['X-Title'] = 'LockedIn Optimus';
    }
    response = await fetch(info.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: resolvedModel,
        stream: true,
        temperature: 0.5,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
      signal,
    });
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${info.label} ${response.status}: ${extractErrorText(text)}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const parsed = (await response.json()) as unknown;
    const full = info.kind === 'gemini' ? extractGeminiText(parsed) : extractOpenAiMessage(parsed);
    if (!full) throw new Error(`${info.label} returned no completion text.`);
    onToken(full);
    return full;
  }

  const full = await readSse(response, info.kind, onToken, signal);
  if (!full) throw new Error(`${info.label} streamed zero tokens. Check the model and key.`);
  return full;
}
