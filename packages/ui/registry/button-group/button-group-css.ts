import { style } from "@hellajs/css";

export const base = style("button-group", {
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

export const orientation = {
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

export const text = style("button-group-text", {
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

export const separatorBase = style("button-group-separator", {
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

export const separator = style("button-group-separator-override", {
  alignSelf: "stretch",
  backgroundColor: "var(--input)",
  margin: "0 !important",
  position: "relative",
  "&[data-orientation='vertical']": {
    height: "auto",
  },
});
