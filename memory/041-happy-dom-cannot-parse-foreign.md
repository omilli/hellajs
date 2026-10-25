---
title: happy-dom cannot parse foreign namespaces natively — re-create foreign-interior templates via createElementNS
description: "happy-dom 20.x parses MathML-context innerHTML in HTML context and implements no foreignObject integration point anywhere, so only createElementNS re-creation (namespace inheritance walk) yields correct namespaces; a context-element parse is correct for svg roots only."
tags: [happy-dom, svg, mathml, namespaces, templates, dom, testing]
confirmed: 2026-10-24
---
# Why
Any mechanism that parses hoisted svg/MathML template strings and trusts the parser's namespaces silently produces wrong-namespace elements in the test environment: MathML-interior content parses in XHTML ns, foreignObject interiors stay in the parent's foreign ns, and html-context parses lowercase attribute names on rooted foreign tags (viewBox → viewbox). If ignored, svg template tests pass in browsers but fail (or worse, silently mis-create) under happy-dom; tag tables are not required to fix it — a ~15-line inheritance walk keyed on the authored namespace is.

# Evidence
Probe suite under packages/dom/tests (2026-10-24, happy-dom 20.14.6): `createElementNS(SVG_NS,'svg').innerHTML = '<g><circle/></g>'` → children carry the SVG namespaceURI with authored case preserved (clipPath, viewBox); `createElementNS(MATHML_NS,'math').innerHTML = '<mrow><mi>x</mi></mrow>'` → children in the XHTML ns (math context parses in HTML mode); `<svg><foreignObject><div/></foreignObject></svg>` parsed via either template.innerHTML or svg-context innerHTML → div carries the SVG ns (no integration point); `template.innerHTML = '<g viewBox=...>'` at HTML position → attr lowercased, tag uppercased. `grep -n 'MathML\\|foreignObject'` in dom's runtime parse confirms the re-creation walk is load-bearing under the test env.
