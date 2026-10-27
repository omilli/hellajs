---
title: Never leave a dynamic import() call alone on a line in doc code blocks
description: "scripts/doc-snippets.ts splitImports tears a line-initial dynamic import() out of its block as if it were an import statement, mangling the enclosing declaration (TS2355/TS2304) — keep import() inline in an expression or behind an await assignment."
tags: [doc-snippets, docs, dynamic-import, code-blocks]
confirmed: 2026-01-29
---

# Why

`splitImports` in `scripts/doc-snippets.ts` classifies any line-initial `import(...)` as an import statement and hoists it out of the block body to the emitted module top. When the call is the body of an arrow (`const load = (): Promise<T> =>\n  import("./x").then(...)`), the declaration left inside the block loses its body: the run reports TS2355 (declared type must return a value) on the dangling arrow and TS2304 on names whose bindings moved to module scope. A doc can go from clean to failing without any type-level error in the source snippet.

# Evidence

Rewriting `packages/dom/docs/api/lazy.mdx` (2026-01-29): a block defining `const loadProfile = (): Promise<ComponentFn> => import("./UserProfile").then((mod) => mod.default);` with the `import(` at line start produced `TS2304: Cannot find name 'loadProfile'` plus `TS2355` in `packages_dom_docs_api_lazy_mdx.tsx`; inspecting the emitted module showed the `import("./UserProfile").then(...)` line hoisted above `__doc()` and separated from its arrow. Restructuring to `const mod = await import("./UserProfile");` (line starts with `const`) and keeping `import(...)` inline inside JSX attributes (`loader={() => import("./Heavy").then(m => m.default)}`) typechecks clean. Attribute-position import() was already the shape of every pre-existing passing example.
