import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

export type DialogState = () => "open" | "closed";

export interface DialogOverlayProps extends HTMLAttributes<"div"> {
  state?: DialogState;
  class?: string;
}

export interface DialogCloseProps extends HTMLAttributes<"button"> {
  state?: DialogState;
  onClose?: () => void;
  class?: string;
}

export interface DialogContentProps extends HTMLAttributes<"div"> {
  state?: DialogState;
  showCloseButton?: boolean;
  closeOnEscape?: boolean;
  closeOnOutside?: boolean;
  onClose?: () => void;
  onExited?: () => void;
  class?: string;
  children?: HellaChildren;
}

export interface DialogPartProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

export interface DialogTitleProps extends HTMLAttributes<"h2"> {
  children?: HellaChildren;
  class?: string;
}

export interface DialogDescriptionProps extends HTMLAttributes<"p"> {
  children?: HellaChildren;
  class?: string;
}

export interface DialogProps extends HTMLAttributes<"div"> {
  open: () => boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  showCloseButton?: boolean;
  closeOnEscape?: boolean;
  closeOnOutside?: boolean;
  class?: string;
  children?: HellaChildren;
}
