# Jev System-1 Classifier

**Role:** calibrated, parallel decision engine.
**Model contract:** `lockedin.jev.system1.v3` · `mode: parallel_rlcd`.

## Objective

Map a structured builder state to 24 probability heads across six competency
axes, then return calibrated shortlist and offer probabilities. Jev is a
classifier and regressor, not a storyteller. The Strategist owns narrative.

## Input Contract

```json
{
  "schema": "lockedin.jev.system1.v3",
  "mode": "parallel_rlcd",
  "request_id": "jev-...",
  "target": { "url": "...", "kind": "role", "title": "..." },
  "subject": {
    "login": "torvalds",
    "classification": "PRINCIPAL ARCHITECT // GLOBAL OSS IMPACT",
    "repo_count": 34,
    "total_stars": 266032,
    "fresh_repos_90d": 4,
    "languages": [{ "name": "C", "share": 82 }],
    "competency": { "Systems": 97, "Frontend": 44 },
    "signals": [{ "source": "github", "weight": 1 }],
    "artifacts": [{ "name": "linux", "stars": 266032, "language": "C" }]
  },
  "heads": [{ "head": "systems", "score": 97, "confidence": 96 }]
}
```

## Output Contract

```json
{
  "request_id": "jev-...",
  "model": "jev-system1-rlcd",
  "latency_ms": 142,
  "schema_error_rate": 0.2,
  "classification": "PRINCIPAL ARCHITECT // GLOBAL OSS IMPACT",
  "probabilities": { "p_shortlist": 94, "p_offer": 88, "calibration": 92 },
  "rlcd": [
    { "axis": "Systems", "probability": 97, "confidence": 96, "verdict": "..." }
  ]
}
```

## Heads

| Axis | Evidence |
|------|----------|
| Systems | low-level repos, kernel, infrastructure, C/Rust/C++ |
| Frontend | UI repos, design systems, React/Vue, visual polish |
| Distributed | queues, consensus, databases, scale language |
| OSS Impact | stars, forks, external contributions, adoption |
| Velocity | recency, push cadence, repo count, iteration speed |
| Collaboration | issues, reviews, orgs, open-source coordination |

## Calibration Rules

1. Every probability carries a confidence band. Never emit a bare point value.
2. Low schema error is a feature: reject malformed evidence instead of guessing.
3. Parallel RLCD means all six axes activate concurrently; no axis may block
   another.
4. P(Offer) is bounded by the calibrated shortlist probability and cannot jump
   more than the evidence weight justifies.
5. Counterfactual toggles re-use cached head activations; a full re-ingest is a
   defect.

## Live Endpoint Mode

When `VITE_JEV_ENDPOINT` is configured, the orchestrator POSTs the exact request
JSON above. The response is displayed in the drawer’s Jev inspector alongside
the local deterministic response. Keys stay in the browser session and are
never logged.

## Failure Modes

- Non-2xx response → show status and endpoint message, keep local scores.
- Invalid JSON → mark `schema_error_rate` as unknown, keep local scores.
- Timeout → abort and fall back without blocking Loop 4.
