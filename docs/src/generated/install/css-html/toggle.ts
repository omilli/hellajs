import { html } from "@hellajs/dom";
import { signal } from "@hellajs/core";
import type { HellaChildren, HellaNode } from "@hellajs/dom";

import { style } from "@hellajs/css";

const base = style({
  alignItems: "center",
  borderRadius: "calc(var(--radius) * 0.8)",
  boxSizing: "border-box",
  display: "inline-flex",
  fontSize: "0.875rem",
  fontWeight: "500",
  gap: "0.5rem",
  justifyContent: "center",
  lineHeight: "1.25rem",
  outlineStyle: "none",
  transition: "color 150ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  whiteSpace: "nowrap",
  "& svg": {
    flexShrink: "0",
    pointerEvents: "none",
  },
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
  "&:hover": {
    backgroundColor: "var(--muted)",
    color: "var(--muted-foreground)",
  },
  "&:focus-visible": {
    borderColor: "var(--ring)",
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
  },
  "&:disabled": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&[aria-invalid='true']": {
    borderColor: "var(--destructive)",
  },
  "&[aria-invalid='true']:focus-visible": {
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 20%, transparent)",
  },
  "&:is(.dark *)[aria-invalid='true']:focus-visible": {
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 40%, transparent)",
  },
  "&[data-state='on']": {
    backgroundColor: "var(--accent)",
    color: "var(--accent-foreground)",
  },
}, { label: "toggle" });

const variants = {
  default: style({
    backgroundColor: "transparent",
  }, { label: "toggle-default" }),
  outline: style({
    background: "transparent",
    border: "1px solid var(--input)",
    boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    "&:hover": {
      backgroundColor: "var(--accent)",
      color: "var(--accent-foreground)",
    },
  }, { label: "toggle-outline" }),
};

const sizes = {
  default: style({
    height: "2.25rem",
    minWidth: "2.25rem",
    paddingInline: "0.5rem",
  }, { label: "toggle-size-default" }),
  sm: style({
    height: "2rem",
    minWidth: "2rem",
    paddingInline: "0.375rem",
  }, { label: "toggle-size-sm" }),
  lg: style({
    height: "2.5rem",
    minWidth: "2.5rem",
    paddingInline: "0.625rem",
  }, { label: "toggle-size-lg" }),
};

interface ToggleProps {
  /** Pressed state. A boolean seeds the internal signal; an accessor makes the toggle controlled — clicks then only report through `onPressedChange`. */
  pressed?: boolean | (() => boolean);
  onPressedChange?: (pressed: boolean) => void;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
  disabled?: boolean;
  class?: string;
  children?: HellaChildren;
}

/** Resolves the toggle's full class from the spliced variant maps — the compose arrays' shared builder. */
export function toggleVariants(options?: {
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
  class?: string;
}): string {
  return [
    base,
    variants[options?.variant ?? "default"],
    sizes[options?.size ?? "default"],
    options?.class,
  ].filter(Boolean).join(" ");
}

export default function Toggle(props: ToggleProps): HellaNode {
  const pressedAccessor = typeof props.pressed === "function" ? props.pressed : undefined;
  const internal = signal(typeof props.pressed === "boolean" ? props.pressed : false);
  const pressed = (): boolean => (pressedAccessor ? pressedAccessor() : internal());

  const toggle = (): void => {
    if (props.disabled) return;
    const next = !pressed();
    if (!pressedAccessor) internal(next);
    props.onPressedChange?.(next);
  };

  return html`
    <button
      type="button"
      data-slot="toggle"
      aria-pressed="${() => (pressed() ? "true" : "false")}"
      data-state="${() => (pressed() ? "on" : "off")}"
      disabled="${props.disabled ? true : undefined}"
      class="${
        [toggleVariants({ variant: props.variant, size: props.size }), props.class]
      }"
      e:click="${toggle}"
    >${() => props.children}</button>
  ` as HellaNode;
}
