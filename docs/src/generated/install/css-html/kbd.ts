import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";

import { style } from "@hellajs/css";

const base = style({
  alignItems: "center",
  backgroundColor: "var(--muted)",
  borderRadius: "calc(var(--radius) * 0.6)",
  boxSizing: "border-box",
  color: "var(--muted-foreground)",
  display: "inline-flex",
  fontFamily: "var(--font-sans, ui-sans-serif, system-ui, sans-serif)",
  fontSize: "0.75rem",
  fontWeight: "500",
  gap: "0.25rem",
  height: "1.25rem",
  justifyContent: "center",
  lineHeight: "1rem",
  minWidth: "1.25rem",
  paddingInline: "0.25rem",
  pointerEvents: "none",
  userSelect: "none",
  width: "fit-content",
  "& svg:not([class*='size-'])": {
    height: "0.75rem",
    width: "0.75rem",
  },
  "&:is([data-slot='tooltip-content'] *)": {
    backgroundColor: "color-mix(in oklab, var(--background) 20%, transparent)",
    color: "var(--background)",
  },
  "&:is([data-slot='tooltip-content'] *):is(.dark *)": {
    backgroundColor: "color-mix(in oklab, var(--background) 10%, transparent)",
  },
}, { label: "kbd" });

const group = style({
  alignItems: "center",
  display: "inline-flex",
  gap: "0.25rem",
}, { label: "kbd-group" });

interface KbdProps {
  children?: HellaChildren;
  class?: string;
}

export default function Kbd(props: KbdProps): HellaNode {
  return html`
    <kbd
      data-slot="kbd"
      class="${
        [base, props.class]
      }"
    >${() => props.children}</kbd>
  ` as HellaNode;
}

export function KbdGroup(props: KbdProps): HellaNode {
  return html`
    <kbd
      data-slot="kbd-group"
      class="${
        [group, props.class]
      }"
    >${() => props.children}</kbd>
  ` as HellaNode;
}
