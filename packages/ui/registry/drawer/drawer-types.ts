import type { Signal } from "@hellajs/core";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

export type DrawerState = () => "open" | "closed";

export type DrawerDirection = "top" | "right" | "bottom" | "left";

export interface DrawerOverlayProps extends HTMLAttributes<"div"> {
  state?: DrawerState;
  /** Drag fraction (0..1 toward dismissal) — drives the proportional overlay fade. */
  fraction?: Signal<number>;
  class?: string;
}

export interface DrawerCloseProps extends HTMLAttributes<"button"> {
  state?: DrawerState;
  onClose?: () => void;
  class?: string;
}

export interface DrawerPortalProps {
  children?: HellaChildren;
}

export interface DrawerTriggerProps extends HTMLAttributes<"button"> {
  children?: HellaChildren;
  class?: string;
}

export interface DrawerContentProps extends HTMLAttributes<"div"> {
  state?: DrawerState;
  direction?: DrawerDirection;
  /** Shared drag fraction (0..1 toward dismissal); the overlay fades proportionally when both parts receive the same signal. */
  fraction?: Signal<number>;
  closeOnEscape?: boolean;
  closeOnOutside?: boolean;
  onClose?: () => void;
  onExited?: () => void;
  class?: string;
  children?: HellaChildren;
}

export interface DrawerPartProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

export interface DrawerTitleProps extends HTMLAttributes<"h2"> {
  children?: HellaChildren;
  class?: string;
}

export interface DrawerDescriptionProps extends HTMLAttributes<"p"> {
  children?: HellaChildren;
  class?: string;
}

export interface DrawerProps extends HTMLAttributes<"div"> {
  open: () => boolean;
  onClose: () => void;
  direction?: DrawerDirection;
  title?: string;
  description?: string;
  closeOnEscape?: boolean;
  closeOnOutside?: boolean;
  class?: string;
  children?: HellaChildren;
}
