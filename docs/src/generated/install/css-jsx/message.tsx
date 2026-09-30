import type { HellaChildren } from "@hellajs/dom";

import { css, style } from "@hellajs/css";

const group = style({
  display: "flex",
  flexDirection: "column",
  minWidth: "0",
  gap: "0.5rem",
}, { label: "hella-message-group", layer: "hella" });

const base = style({
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
}, { label: "hella-message", layer: "hella" });

const avatar = style({
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
}, { label: "hella-message-avatar", layer: "hella" });

const content = style({
  display: "flex",
  width: "100%",
  minWidth: "0",
  flexDirection: "column",
  gap: "0.625rem",
  overflowWrap: "break-word",
}, { label: "hella-message-content", layer: "hella" });

const header = style({
  display: "flex",
  maxWidth: "100%",
  minWidth: "0",
  alignItems: "center",
  paddingInline: "0.75rem",
  fontSize: "0.75rem",
  fontWeight: "500",
  color: "var(--muted-foreground)",
}, { label: "hella-message-header", layer: "hella" });

const footer = style({
  display: "flex",
  maxWidth: "100%",
  minWidth: "0",
  alignItems: "center",
  paddingInline: "0.75rem",
  fontSize: "0.75rem",
  fontWeight: "500",
  color: "var(--muted-foreground)",
}, { label: "hella-message-footer", layer: "hella" });

css({
  "@layer hella": {
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
  },
});

interface MessageGroupProps {
  children?: HellaChildren;
  class?: string;
}

export function MessageGroup(props: MessageGroupProps): JSX.Element {
  return (
    <div
      data-slot="message-group"
      class={
        [group, props.class]
      }
    >
      {props.children}
    </div>
  );
}

interface MessageProps {
  children?: HellaChildren;
  align?: "start" | "end";
  class?: string;
}

export function Message(props: MessageProps): JSX.Element {
  return (
    <div
      data-slot="message"
      data-align={props.align ?? "start"}
      class={
        [base, props.class]
      }
    >
      {props.children}
    </div>
  );
}

interface MessageAvatarProps {
  children?: HellaChildren;
  class?: string;
}

export function MessageAvatar(props: MessageAvatarProps): JSX.Element {
  return (
    <div
      data-slot="message-avatar"
      class={
        [avatar, props.class]
      }
    >
      {props.children}
    </div>
  );
}

interface MessageContentProps {
  children?: HellaChildren;
  class?: string;
}

export function MessageContent(props: MessageContentProps): JSX.Element {
  return (
    <div
      data-slot="message-content"
      class={
        [content, props.class]
      }
    >
      {props.children}
    </div>
  );
}

interface MessageHeaderProps {
  children?: HellaChildren;
  class?: string;
}

export function MessageHeader(props: MessageHeaderProps): JSX.Element {
  return (
    <div
      data-slot="message-header"
      class={
        [header, props.class]
      }
    >
      {props.children}
    </div>
  );
}

interface MessageFooterProps {
  children?: HellaChildren;
  class?: string;
}

export function MessageFooter(props: MessageFooterProps): JSX.Element {
  return (
    <div
      data-slot="message-footer"
      class={
        [footer, props.class]
      }
    >
      {props.children}
    </div>
  );
}
