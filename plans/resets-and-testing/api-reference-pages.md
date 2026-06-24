## [ ] Add and rename API-reference pages for resets and the mount handle
**Type:** Docs

### Depends On
- Rename css reset/remove family to resetCss/removeCss convention
- Add resetResource nuke
- Add resetRouter nuke
- Add resetDom nuke and mount lifecycle handle

### Objective
Every new and renamed public symbol has an API-reference page matching its export name, and `mount.mdx` documents the lifecycle handle.

### Solution
Per the Function Doc template in `guides/docs.md`: no frontmatter on package docs; website wrappers carry `title`/`description`/`layout`; `# Title` matches the export name; `## API` signature + self-contained `## Basic Usage` with imports.

**New package docs + website wrappers:**
- `packages/resource/docs/api/resetresource.mdx` → `docs/src/pages/reference/resource/resetresource.mdx`
- `packages/router/docs/api/resetrouter.mdx` → `docs/src/pages/reference/router/resetrouter.mdx`
- `packages/dom/docs/api/resetdom.mdx` → `docs/src/pages/reference/dom/resetdom.mdx`
- `packages/core/docs/api/flush.mdx` → `docs/src/pages/reference/core/flush.mdx` (core has no `flush.mdx` today)

Each new reset page documents the real-world nuke use cases (HMR, session reset, logout, error recovery, testing) in `## Key Concepts`, and explicitly notes which state it clears (so users know what `resetResource` covers vs `resourceCache.invalidateAll`, and that `resetDom` clears error handlers).

**Rename css package docs + wrappers** (match the new export names, both source and wrapper):
- `cssreset.mdx` → `resetcss.mdx`; `cssvarsreset.mdx` → `resetcssvars.mdx`; `cssremove.mdx` → `removecss.mdx`; `cssvarsremove.mdx` → `removecssvars.mdx`. Update the `# Title` and every cross-reference inside each.

**Update `packages/dom/docs/api/mount.mdx`:** document the `MountHandle` return (`container`, `flush()`, `unmount()`) — add a method-style `###` block under `## Key Concepts` (or `## API` if the return type warrants it) with a usage example showing `const app = mount(…); app.flush(); app.unmount();`.

### Definition of Done
- [ ] Every code example in the changed/added `.mdx` files compiles against the current source signatures
- [ ] The Function Doc template from `./guides/docs.md` is used for every new/changed API page
- [ ] Package docs (`packages/*/docs/**/*.mdx`) have no frontmatter; website wrappers (`docs/src/pages/**/*.mdx`) have `title`, `description`, `layout`
- [ ] No claim contradicts the implementation — each reset's stated cleared-state cross-checked against its source; the mount handle cross-checked against `mount.ts`
- [ ] Every new/renamed file name matches its export name (lowercase): `resetresource`, `resetrouter`, `resetdom`, `flush`, `resetcss`, `resetcssvars`, `removecss`, `removecssvars`
