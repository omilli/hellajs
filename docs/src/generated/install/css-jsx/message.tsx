import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

import { css, style } from "@hellajs/css";
import { tokens } from "./tokens.js";

const group = style("message-group", {
  display: "flex",
  flexDirection: "column",
  minWidth: "0",
  gap: "0.5rem",
});

const base = style("message", {
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

const avatar = style("message-avatar", {
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

const content = style("message-content", {
  display: "flex",
  width: "100%",
  minWidth: "0",
  flexDirection: "column",
  gap: "0.625rem",
  overflowWrap: "break-word",
});

const header = style("message-header", {
  display: "flex",
  maxWidth: "100%",
  minWidth: "0",
  alignItems: "center",
  paddingInline: "0.75rem",
  fontSize: "0.75rem",
  fontWeight: "500",
  color: tokens.mutedForeground,
});

const footer = style("message-footer", {
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

interface MessageGroupProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function MessageGroup({ children, class: cls, ...attrs }: MessageGroupProps): JSX.Element {
  return (
    <div
      data-slot="message-group"
      class={
        [group, cls]
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

interface MessageProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  align?: "start" | "end";
}

export function Message({ align, children, class: cls, ...attrs }: MessageProps): JSX.Element {
  return (
    <div
      data-slot="message"
      data-align={align ?? "start"}
      class={
        [base, cls]
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

interface MessageAvatarProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function MessageAvatar({ children, class: cls, ...attrs }: MessageAvatarProps): JSX.Element {
  return (
    <div
      data-slot="message-avatar"
      class={
        [avatar, cls]
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

interface MessageContentProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function MessageContent({ children, class: cls, ...attrs }: MessageContentProps): JSX.Element {
  return (
    <div
      data-slot="message-content"
      class={
        [content, cls]
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

interface MessageHeaderProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function MessageHeader({ children, class: cls, ...attrs }: MessageHeaderProps): JSX.Element {
  return (
    <div
      data-slot="message-header"
      class={
        [header, cls]
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

interface MessageFooterProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function MessageFooter({ children, class: cls, ...attrs }: MessageFooterProps): JSX.Element {
  return (
    <div
      data-slot="message-footer"
      class={
        [footer, cls]
      }
      {...attrs}
    >
      {children}
    </div>
  );
}
