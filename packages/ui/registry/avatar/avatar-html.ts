import { signal } from "@hellajs/core";
import type { Signal } from "@hellajs/core";
import { html } from "@hellajs/dom";
import type { HTMLAttributes, HellaChildren, HellaNode } from "@hellajs/dom";

// @hella:styles
declare const badge: string;
declare const base: string;
declare const fallback: string;
declare const group: string;
declare const groupCount: string;
declare const image: string;
// @hella:end

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
        // @hella:compose
        [base, cls]
        // @hella:end
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
        // @hella:compose
        [image, cls]
        // @hella:end
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
        // @hella:compose
        [fallback, cls]
        // @hella:end
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
        // @hella:compose
        [badge, cls]
        // @hella:end
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
        // @hella:compose
        [group, cls]
        // @hella:end
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
        // @hella:compose
        [groupCount, cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}
