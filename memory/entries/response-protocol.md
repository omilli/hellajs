# Response protocol: mandatory feedback/memory gate

**Date:** 2026-06-24
**Type:** decision
**Source:** user direction on forcing feedback at the right times
**Lives in:** `AGENTS.md` §Response protocol, `feedback/SKILL.md` Step 2 (trigger calibration)

## Decision
Every substantive response ends with a mandatory one-sentence gate: skill loop + friction → offer `/feedback`; non-obvious decision → offer `/memory`; neither → say "nothing to feedback." The gate is enforced by language ("silently skipping = skipping a verification step"), putting it in the same class as lint/typecheck.

## Why
Without a forced gate, feedback gets skipped — it's discretionary, and the agent defaults to finishing without self-reflection. But forcing it reflexively (every response, no matter how trivial) wastes tokens and produces noise. The table in AGENTS.md makes the decision a quick critical check, not a full skill invocation. The self-calibration in feedback Step 2 (was I called at the right time?) creates a meta-loop: the trigger improves itself across runs. If the user keeps having to ask for feedback explicitly, the gate criteria are too narrow and feedback proposes tightening them.
