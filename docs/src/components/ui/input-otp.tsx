import { inputOtp } from "@hellajs/headless";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

interface InputOTPProps extends HTMLAttributes<"div"> {
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

interface InputOTPGroupProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

interface InputOTPSlotProps extends HTMLAttributes<"div"> {
  class?: string;
  /** Slot position this mirror renders; the root wires its char and caret state after mount. */
  index: number;
}

interface InputOTPSeparatorProps extends HTMLAttributes<"div"> {
  class?: string;
}

import { keyframes, style } from "@hellajs/css";
import { tokens } from "./tokens.js";

const caretBlink = keyframes({
  "0%,70%,100%": { opacity: "1" },
  "20%,50%": { opacity: "0" },
});

const base = style("input-otp", {
  alignItems: "center",
  display: "flex",
  gap: "0.5rem",
  "&:has(:disabled)": {
    opacity: "0.5",
  },
});

const control = style("input-otp-input", {
  "&:disabled": {
    cursor: "not-allowed",
  },
  "&::selection": {
    backgroundColor: "transparent",
    color: "transparent",
  },
});

const group = style("input-otp-group", {
  alignItems: "center",
  display: "flex",
});

const slot = style("input-otp-slot", {
  alignItems: "center",
  borderBlock: `1px solid ${tokens.input}`,
  borderRight: `1px solid ${tokens.input}`,
  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  display: "flex",
  fontSize: "0.875rem",
  height: "2.25rem",
  justifyContent: "center",
  lineHeight: "1.25rem",
  outlineStyle: "none",
  position: "relative",
  transition: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  width: "2.25rem",
  "&:first-child": {
    borderBottomLeftRadius: `calc(${tokens.radius} * 0.8)`,
    borderLeft: `1px solid ${tokens.input}`,
    borderTopLeftRadius: `calc(${tokens.radius} * 0.8)`,
  },
  "&:last-child": {
    borderBottomRightRadius: `calc(${tokens.radius} * 0.8)`,
    borderTopRightRadius: `calc(${tokens.radius} * 0.8)`,
  },
  "&[aria-invalid='true']": {
    borderColor: tokens.destructive,
  },
  "&[data-active='true']": {
    borderColor: tokens.ring,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
    zIndex: "10",
  },
  "&[data-active='true'][aria-invalid='true']": {
    borderColor: tokens.destructive,
  },
  "&[data-active='true'][aria-invalid='true']:is(.dark *)": {
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 40%, transparent)`,
  },
  "&:is(.dark *)": {
    backgroundColor: `color-mix(in oklab, ${tokens.input} 30%, transparent)`,
  },
});

const caretWrap = style("input-otp-caret", {
  alignItems: "center",
  display: "flex",
  inset: "0",
  justifyContent: "center",
  pointerEvents: "none",
  position: "absolute",
});

const caret = style("input-otp-caret-bar", {
  animation: `${caretBlink} 1s ease-out infinite`,
  backgroundColor: tokens.foreground,
  height: "1rem",
  width: "1px",
});

export function InputOTP({
  length,
  value,
  onChange,
  onComplete,
  pattern: patternAttr,
  autofocus: autofocusAttr,
  disabled: disabledAttr,
  class: cls,
  children,
  ...attrs
}: InputOTPProps): JSX.Element {
  const pattern = patternAttr as string | undefined;
  const autofocus = autofocusAttr as boolean | undefined;
  const disabled = disabledAttr as boolean | undefined;
  const Otp = inputOtp({
    maxLength: length,
    value,
    onValueChange: onChange,
    onComplete,
    pattern,
    autofocus,
    disabled,
  });

  return (
    <Otp.Root
      inputClass={
        [control]
      }
      class={
        [base, cls]
      }
      {...attrs}
    >
      {children}
    </Otp.Root>
  );
}

export function InputOTPGroup({ children, class: cls, ...attrs }: InputOTPGroupProps): JSX.Element {
  const { Group } = inputOtp();
  return (
    <Group
      class={
        [group, cls]
      }
      {...attrs}
    >
      {children}
    </Group>
  );
}

export function InputOTPSlot({ index, class: cls, ...attrs }: InputOTPSlotProps): JSX.Element {
  const { Slot } = inputOtp();
  return (
    <Slot
      index={index}
      caretWrapClass={
        [caretWrap]
      }
      caretClass={
        [caret]
      }
      class={
        [slot, cls]
      }
      {...attrs}
    />
  );
}

export function InputOTPSeparator({ class: cls, ...attrs }: InputOTPSeparatorProps): JSX.Element {
  const { Separator } = inputOtp();
  return <Separator class={cls} {...attrs} />;
}
