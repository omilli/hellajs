import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import { inputOtp, OtpRows } from "@hellajs/headless";

export function InputOtpDemo() {
  const code = signal("");

  const InputOtp = inputOtp({
    value: () => code(),
    onValueChange: (next) => code(next),
    maxLength: 6,
  });

  const inputOtpDemo = style({
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    '& [data-slot="input-otp-group"]': {
      display: "flex",
    },
    '& [data-slot="input-otp-slot"]': {
      alignItems: "center",
      border: "1px solid #3a3a48",
      display: "flex",
      height: "2.25rem",
      justifyContent: "center",
      width: "2.25rem",
    },
    '& [data-slot="input-otp-slot"][data-active="true"]': {
      borderColor: "#e8e8f2",
    },
    '& [data-slot="input-otp-separator"]': {
      margin: "0 0.375rem",
    },
    '& [data-slot="input-otp-separator"] svg': {
      height: "1rem",
      width: "1rem",
    },
    "& .note": {
      fontSize: "0.875rem",
      margin: 0,
      opacity: 0.7,
    },
  });

  return (
    <div class={inputOtpDemo}>
      <InputOtp.Root>
        <OtpRows.Group>
          <OtpRows.Slot index={0} />
          <OtpRows.Slot index={1} />
          <OtpRows.Slot index={2} />
          <OtpRows.Separator />
          <OtpRows.Slot index={3} />
          <OtpRows.Slot index={4} />
          <OtpRows.Slot index={5} />
        </OtpRows.Group>
      </InputOtp.Root>
      <p class="note">
        {() => (code() ? `Code: ${code()}` : "Type digits to fill the slots in order.")}
      </p>
    </div>
  );
}
