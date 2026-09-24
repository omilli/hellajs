import { css, keyframes, style } from "@hellajs/css";

// tw-animate-css equivalents, hand-rolled: fade in/out for the overlay. The
// panel itself transitions through transform (vaul parity) rather than
// animate-in/out keyframes.
const fadeIn = keyframes({ from: { opacity: "0" } });
const fadeOut = keyframes({ to: { opacity: "0" } });

export const base = style({
  backgroundColor: "rgb(0 0 0 / 0.5)",
  inset: "0",
  position: "fixed",
  zIndex: "50",
  "&[data-state='open']": {
    animation: `${fadeIn} 150ms ease-out both`,
  },
  "&[data-state='closed']": {
    animation: `${fadeOut} 150ms ease-in both`,
  },
}, { label: "hella-drawer-base", layer: "hella" });

export const content = style({
  background: "var(--background)",
  display: "flex",
  flexDirection: "column",
  height: "auto",
  position: "fixed",
  transition: "opacity 150ms ease-in-out, transform 150ms ease-in-out",
  zIndex: "50",
  "&[data-dragging='true']": {
    transitionProperty: "none",
  },
}, { label: "hella-drawer-content", layer: "hella" });

export const contentDirections = {
  top: style({
    borderBottom: "1px solid var(--border)",
    borderRadius: "0 0 var(--radius) var(--radius)",
    left: "0",
    marginBottom: "6rem",
    maxHeight: "80vh",
    right: "0",
    top: "0",
  }, { label: "hella-drawer-content-top", layer: "hella" }),
  bottom: style({
    borderTop: "1px solid var(--border)",
    borderRadius: "var(--radius) var(--radius) 0 0",
    bottom: "0",
    left: "0",
    marginTop: "6rem",
    maxHeight: "80vh",
    right: "0",
  }, { label: "hella-drawer-content-bottom", layer: "hella" }),
  right: style({
    borderLeft: "1px solid var(--border)",
    bottom: "0",
    right: "0",
    top: "0",
    width: "75%",
    "@media (min-width: 40rem)": {
      "&": {
        maxWidth: "24rem",
      },
    },
  }, { label: "hella-drawer-content-right", layer: "hella" }),
  left: style({
    borderRight: "1px solid var(--border)",
    bottom: "0",
    left: "0",
    top: "0",
    width: "75%",
    "@media (min-width: 40rem)": {
      "&": {
        maxWidth: "24rem",
      },
    },
  }, { label: "hella-drawer-content-left", layer: "hella" }),
};

export const close = style({
  borderRadius: "calc(var(--radius) * 0.2)",
  opacity: "0.7",
  position: "absolute",
  right: "1rem",
  top: "1rem",
  transition: "opacity 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    opacity: "1",
  },
  "&:focus": {
    boxShadow: "0 0 0 2px var(--background), 0 0 0 4px var(--ring)",
    outlineStyle: "none",
  },
  "&:disabled": {
    pointerEvents: "none",
  },
  "&[data-state='open']": {
    backgroundColor: "var(--secondary)",
  },
  "& svg": {
    flexShrink: "0",
    pointerEvents: "none",
  },
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
  // The copied `sr-only` span: tailwind ships the utility, the css flavor
  // carries the same hiding recipe on the close part.
  "& span": {
    clip: "rect(0, 0, 0, 0)",
    borderWidth: "0",
    height: "1px",
    margin: "-1px",
    overflow: "hidden",
    padding: "0",
    position: "absolute",
    whiteSpace: "nowrap",
    width: "1px",
  },
}, { label: "hella-drawer-close", layer: "hella" });

// The handle grip zone: tailwind carries the copied utility string, the css
// flavor restyles it here. Ancestor-attribute conditions cannot restate
// self-based at class scope, so these register as raw attribute selectors in
// the same layer, after the part classes (the Tabs precedent).
css({
  "@layer hella": {
    "[data-slot='drawer-content'] [data-slot='drawer-handle']": {
      display: "none",
    },
    "[data-slot='drawer-content'][data-vaul-drawer-direction='bottom'] [data-slot='drawer-handle']": {
      backgroundColor: "var(--muted)",
      borderRadius: "calc(infinity * 1px)",
      display: "block",
      flexShrink: "0",
      height: "0.5rem",
      marginLeft: "auto",
      marginRight: "auto",
      marginTop: "1rem",
      width: "100px",
    },
  },
});

export const header = style({
  display: "flex",
  flexDirection: "column",
  gap: "0.125rem",
  padding: "1rem",
  "&:is([data-vaul-drawer-direction='bottom'] *)": {
    textAlign: "center",
  },
  "&:is([data-vaul-drawer-direction='top'] *)": {
    textAlign: "center",
  },
  "@media (min-width: 48rem)": {
    "&": {
      gap: "0.375rem",
      textAlign: "left",
    },
  },
}, { label: "hella-drawer-header", layer: "hella" });

export const footer = style({
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
  marginTop: "auto",
  padding: "1rem",
}, { label: "hella-drawer-footer", layer: "hella" });

export const title = style({
  color: "var(--foreground)",
  fontWeight: "600",
}, { label: "hella-drawer-title", layer: "hella" });

export const description = style({
  color: "var(--muted-foreground)",
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
}, { label: "hella-drawer-description", layer: "hella" });
