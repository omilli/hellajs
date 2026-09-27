---
type: correction
title: "Inline-style asserts must space-collapse: jsx serializes `left:25%`, html binds the author string `left: 25%` verbatim"
description: The two registry flavors disagree only on declaration spacing — assert `(el.getAttribute('style') ?? el.style.cssText).replaceAll(' ', '')`; HappyDOM (20.14.5) always populates the style attribute.
tags: [testing, happydom, ui]
timestamp: 2026-09-27
last_confirmed: 2026-09-27
triggers: [style-attribute-assert, object-form-style, slider-thumb-position, css-text-assert, happydom-cssom]
supersedes: 173
---
# Why

The two registry flavors serialize inline styles differently: dom's object-form renderer emits `prop:value` (no space after the colon) joined with `"; "` (`renderProp`, `packages/dom/lib/internal/utils.ts:78`), while the html flavor binds the author's string verbatim (`prop: value`). A raw `getAttribute("style").toContain("left: 25%")` therefore passes the html flavor and fails the jsx flavor for serialization-only reasons — assert the space-collapsed union of attribute and cssText instead.

What breaks if ignored: flavor-parity position/size asserts (slider thumbs, progress) fail for one flavor while passing the other.

Version caveat (corrects the superseded 173): 173 claimed HappyDOM never reflects CSSOM property writes into the style attribute (`getAttribute("style")` staying empty). False against installed happy-dom 20.14.5: `el.style.left = "25%"` reflects to the attribute as normalized `"left: 25%;"` — the attribute is always populated on both the setAttribute and CSSOM write paths. The spacing asymmetry alone is the load-bearing fact; the `?? el.style.cssText` fallback remains as cheap robustness, not a live necessity. An older resolved happy-dom may have behaved as 173 described — re-probe before trusting either claim on a fresh checkout.

# Evidence

Session 2026-09-27 probe (`bun -e` with @happy-dom/global-registrator 20.14.5): CSSOM write → attr `"left: 25%;"` (reflected, normalized); attribute writes are verbatim, never normalized (`"left: 25%"`, `"left:25%"` stay as set). Serialization source: `packages/dom/lib/internal/utils.ts:65-79`. Helper: `packages/ui/tests/slider.test.ts:15-17` (`inlineStyles`). `bun bundle ui && bun test packages/ui/tests/slider.test.ts` → 49 pass, 0 fail.
