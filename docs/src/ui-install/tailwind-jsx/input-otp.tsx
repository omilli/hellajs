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
import { cn } from "./cn.js";

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
        cn("disabled:cursor-not-allowed")
      }
      class={
        cn("flex items-center gap-2 has-disabled:opacity-50", cls)
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
        cn("flex items-center", cls)
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
        cn("pointer-events-none absolute inset-0 flex items-center justify-center")
      }
      caretClass={
        cn("h-4 w-px animate-caret-blink bg-foreground duration-1000")
      }
      class={
        cn("relative flex h-9 w-9 items-center justify-center border-y border-r border-input text-sm shadow-xs transition-all outline-none first:rounded-l-md first:border-l last:rounded-r-md aria-invalid:border-destructive data-[active=true]:z-10 data-[active=true]:border-ring data-[active=true]:ring-[3px] data-[active=true]:ring-ring/50 data-[active=true]:aria-invalid:border-destructive data-[active=true]:aria-invalid:ring-destructive/20 dark:bg-input/30 dark:data-[active=true]:aria-invalid:ring-destructive/40", cls)
      }
      {...attrs}
    />
  );
}

export function InputOTPSeparator({ class: cls, ...attrs }: InputOTPSeparatorProps): JSX.Element {
  const { Separator } = inputOtp();
  return <Separator class={cls} {...attrs} />;
}
