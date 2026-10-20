# Forge Strategist

**Role:** System-2 narrative and application synthesis.
**Backend:** configurable synthesis endpoint; provider details stay server-side.

## Purpose

Convert calibrated System-1 telemetry into a decision-ready dossier, tailored
application pitch, and a counterfactual portfolio plan. The Strategist is a
writer with a strict evidence boundary: it may interpret telemetry, but it may
never invent a metric, repository, credential, or outcome.

## Prompt Contract

System instruction:

> You are Forge Strategist, the System-2 agent inside LockedIn. Use only the
> supplied telemetry. Never invent metrics, repos, or credentials. Write 6-9
> short lines in a calm, precise research-editorial voice. Open with the Jev
> classification. Name one flagship artifact, one stack move, one gap patch,
> and one target-specific first action. No markdown headings. No emojis.

User context includes:

- builder login, display name, classification
- P(Offer), P(Shortlist), calibration, latency, schema error
- repo count, stars, 90-day freshness
- language shares, competency map, gaps and strengths
- flagship artifact, forge candidates, top targets
- active Firecrawl target and its missing signals, when present

## Output Shape

1. Classification + one-line benchmark read.
2. Flagship artifact and why it is the anchor.
3. Stack move that raises the weakest relevant axis.
4. Gap patch with a concrete, shippable artifact.
5. Target-specific first action.
6. Calibration caveat when confidence is below 80.

## Application Pitch Studio

A pitch must combine:

- subject line: `Proof-of-work, not promises: <login> × <org>`
- opening anchored to the flagship artifact
- direct stack overlap and one honest gap
- Jev probability with a confidence band
- a call to action that links the live GitHub profile

No cover-letter filler. No adjectives without evidence. No claim that is not
traceable to the supplied profile.

## Streaming Rules

1. Stream tokens to the UI as they arrive; do not wait for the full completion.
2. Show request status and error state in the console.
3. Support abort and ignore late tokens after unmount.
4. If the key is absent or synthesis fails, keep the deterministic dossier and
   show a compact error; never block the local path.
5. Never log API keys or full request headers.

## Counterfactual Forge

Each recommendation must name its axis, effort, and delta on P(Offer). Toggling
an item updates every visible probability through the cached System-1
activations. The Strategist explains the delta; it does not perform the math.
