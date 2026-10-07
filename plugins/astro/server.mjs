import { ssr } from "@hellajs/ssr";
import { raw } from "@hellajs/dom";

/**
 * Maps Astro's pre-rendered slot HTML (`slots: Record<name, htmlString>`) into the component's
 * props as `[raw(html)]` arrays — one stable child value per slot regardless of which slot shape
 * the component's template consumes (function slot, concat passthrough, or direct value).
 * `default` → `props.children`; named slots → `props[name]`.
 */
function mapSlots(props, slots) {
  if (!slots) return props;
  for (const name in slots) {
    const v = [raw(slots[name])];
    if (name === "default") props.children = v;
    else props[name] = v;
  }
  return props;
}

/**
 * HellaJS Astro renderer (server entry). `check` claims every function component (exclusive-use);
 * `renderToStaticMarkup` runs `Component(props)` (returning a HellaNode — nested `component()` calls
 * execute server-side with no DOM) and stringifies via `ssr()`. Slot HTML passes through verbatim.
 */
export default {
  check: (Component) => typeof Component === "function",
  renderToStaticMarkup: async (Component, props, slots) => ({
    html: ssr(Component(mapSlots(props, slots)))
  }),
};
