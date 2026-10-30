---
title: "Never seed open portaled state: a Portal resolving during the initial mount walk runs before sibling-rendered targets attach"
description: "A factory option that starts a panel open (a defaultValue-style seed) makes its Portal's first effect run query the portal target during the initial mount walk, before a root-appended target later in the same tree attaches; the target query throws and the panel never mounts. Portaled surfaces must start closed and open only after mount."
tags: [dom, portals, headless, factories, mount-walk, navigation-menu]
confirmed: 2026-10-30
---
# Why

`Portal` (`packages/dom/lib/Portal.ts`) registers its target query inside `registry.addEffect(anchor, ...)`; the effect's first run does `document.querySelector(to)` and throws `[dom] Portal: target "<to>" not found in document` when it misses. That first run fires during the initial mount walk, in document order. When a portaled component (e.g. a navigation-menu `Content`) is seeded open at construction time and its portal target is a slot the same tree renders LATER (a navigation-menu root appends the shared viewport as its last child), the query runs before the target div attaches, the effect throws, and the portal never mounts - the region stays empty for the component's lifetime. Any factory whose parts portal into a slot the factory's own root appends must keep the store closed at construction: open only through post-mount interaction or a controller write after mount.

# Evidence

Reproduced with a scratch probe against a factory-seeded open panel: `stderr: [dom] Error: [dom] Portal: target "[data-slot='navigation-menu-viewport']" not found in document` at `packages/dom/dist/Portal.js` effectFn, while the viewport div exists in the DOM after the walk completes (`VIEWPORT: 1`, `CONTENT: 0` in the probe output). Source: `packages/dom/lib/Portal.ts` - the `addEffect` body queries the target at first run with no retry. Post-mount activation (dispatching after `awaitWiring`) portals correctly, which is why click-driven flows never see this. Confirmed 2026-10-30 while lifting the navigation-menu template into `packages/headless/lib/navigationMenu.tsx`; the factory ships no seed option for exactly this reason (its docs carry the user-facing form under "No Panels Open on the First Render").
