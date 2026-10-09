import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

import { style } from "@hellajs/css";
import { tokens } from "./tokens.js";

const base = style("badge", {
  alignItems: "center",
  border: "1px solid transparent",
  borderRadius: "calc(infinity * 1px)",
  boxSizing: "border-box",
  display: "inline-flex",
  flexShrink: "0",
  fontSize: "0.75rem",
  fontWeight: "500",
  gap: "0.25rem",
  justifyContent: "center",
  lineHeight: "1rem",
  overflow: "hidden",
  paddingBlock: "0.125rem",
  paddingInline: "0.5rem",
  transitionDuration: "150ms",
  transitionProperty: "color, box-shadow",
  transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
  whiteSpace: "nowrap",
  width: "fit-content",
  "& > svg": {
    height: "0.75rem",
    pointerEvents: "none",
    width: "0.75rem",
  },
  "&:focus-visible": {
    borderColor: tokens.ring,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
  },
  "&[aria-invalid='true']": {
    borderColor: tokens.destructive,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 20%, transparent)`,
  },
  "&:is(.dark *)[aria-invalid='true']": {
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 40%, transparent)`,
  },
});

const variants = {
  default: style("badge-default", {
    backgroundColor: tokens.primary,
    color: tokens.primaryForeground,
    "&:is(a):hover": {
      backgroundColor: `color-mix(in oklab, ${tokens.primary} 90%, transparent)`,
    },
  }),
  secondary: style("badge-secondary", {
    backgroundColor: tokens.secondary,
    color: tokens.secondaryForeground,
    "&:is(a):hover": {
      backgroundColor: `color-mix(in oklab, ${tokens.secondary} 90%, transparent)`,
    },
  }),
  destructive: style("badge-destructive", {
    backgroundColor: tokens.destructive,
    color: "#fff",
    "&:focus-visible": {
      boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 20%, transparent)`,
    },
    "&:is(.dark *)": {
      backgroundColor: `color-mix(in oklab, ${tokens.destructive} 60%, transparent)`,
    },
    "&:is(.dark *):focus-visible": {
      boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 40%, transparent)`,
    },
    "&:is(a):hover": {
      backgroundColor: `color-mix(in oklab, ${tokens.destructive} 90%, transparent)`,
    },
  }),
  outline: style("badge-outline", {
    borderColor: tokens.border,
    color: tokens.foreground,
    "&:is(a):hover": {
      backgroundColor: tokens.accent,
      color: tokens.accentForeground,
    },
  }),
  ghost: style("badge-ghost", {
    "&:is(a):hover": {
      backgroundColor: tokens.accent,
      color: tokens.accentForeground,
    },
  }),
  link: style("badge-link", {
    color: tokens.primary,
    textUnderlineOffset: "4px",
    "&:is(a):hover": {
      textDecorationLine: "underline",
    },
  }),
};

interface BadgeProps extends HTMLAttributes<"span"> {
  class?: string;
  children?: HellaChildren;
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
}

export default function Badge({ variant, children, class: cls, ...attrs }: BadgeProps): JSX.Element {
  return (
    <span
      data-slot="badge"
      data-variant={variant ?? "default"}
      class={
        [
          base,
          variants[variant ?? "default"],
          cls,
        ]
      }
      {...attrs}
    >
      {children}
    </span>
  );
}
