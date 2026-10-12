import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

export interface NavigationMenuListProps extends HTMLAttributes<"ul"> {
  children?: HellaChildren;
  class?: string;
}

export interface NavigationMenuItemProps extends HTMLAttributes<"li"> {
  children?: HellaChildren;
  class?: string;
}

export interface NavigationMenuTriggerProps extends HTMLAttributes<"button"> {
  /** This trigger's id in the root's open-value store; clicks announce it when no `onActivate` stands in. */
  value?: string;
  /** Resolves the open state for `aria-expanded`/`data-state`; manual wiring threads it from the owning signal. */
  active?: () => boolean;
  onActivate?: () => void;
  children?: HellaChildren;
  class?: string;
}

export interface NavigationMenuContentProps extends HTMLAttributes<"div"> {
  /** Resolves the open state; manual wiring threads it from the owning signal. */
  active?: () => boolean;
  /** Portal target for the shared viewport slot; defaults to the first `[data-slot="navigation-menu-viewport"]` in the document. */
  viewport?: string;
  /** Called when the exit animation ends under data-state="closed"; entry animationends are ignored. */
  onExited?: () => void;
  children?: HellaChildren;
  class?: string;
}

export interface NavigationMenuLinkProps extends HTMLAttributes<"a"> {
  /** Renders `data-active="true"` and its accent styles (the ref's data-[active=true] set). */
  active?: boolean;
  children?: HellaChildren;
  class?: string;
}

export interface NavigationMenuViewportProps extends HTMLAttributes<"div"> {
  /** Resolves the open state for the viewport's enter/exit `data-state`; the composed root wires its own store. */
  active?: () => boolean;
  class?: string;
}

export interface NavigationMenuIndicatorProps extends HTMLAttributes<"div"> {
  /** Resolves the visible state (any panel open); manual wiring threads it from the owning signal. */
  active?: () => boolean;
  /** Resolves the trigger the indicator sits under; defaults to the trigger announced by the activation stream. */
  anchor?: () => Element | undefined;
  children?: HellaChildren;
  class?: string;
}

export interface NavigationMenuProps extends HTMLAttributes<"div"> {
  /** Controlled id of the open panel ("" when closed), fed by trigger announcements; the root never writes it when given. */
  value?: () => string;
  onValueChange?: (value: string) => void;
  /** Renders the shared viewport slot as the last child (default true); set false to render `NavigationMenuViewport` manually. */
  viewport?: boolean;
  children?: HellaChildren;
  class?: string;
}
