import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

export type AlertDialogState = () => "open" | "closed";

export type ActionVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";

export type ActionSize = "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";

export interface AlertDialogOverlayProps extends HTMLAttributes<"div"> {
  state?: AlertDialogState;
  class?: string;
}

export interface AlertDialogPortalProps {
  children?: HellaChildren;
}

export interface AlertDialogTriggerProps extends HTMLAttributes<"button"> {
  children?: HellaChildren;
  class?: string;
}

export interface AlertDialogContentProps extends HTMLAttributes<"div"> {
  state?: AlertDialogState;
  size?: "default" | "sm";
  closeOnEscape?: boolean;
  onClose?: () => void;
  onExited?: () => void;
  class?: string;
  children?: HellaChildren;
}

export interface AlertDialogPartProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

export interface AlertDialogTitleProps extends HTMLAttributes<"h2"> {
  children?: HellaChildren;
  class?: string;
}

export interface AlertDialogDescriptionProps extends HTMLAttributes<"p"> {
  children?: HellaChildren;
  class?: string;
}

export interface AlertDialogActionProps extends HTMLAttributes<"button"> {
  variant?: ActionVariant;
  size?: ActionSize;
  onClose?: () => void;
  children?: HellaChildren;
  class?: string;
}

export interface AlertDialogCancelProps extends HTMLAttributes<"button"> {
  variant?: ActionVariant;
  size?: ActionSize;
  onClose?: () => void;
  children?: HellaChildren;
  class?: string;
}

export interface AlertDialogProps extends HTMLAttributes<"div"> {
  open: () => boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: "default" | "sm";
  closeOnEscape?: boolean;
  class?: string;
  children?: HellaChildren;
}
