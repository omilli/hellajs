import { signal } from "@hellajs/core";
import type { Signal } from "@hellajs/core";
import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";
import { cn } from "./cn.js";

const fallback = "flex size-full items-center justify-center rounded-full bg-muted text-sm text-muted-foreground group-data-[size=sm]/avatar:text-xs";

interface AvatarProps {
  children?: HellaChildren;
  size?: "default" | "sm" | "lg";
  class?: string;
}

export default function Avatar(props: AvatarProps): HellaNode {
  return html`
    <div
      data-slot="avatar"
      data-size="${props.size ?? "default"}"
      class="${
        cn("group/avatar relative flex size-8 shrink-0 overflow-hidden rounded-full select-none data-[size=lg]:size-10 data-[size=sm]:size-6", props.class)
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface AvatarImageProps {
  src?: string;
  alt?: string;
  /** Shared loaded state: flipped by load/error, read by AvatarFallback to swap visibility. */
  loaded?: Signal<boolean>;
  class?: string;
}

export function AvatarImage(props: AvatarImageProps): HellaNode {
  const loaded = props.loaded ?? signal(false);
  return html`
    <img
      data-slot="avatar-image"
      src="${props.src}"
      alt="${props.alt}"
      hidden="${() => !loaded()}"
      class="${
        cn("aspect-square size-full", props.class)
      }"
      e:load="${() => loaded(true)}"
      e:error="${() => loaded(false)}"
    />
  ` as HellaNode;
}

interface AvatarFallbackProps {
  children?: HellaChildren;
  /** Shared loaded state: the fallback hides while the signal reads true. */
  loaded?: () => boolean;
  class?: string;
}

export function AvatarFallback(props: AvatarFallbackProps): HellaNode {
  return html`
    <span
      data-slot="avatar-fallback"
      hidden="${() => Boolean(props.loaded?.())}"
      class="${
        cn(fallback, props.class)
      }"
    >${() => props.children}</span>
  ` as HellaNode;
}

interface AvatarBadgeProps {
  children?: HellaChildren;
  class?: string;
}

export function AvatarBadge(props: AvatarBadgeProps): HellaNode {
  return html`
    <span
      data-slot="avatar-badge"
      class="${
        cn("absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-background select-none group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2 group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2", props.class)
      }"
    >${() => props.children}</span>
  ` as HellaNode;
}

export function AvatarGroup(props: AvatarBadgeProps): HellaNode {
  return html`
    <div
      data-slot="avatar-group"
      class="${
        cn("group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background", props.class)
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

export function AvatarGroupCount(props: AvatarBadgeProps): HellaNode {
  return html`
    <div
      data-slot="avatar-group-count"
      class="${
        cn("relative flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground ring-2 ring-background group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3", props.class)
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}
