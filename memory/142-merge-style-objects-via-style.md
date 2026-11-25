---
title: Merge style objects via style([base, override]); no base/override overload and no mergeStyles export
description: Deep-merging style objects is a first-class documented feature in vanilla-extract and Panda (factory and recipe-override use cases) while Emotion, styled-components, and Stitches compose classes instead; HellaJS keeps the capability behind an array in style()'s first slot, removing the ambiguous style(base, override) overload and adding no new export.
tags: [css, style, composition, api-design, competitors]
confirmed: 2026-11-25
---
# Why

Records the chosen door for deep-merging style objects, `style([base, override], options?)`, and the two rejected shapes, the `style(base, override, options?)` overload and a standalone `mergeStyles` export, together with the competitor evidence that keeps the capability at all. A later reader should neither re-litigate the removal nor re-derive the research: stitches.dev answers 503, styled-components' site is unreachable from the agent sandbox, and the unauthenticated GitHub API budget is finite.

Also records the transferable lesson: zero first-party call sites is not evidence that a public capability is unneeded. Competitor documentation is the decisive check before recommending removal; the in-repo signal alone pointed at "remove" and the external evidence reversed it.

# Evidence

Competitor docs, read from each repo's default branch via raw.githubusercontent.com:

- vanilla-extract `site/docs/api/style.mdx`, section "Style merging": "When passing an array of style objects they will be deep merged into a single class. This is useful when creating utilities to help construct consistent styles", shown with a `responsiveStyle()` factory. "Style composition" is the separate class-name-array form.
- Panda CSS `website/content/docs/styling/merging-styles.mdx` (default branch `v2`), page "Merging Styles": `css(style1, style2)`; "Merging cva + css styles" via `css(buttonStyles.raw({ ... }), overrideStyles)`; `css.raw` objects spread inside nested selectors.
- Emotion `docs/composition.mdx` and `docs/object-styles.mdx`: composition is `css={[danger, base]}` class arrays; object arrays are CSS fallback values (`background: ['red', 'linear-gradient(...)']`). No object merge.
- styled-components `packages/styled-components/CHANGELOG.md`: extension wraps `styled(Component)`, the base CSS is duplicated, and `:where()` zero-specificity wrapping makes the extension win regardless of injection order. No object merge.
- Stitches `packages/core/src/features/css.js` (`css` function): every object argument becomes its own composer (`internals.composers.add(createComposer(arg, ...))`), i.e. class composition. The docs site is offline, so "documented" was not assessable.

In-repo facts (`packages/css`):

- Zero first-party call sites of the old overload across `packages/*/lib`, `plugins/`, `examples/`, `docs/src`, headless, and the ui registry. Its only callers were `style()` and `removeStyle()` through `resolveStyle`; `cva` never touched it.
- `isPlainObject([])` is false (`packages/core/lib/internal/utils.ts`, `isPlainObject`: an array prototype fails the check) and `StyleObject` in `lib/types.d.ts` has no array shape, so `style([a, b])` threw at runtime and failed typecheck before the array overload existed: the array slot carried no prior meaning.
- `isOptionBag` in `lib/style.ts` existed only because slot two could be either an options bag or an override (its doc comment said so). With the array in slot one, slot two is always the options bag and the heuristic is gone. `style('label', base, override)` was never a valid call: the label and the merge were mutually exclusive in the positional slot.
- `cva` `base?: StyleObject | string` passes strings through verbatim (`lib/cva.ts`, the `isString(base)` branch), so the recipe-plus-override case is `cva({ base: style([defaults, overrides]) })` with no cva change.

Decision:

- The third `style` overload is `style(objs: StyleObject[], options?: StyleOptions): string`: one or more plain style objects deep-merged left to right by the existing `mergeStyles` (later wins, nested plain objects recurse, arrays and scalars replace). An empty array throws; a non-object element (a class string, `null`) throws with `[css] style: expected a CSS object, received ...`. Class strings are excluded on purpose: composing existing classes is `cx`, and `style()` returns exactly one class. `removeStyle(objs, options?)` mirrors it through `resolveStyle`.
- The `style(base, override, options?)` overload and its `removeStyle` mirror are removed in a semver-major (`BREAKING CHANGE:` footer, no deprecation shim). A standalone `mergeStyles` export was rejected: the array form adds no barrel entry, no reference page, and no function-count edits, and matches vanilla-extract's call shape; a self-documenting name was its only advantage.
- The documented use cases are not variants (those belong to cx base + modifier, or to cva): style-utility factories whose returned object is merged into one class, and a recipe base merged with overrides.
- Known trade-off: Emotion arrays compose classes (two rules) while vanilla-extract arrays deep-merge objects (one rule), so the docs must state the semantics explicitly.
