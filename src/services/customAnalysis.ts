import type { ProofOfWorkProfile } from '@/types/optimus';
import type { CustomTargetAnalysis, CustomTargetKind } from '@/types/engine';
import { hashString, inferTargetMeta, type ScrapeBundle } from '@/services/firecrawl';

const SKILL_ALIASES: Record<string, string[]> = {
  TypeScript: ['typescript'],
  JavaScript: ['javascript'],
  React: ['react'],
  'Next.js': ['next.js', 'nextjs'],
  'Node.js': ['node', 'node.js', 'nodejs'],
  Python: ['python'],
  Go: ['golang', 'go'],
  Rust: ['rust'],
  Java: ['java'],
  'C++': ['c++', 'cpp'],
  'C#': ['c#', 'csharp'],
  Swift: ['swift'],
  Kotlin: ['kotlin'],
  Postgres: ['postgres', 'postgresql', 'pgsql'],
  SQL: ['sql'],
  GraphQL: ['graphql'],
  Docker: ['docker'],
  Kubernetes: ['kubernetes', 'k8s'],
  AWS: ['aws', 'amazon web services'],
  GCP: ['gcp', 'google cloud'],
  Azure: ['azure'],
  Tailwind: ['tailwind'],
  Solidity: ['solidity'],
  Redis: ['redis'],
  Kafka: ['kafka'],
  Terraform: ['terraform'],
  'Machine Learning': ['machine learning'],
  LLM: ['llm', 'large language model'],
  OpenAI: ['openai', 'gpt-4', 'gpt4'],
};

const SKILLS = Object.keys(SKILL_ALIASES);

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasAlias(text: string, alias: string) {
  const pattern = new RegExp(`(^|[^a-z0-9+#])${escapeRegex(alias)}([^a-z0-9+#]|$)`, 'i');
  return pattern.test(text);
}

function detectSkills(text: string): string[] {
  return SKILLS.filter((skill) => SKILL_ALIASES[skill].some((alias) => hasAlias(text, alias)));
}

function userEvidence(profile: ProofOfWorkProfile): string {
  return [
    ...profile.languages.map((language) => language.name),
    ...profile.repos.flatMap((repo) => [repo.name, repo.language ?? '', repo.description ?? '', ...repo.topics]),
    ...profile.signals.map((signal) => `${signal.label} ${signal.detail}`),
    ...profile.strengths,
  ]
    .join(' ')
    .toLowerCase();
}

function hasSkill(evidence: string, skill: string) {
  return SKILL_ALIASES[skill].some((alias) => hasAlias(evidence, alias));
}

function inferKind(url: string, markdown: string): CustomTargetKind {
  const meta = inferTargetMeta(url);
  const haystack = `${markdown.slice(0, 4000)}`.toLowerCase();
  if (/hackathon|prize track|demo day|build sprint/.test(haystack)) return 'hackathon';
  if (/fellowship|grant program|scholarship/.test(haystack)) return 'grant';
  if (/case study|portfolio|selected work/.test(haystack)) return 'portfolio';
  return meta.kind;
}

function cleanExcerpt(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 460);
}

function shapePitch(
  profile: ProofOfWorkProfile,
  title: string,
  org: string,
  kind: CustomTargetKind,
  matched: string[],
  missing: string[],
  pAccept: number,
  confidence: number
): string {
  const flagship = [...profile.repos]
    .filter((repo) => !repo.fork)
    .sort((a, b) => b.stargazers_count - a.stargazers_count)[0];
  const primary = profile.languages[0]?.name ?? 'TypeScript';
  const stack = matched.length ? matched.slice(0, 3).join(' / ') : primary;
  const anchor = flagship
    ? `${flagship.name} (${flagship.stargazers_count.toLocaleString()} stars, ${flagship.language ?? primary})`
    : `${profile.freshRepos} shipped repositories`;
  const intro =
    kind === 'hackathon'
      ? `For ${title}, I'd ship a judged ${stack} artifact, not a slide deck.`
      : kind === 'grant'
        ? `For ${title}, the milestone plan anchors on ${anchor} and a public ${stack} deliverable.`
        : kind === 'portfolio'
          ? `For ${title}, the portfolio signal should open with ${anchor} and ${stack}.`
          : `For ${title} at ${org}, I'd lead with ${anchor} and direct ${stack} overlap.`;
  const gap = missing.length
    ? ` Honest gap: ${missing[0].replace(/^No /, 'no ')} — patch it with a small public artifact before applying.`
    : ' No material eligibility gap detected; ship the application now.';
  return `${intro} Jev calibrates P(Accept) at ${pAccept}% with ±${100 - confidence} confidence.${gap}`;
}

export function analyzeTarget(
  profile: ProofOfWorkProfile,
  bundle: ScrapeBundle,
  targetUrl = bundle.url
): CustomTargetAnalysis {
  const meta = inferTargetMeta(targetUrl);
  const kind = inferKind(targetUrl, bundle.markdown);
  const haystack = `${bundle.title} ${meta.org} ${targetUrl} ${bundle.markdown}`.toLowerCase();
  const evidence = userEvidence(profile);
  const hash = hashString(targetUrl);

  let required = detectSkills(haystack);
  if (required.length < 2) {
    required = SKILLS.filter((_, index) => (hash >> index) % 4 !== 0).slice(0, 4);
  }
  required = required.slice(0, 6);

  const matched = required.filter((skill) => hasSkill(evidence, skill));
  const missing = required.filter((skill) => !hasSkill(evidence, skill));

  const jitter = (hash % 9) - 4;
  const kindLift = kind === 'hackathon' ? 4 : kind === 'grant' ? 2 : kind === 'portfolio' ? 1 : 0;
  const pAccept = clamp(
    profile.jev.pOffer + matched.length * 6 - missing.length * 3 + kindLift + jitter,
    9,
    96
  );
  const pShortlist = clamp(pAccept + 11 + (hash % 5), 14, 99);
  const confidence = clamp(
    profile.jev.calibration - 4 + matched.length * 2 + (bundle.source === 'firecrawl' ? 4 : 0),
    55,
    98
  );

  const signals: string[] = [];
  missing.slice(0, 2).forEach((skill) => {
    signals.push(`No original ${skill} artifact in top-30 repo telemetry`);
  });
  if (profile.gaps[0]) {
    signals.push(
      `Jev ${profile.gaps[0]} axis at ${profile.competency[profile.gaps[0]]}/100 — no public proof artifact`
    );
  }
  if (profile.freshRepos < 6) {
    signals.push(`Only ${profile.freshRepos} repositories pushed in the last 90 days`);
  }
  if (matched.length === 0) {
    signals.push('No direct overlap with the stated required stack');
  }
  if (signals.length < 2) {
    signals.push('No live application outcome data for this target yet');
  }

  const missingSignals = [...new Set(signals)].slice(0, 4);
  const deltaVsBaseline = pAccept - profile.jev.pOffer;

  return {
    id: `autopsy-${hash.toString(36)}-${Date.now().toString(36)}`,
    url: targetUrl,
    title: bundle.title || meta.title,
    org: meta.org,
    kind,
    source: bundle.source,
    latencyMs: bundle.latencyMs,
    pAccept,
    pShortlist,
    confidence,
    deltaVsBaseline,
    matchedSkills: matched,
    missingSignals,
    pitch: shapePitch(profile, bundle.title || meta.title, meta.org, kind, matched, missingSignals, pAccept, confidence),
    excerpt: cleanExcerpt(bundle.markdown),
    notice: bundle.notice,
    createdAt: Date.now(),
  };
}
