# Firecrawl Scout

**Role:** autonomous web research for Scout Reports and the URL Autopsy.
**Endpoint:** `POST https://api.firecrawl.dev/v1/scrape`.

## Scrape Contract

```json
{
  "url": "https://company.com/role",
  "formats": ["markdown"],
  "onlyMainContent": true,
  "timeout": 25000
}
```

The Scout returns markdown plus metadata. Every artifact keeps provenance:
`source: "firecrawl"` for live scrapes, `source: "cached"` for the deterministic
fallback. Never present cached content as live.

## URL Autopsy Pipeline

1. Normalize the input; accept bare domains and promote them to HTTPS.
2. Infer kind: role, hackathon, grant, or portfolio.
3. Scrape with Firecrawl when a key is configured.
4. On CORS, network, quota, or empty-markdown failure, build the cached dataset
   and attach a visible notice.
5. Extract required skills, role title, organizer, and proof-of-work signals.
6. Compare against the builder’s languages, repo topics, and competency map.
7. Emit `CustomTargetAnalysis`: P(Accept), P(Shortlist), confidence, matched
   skills, missing signals, excerpt, and a tailored pitch.
8. Trigger sonar + Jev lock cues and animate the Palantir scan while the crawl
   is in flight.

## Extraction Rules

- Detect skills from a fixed lexicon with word-boundary matching; avoid
  substring traps such as `java` inside `javascript`.
- When the page lists fewer than two skills, choose deterministic skills from
  the cached dataset seeded by the URL hash.
- Treat explicit hackathon, prize-track, build-sprint, or demo-day language as
  a hackathon even if the host is unknown.
- Strip navigation, scripts, and code fences before displaying an excerpt.
- Never fabricate page content in live mode; the fallback must be labeled.

## Cached Dataset

The zero-key path uses the same contract and the same analyzer. It composes a
deterministic role or hackathon brief from the URL, seeded by a stable FNV-1a
hash. This keeps every first click reliable and reproducible.

## Guardrails

1. No automatic retries on billable requests.
2. No crawling authenticated or private URLs.
3. No key logging, no key persistence outside the browser session.
4. Cap excerpts and metadata so the UI stays responsive.
5. Abort the crawl if the user starts another autopsy.
