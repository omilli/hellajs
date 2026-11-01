import { InputOTP as InputOtpCssDefault } from "../../../dist/registry/input-otp/css/input-otp";
import { InputOTP as InputOtpTailwindDefault } from "../../../dist/registry/input-otp/tailwind/input-otp";
import * as InputOtpCssJsx from "../../../dist/registry/input-otp/css/input-otp";
import * as InputOtpTailwindJsx from "../../../dist/registry/input-otp/tailwind/input-otp";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";
import type { AnyModule, ComponentVariant } from "../../helpers/variants-core";

/** Prop bag shared by every compiled InputOTP variant (mirrors the emitted InputOTPProps). */
export interface InputOtpVariantProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  length?: number;
  value?: string | (() => string);
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void;
}
/**
 * Every compiled InputOTP variant (the InputOTP export) from dist/registry.
 * Children are the user-composed groups/slots, so the suites build them from
 * `inputOtpPartModules` per render.
 */
export const inputOtpVariants: ComponentVariant<InputOtpVariantProps>[] = [
  { style: "css", render: InputOtpCssDefault },
  { style: "tailwind", render: InputOtpTailwindDefault },
];
/**
 * Every compiled InputOTP part module (InputOTPGroup, InputOTPSlot,
 * InputOTPSeparator) at both styles, for composing children in the suites.
 */
export const inputOtpPartModules: AnyModule[] = [InputOtpCssJsx, InputOtpTailwindJsx];
