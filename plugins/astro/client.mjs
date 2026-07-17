import { hydrate, component, raw } from "@hellajs/dom";

/**
 * HellaJS Astro client entry. Astro's `<astro-island>` runtime calls the default export with the
 * island element, then the returned function with `(Component, props, slots, { client })`. Slots are
 * reconstructed from the island's `<astro-slot>` / `<template data-astro-template>` elements (same
 * `Record<name, htmlString>` shape as the server) and mapped to `props` identically to the server
 * entry. The component is re-run inside `component()` to re-establish reactive scope, then `hydrate`
 * adopts the server DOM in place via its `<!--[-->…<!--]-->` markers.
 */
export default (el) => (Component, props, slots) => {
  if (slots) {
    for (const name in slots) {
      const v = [raw(slots[name])];
      if (name === "default") props.children = v;
      else props[name] = v;
    }
  }
  return hydrate(() => component(Component, props), el);
};
