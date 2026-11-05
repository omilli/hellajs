---
title: Let inputOtp own the caret and read the code through its value
impact: MEDIUM
impactDescription: wiring per-slot inputs loses native selection, autofill, and paste, and re-implementing the caret remap fights the transparent control input
tags: inputOtp, OtpRows
---

## Let inputOtp own the caret and read the code through its value

`inputOtp(options)` renders ONE transparent control input overlaying the display slots and holding the whole code - native selection, caret, and autofill survive because there is exactly one real input - while `Root` remaps collapsed carets onto one-slot selections (typing advances, backspace clears and retreats), mirrors each slot's character, ring, and caret through afterMount effects over the `data-index`-keyed slots, merges paste at the selection under the `maxLength` clamp and `pattern` mask, and reports `onValueChange` per accepted change plus `onComplete` ONCE per transition to a full code. The display parts (`Group`, `Slot`, `Separator`) are the static `OtpRows`; slots take `caretWrapClass`/`caretClass` hooks for styling the mirrored caret. `maxLength` is fixed after mount and `value` is a static seed or a controlled accessor - read the code through `onValueChange`/`onComplete`, not by querying the slots.

**Incorrect (what is wrong):**

```tsx
import { inputOtp } from "@hellajs/headless";

const Code = inputOtp({ maxLength: 6 });
// Reading slot textContent per keystroke: the mirrored characters are an
// afterMount effect's output, and autofill and paste land in the hidden
// control input, not in any slot.
const readCode = () =>
  Array.from(document.querySelectorAll("[data-slot='input-otp-slot']"))
    .map((slot) => slot.textContent ?? "")
    .join("");
```

**Correct (what is right):**

```tsx
import { inputOtp, OtpRows } from "@hellajs/headless";

const verify = (code: string): void => undefined;
const updateProgress = (filled: number): void => undefined;
const Code = inputOtp({
  maxLength: 6,
  pattern: "\\d",
  onValueChange: (value) => updateProgress(value.length),
  onComplete: (value) => verify(value), // once per transition to a full code
});

const OtpField = () => (
  <Code.Root>
    <OtpRows.Group>
      <OtpRows.Slot index={0} />
      <OtpRows.Slot index={1} />
      <OtpRows.Slot index={2} />
      <OtpRows.Separator />
      <OtpRows.Slot index={3} />
      <OtpRows.Slot index={4} />
      <OtpRows.Slot index={5} />
    </OtpRows.Group>
  </Code.Root>
);
```

Reference: `packages/headless/lib/inputOtp.tsx` and `packages/headless/tests/input-otp.test.ts`
