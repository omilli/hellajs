import { inputOtp } from "@hellajs/headless";
import type {
  InputOTPProps,
  InputOTPGroupProps,
  InputOTPSlotProps,
  InputOTPSeparatorProps,
} from "./input-otp-types.js";

// @hella:styles
declare const base: string;
declare const caret: string;
declare const caretWrap: string;
declare const control: string;
declare const group: string;
declare const slot: string;
// @hella:end

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
        // @hella:compose
        [control]
        // @hella:end
      }
      class={
        // @hella:compose
        [base, cls]
        // @hella:end
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
        // @hella:compose
        [group, cls]
        // @hella:end
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
        // @hella:compose
        [caretWrap]
        // @hella:end
      }
      caretClass={
        // @hella:compose
        [caret]
        // @hella:end
      }
      class={
        // @hella:compose
        [slot, cls]
        // @hella:end
      }
      {...attrs}
    />
  );
}

export function InputOTPSeparator({ class: cls, ...attrs }: InputOTPSeparatorProps): JSX.Element {
  const { Separator } = inputOtp();
  return <Separator class={cls} {...attrs} />;
}
