---
name: css-best-practices
description: >
  Best practices for @hellajs/css type-safe CSS-in-JS: style, css, reset, vars, keyframes, cva, cx, cssText, removeCss, removeStyle, removeVars, removeKeyframes, resetCss, resetVars. Use when writing or reviewing code that imports @hellajs/css - scoping component styles with style(), writing globals with css(), applying the preflight reset with css(reset), reactive theming with vars(), hashed animations with keyframes(), typed variants with cva(), joining classes with cx(), or collecting server CSS with cssText(). Covers the silent failure modes: function values in style objects throw instead of reacting, :root vars match nothing inside a shadow root, resolved variant classes freeze unless re-resolved at the call site, a server page ships unstyled without a cssText embed, mismatched remove options silently leak registrations. Use ONLY for @hellajs/css styling - DOM rendering and components belong to dom-best-practices, the copy/paste component registry belongs to ui-best-practices.
---

# css-best-practices

Grounded rules for `@hellajs/css`: `style()` scopes declarations under content-hashed classes, `css()` writes globals, `reset` ships the preflight object for `css(reset)`, `vars()` drives reactive theming, `keyframes()` hashes animation definitions, `cva()` resolves typed variants, and `cssText()` collects registered text for server rendering. Every rule is derived from the package source and its test suite; each rule file cites the symbols and tests that pin it.

## When to Apply

- Any code importing `@hellajs/css` or creating classes, global rules, CSS variables, keyframes, or variant recipes.
- Styling web components into shadow roots, or collecting CSS for a server response.
- Removing or resetting registrations.

Not for: DOM rendering and components (`dom-best-practices`), the copy/paste component registry (`ui-best-practices`), deep reactive state containers (`store-best-practices`).

## Impact levels

| Level | Meaning |
|---|---|
| CRITICAL | Breaks correctness: lost reactivity, leaks, glitching, hydration mismatch, data loss |
| HIGH | Measurable perf or UX degradation the library exists to prevent |
| MEDIUM | Suboptimal: works but fights the library's model |
| LOW | Convention or consistency |

## Categories

| Prefix | Category | Impact |
|---|---|---|
| style | Scoped styles | HIGH |
| css | Global rules and value semantics | HIGH |
| vars | Reactive CSS variables | CRITICAL |
| kf | Keyframe animations | HIGH |
| recipe | Variant recipes and class composition | CRITICAL |
| ssrcss | Server rendering and hydration | CRITICAL |

## Rules

### Scoped styles (style)

- `style-component-scoped` - Scope component styles with style, not global classes
- `style-compose-objects` - Compose styles with style(base, override), not object spreads
- `style-function-values` - Reactive values belong in vars, never in style objects
- `style-layer-precedence` - Cascade layers rank below unlayered CSS
- `style-remove-mirror` - Mirror style options exactly in removeStyle
- `style-shadow-host` - Host web component styles with the host option

### Global rules and value semantics (css)

- `css-at-rule-semantics` - Conditional at-rules inherit scope, definitional ones stay global
- `css-global-selectors` - Nest global declarations under a selector or at-rule
- `css-remove-mirror` - Mirror css options exactly in removeCss
- `css-reset-isolation` - Reset each side with its own reset function
- `css-value-semantics` - Numbers mean px, so pass other units in strings

### Reactive CSS variables (vars)

- `vars-one-object-one-scope` - One reactive vars object per scope
- `vars-remove-refcount` - Remove reactive vars by reference, static by structure
- `vars-scope-options` - Scope, prefix, and name vars through the options
- `vars-shadow-root` - Pair hosted vars with scoped :host in shadow roots
- `vars-token-proxy` - Consume the vars proxy; the sheet is what updates

### Keyframe animations (kf)

- `kf-canonical-removal` - Remove keyframes by definition object, order never matters
- `kf-use-returned-name` - Use the keyframes return value in animation properties

### Variant recipes and class composition (recipe)

- `recipe-caller-reactivity` - Re-resolve recipes at the call site for reactivity
- `recipe-cx-join` - Join class fragments with cx
- `recipe-responsive-media` - Declare responsive breakpoints in cva media config
- `recipe-variant-maps` - Define variants as maps and validate by resolution

### Server rendering and hydration (ssrcss)

- `ssrcss-adoption-id` - Ship the style tag with its sheet id
- `ssrcss-collect-csstext` - Embed cssText in every server response

Full rule text, incorrect/correct examples, and source references: `AGENTS.md` in this folder (compiled from `rules/` by `vp run skills-build`).
