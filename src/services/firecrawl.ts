import type { CustomTargetKind } from '@/types/engine';

export interface ScrapeBundle {
  url: string;
  title: string;
  markdown: string;
  source: 'firecrawl' | 'cached';
  latencyMs: number;
  notice?: string;
}

export interface TargetMeta {
  title: string;
  org: string;
  kind: CustomTargetKind;
}

interface FirecrawlResponse {
  success?: boolean;
  data?: {
    markdown?: string;
    metadata?: {
      title?: string;
      description?: string;
      sourceURL?: string;
      statusCode?: number;
    };
  };
  error?: string;
}

const CACHED_SKILLS = [
  'TypeScript',
  'React',
  'Node.js',
  'Postgres',
  'Rust',
  'Go',
  'Python',
  'AWS',
  'Docker',
  'GraphQL',
  'Kubernetes',
  'Redis',
];

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error('Paste a job, hackathon, grant, or portfolio URL first.');
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error('That URL could not be parsed. Include a full domain, e.g. https://company.com/role.');
  }
  if (!parsed.hostname.includes('.')) {
    throw new Error('Enter a public domain, e.g. https://company.com/role.');
  }
  return parsed.toString();
}

function humanize(value: string): string {
  return value
    .replace(/\.(html?|php|aspx?)$/i, '')
    .replace(/[-_+]+/g, ' ')
    .replace(/\b\d{5,}\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function inferTargetMeta(url: string): TargetMeta {
  const parsed = new URL(url);
  const host = parsed.hostname.replace(/^www\./i, '');
  const haystack = `${host}${parsed.pathname}${parsed.search}`.toLowerCase();
  const segments = parsed.pathname
    .split('/')
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment))
    .filter((segment) => /[a-z]/i.test(segment))
    .filter(
      (segment) =>
        !/^(jobs?|careers?|positions?|apply|application|openings?|software|projects?|challenges?|hackathons?|details?|postings?|listing|company|companies|in|en)$/i.test(
          segment
        )
    );

  let kind: CustomTargetKind = 'role';
  if (/hackathon|devpost|devfolio|lablab|ethglobal|hackerearth|mlh|prize|challenge/.test(haystack)) {
    kind = 'hackathon';
  } else if (/grant|fellowship|scholarship|residency/.test(haystack)) {
    kind = 'grant';
  } else if (/portfolio|case-stud|case-studies|personal-site|about-me/.test(haystack)) {
    kind = 'portfolio';
  }

  const slug = segments[segments.length - 1];
  const fromHost = host.split('.')[0];
  const inferred = slug && slug.length > 2 ? humanize(slug) : humanize(fromHost);
  const title = inferred || humanize(host);

  return { title, org: host, kind };
}

function cachedSkills(url: string): string[] {
  const hash = hashString(url);
  return CACHED_SKILLS.filter((_, index) => (hash >> index) % 3 !== 0).slice(0, 4);
}

export function buildCachedScrape(url: string): ScrapeBundle {
  const { title, org, kind } = inferTargetMeta(url);
  const skills = cachedSkills(url);
  const primary = skills[0] ?? 'TypeScript';
  const secondary = skills[1] ?? 'React';
  const third = skills[2] ?? 'Postgres';
  const kindLabel = kind === 'hackathon' ? 'hackathon' : kind === 'grant' ? 'grant' : kind === 'portfolio' ? 'portfolio' : 'role';
  const body =
    kind === 'hackathon'
      ? `# ${title}\n\nHosted by ${org}. A live ${kindLabel} with a judged build sprint and prize track.\n\n## Track requirements\n- Ship an original, working prototype during the event window.\n- Use ${primary} and ${secondary}; demonstrate ${third} integration.\n- Provide a public repo, a short demo, and a proof-of-work write-up.\n\n## Judging criteria\n- Technical execution, originality, and real user value.\n- Depth of ${primary} implementation over slideware.\n- Clear evidence of shipped artifacts and measurable impact.\n`
      : kind === 'portfolio'
        ? `# ${title}\n\nPersonal portfolio for ${title}. Case studies span ${primary}, ${secondary}, and ${third}.\n\n## Signal expectations\n- Shipped production work with public artifacts.\n- Clear ownership of ${primary} systems and measurable outcomes.\n- Live links, repositories, and concise write-ups.\n`
        : kind === 'grant'
          ? `# ${title}\n\n${org} is reviewing ${kindLabel} applications for builders shipping public-good infrastructure.\n\n## Requirements\n- Demonstrated ${primary} and ${secondary} delivery.\n- An open-source artifact with ${third} evidence.\n- A concrete milestone plan with measurable proof-of-work.\n`
          : `# ${title}\n\n${org} is hiring for ${title}.\n\n## Role requirements\n- Strong ${primary} and ${secondary} experience in production.\n- Working knowledge of ${third} and modern delivery pipelines.\n- Public proof-of-work: shipped repositories, measurable outcomes, and clear ownership.\n\n## Preferred signals\n- Open-source contributions and technical write-ups.\n- Experience with ${skills[3] ?? 'distributed systems'} at scale.\n- Comfort operating with high autonomy and fast iteration.\n`;
  const latencyMs = 138 + (hashString(url) % 240);
  return {
    url,
    title,
    markdown: body,
    source: 'cached',
    latencyMs,
  };
}

export async function scrapeWithFirecrawl(
  url: string,
  apiKey: string,
  signal?: AbortSignal
): Promise<ScrapeBundle> {
  const key = apiKey.trim();
  if (!key) throw new Error('Add a Firecrawl API key to run a live scrape.');
  const started = performance.now();
  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      url,
      formats: ['markdown'],
      onlyMainContent: true,
      timeout: 25000,
    }),
    signal,
  });
  const text = await response.text();
  let payload: FirecrawlResponse | null = null;
  try {
    payload = text ? (JSON.parse(text) as FirecrawlResponse) : null;
  } catch {
    payload = null;
  }
  if (!response.ok) {
    const message = payload?.error ?? text.slice(0, 160) ?? `HTTP ${response.status}`;
    throw new Error(`Firecrawl rejected the crawl (${response.status}): ${message}`);
  }
  const markdown = payload?.data?.markdown?.trim() ?? '';
  if (!markdown) throw new Error('Firecrawl returned no readable markdown for that URL.');
  const latencyMs = Math.max(1, Math.round(performance.now() - started));
  const fallbackMeta = inferTargetMeta(url);
  return {
    url,
    title: payload?.data?.metadata?.title?.trim() || fallbackMeta.title,
    markdown,
    source: 'firecrawl',
    latencyMs,
  };
}
