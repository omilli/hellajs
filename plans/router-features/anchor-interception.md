## [ ] Anchor click interception with opt-out config flag

### Depends On
None

### Objective
A global delegated `click` listener on `document` intercepts same-origin internal `<a href>` clicks and routes them through `navigate()`, enabled by default with `router({ intercept: false })` to opt out — closing the anchor-interception gap every competitor in `router-comparison.md` ships.

### Sub-tasks

#### [ ] Intercept listener and config flag (Code)
**Solution:**
Add `intercept?: boolean` to `RouterConfig` in `packages/router/lib/types.d.ts:77-90`. Default is `true` (interception on). The field is read once during `router()` initialization alongside `mode` (`packages/router/lib/router.ts:20-21`).

In `packages/router/lib/router.ts`, extend the existing listener-setup block (currently lines 41-64) to also attach a `click` listener on `document` when `config.intercept !== false` and `hasWindow()` is true. Store its cleanup alongside the existing `cleanupListener` so re-calling `router()` removes both the route listener and the click listener (preserves the "Listener cleanup on re-init" property documented in `packages/router/AGENTS.md`).

Click handler contract — same-origin internal links only:

- Walk up from `event.target` to find the closest `A` tag (`event.target instanceof Element ? event.target.closest("a") : null`). Skip if none.
- Skip if `event.defaultPrevented` — another handler already claimed it.
- Skip if any modifier key is held (`event.metaKey || event.ctrlKey || event.shiftKey || event.altKey`). These are explicit user intent to open in a new tab/window.
- Skip if `anchor.target === "_blank"` or any non-`_self` target — respects author intent.
- Skip if `anchor.download` is set — explicit download intent.
- Skip if the `href` is cross-origin: compare `new URL(anchor.href, window.location.href).origin` against `window.location.origin`. Use `new URL` to normalize relative hrefs.
- Skip if the `href` starts with a non-http(s) scheme (`mailto:`, `tel:`, `javascript:`, etc.). Check the `protocol` field of the parsed URL — only `http:`, `https:`, or same-page (`""`) proceed.
- Skip if the resolved path matches the current path and the user wants to preserve the browser's default scroll-to-top — leave this as a follow-up; for now, intercepting same-path clicks is harmless (the route signal already deduplicates identical paths in `go()` via `previousPath` checks in `lib/internal/matched.ts:20`).
- Otherwise: `event.preventDefault()` and call `navigate(resolvedPath)` where `resolvedPath` is `parsedURL.pathname + parsedURL.search + parsedURL.hash`. In hash mode, strip the leading `#` and route through `navigate()` as well.

The listener attaches to `document` (not `window`) because `click` events bubble to `document`, not `window`. One listener handles every anchor — zero per-anchor ceremony.

Hash mode interaction: when `mode === "hash"`, internal links typically use `href="#/path"`. The interceptor parses these, extracts `/path` from the hash, and calls `navigate("/path")`. The existing `navigate()` already prepends `#` in hash mode (`packages/router/lib/utils.ts:75-76`).

New file `packages/router/lib/intercept.ts` is **not** warranted — the listener is short and belongs alongside the existing `popstate`/`hashchange` setup in `router.ts`. Keeping it inline preserves the single-file initialization story and avoids a new internal module.

No new runtime dependencies. The router already uses `window.addEventListener` / `window.removeEventListener`; adding `document.addEventListener` / `document.removeEventListener` is the same DOM-listener territory.

Cited evidence: `comparison` Section 5 verdict ("HellaJS does not intercept `<a href>` clicks"); `comparison` Section 8 Features Matrix row "Anchor interception: No" vs every competitor "Yes"; `comparison` Bottom Line ("no anchor interception"); `file` `packages/router/docs/api/router.mdx:199-209` (manual `e:click` workaround documented as a Consideration); `file` `packages/router/docs/concepts/routing.mdx:289-292` (alert box acknowledging the limitation); `file` `packages/router/lib/router.ts:62-63` (existing listener cleanup pattern to extend).

**Breaking change — changeset required.** Default-on interception shifts behavior for every existing user: `<a href="/about">` previously triggered a full page reload, now triggers client-side navigation. Any user who colocated SPA routes with non-SPA pages on the same origin and relied on the full reload must now set `intercept: false`. The changeset goes at `.changeset/router-intercept-default.md` and flags the semver-minor-or-major decision (recommend major given the default behavior shift).

**Definition of Done:**
- [ ] `bun check router` exits 0
- [ ] `bun lint` exits 0
- [ ] Every new or changed exported symbol has JSDoc (`@internal` where the symbol is not re-exported by the package's `index.ts`)
- [ ] No new runtime dependency, OR the dependency is justified in Solution and a changeset exists
- [ ] Backward compatible, OR a changeset exists at `.changeset/*.md` describing the break
- [ ] Audit skill run on the changed files reports no deviations from `./guides/code.md`

#### [ ] Interception test suite (Tests)
**Solution:**
New file `packages/router/tests/intercept.test.ts`. Covers:

- Same-origin `<a href="/about">` click calls `event.preventDefault` exactly once and updates `route().path` to `/about` (verified via a real `<a>` element dispatched via `el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))`).
- Cross-origin link (`<a href="https://external.example/path">`) click does **not** call `preventDefault` and does **not** change `route().path`.
- `mailto:` / `tel:` links are not intercepted.
- Modifier-key clicks (`metaKey`, `ctrlKey`, `shiftKey`, `altKey`) are not intercepted — one `test.each` over the four modifier flags.
- `target="_blank"` is not intercepted.
- `download` attribute set is not intercepted.
- `router({ intercept: false })` disables interception entirely — click falls through to the browser default (no `preventDefault`).
- Re-calling `router()` removes the previous click listener (assert via mocked `document.removeEventListener` call count, following the pattern in `packages/router/tests/history.test.ts:17-48`).
- Hash mode: `<a href="#/path">` click resolves to `route().path === "/path"`.

Mock pattern per `guides/tests.md`: use `mock()` for `preventDefault` call tracking (no boolean flags). Restore `document.addEventListener` / `document.removeEventListener` in `afterEach` if patched. Follow the existing save/restore discipline from `tests/features-scroll.test.ts:11-24`.

Cited evidence: `test` missing — no `tests/intercept*.test.ts` exists; the gap is the mirror of the `comparison` Section 5 + Bottom Line callout.

**Definition of Done:**
- [ ] `bun check router` exits 0
- [ ] `bun coverage` shows 100% coverage on the changed source lines (`packages/router/lib/router.ts` intercept block — name the line range in the commit message)
- [ ] Overall coverage is not lower than before this task
- [ ] No anti-pattern from `./guides/tests.md`: `jest.fn` / `vi.fn`, `any`, `it()` / `test.skip`, `await tick()` without `0`, `await tick(); await tick()`, boolean-flag or pure-integer call counters, helpers duplicated across files
- [ ] Every new test asserts a behavior the source actually exposes — cross-checked against the implementation

#### [ ] Interception docs (Docs)
**Solution:**
Update `packages/router/docs/api/router.mdx` — replace the "Link Interception" Important Consideration (currently lines 199-209) with a `### Link Interception` section under `## Key Concepts` describing the default-on behavior, the opt-out flag, modifier-key passthrough, and how cross-origin / non-http links are skipped. Include a copy-pasteable example showing `router({ intercept: false })` and one showing the default intercept with plain `<a href>` tags.

Update `packages/router/docs/concepts/routing.mdx:289-292` — replace the `<div role="alert">` warning (which currently tells users interception is missing) with a note that interception is on by default and how to disable it.

Add a `### SPA Link Interception` pattern to `packages/router/docs/patterns/routing.mdx` showing the common cases: plain internal links work out of the box, `intercept: false` for hybrid SPA + MPA apps, modifier-key behavior for power users.

Update `packages/router/docs/index.mdx` API section to mention the `intercept` config field if space permits (otherwise leave to the `router` API doc).

Cited evidence: `file` `packages/router/docs/api/router.mdx:199-209` (the workaround to replace); `file` `packages/router/docs/concepts/routing.mdx:289-292` (the alert box to replace); `file` `packages/router/docs/patterns/routing.mdx` (no SPA-link pattern exists).

**Definition of Done:**
- [ ] Every code example in the changed files compiles against the current source signatures
- [ ] The correct template from `./guides/docs.md` was used (Function / Prefix / Concept / Pattern / Index)
- [ ] Package docs (`packages/*/docs/**/*.mdx`) have no frontmatter
- [ ] Website wrapper pages (`docs/src/pages/**/*.mdx`) have `title`, `description`, and `layout`
- [ ] No claim in the changed docs contradicts the implementation — cross-checked against source and tests
- [ ] File name matches the export name (API docs) or is lowercase-hyphenated (concepts / patterns)
