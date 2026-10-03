/**
 * Exhaustive cascade-layer declaration order, prefixed onto the demo css
 * tag in MainLayout. First declaration wins position: without this
 * statement the demo tag's `@layer hella{…}` blocks first-declare `hella`
 * ahead of the linked stylesheet's tailwind/daisyUI layers, and base
 * preflight outranks hella (layer order ranks above specificity). Derived
 * from the built stylesheet's actual statement order. TEMPORARY: dies with
 * tailwind+daisyUI in the tailwind-exit unit (becomes `@layer hella;`).
 */
export const LAYER_ORDER =
  "@layer properties, theme, base, components, utilities, daisyui, daisyui.l1, daisyui.l1.l2, daisyui.l1.l2.l3, daisyui.l1.l2.l3.l4, hella;\n";
