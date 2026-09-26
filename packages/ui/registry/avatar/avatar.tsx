import { signal } from "@hellajs/core";
import type { Signal } from "@hellajs/core";
import type { HellaChildren } from "@hellajs/dom";

// @hella:styles
declare const badge: string;
declare const base: string;
declare const fallback: string;
declare const group: string;
declare const groupCount: string;
declare const image: string;
// @hella:end

interface AvatarProps {
  children?: HellaChildren;
  size?: "default" | "sm" | "lg";
  class?: string;
}

export default function Avatar(props: AvatarProps): JSX.Element {
  return (
    <div
      data-slot="avatar"
      data-size={props.size ?? "default"}
      class={
        // @hella:compose
        [base, props.class]
        // @hella:end
      }
    >
      {props.children}
    </div>
  );
}

interface AvatarImageProps {
  src?: string;
  alt?: string;
  /** Shared loaded state: flipped by load/error, read by AvatarFallback to swap visibility. */
  loaded?: Signal<boolean>;
  class?: string;
}

export function AvatarImage(props: AvatarImageProps): JSX.Element {
  const loaded = props.loaded ?? signal(false);
  return (
    <img
      data-slot="avatar-image"
      src={props.src}
      alt={props.alt}
      hidden={() => !loaded()}
      class={
        // @hella:compose
        [image, props.class]
        // @hella:end
      }
      on:load={() => loaded(true)}
      on:error={() => loaded(false)}
    />
  );
}

interface AvatarFallbackProps {
  children?: HellaChildren;
  /** Shared loaded state: the fallback hides while the signal reads true. */
  loaded?: () => boolean;
  class?: string;
}

export function AvatarFallback(props: AvatarFallbackProps): JSX.Element {
  return (
    <span
      data-slot="avatar-fallback"
      hidden={() => Boolean(props.loaded?.())}
      class={
        // @hella:compose
        [fallback, props.class]
        // @hella:end
      }
    >
      {props.children}
    </span>
  );
}

interface AvatarBadgeProps {
  children?: HellaChildren;
  class?: string;
}

export function AvatarBadge(props: AvatarBadgeProps): JSX.Element {
  return (
    <span
      data-slot="avatar-badge"
      class={
        // @hella:compose
        [badge, props.class]
        // @hella:end
      }
    >
      {props.children}
    </span>
  );
}

export function AvatarGroup(props: AvatarBadgeProps): JSX.Element {
  return (
    <div
      data-slot="avatar-group"
      class={
        // @hella:compose
        [group, props.class]
        // @hella:end
      }
    >
      {props.children}
    </div>
  );
}

export function AvatarGroupCount(props: AvatarBadgeProps): JSX.Element {
  return (
    <div
      data-slot="avatar-group-count"
      class={
        // @hella:compose
        [groupCount, props.class]
        // @hella:end
      }
    >
      {props.children}
    </div>
  );
}
