import { signal } from "@hellajs/core";
import type { Signal } from "@hellajs/core";
import { html } from "@hellajs/dom";
import type { HTMLAttributes, HellaChildren, HellaNode } from "@hellajs/dom";
import { cn } from "./cn.js";

interface AvatarProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  size?: "default" | "sm" | "lg";
}

export default function Avatar({ size, children, class: cls, ...attrs }: AvatarProps): HellaNode {
  return html`
    <div
      data-slot="avatar"
      data-size="${size ?? "default"}"
      class="${
        cn("group/avatar relative flex size-8 shrink-0 overflow-hidden rounded-full select-none data-[size=lg]:size-10 data-[size=sm]:size-6", cls)
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface AvatarImageProps extends HTMLAttributes<"img"> {
  class?: string;
  /** Shared loaded state: flipped by load/error, read by AvatarFallback to swap visibility. */
  loaded?: Signal<boolean>;
}

export function AvatarImage({ loaded: loadedSignal, class: cls, ...attrs }: AvatarImageProps): HellaNode {
  const loaded = loadedSignal ?? signal(false);
  return html`
    <img
      data-slot="avatar-image"
      hidden="${() => !loaded()}"
      class="${
        cn("aspect-square size-full", cls)
      }"
      e:load="${() => loaded(true)}"
      e:error="${() => loaded(false)}"
      ...${attrs}
    />
  ` as HellaNode;
}

interface AvatarFallbackProps extends HTMLAttributes<"span"> {
  class?: string;
  children?: HellaChildren;
  /** Shared loaded state: the fallback hides while the signal reads true. */
  loaded?: () => boolean;
}

export function AvatarFallback({ loaded, children, class: cls, ...attrs }: AvatarFallbackProps): HellaNode {
  return html`
    <span
      data-slot="avatar-fallback"
      hidden="${() => Boolean(loaded?.())}"
      class="${
        cn("flex size-full items-center justify-center rounded-full bg-muted text-sm text-muted-foreground group-data-[size=sm]/avatar:text-xs", cls)
      }"
      ...${attrs}
    >${() => children}</span>
  ` as HellaNode;
}

interface AvatarBadgeProps extends HTMLAttributes<"span"> {
  class?: string;
  children?: HellaChildren;
}

export function AvatarBadge({ children, class: cls, ...attrs }: AvatarBadgeProps): HellaNode {
  return html`
    <span
      data-slot="avatar-badge"
      class="${
        cn("absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-background select-none group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2 group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2", cls)
      }"
      ...${attrs}
    >${() => children}</span>
  ` as HellaNode;
}

interface AvatarGroupProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function AvatarGroup({ children, class: cls, ...attrs }: AvatarGroupProps): HellaNode {
  return html`
    <div
      data-slot="avatar-group"
      class="${
        cn("group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background", cls)
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface AvatarGroupCountProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function AvatarGroupCount({ children, class: cls, ...attrs }: AvatarGroupCountProps): HellaNode {
  return html`
    <div
      data-slot="avatar-group-count"
      class="${
        cn("relative flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground ring-2 ring-background group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3", cls)
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}
