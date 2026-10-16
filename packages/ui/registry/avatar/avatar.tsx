import { signal } from "@hellajs/core";
import type {
  AvatarProps,
  AvatarImageProps,
  AvatarFallbackProps,
  AvatarBadgeProps,
  AvatarGroupProps,
  AvatarGroupCountProps,
} from "./avatar-types.js";

// @hella:styles
declare const badge: string;
declare const base: string;
declare const fallback: string;
declare const group: string;
declare const groupCount: string;
declare const image: string;
// @hella:end

export function Avatar({ size, children, class: cls, ...attrs }: AvatarProps): JSX.Element {
  return (
    <div
      data-slot="avatar"
      data-size={size ?? "default"}
      class={
        // @hella:compose
        [base, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function AvatarImage({
  loaded: loadedSignal,
  class: cls,
  ...attrs
}: AvatarImageProps): JSX.Element {
  const loaded = loadedSignal ?? signal(false);
  return (
    <img
      data-slot="avatar-image"
      hidden={() => !loaded()}
      class={
        // @hella:compose
        [image, cls]
        // @hella:end
      }
      e:load={() => loaded(true)}
      e:error={() => loaded(false)}
      {...attrs}
    />
  );
}

export function AvatarFallback({
  loaded,
  children,
  class: cls,
  ...attrs
}: AvatarFallbackProps): JSX.Element {
  return (
    <span
      data-slot="avatar-fallback"
      hidden={() => Boolean(loaded?.())}
      class={
        // @hella:compose
        [fallback, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </span>
  );
}

export function AvatarBadge({ children, class: cls, ...attrs }: AvatarBadgeProps): JSX.Element {
  return (
    <span
      data-slot="avatar-badge"
      class={
        // @hella:compose
        [badge, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </span>
  );
}

export function AvatarGroup({ children, class: cls, ...attrs }: AvatarGroupProps): JSX.Element {
  return (
    <div
      data-slot="avatar-group"
      class={
        // @hella:compose
        [group, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function AvatarGroupCount({
  children,
  class: cls,
  ...attrs
}: AvatarGroupCountProps): JSX.Element {
  return (
    <div
      data-slot="avatar-group-count"
      class={
        // @hella:compose
        [groupCount, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}
