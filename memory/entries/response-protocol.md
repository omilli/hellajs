# Response protocol: mandatory handoff gate

**Date:** 2026-06-24
**Type:** decision
**Source:** user direction on forcing feedback at the right times; updated after a mis-routed handoff (offered `/memory` for an actionable bug) surfaced a labeling gap
**Lives in:** `AGENTS.md` §Response protocol, `feedback/SKILL.md` Step 2 (trigger calibration)

## Decision
Every substantive response ends with a mandatory one-sentence handoff gate: name the target skill (if any) and justify in one clause why it fits the request. Any skill can be the target — judgment-based, not a fixed mapping. The gate is enforced by language ("silently skipping = skipping a verification step"), same class as lint/typecheck. See `AGENTS.md` for the condition table (feedback / memory / plan / none).

## Why
Without a forced gate, feedback gets skipped — it's discretionary, and the agent defaults to finishing without self-reflection. But forcing it reflexively wastes tokens; the table makes it a quick check, not a full invocation. The label+justify requirement was added after a run where the gate fired but mis-routed (offered `/memory` for an unfixed bug) — a gate that fires but routes to the wrong skill is as bad as no gate, because the agent executes on the bare trigger. Naming + justifying forces the routing decision to be re-derived at the moment it's made. feedback Step 2's self-calibration (was I called at the right time?) creates a meta-loop improving the trigger across runs.
