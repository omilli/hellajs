---
applyTo: "packages/router/**"
---

<router-package-instructions>
  <overview>
    Reactive client-side routing with nested routes, lifecycle hooks, parameter inheritance, and History API support.
  </overview>
  <mental-model>
    <concept>router() initializes route map, hooks, and browser history listeners</concept>
    <concept>route() is a reactive signal exposing current path, params, query, and handler</concept>
    <concept>navigate() provides programmatic navigation with parameter substitution and query strings</concept>
    <concept>Resolution uses strict priority order: redirects → nested → flat → notFound</concept>
  </mental-model>
  <architecture>
    <key-components>
      <component name="router.ts">Initialization, history API integration, resolution orchestration</component>
      <component name="match.ts">Pattern matching engine with nested route recursion</component>
      <component name="navigate.ts">Parameter substitution and query string serialization</component>
      <component name="hooks.ts">Lifecycle execution with non-blocking error handling</component>
      <component name="state.ts">Seven signals (routes, hooks, redirects, notFound, mode, scrollBehavior, previousPath)</component>
      <component name="utils.ts">Type guards, sorting, and route resolution logic</component>
    </key-components>
    <key-algorithms>
      <algorithm name="route-resolution">
        <purpose>Resolve a path to a handler following strict priority order</purpose>
        <step>Global redirects from redirects array (exact path match)</step>
        <step>String redirects in route map (pattern match)</step>
        <step>Nested routes sorted by specificity (recursive matching)</step>
        <step>Flat routes (simple pattern match)</step>
        <step>notFound handler</step>
        <ordering>Nested routes sorted: non-wildcard before wildcard, deeper paths before shallow. Flat routes match in object entry order.</ordering>
      </algorithm>
      <algorithm name="hook-execution">
        <purpose>Run lifecycle hooks around the handler in a deterministic order</purpose>
        <order>global.before → parent.before → child.before → handler → child.after → parent.after → global.after</order>
        <note>After hooks execute in reverse (LIFO cleanup order)</note>
      </algorithm>
    </key-algorithms>
  </architecture>
  <performance>
    <optimization name="empty-object-reuse">Frozen {} returned for routes without params/query</optimization>
    <optimization name="hasparams-flag">Defers object allocation until dynamic segment matched</optimization>
    <optimization name="early-exits">Redirect checks before expensive nested matching</optimization>
    <optimization name="single-signal">Route map stored in a single signal, not per-route subscriptions</optimization>
  </performance>
  <non-obvious-behaviors>
    <behavior>queueMicrotask on init — first updateRoute() deferred to prevent race with signal subscriptions</behavior>
    <behavior>Hooks never block navigation — all errors caught and logged, navigation completes regardless</behavior>
    <behavior>Function arity affects param passing — 2+ arity with no params gets (undefined, query), otherwise (query)</behavior>
    <behavior>Wildcard captures without leading slash — /files/* with /files/docs/readme.md → params["*"] = "docs/readme.md"</behavior>
    <behavior>Nested params inherit via spread — child overrides parent if same key</behavior>
    <behavior>Flat routes not sorted by specificity — order specific routes before generic ones in the routes object</behavior>
    <behavior>Scroll skipped on initial load — previousPath initialized to current path, first navigation detects from === to</behavior>
    <behavior>Meta from final matched route only — leaf route's meta exposed on route signal, not inherited from parents</behavior>
    <behavior>Listener cleanup on re-init — calling router() again removes previous event listeners</behavior>
    <behavior>Atomic route writes — route() updates path, handler, params, query, meta, and crumbs in a single signal write. Effects never observe a partially-updated RouteInfo; go(), popstate, and hashchange all funnel through updateRoute(nextPath, ...) which writes the resolved match once. The init-time pre-write at router.ts:35-40 is the only non-atomic write, and it is harmless (skipped on re-init via the handler guard, no subscribers on first init).</behavior>
  </non-obvious-behaviors>
</router-package-instructions>
