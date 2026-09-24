---
type: decision
title: Babel kebab-cases aria-/data-prefixed camelCase props at every JSX call site, component calls included
description: Never name a component prop `ariaFoo`/`dataFoo`; babel rewrites it to the "aria-foo" key at JSX call sites, so camelCase reads come back undefined in the jsx flavor while html keeps working.
tags: [babel, jsx, registry]
timestamp: 2026-09-18
last_confirmed: 2026-09-18
triggers: [component-props, aria-attribute, jsx-canonical, registry-composition, flavor-parity]
---
# Why

The rewrite is correct for HOST elements (the attribute name is the contract) but silently breaks component composition: a root passing `ariaControls={id}` to a part component compiles to `{ "aria-controls": id }`, and the part reading `props.ariaControls` gets `undefined`. The html flavor passes plain object keys verbatim, so the bug shows up as a jsx-only parity failure. Name the prop for the semantic without the prefix instead (`controls`, `labelledBy` per dialog) and bind `aria-controls={props.controls}` on the host.

# Evidence

`plugins/babel/src/processors/attributes.mjs`: `/^(data|aria)[A-Z]/.test(key)` kebab-cases the key for both element and component attributes. Reproduced in `packages/ui` unit 6: collapsible jsx variants rendered without `aria-controls` while html variants matched; compiled `dist/registry/collapsible/css/collapsible.js` shows `"aria-controls": contentId` at the `component(CollapsibleTrigger, …)` call site. Fixed by renaming the part prop to `controls`; `bun coverage ui` green across all four flavors after re-vendor.
