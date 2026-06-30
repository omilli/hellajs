---
name: brain-prime
description: >
  The operating backbone — load FIRST on any non-trivial task, before doing the work. Carries the work ethos (smallest correct change at the root cause), the skill loop (brain-idea/brain-audit/brain-critic/brain-feature -> brain-plan -> brain-worker, with brain-feedback/brain-memory firing cross-cutting from any skill on friction or verified facts), the methodology, the non-negotiables (Done = solved + verified; full blast radius), and tool/memory economy. Load before any substantive work; skip for trivial lookups.
---

# Prime

The backbone every substantive task loads first. It carries four things the rest of the system assumes present: the **ethos**, the **loop**, the **methodology**, and the **non-negotiables**. The other skills (`brain-idea`, `brain-audit`, `brain-critic`, `brain-feature`, `brain-plan`, `brain-worker`, `brain-feedback`, `brain-memory`, plus standalone `brain-skill`/`brain-author`) are the capabilities this loop orchestrates.

## The loop

    brain-idea / brain-audit / brain-critic / brain-feature  (entry: decide WHAT)
        -> brain-plan      (structure HOW: a task-contract)
        -> brain-worker    (execute it, ticking each Definition of Done with evidence)
            on a plan-gap -> back to brain-plan
            on a design fork -> back to brain-idea

    Self-improvement (cross-cutting — fires from ANY skill at completion, not a tail):
        friction -> brain-feedback  (propose config/skill edits)
        durable fact/decision -> brain-memory  (curate into the repo knowledge base)

**Handoff gate** — after any substantive work, scan both tracks proactively and invoke the matching skill yourself; do not wait for the user to call them. Self-improvement is the system compounding on itself — the skill that hit the friction owns routing it, not the user.

- **Downstream track** — the next skill in the loop, if the work continues (entry → `brain-plan`; `brain-plan` → `brain-worker`; `brain-worker` → `brain-plan` on a plan-gap or `brain-idea` on a design fork). One sentence naming it and a one-clause justification, or "nothing downstream."
- **Self-improvement track** — friction from THIS run (rework, a wrong assumption, a rule/tool that didn't hold, a user correction) routes to `brain-feedback` when it should change a rule (always-on config/skill text), `brain-memory` when it is a recallable fact/decision. A durable decision or fact confirmed against source this run routes to `brain-memory`. Each skill names its own friction signals in its Done/Self-check section.

A clean run with no events skips the self-improvement track — that is correct and common, not a failure. A trivial change skips everything.

## Ethos

Ship the smallest correct change that fixes the root cause. Simplify, reuse, or delete before adding. Everything else is overhead.

## Non-negotiables

- **Done = solved + verified.** Lint, typecheck, relevant tests green. If a verification command isn't findable, ask — never skip the gate.
- **Every change carries its full blast radius.** Before finishing, enumerate every downstream effect: sibling tests asserting old behavior, docs describing the old shape, callers of a changed signature, backward compatibility. A change green in its own check but breaking a caller, test, or doc elsewhere is not done.
- **Rules inviolable.** When work conflicts with an established project rule (lint, style, convention), surface the conflict and propose the change — never silently work around it.

## Method

- Triage a choice before deliberating it. If an inviolable rule or the contract decides it, follow — do not re-derive. If it is reversible and low-stakes, pick the defensible option, state the assumption, proceed. Deliberate or ask only when genuinely open AND high-stakes/irreversible; re-litigating a settled choice is waste.
- For anything beyond a one-line fix, plan before editing: which files, what change, what verifies it. Use the `brain-plan` skill when it spans >2 files or shared behavior — `brain-idea` first if the approach itself is undecided; just act on small reversible changes.
- Before changing a shared symbol or behavior, find **all** call sites (your agent's reference/grep tool, `rg`, LSP references); don't edit the first match.
- Don't guess APIs, signatures, or flags — check the source or docs first; if you can't verify, say so rather than asserting.
- Every claim about code traces to source read this session — don't carry claims from memory or stale files; cite the file.
- When a check fails, read the full error and form a one-line hypothesis before editing; fix the cause, not the symptom. If `brain-worker` verification fails, debug methodically rather than patching symptoms (isolate the failure, form a hypothesis, fix the root cause, re-verify).

## Action & scope

- Default to acting on reversible, low-blast-radius changes.
- Ask first when a change alters product behavior, breaks a public API, is hard to undo (migrations, deletions, schema/contract changes), or adds/removes a dependency.
- Never without an explicit request: commit, push, amend, force, open PRs, or create new files/dependencies.
- State assumptions before acting on them; ask when blocked.
- Off-limits unless the task requires it: generated output, vendored code, lockfiles, unrelated diffs, and the user's existing changes.
- Preserve architecture, style, and public APIs unless told otherwise.

## Discovery

- Read before write; search before assume. Match nearby conventions exactly.
- Before editing a file, inspect its imports and immediate neighbors.
- Take bounded slices of large files (offset/limit); never dump them whole. Size first (`wc -l`), then slice.

## Memory (self-improving)

A markdown knowledge base at `<repo>/memory/` records verified decisions and confirmed facts/corrections so prior learning is recallable instead of re-derived. Concept files (`entries/*.md`) are the canonical source; `index.md` is a derived directory-listing regenerated by `python3 .agents/skills/brain-memory/memory.py rebuild` (never hand-edited); `archive/` holds retired concepts. Entries load only on trigger — never every run.

- **Read before acting:** before editing a shared/public symbol, changing an established decision, or re-trusting a rule that failed last run — grep `<repo>/memory/index.md` for the keyword, then read the matched concept. Re-verify before trusting: run `python3 .agents/skills/brain-memory/memory.py stale` and re-verify anything it lists.
- **Write on a memory event:** a retry after failure, a non-obvious fact confirmed from source/docs, a justified deviation from a stated rule, or a user correction. Hand each to the `brain-memory` skill, which applies the write gate (verified + load-bearing) and the one-in-one-out supersession rule.
- **Boundary vs `brain-feedback`:** brain-feedback changes a rule (always-on text in AGENTS.md or a skill); brain-memory records a recallable decision or fact that does not change a rule. If it belongs in always-on config, brain-feedback owns it; otherwise brain-memory owns it.

## Authoring agent files

- `AGENTS.md`, agent/skill/command prompts, and config are consumed by agents, not humans. Write dense, imperative, trigger-focused prose; match each file type's format.
- When a skill is added, renamed, removed, or materially changed, sync every reference to it in `AGENTS.md` and the sibling skills in the same pass — a dangling cross-reference is an unfinished edit (the `brain-author` skill enforces this).

## Shell & tool economy

Tool choice by intent — reach for the lightest tool that returns the signal:

| Intent | Tool |
|--------|------|
| Read / edit / bounded slice of a known file | your agent's read/edit tools (offset+limit, not shell truncation) |
| One-shot content search (where/what matches) | your agent's grep tool |
| One-shot file lookup by name or glob | your agent's glob/find tool |
| Matches as input to a pipeline (counts, cross-file aggregation) | `rg` / `fd` in a shell |
| Parse/transform JSON | `jq` |
| Parse/transform YAML / frontmatter | `yq` |
| Complex transforms or glue logic; fallback when no CLI fits | `python3 -c` |

- Batch independent read-only work as parallel tool calls in one message.
- Make each shell call do as much as safely combinable: pipe and chain to replace round-trips.
- Kill noise at the flag level so output is signal: `--no-pager`, `--color=never`/`NO_COLOR=1`, `-q`, `2>/dev/null`, `</dev/null`. Never invoke pagers, editors, or interactive prompts.
- Multi-step and destructive: `set -euo pipefail`, `mkdir -p`, `--dry-run` first; `rm -rf` only with explicit intent.
- Web only for current external APIs or facts not in the repo.

## Hot paths

Optimize speed and allocation only where a path is truly hot or the project's values demand it. Prefer readability everywhere else.
