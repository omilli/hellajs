import type { HellaChildren } from "@hellajs/dom";

import { css, style } from "@hellajs/css";

const base = style({
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
}, { label: "marker" });

const variants: Record<string, string> = {
  separator: style({
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
  }, { label: "marker-separator" }),
  border: style({
    borderBottom: "1px solid var(--border)",
    paddingBottom: "0.5rem",
  }, { label: "marker-border" }),
};

const icon = style({
  flexShrink: "0",
  height: "1rem",
  width: "1rem",
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
}, { label: "marker-icon" });

const content = style({
  minWidth: "0",
  overflowWrap: "break-word",
  "& a": {
    textDecorationLine: "underline",
    textUnderlineOffset: "3px",
  },
  "& a:hover": {
    color: "var(--foreground)",
  },
}, { label: "marker-content" });

css({
  "[data-slot='marker'][data-variant='separator'] [data-slot='marker-content']": {
    flex: "none",
    textAlign: "center",
  },
});

interface MarkerProps {
  children?: HellaChildren;
  variant?: "default" | "separator" | "border";
  class?: string;
}

export default function Marker(props: MarkerProps): JSX.Element {
  return (
    <div
      data-slot="marker"
      data-variant={props.variant ?? "default"}
      class={
        [
          base,
          variants[props.variant ?? "default"],
          props.class,
        ]
      }
    >
      {props.children}
    </div>
  );
}

interface MarkerIconProps {
  children?: HellaChildren;
  class?: string;
}

export function MarkerIcon(props: MarkerIconProps): JSX.Element {
  return (
    <span
      data-slot="marker-icon"
      aria-hidden="true"
      class={
        [icon, props.class]
      }
    >
      {props.children}
    </span>
  );
}

interface MarkerContentProps {
  children?: HellaChildren;
  class?: string;
}

export function MarkerContent(props: MarkerContentProps): JSX.Element {
  return (
    <span
      data-slot="marker-content"
      class={
        [content, props.class]
      }
    >
      {props.children}
    </span>
  );
}
