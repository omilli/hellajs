import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";
import { cn } from "./cn.js";

const base =
  "group/message relative flex w-full min-w-0 gap-2 text-sm data-[align=end]:flex-row-reverse";

const avatar =
  "flex w-fit min-w-8 shrink-0 items-center justify-center self-end overflow-hidden rounded-full bg-muted group-has-data-[slot=message-footer]/message:-translate-y-8";

const content =
  "flex w-full min-w-0 flex-col gap-2.5 wrap-break-word group-data-[align=end]/message:*:data-slot:self-end";

const header =
  "flex max-w-full min-w-0 items-center px-3 text-xs font-medium text-muted-foreground group-has-data-[variant=ghost]/message:px-0";

const footer =
  "flex max-w-full min-w-0 items-center px-3 text-xs font-medium text-muted-foreground group-has-data-[variant=ghost]/message:px-0 group-data-[align=end]/message:justify-end";

interface MessageGroupProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function MessageGroup({ children, class: cls, ...attrs }: MessageGroupProps): JSX.Element {
  return (
    <div
      data-slot="message-group"
      class={
        cn("flex min-w-0 flex-col gap-2", cls)
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
        cn(base, cls)
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
        cn(avatar, cls)
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
        cn(content, cls)
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
        cn(header, cls)
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
        cn(footer, cls)
      }
      {...attrs}
    >
      {children}
    </div>
  );
}
