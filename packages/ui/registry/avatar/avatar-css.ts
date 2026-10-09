import { style } from "@hellajs/css";
import { tokens } from "../theme/tokens.js";

export const base = style("avatar", {
  borderRadius: "calc(infinity * 1px)",
  display: "flex",
  flexShrink: "0",
  height: "2rem",
  overflow: "hidden",
  position: "relative",
  userSelect: "none",
  width: "2rem",
  "&[data-size='lg']": {
    height: "2.5rem",
    width: "2.5rem",
  },
  "&[data-size='sm']": {
    height: "1.5rem",
    width: "1.5rem",
  },
});

export const image = style("avatar-image", {
  aspectRatio: "1 / 1",
  height: "100%",
  width: "100%",
});

export const fallback = style("avatar-fallback", {
  alignItems: "center",
  backgroundColor: tokens.muted,
  borderRadius: "calc(infinity * 1px)",
  color: tokens.mutedForeground,
  display: "flex",
  fontSize: "0.875rem",
  height: "100%",
  justifyContent: "center",
  width: "100%",
  "&:is([data-slot='avatar'][data-size='sm'] *)": {
    fontSize: "0.75rem",
  },
});

export const badge = style("avatar-badge", {
  alignItems: "center",
  backgroundColor: tokens.primary,
  borderRadius: "calc(infinity * 1px)",
  bottom: "0",
  boxShadow: `0 0 0 2px ${tokens.background}`,
  color: tokens.primaryForeground,
  display: "inline-flex",
  justifyContent: "center",
  position: "absolute",
  right: "0",
  userSelect: "none",
  zIndex: "10",
  "&:is([data-slot='avatar'][data-size='sm'] *)": {
    height: "0.5rem",
    width: "0.5rem",
    "& > svg": {
      display: "none",
    },
  },
  "&:is([data-slot='avatar'][data-size='default'] *)": {
    height: "0.625rem",
    width: "0.625rem",
    "& > svg": {
      height: "0.5rem",
      width: "0.5rem",
    },
  },
  "&:is([data-slot='avatar'][data-size='lg'] *)": {
    height: "0.75rem",
    width: "0.75rem",
    "& > svg": {
      height: "0.5rem",
      width: "0.5rem",
    },
  },
});

export const group = style("avatar-group", {
  display: "flex",
  "& > :not(:last-child)": {
    marginInlineEnd: "-0.5rem",
  },
  "& > [data-slot='avatar']": {
    boxShadow: `0 0 0 2px ${tokens.background}`,
  },
});

export const groupCount = style("avatar-group-count", {
  alignItems: "center",
  backgroundColor: tokens.muted,
  borderRadius: "calc(infinity * 1px)",
  boxShadow: `0 0 0 2px ${tokens.background}`,
  color: tokens.mutedForeground,
  display: "flex",
  flexShrink: "0",
  fontSize: "0.875rem",
  height: "2rem",
  justifyContent: "center",
  position: "relative",
  width: "2rem",
  "& > svg": {
    height: "1rem",
    width: "1rem",
  },
  "&:is([data-slot='avatar-group']:has([data-size='lg']) *)": {
    height: "2.5rem",
    width: "2.5rem",
    "& > svg": {
      height: "1.25rem",
      width: "1.25rem",
    },
  },
  "&:is([data-slot='avatar-group']:has([data-size='sm']) *)": {
    height: "1.5rem",
    width: "1.5rem",
    "& > svg": {
      height: "0.75rem",
      width: "0.75rem",
    },
  },
});
