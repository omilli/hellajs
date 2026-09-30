import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";
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

interface MessageGroupProps {
  children?: HellaChildren;
  class?: string;
}

export function MessageGroup(props: MessageGroupProps): HellaNode {
  return html`
    <div
      data-slot="message-group"
      class="${
        cn("flex min-w-0 flex-col gap-2", props.class)
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface MessageProps {
  children?: HellaChildren;
  align?: "start" | "end";
  class?: string;
}

export function Message(props: MessageProps): HellaNode {
  return html`
    <div
      data-slot="message"
      data-align="${props.align ?? "start"}"
      class="${
        cn(base, props.class)
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface MessageAvatarProps {
  children?: HellaChildren;
  class?: string;
}

export function MessageAvatar(props: MessageAvatarProps): HellaNode {
  return html`
    <div
      data-slot="message-avatar"
      class="${
        cn(avatar, props.class)
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface MessageContentProps {
  children?: HellaChildren;
  class?: string;
}

export function MessageContent(props: MessageContentProps): HellaNode {
  return html`
    <div
      data-slot="message-content"
      class="${
        cn(content, props.class)
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface MessageHeaderProps {
  children?: HellaChildren;
  class?: string;
}

export function MessageHeader(props: MessageHeaderProps): HellaNode {
  return html`
    <div
      data-slot="message-header"
      class="${
        cn(header, props.class)
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface MessageFooterProps {
  children?: HellaChildren;
  class?: string;
}

export function MessageFooter(props: MessageFooterProps): HellaNode {
  return html`
    <div
      data-slot="message-footer"
      class="${
        cn(footer, props.class)
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}
