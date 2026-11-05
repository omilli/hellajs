---
title: Plugin-skill rule fences are wholesale skipped by skills-check - zero typecheck blocks is the expected state
description: "vp run skills-check drops every rule-file fence importing a non-@hellajs/* bare specifier (hellajs-compiler, vite, vite-plugin-hellajs, ...), so plugin-target skills contribute zero typecheckable blocks - validation-only coverage, never a gate bug to chase."
tags: [skills-check, skills-build, best-practices-skills, plugins, snippets, skip-policy]
confirmed: 2026-11-05
---

# Why

A `*-best-practices` skill for a plugin target (compiler, vite, rollup, astro) writes Correct fences from the consumer's perspective: `import { transform } from "hellajs-compiler"`, `import hellajs from "vite-plugin-hellajs"`. skills-check's `checkableBlocks` drops any block carrying an external-bare-specifier import, and `EXTERNAL_IMPORT_RE` defines external as everything outside `@hellajs/*` - plugin specifiers included. The typecheck path map (`PACKAGES` = core, dom, css, resource, router, store, ssr) cannot resolve a plugin specifier anyway, so no authoring shape makes these fences typecheck. Consequences: (1) the gate's "N rule file(s)" count excludes rule files whose every fence is external-import - a plugin skill adding 10 rule files moves the compiled rule total but not the checked-file count, and that is correct, not a skip-policy leak; (2) a plugin skill's fences are covered by skills-build's structural validation only (frontmatter, H2, fence presence, Reference resolvability), so claim accuracy rests on the authoring pass, never on the type gate; (3) never contort a fence with a fake `@hellajs/*` import just to get it counted - the import must stay real to the example.

# Evidence

- `scripts/snippets/emit.ts` `EXTERNAL_IMPORT_RE = /^import\s[^"']*from\s+["'](?!@hellajs\/)[^"']+["']/` (negative lookahead admits only `@hellajs/`); `scripts/skills-check.ts` `checkableBlocks` returns false for blocks whose imports match it; `scripts/snippets/tsc.ts` `writeTsconfig` path-maps only `PACKAGES = ["core", "dom", "css", "resource", "router", "store", "ssr"]` (read in-repo, 2026-11-05).
- Observed on the compiler-best-practices delivery (2026-11-05): `vp run skills-build` reported "compiled 10 skill(s), 210 rule(s)" while `vp run skills-check` reported "checked 10 skill(s), 198 rule file(s), 198 blocks (0 findings)" - the compiler skill's 10 all-external-import rule files validated structurally but contributed no typecheck blocks.
