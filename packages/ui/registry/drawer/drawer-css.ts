import { css, keyframes, style } from "@hellajs/css";

const fadeIn = keyframes({ from: { opacity: "0" } });
const fadeOut = keyframes({ to: { opacity: "0" } });

export const base = style("drawer-base", {
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
});

export const content = style("drawer-content", {
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
});

export const contentDirections = {
  top: style("drawer-content-top", {
    borderBottom: "1px solid var(--border)",
    borderRadius: "0 0 var(--radius) var(--radius)",
    left: "0",
    marginBottom: "6rem",
    maxHeight: "80vh",
    right: "0",
    top: "0",
  }),
  bottom: style("drawer-content-bottom", {
    borderTop: "1px solid var(--border)",
    borderRadius: "var(--radius) var(--radius) 0 0",
    bottom: "0",
    left: "0",
    marginTop: "6rem",
    maxHeight: "80vh",
    right: "0",
  }),
  right: style("drawer-content-right", {
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
  }),
  left: style("drawer-content-left", {
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
  }),
};

export const close = style("drawer-close", {
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
});

css({
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
});

export const header = style("drawer-header", {
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
});

export const footer = style("drawer-footer", {
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
  marginTop: "auto",
  padding: "1rem",
});

export const title = style("drawer-title", {
  color: "var(--foreground)",
  fontWeight: "600",
});

export const description = style("drawer-description", {
  color: "var(--muted-foreground)",
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
});
