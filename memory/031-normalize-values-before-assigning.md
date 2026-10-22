---
title: Normalize values before assigning to textContent
description: Stringify numbers before `element.textContent = v` — happy-dom's setter drops falsy values, so a raw `0` renders nothing where browsers render "0".
tags: [dom, happy-dom, textContent, falsy, test-env]
confirmed: 2026-10-21
---
# Why

Browsers coerce any assigned value to DOMString before the setter runs, so `el.textContent = 0` yields "0". happy-dom's `textContent` setter (Element.js) first removes all children, then appends a text node only `if (textContent)` — a falsy raw value (`0`, `""`, `false`) clears the element and renders nothing. Any fast path that assigns a non-string value to `textContent` silently diverges between the test environment and the browser. Normalize first (`String(v)`, which also keeps `0` truthy as `"0"`); empty-string assignments behave identically in both engines (no child node).

# Evidence

`node_modules/happy-dom/lib/nodes/element/Element.js` setter: removes all childNodes, then `if (textContent) { this.appendChild(...createTextNode(textContent)); }` (read 2026-10-21). Realized in `packages/dom/lib/internal/render.ts` `appendToParent`'s single-number-child fast path: `parent.textContent = String(only)`; verified by the `test.each([5, 0])` case in `packages/dom/tests/mount-binding.test.tsx` (`vp run coverage dom` exit 0).
