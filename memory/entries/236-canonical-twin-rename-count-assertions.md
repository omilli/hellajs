---
type: fact
title: "registry jsx/html canonical twins diverge in whitespace and syntax — mechanical rename scripts must assert per-site match counts, never tolerate zero matches"
description: "Canonical twins (<name>.tsx / <name>-html.ts) drift in indentation and flavor syntax — a rename script that skips count==0 sites strands the old local; assert every replacement count."
tags: [ui, registry, canonical-twins, mechanical-edits, refactoring]
timestamp: 2026-09-30
last_confirmed: 2026-09-30
triggers: [canonical-twin-edits, rename-scripts, jsx-html-divergence, dangling-local, count-assertions]
---
# Why

Registry canonicals exist as near-identical twins per flavor, and batch renames over them read as mechanical — but the twins differ in exactly the places a string-replacement script matches: indentation depth (navigation-menu's `to: viewport,` sat at 6 spaces in the html twin vs 8 in the jsx-twin-shaped pattern), template syntax (sidebar-html's children call is a `${...}` interpolation; dropping the `$` turns the slot call into inert template text and the component mounts empty), and call shapes (`CommandEmpty({ children })` vs `<CommandEmpty>`). During plans/ui/code/tailwind-inline-all-strings, a rename script with a "skip count==0 for flavor-specific sites" tolerance silently skipped two sites; both surfaced only as runtime mount failures in the html test variants and one bundle tsc error — tests green on jsx, red on html, with no diff hinting at the skipped line. A second silent catch: the `caretWrap` local survived a rename sweep because the transform's masking bug hid its binding — the registry.test.ts sweep guard (added by that plan) is what made it visible.

# Evidence

2026-09-30, same plan unit: `bun test packages/ui/tests/sidebar.test.ts` failed 12 html-variant cases with `root: null` after `>{props.children({ open, setOpen, mobile: isMobile, ...` lost its `$` (jsx twin green); `navigation-menu` html variants failed until `      to: portalTarget,` (6-space indent) replaced the skipped `to: viewport,`; `bun bundle ui` tsc gate reported the skipped `to:` as TS2304. After fixing both sites to assert count==1: full ui suite 2779 pass / 0 fail, sweep test.each 117/117 green.
