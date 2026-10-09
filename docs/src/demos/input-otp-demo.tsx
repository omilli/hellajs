import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import { tokens } from "../styles/tokens";
import InputOTP, { InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@registry/input-otp/css/input-otp.js";

const muted = style({
  color: tokens.mutedForeground,
  fontSize: "0.875rem",
  margin: 0,
  maxWidth: "26rem",
  textAlign: "center",
}, { label: "demo-muted" });

const mask = (value: string): string =>
  (value + "_".repeat(6)).slice(0, 6).split("").join(" ");

export function InputOtpDemo() {
  const code = signal("");

  return (
    <>
      <div class="demo-row">
        <InputOTP
          length={6}
          value={code}
          onChange={(next: string) => code(next)}
          onComplete={(next: string) => console.log("complete:", next)}
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </div>
      <p class="demo-muted">{() => `The code so far: ${mask(code())}`}</p>
    </>
  );
}

export function InputOtpDigitsDemo() {
  return (
    <>
      <div class="demo-row">
        <InputOTP length={4} pattern="^\d+$">
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
          </InputOTPGroup>
        </InputOTP>
      </div>
    </>
  );
}
