---
type: decision
title: "HappyDOM never reflects object-form style props to the style attribute — assert normalized cssText, not getAttribute('style')"
description: "JSX-flavor `style={() => ({...})}` updates land in CSSOM only (getAttribute('style') stays empty); html-flavor string bindings do set the attribute — assert a space-collapsed cssText union of both."
tags: [testing, happydom, ui]
timestamp: 2026-09-19
last_confirmed: 2026-09-19
triggers: [style-attribute-assert, object-form-style, happydom-cssom, slider-thumb-position, css-text-assert]
---
# Why

The two registry flavors serialize inline styles differently: dom's object-form renderer sets the attribute to `prop:value` declarations joined with `; ` (no space after the colon) while the html flavor binds the author's string verbatim (`prop: value`), AND HappyDOM does not reflect CSSOM property writes back into the attribute for the object path — an element can carry `style.left === "25%"` with `getAttribute("style")` empty (reactive updates) or `left:25%` vs `left: 25%` (initial render). Any position/size assertion written as `getAttribute("style").toContain("left: 25%")` passes the html flavor and fails the jsx flavor for serialization-only reasons. The robust read is `(el.getAttribute("style") ?? el.style.cssText).replaceAll(" ", "")` asserted against space-collapsed expectations.

# Evidence

Session 2026-09-19, slider tests: multi-thumb position asserts failed for both jsx flavors while html passed; a probe component (progress) showed `transform:translateX(-50%)` (jsx attr) vs `transform: translateX(-50%)` (html attr); after reactive writes the jsx attribute reads empty entirely. Fixed by the normalized `inlineStyles()` helper in `packages/ui/tests/slider.test.ts`; `bun coverage ui` exit 0.
