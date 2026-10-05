---
type: decision
title: "TypeScript checks namespaced JSX attributes (on:click) as string keys against the component props type — a closed interface rejects them at the call site"
description: "TS checks a JSX namespaced attr `on:click` as the string key `\"on:click\"` against props; interfaces declare `'on:click'?` members (or `'on:${string}'` keys) to accept and type them."
tags: [types, jsx, components, babel]
timestamp: 2026-10-05
last_confirmed: 2026-10-05
triggers: [namespaced-attr, jsx-string-key, on-prefix-typing, prefixed-props, component-event-props]
---

# Why

Prefixed attrs (`on:`/`e:`/`hook:`/`error:`) passed to a component are NOT silently dropped at the type level: the compiler checks them, so a closed props interface turns `<Button on:click={fn}/>` into a compile error rather than a runtime no-op. This is the foundation for typing forwarded prefixed props — declare the prefixed members on the props interface and TS enforces them end to end; `'on:${string}'` template-literal keys cover the open event-name space while curated unions can front autocomplete.

# Evidence

Probe (2026-10-05, per entry 118's recipe): `declare function Button(props: { children?: HellaChildren; click?: () => void }): JSX.Element; <Button on:click={() => {}}>hi</Button>` → `error TS2322: Type '{ children: string; "on:click": () => void; }' is not assignable ... Property 'on:click' does not exist` — the namespaced name appears as the quoted string key in the checked type.
