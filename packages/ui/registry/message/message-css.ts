import { css, style } from "@hellajs/css";
import { tokens } from "../theme/tokens.js";

export const group = style("message-group", {
  display: "flex",
  flexDirection: "column",
  minWidth: "0",
  gap: "0.5rem",
});

export const base = style("message", {
  position: "relative",
  display: "flex",
  width: "100%",
  minWidth: "0",
  gap: "0.5rem",
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
  "&[data-align='end']": {
    flexDirection: "row-reverse",
  },
});

export const avatar = style("message-avatar", {
  display: "flex",
  width: "fit-content",
  minWidth: "2rem",
  flexShrink: "0",
  alignItems: "center",
  justifyContent: "center",
  alignSelf: "flex-end",
  overflow: "hidden",
  borderRadius: "calc(infinity * 1px)",
  backgroundColor: tokens.muted,
});

export const content = style("message-content", {
  display: "flex",
  width: "100%",
  minWidth: "0",
  flexDirection: "column",
  gap: "0.625rem",
  overflowWrap: "break-word",
});

export const header = style("message-header", {
  display: "flex",
  maxWidth: "100%",
  minWidth: "0",
  alignItems: "center",
  paddingInline: "0.75rem",
  fontSize: "0.75rem",
  fontWeight: "500",
  color: tokens.mutedForeground,
});

export const footer = style("message-footer", {
  display: "flex",
  maxWidth: "100%",
  minWidth: "0",
  alignItems: "center",
  paddingInline: "0.75rem",
  fontSize: "0.75rem",
  fontWeight: "500",
  color: tokens.mutedForeground,
});

css({
  "[data-slot='message']:has([data-slot='message-footer']) [data-slot='message-avatar']": {
    transform: "translateY(-2rem)",
  },
  "[data-slot='message'][data-align='end'] [data-slot='message-content'] > [data-slot]": {
    alignSelf: "flex-end",
  },
  "[data-slot='message']:has([data-variant='ghost']) [data-slot='message-header']": {
    paddingInline: "0",
  },
  "[data-slot='message']:has([data-variant='ghost']) [data-slot='message-footer']": {
    paddingInline: "0",
  },
  "[data-slot='message'][data-align='end'] [data-slot='message-footer']": {
    justifyContent: "flex-end",
  },
});
