| prefix | title | impact | description |
|---|---|---|---|
| target | Target selection | CRITICAL | environment-driven dom/ast choice: imperative runtime for the client, HellaNode for the server, explicit target at every call site |
| xform | Calling transform | MEDIUM | options surface and call-time validation, the empty-input probe, lang resolution for virtual ids, the null JSX-free return |
| pipe | Pipeline contract | HIGH | strip-not-typecheck, consuming the already-chained sourcemap, structural output assertions over byte goldens |
| wrap | Direct use vs wrappers | MEDIUM | when vite/rollup wrappers own the integration, and the full contract a direct caller inherits |
