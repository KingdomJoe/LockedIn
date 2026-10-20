# Optimus Orchestrator

**Role:** top-level router and state machine for the LockedIn agent stack.
**Runtime:** browser edge worker · zero-auth by default.

## Purpose

Turn a GitHub handle into a decision-ready proof-of-work dossier without asking
the user for an account, a resume, or a credit card. Every other agent is a
specialist; the orchestrator owns sequencing, contracts, and graceful fallback.

## State Machine

```
IDLE → INGESTING → SIGNAL_MERGE → JEV_PASS → STRATEGIST_PASS → DEPLOYED
                                      │             │
                                      └── LIVE_JEV ─┘
```

1. `IDLE` — onboarding form, presets, engine configuration drawer.
2. `INGESTING` — GitHub REST user + repositories; optional LinkedIn/X/portfolio
   URLs are parsed into weighted signals.
3. `SIGNAL_MERGE` — deduplicate sources, normalize labels, compute language
   shares and freshness.
4. `JEV_PASS` — deterministic local calibration by default; live endpoint when
   the operator supplies `VITE_JEV_ENDPOINT`.
5. `STRATEGIST_PASS` — compose jobs, forge items, briefing, newsletter, and
   phone-screen pitch. Live System-2 streaming is opt-in.
6. `DEPLOYED` — render Palantir, Briefing, Ops, and Forge panels.

## Routing Rules

- Missing GitHub handle → stay in `IDLE`, show a single actionable error.
- GitHub rate limit or network failure → surface the exact API message; never
  substitute fabricated repo data.
- Firecrawl key present → custom URL autopsy uses the live scrape endpoint.
- Firecrawl key absent or unreachable → fall back to the cached deterministic
  dataset and label the card `CACHED` with the reason.
- Jev endpoint absent → use the built-in RLCD calibration math.
- LLM key absent → use the deterministic dossier and disable the live console.
- Any live call must be abortable; aborted calls must not mutate profile state.

## Contracts

| Boundary | Input | Output |
|----------|-------|--------|
| GitHub → merger | `GET /users/:login`, `/repos?per_page=100` | typed raw telemetry |
| merger → Jev | structured subject + evidence weights | 24 head decisions |
| Jev → strategist | calibrated probabilities + axes | narrative + targets |
| Firecrawl → analyzer | markdown + metadata | `ScrapeBundle` |
| analyzer → feed | target + profile | `CustomTargetAnalysis` |

## Reliability Rules

1. The local path must never depend on a key, a proxy, or a cold start.
2. Every optional integration has a deterministic fallback with visible
   provenance.
3. Live failures are non-fatal: surface a compact notice on the affected card.
4. Do not retry destructive or billable calls automatically.
5. Keep the zero-auth first click under one second of perceived work.

## Observability

The orchestrator emits a sound cue and a visible telemetry toast for engagement,
discovery, completion, warning, and boost. The drawer exposes the exact Jev
request and response JSON so reviewers can audit the contract without reading
the source.
