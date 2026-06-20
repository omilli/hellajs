## [ ] Guide — wrapper-function overload carveout
**Type:** Docs

### Depends On
- None

### Objective
`./guides/code.md` § Functions & Modules carves out an explicit exception to the "never wrapper" rule for TypeScript overload implementations that forward to an internal factory.

### Solution
The audit hit a real conflict. `packages/store/lib/store.ts:72-76` is the implementation signature of five public overloads of `store`, and its entire body is `return createStore(initial, options);`. The guide's hard rule ("Never create wrapper functions that only call through to another function") flags this as a violation. But TypeScript overload semantics require the implementation signature to be a real function body, and the guide separately mandates ("Internal functions use a single signature — overloads are a public API concern") that overloads live on the public symbol while the impl lives in a separate internal factory. Those two rules jointly *require* the thin forwarding wrapper — there is no way to satisfy both without it.

Edit `./guides/code.md`, `### Functions & Modules` section. After the existing "Never create wrapper functions that only call through to another function" bullet, add a new bullet:
```
- Exception: TypeScript overload implementations. When public overload signatures live on one function and the implementation forwards to an internal factory, the thin forwarding body is structural — required by overload semantics and the public-vs-internal split. The wrapper must add no logic beyond argument forwarding; any real work belongs in the factory.
```

This makes three things explicit: (1) the wrapper ban targets avoidable indirection, not structural requirements of the language, (2) the forwarding body must be argument-only (no guards, no defaults, no transforms — those go in the factory), (3) the existing overload-vs-internal rule still holds. No other section is touched.

Trade-offs: keeping the ban strict would force `createStore`'s ~100-line body and all five overload signatures into a single file, which conflicts with the 80-line function limit and the "public overloads on the public symbol" rule. The carveout resolves the tension in favor of the existing architectural split. Reference general TypeScript overload principles only — no explicit package code.

### Definition of Done
- [ ] `bun check store` exits 0
- [ ] `bun lint` exits 0
- [ ] The `### Functions & Modules` section of `./guides/code.md` contains a bullet addressing overload-implementation forwarding wrappers
- [ ] The bullet states that the forwarding body must add no logic beyond argument forwarding
- [ ] The bullet references TypeScript overload semantics as the justification
- [ ] Does `rg "Exception: TypeScript overload implementations" guides/code.md` find the new bullet?
- [ ] Does the edit leave the existing "Never create wrapper functions" bullet and the "Internal functions use a single signature" bullet intact?
