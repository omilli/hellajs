# css-best-practices

Compiled by `vp run skills-build` from `rules/` - never hand-edit; regenerate instead.

Best practices for @hellajs/css, the type-safe CSS-in-JS package: scoped style() classes, global css() rules, reactive vars() theming, hashed keyframes(), cva() variant recipes, cx() joins, and cssText() server collection. Every rule is grounded in the package source and test suite.

- Version: 1.0.0
- Organization: HellaJS
- Date: 2026-11-04

## Impact levels

| Level | Meaning |
|---|---|
| CRITICAL | Breaks correctness: lost reactivity, leaks, glitching, hydration mismatch, data loss |
| HIGH | Measurable perf or UX degradation the library exists to prevent |
| MEDIUM | Suboptimal: works but fights the library's model |
| LOW | Convention or consistency |

## Contents
- 1. Scoped styles
  - 1.1 Scope component styles with style, not global classes (`style-component-scoped`)
  - 1.2 Compose styles with style(base, override), not object spreads (`style-compose-objects`)
  - 1.3 Reactive values belong in vars, never in style objects (`style-function-values`)
  - 1.4 Cascade layers rank below unlayered CSS (`style-layer-precedence`)
  - 1.5 Mirror style options exactly in removeStyle (`style-remove-mirror`)
  - 1.6 Host web component styles with the host option (`style-shadow-host`)
- 2. Global rules and value semantics
  - 2.1 Conditional at-rules inherit scope, definitional ones stay global (`css-at-rule-semantics`)
  - 2.2 Nest global declarations under a selector or at-rule (`css-global-selectors`)
  - 2.3 Mirror css options exactly in removeCss (`css-remove-mirror`)
  - 2.4 Reset each side with its own reset function (`css-reset-isolation`)
  - 2.5 Register the preflight reset through css(), never scoped or hand-copied (`css-reset-preflight`)
  - 2.6 Numbers mean px, so pass other units in strings (`css-value-semantics`)
- 3. Styling object authoring
  - 3.1 Break every styling object across lines, single-property objects included (`format-multiline-objects`)
- 4. Reactive CSS variables
  - 4.1 One reactive vars object per scope (`vars-one-object-one-scope`)
  - 4.2 Remove reactive vars by reference, static by structure (`vars-remove-refcount`)
  - 4.3 Scope, prefix, and name vars through the options (`vars-scope-options`)
  - 4.4 Pair hosted vars with scoped :host in shadow roots (`vars-shadow-root`)
  - 4.5 Consume the vars proxy; the sheet is what updates (`vars-token-proxy`)
- 5. Keyframe animations
  - 5.1 Remove keyframes by definition object, order never matters (`kf-canonical-removal`)
  - 5.2 Use the keyframes return value in animation properties (`kf-use-returned-name`)
- 6. Variant recipes and class composition
  - 6.1 Re-resolve recipes at the call site for reactivity (`recipe-caller-reactivity`)
  - 6.2 Join class fragments with cx (`recipe-cx-join`)
  - 6.3 Declare responsive breakpoints in cva media config (`recipe-responsive-media`)
  - 6.4 Define variants as maps and validate by resolution (`recipe-variant-maps`)
- 7. Server rendering and hydration
  - 7.1 Ship the style tag with its sheet id (`ssrcss-adoption-id`)
  - 7.2 Embed cssText in every server response (`ssrcss-collect-csstext`)

## 1. Scoped styles

### 1.1 Scope component styles with style, not global classes

**Impact: MEDIUM** - global hand-written class selectors collide across components and forfeit the scoping, dedup, and removal machinery style() provides

`style()` is the component path: it takes a declarations-first object, derives a content-hashed class (`{label}-{hash}` with a label, a bare letter-only hash without), and scopes every nested selector under it. The hash covers the object alone, so the same object always derives the same class, on every render and on both platforms. Reach for `css()` only for what belongs to no component: resets, element defaults, `@font-face`. Hand-writing a class selector through `css()` for one component's styles leaks that class to the whole document, collides with any other component using the same name, and cannot be removed or refcounted as a unit.

**Incorrect (what is wrong):**

```ts
import { css } from "@hellajs/css";

// Component styles as globals: ".card" collides with every other
// component that styles a class with this name
css({
  ".card": {
    padding: "1rem",
    borderRadius: "0.5rem",
  },
});
```

**Correct (what is right):**

```ts
import { style } from "@hellajs/css";

// Scoped, content-hashed, removable as a unit; "card-{hash}" is
// identical on client and server
const card = style(
  "card",
  {
    padding: "1rem",
    borderRadius: "0.5rem",
    "&:hover": {
      background: "#f9fafb",
    },
  },
);
```

Nested keys compose under the generated class: `&` refers to the class at every occurrence, plain keys become descendants, and conditional at-rules (`@media`, `@container`, `@supports`) inherit it. The options-bag form with a `label` key is equivalent to the positional label.

Reference: `packages/css/lib/style.ts` and `packages/css/lib/internal/identity.ts scopedClassName` and `packages/css/docs/api/style.mdx`

### 1.2 Compose styles with style(base, override), not object spreads

**Impact: MEDIUM** - shallow spreads replace nested objects wholesale and rehash the whole object per variant, while the compose overload deep-merges into one class

Two object arguments compose: `style(base, override)` deep-merges into a single class where the override wins, nested plain objects merge recursively, and arrays and scalars replace. Spreading by hand is shallow: a nested selector object (`&:hover`) is replaced wholesale instead of merged, and every variant rehashes the full base object. Composing class strings is `cx()`'s job, not string concatenation.

**Incorrect (what is wrong):**

```ts
import { style } from "@hellajs/css";

const base = {
  padding: "1rem",
  "&:hover": {
    background: "#f9fafb",
  },
};

// Shallow spread: the nested hover object is dropped, not merged,
// and the dense variant hashes a fresh full-size object
const dense = style({
  ...base,
  padding: "0.5rem",
});
```

**Correct (what is right):**

```ts
import { style } from "@hellajs/css";

const base = {
  padding: "1rem",
  "&:hover": {
    background: "#f9fafb",
  },
};

// One merged class: override wins, nested objects merge, arrays replace
const dense = style(
  base,
  {
    padding: "0.5rem",
  },
);
```

A second plain object reads as an options bag only when every own key is `label`, `layer`, or `host` and no third argument is present; anything else is the override. A positional string first argument is a label, never a base.

Reference: `packages/css/lib/style.ts mergeStyles` and `packages/css/docs/concepts/styling.mdx`

### 1.3 Reactive values belong in vars, never in style objects

**Impact: MEDIUM** - function property values throw at any nesting depth in css() and style() objects; the throw fires at the call, so the component never styles at all

Property values in `css()` and `style()` objects are static by contract. A function value throws (`[css] function values are not supported in css objects`) at any nesting depth: there is no reactive re-derivation of scoped rules. Reactive values belong in `vars()`: author tokens whose leaves are functions (signals, computed), consume the returned `var()` references as static values inside `style()`, and the sheet updates when the signals change without rebuilding any rule. Conditions resolve before the call; for style values that track signals, author tokens with `vars()`.

**Incorrect (what is wrong):**

```ts
import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";

const theme = signal("light");

// Throws: function values are not supported in css objects
const button = style(
  "theme-btn",
  {
    background: () => (theme() === "dark" ? "#374151" : "#3b82f6"),
  },
);
```

**Correct (what is right):**

```ts
import { signal } from "@hellajs/core";
import { style, vars } from "@hellajs/css";

const theme = signal("light");

const themeVars = vars({
  background: () => (theme() === "dark" ? "#374151" : "#3b82f6"),
});

const button = style(
  "theme-btn",
  {
    background: themeVars.background,
  },
);
```

Reference: `packages/css/lib/css.ts process` and `packages/css/docs/concepts/styling.mdx`

### 1.4 Cascade layers rank below unlayered CSS

**Impact: HIGH** - the layer option wraps rules in @layer, and layered rules lose to unlayered author CSS by construction, so a layered style silently loses to any unlayered rule regardless of specificity

The `layer` option wraps the emitted rules in `@layer {name}` (outermost of `media` when both are set) without touching the class name: the same object with and without a layer derives the same class, only the text differs. That wrapper changes the cascade: layered rules rank below unlayered author CSS at any specificity, and among layers, later-declared names rank above earlier ones. Reach for layers deliberately, to rank resets and framework CSS below your component styles; never expect a layered rule to beat an unlayered one. A removal must mirror the same `layer` option (see the removeStyle rule).

**Incorrect (what is wrong):**

```ts
import { css, style } from "@hellajs/css";

// Unlayered author CSS
css({
  button: {
    padding: "1rem",
  },
});

// Layered rules lose to unlayered CSS by construction: this padding
// silently loses despite the class specificity
const cta = style(
  "cta",
  {
    padding: "0.5rem",
  },
  {
    layer: "components",
  },
);
```

**Correct (what is right):**

```ts
import { css, style } from "@hellajs/css";

// Both sides layered: the later-declared layer ranks above the earlier
css({
  "@layer base": {
    button: {
      padding: "1rem",
    },
  },
});

const cta = style(
  "cta",
  {
    padding: "0.5rem",
  },
  {
    layer: "components",
  },
);
```

Reference: `packages/css/lib/internal/identity.ts scopedRule` and `packages/css/tests/style-layer.test.ts` and `packages/css/docs/api/style.mdx`

### 1.5 Mirror style options exactly in removeStyle

**Impact: HIGH** - a removal whose label or options differ from the registration re-derives different text and silently no-ops, leaking the rules; at zero refs the CSSOM rules drop out from under any element still rendered with the class

Registration is reference-counted and argument-derived: `removeStyle()` re-derives the class and rule text from the same arguments `style()` used, so identical arguments always locate the entry. Mismatched options (a missing `layer`, a different label form, a missing `host`) derive different text and the removal is a silent no-op: the registration leaks and the rules stay in the sheet. Every `style()` call needs exactly one matching `removeStyle()`; the count reaches zero and the CSSOM rules drop only when the last matching removal runs.

**Incorrect (what is wrong):**

```ts
import { removeStyle, style } from "@hellajs/css";

const card = {
  padding: "1rem",
};

style(
  "card",
  card,
  {
    layer: "components",
  },
);

// Missing the layer: derives unlayered text, finds no registration, no-ops
removeStyle("card", card);
```

**Correct (what is right):**

```ts
import { removeStyle, style } from "@hellajs/css";

const card = {
  padding: "1rem",
};

style(
  "card",
  card,
  {
    layer: "components",
  },
);

// Same label form, same options: decrements the count, drops at zero
removeStyle(
  "card",
  card,
  {
    layer: "components",
  },
);
```

A registration kept for the whole page lifetime (module scope) needs no removal at all; pair registration and removal only for dynamically created styles.

Reference: `packages/css/lib/removeStyle.ts` and `packages/css/lib/internal/injection.ts deregisterText`

### 1.6 Host web component styles with the host option

**Impact: HIGH** - styles registered without a host land in document.head and escape shadow-root encapsulation, leaking into and missing the component tree they were written for

The `host` option redirects the generated `<style>` elements into any parent node, most commonly a shadow root: one `<style>` per sheet id inside the host, never `document.head`. Registries are host-qualified, so the same styles injected into two hosts never dedup into one sheet: N web component instances style independently with separate reference counts. Removers (`removeStyle`, `removeCss`, `removeVars`) take the same `host` option to reach the same sheet. Hosted `vars()` has one sharp edge: the default `:root` scope matches nothing inside a shadow root (see the vars shadow-root rule).

**Incorrect (what is wrong):**

```ts
import { style } from "@hellajs/css";

const root = document.createElement("my-card").attachShadow({
  mode: "open",
});

// No host: the rules land in document.head, outside the shadow root,
// and the component's inner tree never sees them under encapsulation
const card = style(
  "card",
  {
    color: "#111827",
  },
);
```

**Correct (what is right):**

```ts
import { css, style } from "@hellajs/css";

const root = document.createElement("my-card").attachShadow({
  mode: "open",
});

// Sheets are created inside the host, not document.head
const card = style(
  "card",
  {
    color: "#111827",
  },
  {
    host: root,
  },
);

css(
  {
    "*": {
      boxSizing: "border-box",
    },
  },
  {
    host: root,
  },
);
```

Reference: `packages/css/lib/internal/sheet.ts getSheet` and `packages/css/tests/style-host.test.ts` and `packages/css/docs/concepts/styling.mdx`


## 2. Global rules and value semantics

### 2.1 Conditional at-rules inherit scope, definitional ones stay global

**Impact: MEDIUM** - expecting a definitional at-rule nested under a scoped style to inherit the class silently produces a global rule that styles far more than intended

At-rules split in two. Conditional ones (`@media`, `@container`, `@supports`, `@starting-style`) inherit the active selector: nested under a `style()` class they compose under it, and `&` plus descendant composition work inside them. Definitional ones (`@keyframes`, `@font-face`, `@layer`, `@import`) always process with an empty selector: they never pick up a class scope, even when nested inside a `style()` object. An `@`-prefixed scalar key (`@import: 'url(...)'`) is a block-less statement, emitted ahead of all braced text in the same emission.

**Incorrect (what is wrong):**

```ts
import { style } from "@hellajs/css";

const card = style(
  "card",
  {
    padding: "1rem",
    // Definitional at-rules never pick up the class: this @font-face
  // registers globally despite sitting under .card-{hash}
  "@font-face": {
      fontFamily: "Inter",
      src: "url('/fonts/inter.woff2')",
    },
  },
);
```

**Correct (what is right):**

```ts
import { css, style } from "@hellajs/css";

// Conditional at-rules inherit the class scope
const card = style(
  "card",
  {
    padding: "1rem",
    "@media (min-width: 768px)": {
      padding: "1.5rem",
    },
  },
);

// Definitional at-rules belong at the global level
css({
  "@font-face": {
    fontFamily: "Inter",
    src: "url('/fonts/inter.woff2')",
  },
});
```

Reference: `packages/css/lib/css.ts CONDITIONAL_AT_RULES` and `packages/css/docs/api/css.mdx`

### 2.2 Nest global declarations under a selector or at-rule

**Impact: MEDIUM** - top-level declarations and selector-less conditional at-rule bodies throw loudly, so a first css() call written like a style object fails instead of styling

`css()` is selector-first: every top-level key is a CSS selector or an at-rule, never a property. Direct declarations at the top level throw (`[css] top-level declarations have no selector`), and a conditional at-rule body containing direct declarations with no selector in scope throws too (`nest selectors under the at-rule`): both would emit selector-less text the browser silently drops, so the call rejects loudly instead. Wrap declarations in a selector, an at-rule, or use `style()`, which supplies its generated class as the scope.

**Incorrect (what is wrong):**

```ts
import { css } from "@hellajs/css";

// Throws: top-level declarations have no selector
css({
  margin: 0,
  color: "#111827",
});
```

**Correct (what is right):**

```ts
import { css } from "@hellajs/css";

css({
  body: {
    margin: 0,
    fontFamily: "system-ui, sans-serif",
  },
  "*": {
    boxSizing: "border-box",
  },
});
```

The same rejections fire in `removeCss()` on the same object shape: the removal re-runs the identical derivation.

Reference: `packages/css/lib/css.ts process` and `packages/css/docs/api/css.mdx`

### 2.3 Mirror css options exactly in removeCss

**Impact: HIGH** - a removal whose host option differs from the registration decrements nothing and silently leaks the rules into the wrong sheet's registry

`removeCss(obj, options)` re-derives the CSS text from the same arguments the `css()` call used and decrements the matching registration: the same object shape plus the same `host`. Options that differ derive different registration keys, so the removal is a silent no-op. Registration is per-call: two `css()` calls with the same object hold two references, and the rules drop only when the last matching `removeCss()` runs. Unknown inputs are a no-op, never a throw.

**Incorrect (what is wrong):**

```ts
import { css, removeCss } from "@hellajs/css";

const reset = {
  body: {
    margin: 0,
  },
};

const root = document.createElement("my-card").attachShadow({
  mode: "open",
});

css(
  reset,
  {
    host: root,
  },
);

// No host: decrements the document-head registration that does not
// exist, and the hosted rules leak
removeCss(reset);
```

**Correct (what is right):**

```ts
import { css, removeCss } from "@hellajs/css";

const reset = {
  body: {
    margin: 0,
  },
};

const root = document.createElement("my-card").attachShadow({
  mode: "open",
});

css(
  reset,
  {
    host: root,
  },
);

// Same object, same host: decrements the hosted registration exactly
removeCss(
  reset,
  {
    host: root,
  },
);
```

Reference: `packages/css/lib/removeCss.ts` and `packages/css/lib/internal/injection.ts deregisterText`

### 2.4 Reset each side with its own reset function

**Impact: LOW** - resetCss never touches vars state and resetVars never touches rule registrations, so calling one half and expecting a full wipe leaves the other half live

The CSS system is two independent halves. `resetCss()` clears the css side only: `css()`, `style()`, and `keyframes()` registrations plus the `hella-css` sheet. `resetVars()` clears the vars side only: buckets, the static cache, reactive registries, every vars effect, and the `hella-vars` sheet. The `<style>` elements are cleared, never removed from the DOM. Tests reset both (the shared `resetTestState()` helper); production code rarely needs either.

**Incorrect (what is wrong):**

```ts
import { css, resetCss, vars } from "@hellajs/css";

css({
  body: {
    margin: 0,
  },
});
vars({
  bg: "#ffffff",
});

// Wrong half: the vars registration survives with its sheet rule
resetCss();
```

**Correct (what is right):**

```ts
import { css, cssText, resetCss, resetVars, vars } from "@hellajs/css";

css({
  body: {
    margin: 0,
  },
});
vars({
  bg: "#ffffff",
});

// Each reset clears its own side; both together restore initial state
resetCss();
resetVars();

cssText(); // ""
```

Reference: `packages/css/lib/resetCss.ts` and `packages/css/lib/resetVars.ts` and `utils/test-helpers.js resetTestState`

### 2.5 Register the preflight reset through css(), never scoped or hand-copied

**Impact: HIGH** - scoping the reset under a class mangles its selector lists so it silently half-applies, and a mutated copy breaks the removeCss() mirror

`reset` is the shipped preflight object (a tailwind preflight port): plain data whose selectors only mean something globally. Register it once at the app entry with `css(reset)`; the call is text-deduped and reference-counted, and `removeCss(reset)` drops exactly that registration. Never pass it to `style()`: scoping composes each top-level selector into a descendant of the generated class (`.cls html, :host`, `.cls *, ::after`), mangling every selector list so the reset half-applies with no error. Never register a mutated copy either: removal re-derives text from the object you pass, so a copy leaves the original registered.

**Incorrect (what is wrong):**

```ts
import { reset, style } from "@hellajs/css";

// Scopes the preflight: every selector list composes against the class,
// so only its first compound gets the prefix and the reset half-applies
const resetClass = style(reset, {
  label: "reset",
});
```

**Correct (what is right):**

```ts
import { css, reset, style } from "@hellajs/css";

// Once, at the app entry: registers globally, deduped and refcounted
css(reset);

const card = style(
  {
    padding: "1rem",
  },
  {
    label: "card",
  },
);
```

Register the exported reference as-is; if teardown is ever needed, `removeCss(reset)` with the same reference.

Reference: `packages/css/lib/reset.ts reset` and `packages/css/docs/api/reset.mdx`

### 2.6 Numbers mean px, so pass other units in strings

**Impact: LOW** - numeric values append px everywhere except a unitless allowlist and custom properties, so a bare number where another unit was meant silently styles the wrong geometry

Value semantics in `css()` and `style()` objects are fixed. Numbers append `px` unless the property is in the unitless allowlist (`z-index`, `opacity`, `flex`, `line-height`, `order`, `font-weight`, and friends) or the key is a `--` custom property. Strings pass through verbatim: pass `"50%"`, `"1rem"`, `"0.8s"` with their units. Array values join with commas (multi-value properties), `content` strings auto-quote unless already quoted, `null` and `undefined` values are skipped, camelCase keys kebab-case, and `--` custom-property keys stay verbatim.

**Incorrect (what is wrong):**

```ts
import { css } from "@hellajs/css";

// Numbers mean px: both become px lengths, not percentages
css({
  ".pin": {
    top: 50,
    left: 50,
  },
});
```

**Correct (what is right):**

```ts
import { css } from "@hellajs/css";

css({
  ".pin": {
    top: "50%",  // strings carry their own units
    zIndex: 100,  // unitless allowlist stays raw
    gap: 4,  // numbers append px
    transition: ["opacity 0.2s ease", "transform 0.2s ease"],  // arrays join with commas
    content: "open",  // content strings auto-quote
  },
});
```

Reference: `packages/css/lib/css.ts UNITLESS_PROPERTIES` and `packages/css/docs/api/css.mdx`


## 3. Styling object authoring

### 3.1 Break every styling object across lines, single-property objects included

**Impact: LOW** - single-line object props bury selectors and variant selections inside dense one-liners, so reading a recipe means parsing nested braces and every edit reflows a whole line instead of touching one

Every object literal in styling code breaks across lines, one property per line, at every nesting depth: the `css()` / `style()` / `keyframes()` object and its nested selector blocks, `cva()` configs and their variant maps and selections, `vars()` token objects, and the options bags (`{ label }`, `{ host, scoped }`). Single-property objects are included. When a call takes several arguments and any of them is an object literal, each argument goes on its own line. Type literals (`{ title: string }` prop annotations, `type X = { … }` declarations) and comments showing output shapes are not object literals; they stay compact.

**Incorrect (what is wrong):**

```ts
import { cva, style } from "@hellajs/css";

// Variant selections buried in one-liners; reading means parsing nested braces
const button = cva({
  base: {
    borderRadius: "0.5rem",
    cursor: "pointer",
  },
  variants: {
    size: {
      sm: {
        padding: "0.25rem 0.5rem",
      },
      lg: {
        padding: "0.75rem 1.5rem",
      },
    },
  },
});

// Options bags and single-property objects too
const card = style(
  {
    padding: "1rem",
  },
  {
    label: "card",
  },
);
```

**Correct (what is right):**

```ts
import { cva, style } from "@hellajs/css";

const button = cva({
  base: {
    borderRadius: "0.5rem",
    cursor: "pointer",
  },
  variants: {
    size: {
      sm: {
        padding: "0.25rem 0.5rem",
      },
      lg: {
        padding: "0.75rem 1.5rem",
      },
    },
  },
});

// One argument per line once any argument is an object literal
const card = style(
  {
    padding: "1rem",
  },
  {
    label: "card",
  },
);
```

**Incorrect (what is wrong):**

```ts
import { vars } from "@hellajs/css";

// Token objects and scoped options collapsed onto one line
const theme = vars(
  {
    colors: {
      primary: "#3b82f6",
    },
  },
  {
    scoped: ".card",
  },
);
```

**Correct (what is right):**

```ts
import { vars } from "@hellajs/css";

const theme = vars(
  {
    colors: {
      primary: "#3b82f6",
    },
  },
  {
    scoped: ".card",
  },
);
```

Reference: `guides/docs.md` and `packages/css/docs/api/cva.mdx`


## 4. Reactive CSS variables

### 4.1 One reactive vars object per scope

**Impact: MEDIUM** - re-registering the same reactive object with different options throws before any rule is written, failing the second call site at runtime

A reactive vars object (any leaf is a function) is registered by object reference: one object carries exactly one resolved `scoped`/`prefix`/`media`/`layer`/`host` combination. A second `vars()` call on the same reference with differing options throws (`vars: reactive vars object already registered with different options`) before any stray rule is written. Use a separate object per scope. Static objects (no function leaves) are keyed by content hash instead, so the same shape under different options registers as separate entries with no conflict.

**Incorrect (what is wrong):**

```ts
import { signal } from "@hellajs/core";
import { vars } from "@hellajs/css";

const accent = signal("#3b82f6");
const tokens = { accent };

vars(
  tokens,
  {
    scoped: ".panel",
  },
);

// Throws: the same object reference re-registered with new options
vars(
  tokens,
  {
    scoped: ".sidebar",
  },
);
```

**Correct (what is right):**

```ts
import { signal } from "@hellajs/core";
import { vars } from "@hellajs/css";

const accent = signal("#3b82f6");
const panelTokens = { accent };
const sidebarTokens = { accent };

// One object per scope: distinct references register independently
vars(
  panelTokens,
  {
    scoped: ".panel",
  },
);
vars(
  sidebarTokens,
  {
    scoped: ".sidebar",
  },
);
```

Reference: `packages/css/lib/vars.ts` and `packages/css/tests/vars-media.test.ts`

### 4.2 Remove reactive vars by reference, static by structure

**Impact: HIGH** - passing a structural copy to removeVars misses the reference-keyed reactive entry and silently no-ops, leaving the effect running and the declarations in the sheet

`removeVars()` looks entries up two ways, in order. Reactive registrations are keyed by object reference: pass the exact same object that went into `vars()`, and removal disposes the effect (later signal writes re-add nothing) and drops the declarations at the last reference. Static registrations are keyed by a structural hash: a structurally equal fresh object matches. A structural copy passed for a reactive object misses the reference lookup, falls through to the static hash, finds nothing, and silently no-ops.

**Incorrect (what is wrong):**

```ts
import { signal } from "@hellajs/core";
import { removeVars, vars } from "@hellajs/css";

const accent = signal("#3b82f6");
const tokens = { accent };

vars(tokens);

// A fresh literal is a different reference: the reactive entry is
// missed, nothing is removed, and the effect keeps running
removeVars({ accent });
```

**Correct (what is right):**

```ts
import { signal } from "@hellajs/core";
import { removeVars, vars } from "@hellajs/css";

const accent = signal("#3b82f6");
const tokens = { accent };

vars(tokens);

// Same reference: decrements the count, disposes the effect at zero
removeVars(tokens);
```

Multiple `vars()` calls sharing one scope bucket merge their keys; a matching `removeVars` removes only that call's keys.

Reference: `packages/css/lib/removeVars.ts` and `packages/css/tests/vars-remove.test.ts`

### 4.3 Scope, prefix, and name vars through the options

**Impact: MEDIUM** - hand-flattened kebab names and trailing-hyphen prefixes double-hyphen the emitted custom properties, and the default scope ships tokens on :root when a narrower scope was meant

Name derivation is fixed: nested object keys flatten to dot-joined paths, dots become hyphens, camelCase and letter-digit boundaries hyphenate, and the name lowercases, all at emission (`primaryForeground` becomes `--primary-foreground`). Author keys in their natural shape and let the options do the scoping work: `scoped` overrides the default `:root` scope with any selector, `prefix` namespaces every name (its trailing hyphen is inserted for you, so pass `"brand"`, not `"brand-"`), `media` wraps the scope block in the condition, and `layer` wraps outermost of media. Calls sharing one scope, media, and layer merge into one bucket; different combinations coexist as separate buckets.

**Incorrect (what is wrong):**

```ts
import { vars } from "@hellajs/css";

// Trailing hyphen in the prefix doubles up: "--brand--accent"
vars(
  {
    accent: "#3b82f6",
  },
  {
    prefix: "brand-",
  },
);
```

**Correct (what is right):**

```ts
import { vars } from "@hellajs/css";

// "--brand-accent", scoped to .panel, dark-scheme only
vars(
  {
    accent: "#3b82f6",
  },
  {
    prefix: "brand",
    scoped: ".panel",
    media: "(prefers-color-scheme: dark)",
  },
);
```

Reference: `packages/css/lib/internal/vars.ts resolveVarsOptions` and `packages/css/lib/internal/vars.ts kebabVarName` and `packages/css/docs/api/vars.mdx`

### 4.4 Pair hosted vars with scoped :host in shadow roots

**Impact: CRITICAL** - a hosted vars registration still defaults to the :root scope, which matches nothing inside a shadow root, so every consumer of those tokens silently styles with no value

The `host` option moves the vars sheet into the shadow root, but the scope selector is independent and still defaults to `:root`. Inside a `ShadowRoot`, `:root` matches nothing: the declarations are registered and collected but apply to no element, and every `var()` reference resolves to nothing. Pair `host` with `scoped: ':host'` so the declarations land on the shadow host. The same reference rule as any reactive vars object applies across hosts too: re-registering one object under a different host throws.

**Incorrect (what is wrong):**

```ts
import { vars } from "@hellajs/css";

const root = document.createElement("my-card").attachShadow({
  mode: "open",
});

// :root matches nothing inside a shadow root: the tokens are
// registered but never apply, and consumers get no value
vars(
  {
    accent: "#3b82f6",
  },
  {
    host: root,
  },
);
```

**Correct (what is right):**

```ts
import { style, vars } from "@hellajs/css";

const root = document.createElement("my-card").attachShadow({
  mode: "open",
});

const theme = vars(
  {
    accent: "#3b82f6",
  },
  {
    host: root,
    scoped: ":host",
  },
);

const card = style(
  "card",
  {
    color: theme.accent,
  },
  {
    host: root,
  },
);
```

Reference: `packages/css/lib/internal/vars.ts resolveVarsOptions` and `packages/css/docs/concepts/styling.mdx`

### 4.5 Consume the vars proxy; the sheet is what updates

**Impact: HIGH** - the returned proxy never mutates and re-calling vars on every change only churns registrations, while the actual update path is the effect writing the sheet when signals change

`vars()` returns a same-shaped object whose leaves are `var()` reference strings, on both platforms. That result is stable by construction: it is built from the flattened keys alone, so it never mutates when signals change, and a repeat reactive call on the same object returns the very same result while bumping the reference count. Live values reach the stylesheet, not the object: function leaves become one effect per registration that rewrites the declarations when the signals change, so consume the proxy's `var()` strings as static values in `style()`/`css()` objects and let the sheet update in place. Writes inside `batch()` land when the batch flushes. On the server the function leaves resolve exactly once and no effects are created.

**Incorrect (what is wrong):**

```ts
import { signal } from "@hellajs/core";
import { vars } from "@hellajs/css";

const scale = signal(1);
const tokens = vars({
  scale: () => scale(),
});

scale(1.5);

// Wrong instinct: re-register to "refresh". The proxy never held the
// value (it holds "var(--scale)"), and the repeat call only bumps the
// reference count, which now leaks on removal
vars(tokens);
```

**Correct (what is right):**

```ts
import { signal } from "@hellajs/core";
import { style, vars } from "@hellajs/css";

const scale = signal(1);
const tokens = vars({
  scale: () => scale(),
});

const box = style(
  "box",
  {
    transform: `scale(${tokens.scale})`,
  },
);

// The effect rewrites --scale in the sheet; box rules never rebuild
scale(1.5);
```

Reference: `packages/css/lib/vars.ts` and `packages/css/docs/api/vars.mdx`


## 5. Keyframe animations

### 5.1 Remove keyframes by definition object, order never matters

**Impact: LOW** - removeKeyframes takes the step object, not the returned name, and matches by canonicalized content, so a name-based removal attempt throws while an equivalent object in any key order removes exactly

`keyframes()` canonicalizes its input before hashing: step keys and declarations are recursively key-sorted, so structurally equal definitions in any key order register one rule under one name. `removeKeyframes()` mirrors that derivation: pass a structurally equal object, not the returned `kf-{hash}` name (the name is a string, and the call throws on it) and not a specific object identity. Registration is reference-counted like every css-side registration; the rule drops at the last matching removal.

**Incorrect (what is wrong):**

```ts
import { keyframes, removeKeyframes } from "@hellajs/css";

const spin = keyframes({
  from: {
    transform: "rotate(0deg)",
  },
  to: {
    transform: "rotate(360deg)",
  },
});

// Throws: removeKeyframes takes the definition object, not the name
removeKeyframes(spin);
```

**Correct (what is right):**

```ts
import { keyframes, removeKeyframes } from "@hellajs/css";

const spin = keyframes({
  from: {
    transform: "rotate(0deg)",
  },
  to: {
    transform: "rotate(360deg)",
  },
});

// Key order never matters: a structurally equal object matches
removeKeyframes({
  to: {
    transform: "rotate(360deg)",
  },
  from: {
    transform: "rotate(0deg)",
  },
});
```

Reference: `packages/css/lib/keyframes.ts keyframesRule` and `packages/css/lib/removeKeyframes.ts`

### 5.2 Use the keyframes return value in animation properties

**Impact: HIGH** - the rule registers under a generated kf-hash name, so referencing a hand-assumed name leaves the animation pointing at nothing and it never runs

`keyframes()` registers the `@keyframes` rule under a content-hashed name and returns it: `kf-{hash}`, identical on client and server, collision-free by construction. That returned string is the only correct `animation`/`animation-name` value: hard-coding an assumed name matches no registered rule and the animation silently never runs. Hand-naming `@keyframes` through `css()` works but forfeits the hashed identity and the refcounted `removeKeyframes()` lifecycle.

**Incorrect (what is wrong):**

```ts
import { keyframes, style } from "@hellajs/css";

const spin = keyframes({
  from: {
    transform: "rotate(0deg)",
  },
  to: {
    transform: "rotate(360deg)",
  },
});

// The registered name is "kf-{hash}", not "spin": the animation
// matches nothing and never runs
const spinner = style(
  "spinner",
  {
    animation: "spin 0.8s linear infinite",
  },
);
```

**Correct (what is right):**

```ts
import { keyframes, style } from "@hellajs/css";

const spin = keyframes({
  from: {
    transform: "rotate(0deg)",
  },
  to: {
    transform: "rotate(360deg)",
  },
});

const spinner = style(
  "spinner",
  {
    width: "2rem",
    height: "2rem",
    animation: `${spin} 0.8s linear infinite`,
  },
);
```

Reference: `packages/css/lib/keyframes.ts` and `packages/css/docs/api/keyframes.mdx`


## 6. Variant recipes and class composition

### 6.1 Re-resolve recipes at the call site for reactivity

**Impact: CRITICAL** - variant classes are static once resolved, so computing the class string once freezes the variant for the component's lifetime and signal changes never restyle

A `cva()` recipe resolves props to a composed class string and nothing more: the classes it returns are static strings, and the recipe carries no subscription to the signals that produced them. Reactivity rides the caller. Bind `class` as a function so each signal change re-runs the resolution: `class={() => button({ size: size() })}`. Resolving the class once outside a reactive binding (or passing a resolved string into a static `class` attribute) pins the variant at its first value. The `class` attribute accepts a function or an array, recalculating when signals change.

**Incorrect (what is wrong):**

```jsx
import { signal } from "@hellajs/core";
import { cva } from "@hellajs/css";

const size = signal<"sm" | "lg">("sm");
const button = cva({
  variants: {
    size: {
      sm: {
        padding: "0.25rem 0.5rem",
      },
      lg: {
        padding: "0.75rem 1.5rem",
      },
    },
  },
});

// Resolved once: the class is frozen at the initial signal value
const cls = button({
  size: size(),
});

<button class={cls}>Save</button>;
```

**Correct (what is right):**

```jsx
import { signal } from "@hellajs/core";
import { cva } from "@hellajs/css";

const size = signal<"sm" | "lg">("sm");
const button = cva({
  variants: {
    size: {
      sm: {
        padding: "0.25rem 0.5rem",
      },
      lg: {
        padding: "0.75rem 1.5rem",
      },
    },
  },
});

// Re-resolved inside a function class binding on every signal change
<button class={() => button({
  size: size(),
})}>Save</button>;
```

Reference: `packages/css/docs/api/cva.mdx` and `packages/css/docs/concepts/styling.mdx`

### 6.2 Join class fragments with cx

**Impact: LOW** - hand-rolled joins stringify false and leave stray whitespace, while cx drops falsy fragments and never produces leading or trailing spaces

`cx()` is the class joiner (clsx parity): strings and numbers contribute themselves, falsy values drop, objects contribute the keys whose values are truthy, and arrays recurse. The result never carries leading or trailing whitespace and is `""` when nothing survives. Hand-rolled `join(" ")` calls stringify `false` fragments (`"card false"`) and leave dangling separators; template concatenation does the same. `cx` is pure: it registers nothing, so it composes freely with `style()` classes and `cva()` output.

**Incorrect (what is wrong):**

```ts
const isActive = false;

// Array join stringifies the false fragment: "card false"
["card", isActive && "card-active"].join(" ");
```

**Correct (what is right):**

```ts
import { cx } from "@hellajs/css";

const isActive = false;

// Falsy fragments drop: "card", never "card false" or "card "
cx("card", isActive && "card-active");
```

Reference: `packages/css/lib/cx.ts` and `packages/css/docs/api/cx.mdx`

### 6.3 Declare responsive breakpoints in cva media config

**Impact: MEDIUM** - a responsive selection naming a breakpoint absent from the media config throws at resolution, so the missing declaration surfaces as a render-time failure

Responsive selections are pure CSS. A variant prop of `{ initial: 'sm', md: 'lg' }` selects `sm` un-wrapped plus `lg` under the `md` media condition, both classes emitted, no listeners anywhere. The breakpoint key must exist in the recipe's `media` config (a breakpoint name mapped to its media condition); an unknown breakpoint throws at first resolution. Selecting the same value at `initial` and a breakpoint contributes one class while registering both rules. On the server the same resolution emits the same classes and rules, so the critical CSS matches what the client would inject.

**Incorrect (what is wrong):**

```ts
import { cva } from "@hellajs/css";

const layout = cva({
  variants: {
    density: {
      tight: {
        gap: "0.5rem",
      },
      roomy: {
        gap: "1.5rem",
      },
    },
  },
});

// Throws at resolution: "md" is absent from the media config
// (there is none)
layout({
  density: {
    initial: "tight",
    md: "roomy",
  },
});
```

**Correct (what is right):**

```ts
import { cva } from "@hellajs/css";

const MEDIA = {
  md: "(min-width: 768px)",
};

const layout = cva({
  media: MEDIA,
  variants: {
    density: {
      tight: {
        gap: "0.5rem",
      },
      roomy: {
        gap: "1.5rem",
      },
    },
  },
});

// Emits the tight class un-wrapped plus the roomy class under @media
layout({
  density: {
    initial: "tight",
    md: "roomy",
  },
});
```

Reference: `packages/css/lib/cva.ts` and `packages/css/tests/cva-responsive.test.ts`

### 6.4 Define variants as maps and validate by resolution

**Impact: MEDIUM** - config validation is lazy, so a mistyped variant value sails through creation and throws at first render instead, where it is far harder to trace

A recipe maps each variant key to value names mapped to style objects (or verbatim class strings, which pass through with no rule generated). Generation is lazy: creating a recipe injects nothing, and each selected value generates its class on first resolution, so unselected variants never produce CSS and the server collects exactly the critical set. Validation is lazy to match: an unknown variant value or unknown breakpoint throws at first resolution, not at `cva()` creation, so a config mistake surfaces at the first call site. `defaultVariants` fills a variant the props omit; `compoundVariants` entries emit when every stated selection equals the resolved one.

**Incorrect (what is wrong):**

```ts
import { cva } from "@hellajs/css";

const button = cva({
  variants: {
    size: {
      sm: {
        padding: "0.25rem 0.5rem",
      },
    },
  },
});

// Creation threw nothing; this throws at first resolution:
// unknown value "large" for variant "size". The mistake was in the
// config, but it surfaces here
button({
  size: "large",
});
```

**Correct (what is right):**

```ts
import { cva } from "@hellajs/css";

const button = cva({
  base: {
    borderRadius: "0.5rem",
    cursor: "pointer",
  },
  variants: {
    size: {
      sm: {
        padding: "0.25rem 0.5rem",
      },
      lg: {
        padding: "0.75rem 1.5rem",
      },
    },
    tone: {
      primary: {
        background: "#3b82f6",
      },
      danger: {
        background: "#dc2626",
      },
    },
  },
  defaultVariants: {
    size: "sm",
  },
  compoundVariants: [
    {
      size: "lg",
      tone: "danger",
      css: {
        fontWeight: 700,
      },
    },
  ],
});

// Unselected variants generate no CSS; the default fills size
button({
  tone: "danger",
});
```

Reference: `packages/css/lib/cva.ts` and `packages/css/docs/api/cva.mdx`


## 7. Server rendering and hydration

### 7.1 Ship the style tag with its sheet id

**Impact: HIGH** - an id-less style embed forces hydration to create a second element and duplicate every delivered rule, doubling the sheet the page carries

Deliver the collected CSS inside a `<style>` element carrying the `hella-css` id (and `hella-vars` for the vars half). On hydration the client finds the element by id and adopts it: every re-registration whose text byte-equals a delivered rule claims that rule in place, in the same element, with no duplicate insertion and no flash window. Without the id the client cannot find the delivery: it creates its own element and re-registers every rule, so the page carries the same rules twice (identical and harmless, but doubled).

**Incorrect (what is wrong):**

```ts
import { css, cssText } from "@hellajs/css";

css({
  body: {
    margin: 0,
  },
});

// No id: hydration inserts a second element and duplicates every rule
const head = `<style>${cssText()}</style>`;
```

**Correct (what is right):**

```ts
import { css, cssText, vars } from "@hellajs/css";

css({
  body: {
    margin: 0,
  },
});
vars({
  bg: "#ffffff",
});

// Two-tag delivery: each half embeds into the tag carrying its sheet id
const cssTag = `<style id="hella-css">${cssText.css()}</style>`;
const varsTag = `<style id="hella-vars">${cssText.vars()}</style>`;
```

A single `<style id="hella-css">${cssText()}</style>` embed carries both halves in one tag; the split members exist for two-tag delivery where each sheet keeps its own element.

Reference: `packages/css/lib/internal/sheet.ts adoptElementRules` and `packages/css/docs/concepts/styling.mdx`

### 7.2 Embed cssText in every server response

**Impact: CRITICAL** - on the server every creator registers state-only, so a response without a cssText embed ships an unstyled page no matter how many styles the code registered

Every creator (`css()`, `style()`, `keyframes()`, `vars()`) registers on the server without a DOM and returns the same value it returns on the client: the rules exist only as registration state. `cssText()` is the collector that turns that state into the response's `<style>` source: css-side rules in first-registration order (statement-leading texts such as `@import` hoisted ahead of braced-only ones), then the vars contribution. It is a peek, never a drain: repeated calls return the same string until a reset clears the registrations. One embed per response; a page rendered without the embed ships with no styles at all.

**Incorrect (what is wrong):**

```ts
import { css, style } from "@hellajs/css";

css({
  body: {
    margin: 0,
  },
});
const card = style(
  "card",
  {
    padding: "1rem",
  },
);

// Registrations are state-only on the server: without a cssText()
// embed the page ships with no styles at all
const page = `<!DOCTYPE html><html><head></head><body><div class="${card}"></div></body></html>`;
```

**Correct (what is right):**

```ts
import { css, cssText, style, vars } from "@hellajs/css";

const tokens = vars({
  bg: "#ffffff",
});
css({
  body: {
    margin: 0,
    backgroundColor: tokens.bg,
  },
});
const card = style(
  "card",
  {
    padding: "1rem",
  },
);

// One embed per response: css side in registration order, then vars
const page = `<!DOCTYPE html><html><head><style id="hella-css">${cssText()}</style></head><body><div class="${card}"></div></body></html>`;
```

Host-qualified registrations are excluded from the collector: their rules live in host sheets (shadow roots), not the document head.

Reference: `packages/css/lib/cssText.ts` and `packages/css/docs/api/csstext.mdx`

