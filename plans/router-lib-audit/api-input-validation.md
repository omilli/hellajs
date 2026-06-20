## [ ] Public API input validation
**Type:** Code

### Depends On
- In-place style fixes

### Objective
The public entry points `router()` and `navigate()` validate their inputs and throw an `Error` shaped `[router] fn: <constraint>, received <value>` on invalid input — failing fast at the boundary instead of corrupting internal signals or producing malformed URLs.

### Solution
Add guards at the top of each public entry point, per `./guides/code.md` § Error Handling. Internal functions remain unguarded (trusted callers). Runs after `in-place-style-fixes` so the `router.ts` import collapse lands first.

`router(config: RouterConfig)` at `router.ts:14` — before touching `config.routes`, validate:
- If `config == null` (null or undefined): throw `new Error("[router] router: config is required, received " + config)`.
- If `config.routes == null || typeof config.routes !== "object"`: throw `new Error("[router] router: config.routes must be an object, received " + typeof config.routes)`.
Leave `hooks`, `redirects`, `notFound`, `mode`, `scrollBehavior` unvalidated — they are optional and already defaulted via `|| {}` / `|| []` / `|| null` inside the body, which is the documented handling for genuinely-optional fields.

`navigate<T extends string>(path, options)` at `navigate.ts:10` — at the top:
- If `typeof path !== "string"`: throw `new Error("[router] navigate: path must be a string, received " + typeof path)`.
- If `path === ""`: throw `new Error("[router] navigate: path is required, received empty string")`.
Leave `options` unvalidated beyond the existing defaults — its shape is enforced by `NavigateOptions<T>` and every field is optional/defaulted.

Behavior change: code that previously called `router(undefined)` or `navigate(123 as any)` and failed late (or silently seeded an empty route map) now throws at the boundary. Create a changeset at `.changeset/router-input-validation.md` describing the new validation; mark `@hellajs/router` as a breaking change (major) since prior calls with invalid inputs failed differently or silently misbehaved.

Trade-offs: TS typing already prevents most misuse at compile time, so the runtime guards primarily protect loose-JS and `as any` callers. The guide is unconditional ("Public API functions validate inputs"), and the cost is two cheap `typeof` checks on a cold path.

### Definition of Done
- [ ] `bun check router` exits 0
- [ ] `bun lint` exits 0
- [ ] Every changed exported symbol has JSDoc (`@internal` where not re-exported by `index.ts`)
- [ ] No new runtime dependency
- [ ] A changeset exists at `.changeset/*.md` describing the breaking input-validation behavior change for `@hellajs/router` (major version bump)
- [ ] Audit skill on changed lines reports no deviations from `./guides/code.md`
- [ ] Does `rg "\[router\]" packages/router/lib/` find guard messages for both `router` and `navigate`?
- [ ] Does each guard message include the literal substring `received `?
- [ ] Does `router(null)` throw (not return) and does `navigate(123 as any)` throw (not return)?
