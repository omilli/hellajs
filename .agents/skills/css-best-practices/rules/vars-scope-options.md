---
title: Scope, prefix, and name vars through the options
impact: MEDIUM
impactDescription: hand-flattened kebab names and trailing-hyphen prefixes double-hyphen the emitted custom properties, and the default scope ships tokens on :root when a narrower scope was meant
tags: vars, scope, prefix, media, layer
---

## Scope, prefix, and name vars through the options

Name derivation is fixed: nested object keys flatten to dot-joined paths, dots become hyphens, camelCase and letter-digit boundaries hyphenate, and the name lowercases, all at emission (`primaryForeground` becomes `--primary-foreground`). Author keys in their natural shape and let the options do the scoping work: `scoped` overrides the default `:root` scope with any selector, `prefix` namespaces every name (its trailing hyphen is inserted for you, so pass `"brand"`, not `"brand-"`), `media` wraps the scope block in the condition, and `layer` wraps outermost of media. Calls sharing one scope, media, and layer merge into one bucket; different combinations coexist as separate buckets.

**Incorrect (what is wrong):**

```ts
import { vars } from "@hellajs/css";

// Trailing hyphen in the prefix doubles up: "--brand--accent"
vars({
  accent: "#3b82f6",
}, {
  prefix: "brand-",
});
```

**Correct (what is right):**

```ts
import { vars } from "@hellajs/css";

// "--brand-accent", scoped to .panel, dark-scheme only
vars({
  accent: "#3b82f6",
}, {
  prefix: "brand",
  scoped: ".panel",
  media: "(prefers-color-scheme: dark)",
});
```

Reference: `packages/css/lib/internal/vars.ts resolveVarsOptions` and `packages/css/lib/internal/vars.ts kebabVarName` and `packages/css/docs/api/vars.mdx`
