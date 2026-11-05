---
title: Configure the global LRU through setConfig
impact: LOW
impactDescription: mutating the config object returned by resourceCache.config is a silent no-op against a copy, so size limits never change and eviction runs at the defaults
tags: setConfig, config, maxSize, enableLRU, LRU, cleanup
---

## Configure the global LRU through setConfig

The cache ships with `maxSize: 1000` and `enableLRU: true` globally, across every fetcher scope at once. `resourceCache.config` returns a copy - mutating it changes nothing; `resourceCache.setConfig({ maxSize, enableLRU })` is the only write path (validates types, rejects leaving the old config intact). Eviction is lazy: it runs when a cache write pushes the total entry count over `maxSize`, evicting least-recently-accessed entries first (`resourceCache.get` refreshes `lastAccess`; `resourceCache.map.get` does not). `cleanup()` batches expired-entry deletion and is throttled to one pass per 60 seconds with a 100-entry cap.

**Incorrect (what is wrong):**

```ts
import { resourceCache } from "@hellajs/resource";

// config returns a copy: assigning through it is a silent no-op
resourceCache.config.maxSize = 5000;
console.log(resourceCache.config.maxSize); // still 1000
```

**Correct (what is right):**

```ts
import { resourceCache } from "@hellajs/resource";

resourceCache.setConfig({ maxSize: 5000, enableLRU: true });
const size = resourceCache.map.size; // total entries across all fetcher scopes
console.log(size, resourceCache.config.maxSize); // 5000
```

Reference: `packages/resource/lib/resourceCache.ts setConfig` and `packages/resource/tests/cache.test.ts`
