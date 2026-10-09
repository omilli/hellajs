import { html } from "@hellajs/dom";
import type { HTMLAttributes, HellaChildren, HellaNode } from "@hellajs/dom";

import { css, style } from "@hellajs/css";

const base = style("marker", {
  alignItems: "center",
  color: "var(--muted-foreground)",
  columnGap: "0.5rem",
  display: "flex",
  minHeight: "1rem",
  position: "relative",
  textAlign: "left",
  width: "100%",
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
  "& a": {
    textDecorationLine: "underline",
    textUnderlineOffset: "3px",
  },
  "& a:hover": {
    color: "var(--foreground)",
  },
});

const variants: Record<string, string> = {
  separator: style("marker-separator", {
    "&::before": {
      backgroundColor: "var(--border)",
      flex: "1 1 0%",
      height: "1px",
      marginRight: "0.25rem",
      minWidth: "0",
    },
    "&::after": {
      backgroundColor: "var(--border)",
      flex: "1 1 0%",
      height: "1px",
      marginLeft: "0.25rem",
      minWidth: "0",
    },
  }),
  border: style("marker-border", {
    borderBottom: "1px solid var(--border)",
    paddingBottom: "0.5rem",
  }),
};

const icon = style("marker-icon", {
  flexShrink: "0",
  height: "1rem",
  width: "1rem",
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
});

const content = style("marker-content", {
  minWidth: "0",
  overflowWrap: "break-word",
  "& a": {
    textDecorationLine: "underline",
    textUnderlineOffset: "3px",
  },
  "& a:hover": {
    color: "var(--foreground)",
  },
});

css({
  "[data-slot='marker'][data-variant='separator'] [data-slot='marker-content']": {
    flex: "none",
    textAlign: "center",
  },
});

interface MarkerProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  variant?: "default" | "separator" | "border";
}

export default function Marker({ variant, children, class: cls, ...attrs }: MarkerProps): HellaNode {
  return html`
    <div
      data-slot="marker"
      data-variant="${variant ?? "default"}"
      class="${
        [
          base,
          variants[variant ?? "default"],
          cls,
        ]
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface MarkerIconProps extends HTMLAttributes<"span"> {
  class?: string;
  children?: HellaChildren;
}

export function MarkerIcon({ children, class: cls, ...attrs }: MarkerIconProps): HellaNode {
  return html`
    <span
      data-slot="marker-icon"
      aria-hidden="true"
      class="${
        [icon, cls]
      }"
      ...${attrs}
    >${() => children}</span>
  ` as HellaNode;
}

interface MarkerContentProps extends HTMLAttributes<"span"> {
  class?: string;
  children?: HellaChildren;
}

export function MarkerContent({ children, class: cls, ...attrs }: MarkerContentProps): HellaNode {
  return html`
    <span
      data-slot="marker-content"
      class="${
        [content, cls]
      }"
      ...${attrs}
    >${() => children}</span>
  ` as HellaNode;
}
