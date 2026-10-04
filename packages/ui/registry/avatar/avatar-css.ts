import { style } from "@hellajs/css";

export const base = style({
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
}, { label: "avatar" });

export const image = style({
  aspectRatio: "1 / 1",
  height: "100%",
  width: "100%",
}, { label: "avatar-image" });

export const fallback = style({
  alignItems: "center",
  backgroundColor: "var(--muted)",
  borderRadius: "calc(infinity * 1px)",
  color: "var(--muted-foreground)",
  display: "flex",
  fontSize: "0.875rem",
  height: "100%",
  justifyContent: "center",
  width: "100%",
  "&:is([data-slot='avatar'][data-size='sm'] *)": {
    fontSize: "0.75rem",
  },
}, { label: "avatar-fallback" });

export const badge = style({
  alignItems: "center",
  backgroundColor: "var(--primary)",
  borderRadius: "calc(infinity * 1px)",
  bottom: "0",
  boxShadow: "0 0 0 2px var(--background)",
  color: "var(--primary-foreground)",
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
}, { label: "avatar-badge" });

export const group = style({
  display: "flex",
  "& > :not(:last-child)": {
    marginInlineEnd: "-0.5rem",
  },
  "& > [data-slot='avatar']": {
    boxShadow: "0 0 0 2px var(--background)",
  },
}, { label: "avatar-group" });

export const groupCount = style({
  alignItems: "center",
  backgroundColor: "var(--muted)",
  borderRadius: "calc(infinity * 1px)",
  boxShadow: "0 0 0 2px var(--background)",
  color: "var(--muted-foreground)",
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
}, { label: "avatar-group-count" });
