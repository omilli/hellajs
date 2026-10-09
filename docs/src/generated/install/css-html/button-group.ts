import { html } from "@hellajs/dom";
import type { HTMLAttributes, HellaChildren, HellaNode } from "@hellajs/dom";

import { style } from "@hellajs/css";

const base = style("button-group", {
  alignItems: "stretch",
  display: "flex",
  width: "fit-content",
  "&:has(> [data-slot='button-group'])": {
    gap: "0.5rem",
  },
  "& > *:focus-visible": {
    position: "relative",
    zIndex: "10",
  },
  "&:has(select[aria-hidden='true']:last-child) > [data-slot='select-trigger']:last-of-type": {
    borderBottomRightRadius: "calc(var(--radius) * 0.8)",
    borderTopRightRadius: "calc(var(--radius) * 0.8)",
  },
  "& > [data-slot='select-trigger']:not([class*='w-'])": {
    width: "fit-content",
  },
  "& > input": {
    flex: "1 1 0%",
  },
});

const orientation = {
  horizontal: style("button-group-horizontal", {
    "& > *:not(:first-child)": {
      borderBottomLeftRadius: "0",
      borderLeftWidth: "0",
      borderTopLeftRadius: "0",
    },
    "& > *:not(:last-child)": {
      borderBottomRightRadius: "0",
      borderTopRightRadius: "0",
    },
  }),
  vertical: style("button-group-vertical", {
    flexDirection: "column",
    "& > *:not(:first-child)": {
      borderTopLeftRadius: "0",
      borderTopRightRadius: "0",
      borderTopWidth: "0",
    },
    "& > *:not(:last-child)": {
      borderBottomLeftRadius: "0",
      borderBottomRightRadius: "0",
    },
  }),
};

const text = style("button-group-text", {
  alignItems: "center",
  backgroundColor: "var(--muted)",
  border: "1px solid var(--border)",
  borderRadius: "calc(var(--radius) * 0.8)",
  display: "flex",
  fontSize: "0.875rem",
  fontWeight: "500",
  gap: "0.5rem",
  paddingInline: "1rem",
  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  "& svg": {
    pointerEvents: "none",
  },
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
});

const separatorBase = style("button-group-separator", {
  backgroundColor: "var(--border)",
  flexShrink: "0",
  "&[data-orientation='horizontal']": {
    height: "1px",
    width: "100%",
  },
  "&[data-orientation='vertical']": {
    height: "100%",
    width: "1px",
  },
});

const separator = style("button-group-separator-override", {
  alignSelf: "stretch",
  backgroundColor: "var(--input)",
  margin: "0 !important",
  position: "relative",
  "&[data-orientation='vertical']": {
    height: "auto",
  },
});

interface ButtonGroupProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  orientation?: "horizontal" | "vertical";
}

export default function ButtonGroup({ orientation: orient, children, class: cls, ...attrs }: ButtonGroupProps): HellaNode {
  return html`
    <div
      role="group"
      data-slot="button-group"
      data-orientation="${orient ?? "horizontal"}"
      class="${
        [
          base,
          orientation[orient ?? "horizontal"],
          cls,
        ]
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface ButtonGroupTextProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function ButtonGroupText({ children, class: cls, ...attrs }: ButtonGroupTextProps): HellaNode {
  return html`
    <div
      data-slot="button-group-text"
      class="${
        [text, cls]
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface ButtonGroupSeparatorProps extends HTMLAttributes<"div"> {
  orientation?: "horizontal" | "vertical";
  class?: string;
}

export function ButtonGroupSeparator({ orientation: orient, class: cls, ...attrs }: ButtonGroupSeparatorProps): HellaNode {
  return html`
    <div
      role="separator"
      data-slot="button-group-separator"
      data-orientation="${orient ?? "vertical"}"
      aria-orientation="${orient ?? "vertical"}"
      class="${
        [
          separatorBase,
          separator,
          cls,
        ]
      }"
      ...${attrs}
    ></div>
  ` as HellaNode;
}
