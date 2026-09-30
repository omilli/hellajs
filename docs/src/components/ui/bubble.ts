import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";

import { css, style } from "@hellajs/css";

const base = style({
  display: "flex",
  flexDirection: "column",
  minWidth: "0",
  gap: "0.5rem",
}, { label: "hella-bubble-group", layer: "hella" });

const variants = {
  default: style({
    "& > [data-slot='bubble-content']": {
      backgroundColor: "var(--primary)",
      color: "var(--primary-foreground)",
    },
    "& > [data-slot='bubble-content']:is(button, a):hover": {
      backgroundColor: "color-mix(in oklab, var(--primary) 80%, transparent)",
    },
  }, { label: "hella-bubble-default", layer: "hella" }),
  secondary: style({
    "& > [data-slot='bubble-content']": {
      backgroundColor: "var(--secondary)",
      color: "var(--secondary-foreground)",
    },
    "& > [data-slot='bubble-content']:is(button, a):hover": {
      backgroundColor: "color-mix(in oklch, var(--secondary), var(--foreground) 5%)",
    },
  }, { label: "hella-bubble-secondary", layer: "hella" }),
  muted: style({
    "& > [data-slot='bubble-content']": {
      backgroundColor: "var(--muted)",
    },
    "& > [data-slot='bubble-content']:is(button, a):hover": {
      backgroundColor: "color-mix(in oklch, var(--muted), var(--foreground) 5%)",
    },
  }, { label: "hella-bubble-muted", layer: "hella" }),
  tinted: style({
    "& > [data-slot='bubble-content']": {
      backgroundColor: "oklch(from var(--primary) 0.93 calc(c * 0.4) h)",
      color: "var(--foreground)",
    },
    "&:is(.dark *) > [data-slot='bubble-content']": {
      backgroundColor: "oklch(from var(--primary) 0.3 calc(c * 0.4) h)",
    },
    "& > [data-slot='bubble-content']:is(button, a):hover": {
      backgroundColor: "oklch(from var(--primary) 0.88 calc(c * 0.5) h)",
    },
    "&:is(.dark *) > [data-slot='bubble-content']:is(button, a):hover": {
      backgroundColor: "oklch(from var(--primary) 0.35 calc(c * 0.5) h)",
    },
  }, { label: "hella-bubble-tinted", layer: "hella" }),
  outline: style({
    "& > [data-slot='bubble-content']": {
      borderColor: "var(--border)",
      backgroundColor: "var(--background)",
    },
    "& > [data-slot='bubble-content']:is(button, a):hover": {
      backgroundColor: "var(--muted)",
      color: "var(--foreground)",
    },
    "&:is(.dark *) > [data-slot='bubble-content']:is(button, a):hover": {
      backgroundColor: "color-mix(in oklab, var(--input) 30%, transparent)",
    },
  }, { label: "hella-bubble-outline", layer: "hella" }),
  ghost: style({
    borderStyle: "none",
    "& > [data-slot='bubble-content']": {
      borderRadius: "0",
      backgroundColor: "transparent",
      padding: "0",
    },
    "& > [data-slot='bubble-content']:is(button, a):hover": {
      backgroundColor: "var(--muted)",
      color: "var(--foreground)",
    },
    "&:is(.dark *) > [data-slot='bubble-content']:is(button, a):hover": {
      backgroundColor: "color-mix(in oklab, var(--muted) 50%, transparent)",
    },
  }, { label: "hella-bubble-ghost", layer: "hella" }),
  destructive: style({
    "& > [data-slot='bubble-content']": {
      backgroundColor: "color-mix(in oklab, var(--destructive) 10%, transparent)",
      color: "var(--destructive)",
    },
    "&:is(.dark *) > [data-slot='bubble-content']": {
      backgroundColor: "color-mix(in oklab, var(--destructive) 20%, transparent)",
    },
    "& > [data-slot='bubble-content']:is(button, a):hover": {
      backgroundColor: "color-mix(in oklab, var(--destructive) 20%, transparent)",
    },
    "&:is(.dark *) > [data-slot='bubble-content']:is(button, a):hover": {
      backgroundColor: "color-mix(in oklab, var(--destructive) 30%, transparent)",
    },
  }, { label: "hella-bubble-destructive", layer: "hella" }),
};

const bubble = style({
  position: "relative",
  display: "flex",
  width: "fit-content",
  maxWidth: "80%",
  minWidth: "0",
  flexDirection: "column",
  gap: "0.25rem",
  "&[data-align='end']": {
    alignSelf: "flex-end",
  },
  "&[data-variant='ghost']": {
    maxWidth: "100%",
  },
}, { label: "hella-bubble", layer: "hella" });

const content = style({
  width: "fit-content",
  maxWidth: "100%",
  minWidth: "0",
  overflow: "hidden",
  borderRadius: "calc(var(--radius) * 1.4)",
  border: "1px solid transparent",
  paddingInline: "0.75rem",
  paddingBlock: "0.5rem",
  fontSize: "0.875rem",
  lineHeight: "1.625",
  overflowWrap: "break-word",
  "&:is(button)": {
    textAlign: "left",
  },
  "&:is(button, a)": {
    transitionProperty: "color, background-color, border-color, outline-color, text-decoration-color, fill, stroke",
    transitionDuration: "150ms",
    transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
    outlineStyle: "none",
  },
  "&:is(button, a):focus-visible": {
    borderColor: "var(--ring)",
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
  },
}, { label: "hella-bubble-content", layer: "hella" });

const reactions = style({
  position: "absolute",
  zIndex: "10",
  display: "flex",
  width: "fit-content",
  flexShrink: "0",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.25rem",
  borderRadius: "calc(infinity * 1px)",
  backgroundColor: "var(--muted)",
  paddingInline: "0.375rem",
  paddingBlock: "0.125rem",
  fontSize: "0.875rem",
  boxShadow: "0 0 0 3px var(--card)",
  "&:has(button)": {
    padding: "0",
  },
}, { label: "hella-bubble-reactions", layer: "hella" });

css({
  "@layer hella": {
    "[data-slot='message'][data-align='end'] [data-slot='bubble']": {
      alignSelf: "flex-end",
    },
    "[data-slot='bubble'][data-align='end'] [data-slot='bubble-content']": {
      alignSelf: "flex-end",
    },
  },
});

const reactionsSides = {
  top: style({
    top: "0",
    transform: "translateY(-75%)",
  }, { label: "hella-bubble-reactions-top", layer: "hella" }),
  bottom: style({
    bottom: "0",
    transform: "translateY(75%)",
  }, { label: "hella-bubble-reactions-bottom", layer: "hella" }),
};

const reactionsAligns = {
  start: style({
    left: "0.75rem",
  }, { label: "hella-bubble-reactions-start", layer: "hella" }),
  end: style({
    right: "0.75rem",
  }, { label: "hella-bubble-reactions-end", layer: "hella" }),
};

interface BubbleGroupProps {
  children?: HellaChildren;
  class?: string;
}

export function BubbleGroup(props: BubbleGroupProps): HellaNode {
  return html`
    <div
      data-slot="bubble-group"
      class="${
        [base, props.class]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface BubbleProps {
  children?: HellaChildren;
  variant?: "default" | "secondary" | "muted" | "tinted" | "outline" | "ghost" | "destructive";
  align?: "start" | "end";
  class?: string;
}

export function Bubble(props: BubbleProps): HellaNode {
  return html`
    <div
      data-slot="bubble"
      data-variant="${props.variant ?? "default"}"
      data-align="${props.align ?? "start"}"
      class="${
        [bubble, variants[props.variant ?? "default"], props.class]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface BubbleContentProps {
  children?: HellaChildren;
  class?: string;
}

export function BubbleContent(props: BubbleContentProps): HellaNode {
  return html`
    <div
      data-slot="bubble-content"
      class="${
        [content, props.class]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface BubbleReactionsProps {
  children?: HellaChildren;
  side?: "top" | "bottom";
  align?: "start" | "end";
  class?: string;
}

export function BubbleReactions(props: BubbleReactionsProps): HellaNode {
  return html`
    <div
      data-slot="bubble-reactions"
      data-align="${props.align ?? "end"}"
      data-side="${props.side ?? "bottom"}"
      class="${
        [reactions, reactionsSides[props.side ?? "bottom"], reactionsAligns[props.align ?? "end"], props.class]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}
