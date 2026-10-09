import { signal } from "@hellajs/core";
import type { Signal } from "@hellajs/core";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";
import { cn } from "./cn.js";

interface AvatarProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  size?: "default" | "sm" | "lg";
}

export default function Avatar({ size, children, class: cls, ...attrs }: AvatarProps): JSX.Element {
  return (
    <div
      data-slot="avatar"
      data-size={size ?? "default"}
      class={
        cn("group/avatar relative flex size-8 shrink-0 overflow-hidden rounded-full select-none data-[size=lg]:size-10 data-[size=sm]:size-6", cls)
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

interface AvatarImageProps extends HTMLAttributes<"img"> {
  class?: string;
  /** Shared loaded state: flipped by load/error, read by AvatarFallback to swap visibility. */
  loaded?: Signal<boolean>;
}

export function AvatarImage({ loaded: loadedSignal, class: cls, ...attrs }: AvatarImageProps): JSX.Element {
  const loaded = loadedSignal ?? signal(false);
  return (
    <img
      data-slot="avatar-image"
      hidden={() => !loaded()}
      class={
        cn("aspect-square size-full", cls)
      }
      e:load={() => loaded(true)}
      e:error={() => loaded(false)}
      {...attrs}
    />
  );
}

interface AvatarFallbackProps extends HTMLAttributes<"span"> {
  class?: string;
  children?: HellaChildren;
  /** Shared loaded state: the fallback hides while the signal reads true. */
  loaded?: () => boolean;
}

export function AvatarFallback({ loaded, children, class: cls, ...attrs }: AvatarFallbackProps): JSX.Element {
  return (
    <span
      data-slot="avatar-fallback"
      hidden={() => Boolean(loaded?.())}
      class={
        cn("flex size-full items-center justify-center rounded-full bg-muted text-sm text-muted-foreground group-data-[size=sm]/avatar:text-xs", cls)
      }
      {...attrs}
    >
      {children}
    </span>
  );
}

interface AvatarBadgeProps extends HTMLAttributes<"span"> {
  class?: string;
  children?: HellaChildren;
}

export function AvatarBadge({ children, class: cls, ...attrs }: AvatarBadgeProps): JSX.Element {
  return (
    <span
      data-slot="avatar-badge"
      class={
        cn("absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-background select-none group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2 group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2", cls)
      }
      {...attrs}
    >
      {children}
    </span>
  );
}

interface AvatarGroupProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function AvatarGroup({ children, class: cls, ...attrs }: AvatarGroupProps): JSX.Element {
  return (
    <div
      data-slot="avatar-group"
      class={
        cn("group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background", cls)
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

interface AvatarGroupCountProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function AvatarGroupCount({ children, class: cls, ...attrs }: AvatarGroupCountProps): JSX.Element {
  return (
    <div
      data-slot="avatar-group-count"
      class={
        cn("relative flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground ring-2 ring-background group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3", cls)
      }
      {...attrs}
    >
      {children}
    </div>
  );
}
