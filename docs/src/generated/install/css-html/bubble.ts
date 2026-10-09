import { html } from "@hellajs/dom";
import type { HTMLAttributes, HellaChildren, HellaNode } from "@hellajs/dom";

import { css, style } from "@hellajs/css";
import { tokens } from "./tokens.js";

const base = style("bubble-group", {
  display: "flex",
  flexDirection: "column",
  minWidth: "0",
  gap: "0.5rem",
});

const variants = {
  default: style("bubble-default", {
    "& > [data-slot='bubble-content']": {
      backgroundColor: tokens.primary,
      color: tokens.primaryForeground,
    },
    "& > [data-slot='bubble-content']:is(button, a):hover": {
      backgroundColor: `color-mix(in oklab, ${tokens.primary} 80%, transparent)`,
    },
  }),
  secondary: style("bubble-secondary", {
    "& > [data-slot='bubble-content']": {
      backgroundColor: tokens.secondary,
      color: tokens.secondaryForeground,
    },
    "& > [data-slot='bubble-content']:is(button, a):hover": {
      backgroundColor: `color-mix(in oklch, ${tokens.secondary}, ${tokens.foreground} 5%)`,
    },
  }),
  muted: style("bubble-muted", {
    "& > [data-slot='bubble-content']": {
      backgroundColor: tokens.muted,
    },
    "& > [data-slot='bubble-content']:is(button, a):hover": {
      backgroundColor: `color-mix(in oklch, ${tokens.muted}, ${tokens.foreground} 5%)`,
    },
  }),
  tinted: style("bubble-tinted", {
    "& > [data-slot='bubble-content']": {
      backgroundColor: `oklch(from ${tokens.primary} 0.93 calc(c * 0.4) h)`,
      color: tokens.foreground,
    },
    "&:is(.dark *) > [data-slot='bubble-content']": {
      backgroundColor: `oklch(from ${tokens.primary} 0.3 calc(c * 0.4) h)`,
    },
    "& > [data-slot='bubble-content']:is(button, a):hover": {
      backgroundColor: `oklch(from ${tokens.primary} 0.88 calc(c * 0.5) h)`,
    },
    "&:is(.dark *) > [data-slot='bubble-content']:is(button, a):hover": {
      backgroundColor: `oklch(from ${tokens.primary} 0.35 calc(c * 0.5) h)`,
    },
  }),
  outline: style("bubble-outline", {
    "& > [data-slot='bubble-content']": {
      borderColor: tokens.border,
      backgroundColor: tokens.background,
    },
    "& > [data-slot='bubble-content']:is(button, a):hover": {
      backgroundColor: tokens.muted,
      color: tokens.foreground,
    },
    "&:is(.dark *) > [data-slot='bubble-content']:is(button, a):hover": {
      backgroundColor: `color-mix(in oklab, ${tokens.input} 30%, transparent)`,
    },
  }),
  ghost: style("bubble-ghost", {
    borderStyle: "none",
    "& > [data-slot='bubble-content']": {
      borderRadius: "0",
      backgroundColor: "transparent",
      padding: "0",
    },
    "& > [data-slot='bubble-content']:is(button, a):hover": {
      backgroundColor: tokens.muted,
      color: tokens.foreground,
    },
    "&:is(.dark *) > [data-slot='bubble-content']:is(button, a):hover": {
      backgroundColor: `color-mix(in oklab, ${tokens.muted} 50%, transparent)`,
    },
  }),
  destructive: style("bubble-destructive", {
    "& > [data-slot='bubble-content']": {
      backgroundColor: `color-mix(in oklab, ${tokens.destructive} 10%, transparent)`,
      color: tokens.destructive,
    },
    "&:is(.dark *) > [data-slot='bubble-content']": {
      backgroundColor: `color-mix(in oklab, ${tokens.destructive} 20%, transparent)`,
    },
    "& > [data-slot='bubble-content']:is(button, a):hover": {
      backgroundColor: `color-mix(in oklab, ${tokens.destructive} 20%, transparent)`,
    },
    "&:is(.dark *) > [data-slot='bubble-content']:is(button, a):hover": {
      backgroundColor: `color-mix(in oklab, ${tokens.destructive} 30%, transparent)`,
    },
  }),
};

const bubble = style("bubble", {
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
});

const content = style("bubble-content", {
  width: "fit-content",
  maxWidth: "100%",
  minWidth: "0",
  overflow: "hidden",
  borderRadius: `calc(${tokens.radius} * 1.4)`,
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
    borderColor: tokens.ring,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
  },
});

const reactions = style("bubble-reactions", {
  position: "absolute",
  zIndex: "10",
  display: "flex",
  width: "fit-content",
  flexShrink: "0",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.25rem",
  borderRadius: "calc(infinity * 1px)",
  backgroundColor: tokens.muted,
  paddingInline: "0.375rem",
  paddingBlock: "0.125rem",
  fontSize: "0.875rem",
  boxShadow: `0 0 0 3px ${tokens.card}`,
  "&:has(button)": {
    padding: "0",
  },
});

css({
  "[data-slot='message'][data-align='end'] [data-slot='bubble']": {
    alignSelf: "flex-end",
  },
  "[data-slot='bubble'][data-align='end'] [data-slot='bubble-content']": {
    alignSelf: "flex-end",
  },
});

const reactionsSides = {
  top: style("bubble-reactions-top", {
    top: "0",
    transform: "translateY(-75%)",
  }),
  bottom: style("bubble-reactions-bottom", {
    bottom: "0",
    transform: "translateY(75%)",
  }),
};

const reactionsAligns = {
  start: style("bubble-reactions-start", {
    left: "0.75rem",
  }),
  end: style("bubble-reactions-end", {
    right: "0.75rem",
  }),
};

interface BubbleGroupProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function BubbleGroup({ children, class: cls, ...attrs }: BubbleGroupProps): HellaNode {
  return html`
    <div
      data-slot="bubble-group"
      class="${
        [base, cls]
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface BubbleProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  variant?: "default" | "secondary" | "muted" | "tinted" | "outline" | "ghost" | "destructive";
  align?: "start" | "end";
}

export function Bubble({ variant, align, children, class: cls, ...attrs }: BubbleProps): HellaNode {
  return html`
    <div
      data-slot="bubble"
      data-variant="${variant ?? "default"}"
      data-align="${align ?? "start"}"
      class="${
        [bubble, variants[variant ?? "default"], cls]
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface BubbleContentProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function BubbleContent({ children, class: cls, ...attrs }: BubbleContentProps): HellaNode {
  return html`
    <div
      data-slot="bubble-content"
      class="${
        [content, cls]
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface BubbleReactionsProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  side?: "top" | "bottom";
  align?: "start" | "end";
}

export function BubbleReactions({ side, align, children, class: cls, ...attrs }: BubbleReactionsProps): HellaNode {
  return html`
    <div
      data-slot="bubble-reactions"
      data-align="${align ?? "end"}"
      data-side="${side ?? "bottom"}"
      class="${
        [reactions, reactionsSides[side ?? "bottom"], reactionsAligns[align ?? "end"], cls]
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}
