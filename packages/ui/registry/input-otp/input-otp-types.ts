import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

export interface InputOTPProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  /** Number of slots; fixed after mount. Defaults to 6. */
  length?: number;
  /** The code. A static string seeds the internal state; an accessor makes it controlled, so edits report through `onChange` only. */
  value?: string | (() => string);
  /** Reports every accepted value change (typing, paste, deletion). */
  onChange?: (value: string) => void;
  /** Fires once per transition to a full code. */
  onComplete?: (value: string) => void;
}

export interface InputOTPGroupProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export interface InputOTPSlotProps extends HTMLAttributes<"div"> {
  class?: string;
  /** Slot position this mirror renders; the root wires its char and caret state after mount. */
  index: number;
}

export interface InputOTPSeparatorProps extends HTMLAttributes<"div"> {
  class?: string;
}
