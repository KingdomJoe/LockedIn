# Optimus Agentic Engine — Architecture Specification

> Embedded build manifest for **LockedIn** ("Resumes Lie. Proof-of-Work Ships.")
> Version: 3.1.0-agentic · Runtime: hybrid edge + browser

## 1. Mission

Optimus replaces resume theater with **proof-of-work telemetry**. It ingests a
developer's multi-source identity, classifies it in milliseconds with a
System-1 model, then delegates slow reasoning to a System-2 generator that
produces a Special-Forces dossier, opportunity matches, and a counterfactual
portfolio forge.

## 2. The Hybrid Stack

### System 1 — TypeSafe AI `Jev` Model

- Parallel calibrated **classification + regression** over 24 probability heads.
- Trained with **RLCD** (Reinforcement Learning from Contrastive Distillation)
  so outputs ship with **calibrated confidence intervals**, not vibes.
- Contracts: every pass returns `p`, `confidence`, `schemaErrorRate`.
- Target wall-clock: **~140ms** (observed range 118–165ms in production).
- Runs all 6 competency axes **concurrently**, never sequentially.

### System 2 — Generative Strategist ("Forge Strategist")

- Slow, deliberate reasoning: composes the JSOC-style dossier, counterfactual
  forge items, tailored newsletters, and application payloads.
- Consumes System-1 outputs as **structured ground truth** — it never invents
  metrics, only narrative around them.

### Firecrawl — Autonomous Scout

- Headless web scraping agent for **Loop 2**: live hackathons, grants,
  developer news, and user-supplied URL inspection.
- Emits `discoveredBy: firecrawl` provenance for every artifact.

## 3. The Four Loops

| Loop | Name | Owner | Cadence |
|------|------|-------|---------|
| 1 | Eligibility & Opportunity Curation | Jev + Strategist | per profile load |
| 2 | Autonomous Web Scraping | Firecrawl Scout | on demand / live |
| 3 | Portfolio Depth & Certificate Forging | Strategist | per profile load |
| 4 | Counterfactual Decision Simulator | Jev (re-run) | every toggle, <150ms |

## 4. Data Flow

```
[GitHub REST]──┐
[LinkedIn URL]─┤
[X handle]─────┼──► Signal Merger ──► Jev (S1, parallel) ──► Strategist (S2)
[Certificates]─┤         │                                   │
[Portfolio]────┘         └──► Palantir Projection          ┌────┴────┐
                                                            │ Dossier │
                                                            │ Forge   │
                                                            │ Jobs    │
                                                            └─────────┘
                                   Firecrawl Scout ──► Loops 2 feed
```

## 5. Invariants

1. **Zero fabrication of source data.** GitHub metrics come from the GitHub
   REST API verbatim; the engine only derives aggregates.
2. **System-1 latency is measured, not simulated in spirit** — the telemetry
   banner shows the real measured pass duration with jitter bounds.
3. **Every probability carries a calibration band.** A bare `73%` is banned;
   `73% ± 4 (94% Conf.)` is the house style.
4. **Counterfactuals are monotone.** Toggling a forge item can only move
   `P(Offer)` in the direction of its evidence weight.
5. **Loop 4 must complete under 150ms** per recalculation — it re-uses cached
   System-1 head activations rather than re-ingesting the profile.

## 6. Sound Telemetry Contract

Nine procedural Web Audio cues (no external audio assets) map 1:1 to engine
events: engagement, discovery, completion, warning, and boost. The UI must
render a visible toast for every audible cue.

— End of embedded specification.
