---
title: Read the registry and config through the API, never stale copies
impact: LOW
impactDescription: hardcoding the component catalog or re-parsing registry.json drifts as the registry ships new entries
tags: loadRegistry, readConfig, listComponents, manifest
---

## Read the registry and config through the API, never stale copies

The registry ships as data (`registry/registry.json`, entries keyed by name with shared `files`/`deps` and per-style slots), and the package exposes it directly: `loadRegistry()` returns the parsed manifest, `listComponents()` the sorted names, `readConfig(dir)` the effective copy plan for a project root. Generators, docs tooling, and migration scripts should read these at run time - a hardcoded name list or a hand-copied manifest goes stale the moment the registry ships a new entry. Per-style details (extra deps, registry dependencies, the `darkFiles` substitution map) live on each entry's `styles` slot.

**Incorrect (what is wrong):**

```ts
// Hardcoded catalog drifts silently: the registry ships new entries across
// releases, and the script keeps scaffolding from a stale snapshot.
const COMPONENTS = ["button", "card", "dialog"];
```

**Correct (what is right):**

```ts
import { listComponents, loadRegistry, readConfig } from "@hellajs/ui";

const names: string[] = listComponents(); // the live catalog, sorted
const manifest = loadRegistry(); // RegistryManifest: entries keyed by name
const dialogDeps: string[] = manifest.entries["dialog"]!.deps ?? [];
const plan = readConfig(); // the effective copy plan for this root
const flavor: string = plan.style;
```

Reference: `packages/ui/lib/loadRegistry.ts loadRegistry` and `packages/ui/lib/internal/config.ts readConfig` and `packages/ui/lib/types.d.ts`
