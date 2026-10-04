import { css, style } from "@hellajs/css";

export const group = style({
  display: "flex",
  flexDirection: "column",
  minWidth: "0",
  gap: "0.5rem",
}, { label: "message-group" });

export const base = style({
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
}, { label: "message" });

export const avatar = style({
  display: "flex",
  width: "fit-content",
  minWidth: "2rem",
  flexShrink: "0",
  alignItems: "center",
  justifyContent: "center",
  alignSelf: "flex-end",
  overflow: "hidden",
  borderRadius: "calc(infinity * 1px)",
  backgroundColor: "var(--muted)",
}, { label: "message-avatar" });

export const content = style({
  display: "flex",
  width: "100%",
  minWidth: "0",
  flexDirection: "column",
  gap: "0.625rem",
  overflowWrap: "break-word",
}, { label: "message-content" });

export const header = style({
  display: "flex",
  maxWidth: "100%",
  minWidth: "0",
  alignItems: "center",
  paddingInline: "0.75rem",
  fontSize: "0.75rem",
  fontWeight: "500",
  color: "var(--muted-foreground)",
}, { label: "message-header" });

export const footer = style({
  display: "flex",
  maxWidth: "100%",
  minWidth: "0",
  alignItems: "center",
  paddingInline: "0.75rem",
  fontSize: "0.75rem",
  fontWeight: "500",
  color: "var(--muted-foreground)",
}, { label: "message-footer" });

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
