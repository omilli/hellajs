# [x] Unit 1 — @hellajs/ssr emits `<!--[-->…<!--]-->` markers around dynamic regions

## Scope

- **Gap:** `ssr()` emits clean HTML with no region markers, forcing `hydrate()` to infer dynamic-region boundaries by structural cursor walk (the coalescing/adoption-limit/cursor-fragility tax documented in memory/010, 012, and audit C1/C3). Target: `ssr()` wraps every dynamic region in a `<!--[-->…<!--]-->` comment-marker pair so hydrate can locate regions unambiguously.
- **Surface: yes (BREAKING)** — `ssr()` output changes (markers in the HTML). Atomic Code + Tests + Docs.
- **Type:** Code + Tests + Docs.
- **Depends on:** nothing (defines the contract Units 2 + 3 consume).

## [x] Code

**File:** `packages/ssr/lib/ssr.ts` — `walkChild` (+ module-level marker constants).

**Marker constants** (near `VOID`):
```typescript
/** SSR region-boundary markers — parsed to Comment nodes (nodeValue `[` / `]`) that hydrate locates. */
const MARK_OPEN = "<!--[-->";
const MARK_CLOSE = "<!--]-->";
```

**Wrapping rule (the contract):**
| Child kind | Marked? | Why |
|---|---|---|
| static string / number | no | unambiguous, consumed by position |
| reactive child (function, non-dynamic) | **yes** | value can change → needs a bounded region (solves coalescing) |
| isDynamic child (ForEach/Transition/Portal/Lazy) | **yes** | variable/conditional extent |
| HellaNode element (`tag !== "$"`) | no | element-bounded, unambiguous |
| HellaNode fragment (`tag === "$"`) nested among siblings | **yes** | extent ambiguous (no wrapper element) |

**Delta — restructure `walkChild`** so every marked kind computes a `body` then returns `MARK_OPEN + body + MARK_CLOSE`; unmarked kinds return as today. The function branch becomes:

```typescript
if (typeof child === "function") {
  let body = "";
  if ((child as DynamicFn).isDynamic) {
    const meta = (child as DynamicFn).ssr;
    if (!meta) return "";                          // user-authored isDynamic, no ssr — no region
    const props = meta.props as Record<string, unknown>;
    switch (meta.kind) {
      case "forEach": { /* build into body via cached while loop — same logic as today */ break; }
      case "transition": body = resolveValue(props.show) ? walkChild(props.children as HellaChild) : ""; break;
      case "portal": body = ""; break;             // marker pair present, empty body
      case "lazy": body = props.loading !== undefined ? walkChild(props.loading as HellaChild) : ""; break;
      default: body = "";
    }
  } else {
    const resolved = resolveValue(child);
    body = (resolved !== null && typeof resolved === "object" && (resolved as HellaNode).tag !== undefined)
      ? ssr(resolved as HellaNode)
      : escapeText(resolved === false || resolved === null || resolved === undefined ? "" : `${resolved}`);
  }
  return MARK_OPEN + body + MARK_CLOSE;
}
```

The object branch gains fragment marking:
```typescript
if (typeof child === "object" && (child as HellaNode).tag !== undefined) {
  const node = child as HellaNode;
  if (node.tag === "$") return MARK_OPEN + walkChildren(node.children) + MARK_CLOSE;
  return ssr(node);                                 // element — no marker
}
```

**`ssr(node)` top-level** and **`walkChildren`** are UNCHANGED — markers are between children only; the root element is never wrapped. `forEach`'s `out`-building loop stays a cached `while`; only its return becomes `body = out; break` so the caller wraps.

**Strategy:** always wrap reactive children (even when they resolve to an element) for walker uniformity — every reactive child is exactly one marked region. The 2-comment payload per dynamic region is trivial and invisible to users. Keep `MARK_OPEN`/`MARK_CLOSE` as module consts (≥2 callsites — `walkChild` + fragment branch). No new exports; `ssr` is still the only export.

- [x] `MARK_OPEN`/`MARK_CLOSE` constants added; `walkChild` wraps reactive + isDynamic + fragment children. — `packages/ssr/lib/ssr.ts` `const MARK_OPEN = "<!--[-->"; const MARK_CLOSE = "<!--]-->";`.
- [x] Static string/number/element children are NOT wrapped (byte-identical to today for those paths). — walkChild string/number/object-element branches unwrapped.
- [x] **C1 fix (added during execution):** `renderDynamic` extracted (2 callsites: direct-isDynamic + reactive-resolved-isDynamic) so a reactive getter returning an isDynamic component (`() => ForEach({...})`) renders its items, not the function source. — `renderDynamic(meta)` + the `typeof resolved === "function" && resolved.isDynamic` branch.
- [x] `ssr()` remains the sole export; zero runtime `@hellajs/*` imports preserved. — `rg '^import \{' packages/ssr/lib` = only `import type`.

## [x] Tests

**File:** `packages/ssr/tests/ssr.test.ts` — update every expectation whose input contains a dynamic region, and add marker-placement tests.

**Update (expectations change because markers now appear):**
- "inlines current signal value" → `ssr(html\`<p>${count}</p>\`)` becomes `"<p><!--[-->5<!--]--></p>"`.
- "renders bind directive's initial signal value" — `bind:` is an ATTRIBUTE (on the open tag), not a child → UNCHANGED (`<input value="x">`). Verify this expectation stays (bind is not a child region).
- forEach/transition/lazy scenarios → their inner content gets wrapped: e.g. forEach → `"<ul><!--[--><li>1</li><li>2</li><li>3</li><!--]--></ul>"`.
- "renders a HellaNode returned by a reactive child" → wrapped.
- "renders nothing for an isDynamic function without ssr" → unchanged (`<div></div>` — no region emitted).

**Add (marker-placement contract):**
- `test("does not mark static elements or static text", () => { expect(ssr(html\`<div><span>hi</span>there</div>\` as HellaNode)).toBe("<div><span>hi</span>there</div>"); })`
- `test("marks each reactive child independently between static text", () => { const a = signal(1); const b = signal(2); expect(ssr(html\`<div>x${a}y${b}z</div>\` as HellaNode)).toBe("<div>x<!--[-->1<!--]-->y<!--[-->2<!--]-->z</div>"); })` *(the headline coalescing test — proves 010 is structurally gone)*
- `test("marks a fragment child among siblings", () => { expect(ssr(html\`<div>a${html\`<b/><c/>\`}d</div>\` as HellaNode)).toBe("<div>a<!--[--><b></b><c></c><!--]-->d</div>"); })`
- `test("marks a Portal region with empty body", () => { const node = html\`<div><${Portal} to="#x">${html\`<p/>\`}</${Portal}></div>\` as HellaNode; expect(ssr(node)).toBe("<div><!--[--><!--]--></div>"); })`

**Strategy:** the existing 24 tests are the regression net — each expectation is updated to include markers where the input has a dynamic region; the marker-placement tests pin the wrapping rule. Run `bun coverage ssr` → must stay 100% (markers add branches; the placement tests cover them).

**DoD:**
- [x] Every existing expectation updated for markers where its input has a dynamic region; static-only expectations unchanged. — 11 expectations updated (signal/escape/forEach/transition×2/portal/lazy×2/unknown-kind/reactive-HellaNode/reactive-non-HellaNode).
- [x] The 4 marker-placement tests added (static-unmarked, independent-reactive, fragment, reactive-resolves-to-element). — `ssr.test.ts`.
- [x] C1 regression test added ("renders a reactive getter that returns an isDynamic component").
- [x] `bun coverage ssr` green — 100/100 coverage, 29 pass. — EXIT 0.

## [x] Docs

| File | Change |
|---|---|
| `packages/ssr/AGENTS.md` | Rewrite the architecture + gotchas: markers are now the contract. Document the wrapping rule (table above), the `MARK_OPEN`/`MARK_CLOSE` format, that hydrate reads `Comment` nodes with nodeValue `[`/`]`. **Remove** the C1 "reactive getters returning isDynamic are unsupported" bullet (Unit 2 makes them supported). Replace the coalescing caveat with "markers bound every dynamic region." |
| `packages/ssr/docs/api/ssr.mdx` | Update `## Basic Usage` output examples to show markers; add a `### Hydration markers` Key Concept explaining the `<!--[-->…<!--]-->` contract + why (locates dynamic regions without inference). |
| `packages/ssr/docs/concepts/ssr.mdx` | Update any clean-HTML example output; note the marker trade-off (cleaner hydration, tiny payload cost). |

**DoD:**
- [x] `packages/ssr/AGENTS.md` documents the marker contract (wrapping rule + `### Hydration markers` section) and removes the C1 unsupported-input bullet. — Architecture table + walk section + Hydration markers section + Non-obvious "Hydration markers are the contract" bullet.
- [x] `packages/ssr/docs/api/ssr.mdx` has a `### Hydration markers` section; examples show marker output (signal example). — inserted after Zero Runtime Dependencies.
- [x] `packages/ssr/docs/concepts/ssr.mdx` updated. — String-Renderer Model + Client Enhancement hydrate bullet mention markers.

## Blast radius

- `@hellajs/dom` tests do NOT break from Unit 1 alone — they build server HTML via `serverContainer` (mount-based, no markers) or manual `innerHTML`, so ssr's new output isn't their input (verified: `rg 'from "@hellajs/ssr' packages/dom` → none). Unit 2 rewrites the dom hydrate tests to inject markers.
- The contract is temporarily inconsistent between Unit 1 and Unit 2 (ssr emits markers, dom ignores them as comments-in-text) — acceptable, no test exercises ssr→hydrate yet (Unit 3 adds it).

## Verification

- [x] `bun coverage ssr` green — 100/100. — EXIT 0; 29 pass.
- [x] `rg 'MARK_OPEN|MARK_CLOSE|renderDynamic' packages/ssr/lib/ssr.ts` shows the constants + usage. — verified.
- [x] `bun lint` (global tsc + eslint) exits 0. — verified via coverage run.
