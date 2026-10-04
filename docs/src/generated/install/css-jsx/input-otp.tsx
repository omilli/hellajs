import { effect, signal } from "@hellajs/core";
import type { HellaChildren } from "@hellajs/dom";

import { keyframes, style } from "@hellajs/css";

const caretBlink = keyframes({
  "0%,70%,100%": { opacity: "1" },
  "20%,50%": { opacity: "0" },
});

const base = style({
  alignItems: "center",
  display: "flex",
  gap: "0.5rem",
  "&:has(:disabled)": {
    opacity: "0.5",
  },
}, { label: "input-otp" });

const control = style({
  "&:disabled": {
    cursor: "not-allowed",
  },
  "&::selection": {
    backgroundColor: "transparent",
    color: "transparent",
  },
}, { label: "input-otp-input" });

const group = style({
  alignItems: "center",
  display: "flex",
}, { label: "input-otp-group" });

const slot = style({
  alignItems: "center",
  borderBlock: "1px solid var(--input)",
  borderRight: "1px solid var(--input)",
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
    borderBottomLeftRadius: "calc(var(--radius) * 0.8)",
    borderLeft: "1px solid var(--input)",
    borderTopLeftRadius: "calc(var(--radius) * 0.8)",
  },
  "&:last-child": {
    borderBottomRightRadius: "calc(var(--radius) * 0.8)",
    borderTopRightRadius: "calc(var(--radius) * 0.8)",
  },
  "&[aria-invalid='true']": {
    borderColor: "var(--destructive)",
  },
  "&[data-active='true']": {
    borderColor: "var(--ring)",
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
    zIndex: "10",
  },
  "&[data-active='true'][aria-invalid='true']": {
    borderColor: "var(--destructive)",
  },
  "&[data-active='true'][aria-invalid='true']:is(.dark *)": {
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 40%, transparent)",
  },
  "&:is(.dark *)": {
    backgroundColor: "color-mix(in oklab, var(--input) 30%, transparent)",
  },
}, { label: "input-otp-slot" });

const caretWrap = style({
  alignItems: "center",
  display: "flex",
  inset: "0",
  justifyContent: "center",
  pointerEvents: "none",
  position: "absolute",
}, { label: "input-otp-caret" });

const caret = style({
  animation: `${caretBlink} 1s ease-out infinite`,
  backgroundColor: "var(--foreground)",
  height: "1rem",
  width: "1px",
}, { label: "input-otp-caret-bar" });

interface InputOTPProps {
  /** Number of slots; fixed after mount. Defaults to 6. */
  length?: number;
  /** The code. A static string seeds the internal state; an accessor makes it controlled, so edits report through `onChange` only. */
  value?: string | (() => string);
  /** Reports every accepted value change (typing, paste, deletion). */
  onChange?: (value: string) => void;
  /** Fires once per transition to a full code. */
  onComplete?: (value: string) => void;
  /** Whole-value RegExp gate: an edit whose result fails the test is rejected and the previous value stands. */
  pattern?: RegExp;
  autoFocus?: boolean;
  disabled?: boolean;
  class?: string;
  children?: HellaChildren;
}

export default function InputOTP(props: InputOTPProps): JSX.Element {
  const length = props.length ?? 6;
  const pattern = props.pattern ?? null;

  const internal = signal(typeof props.value === "function" ? "" : props.value ?? "");
  const value = (): string => (typeof props.value === "function" ? props.value() : internal());

  const focused = signal(false);
  const mss = signal<number | null>(null);
  const mse = signal<number | null>(null);
  let prevSel: [number | null, number | null, string] = [null, null, "forward"];

  const isActive = (index: number): boolean => {
    if (!focused() || mss() === null || mse() === null) return false;
    return mss() === mse() ? index === mss() : index >= mss()! && index < mse()!;
  };

  const accept = (next: string): boolean => {
    const prev = value();
    if (next.length > 0 && pattern && !pattern.test(next)) return false;
    if (typeof props.value !== "function") internal(next);
    props.onChange?.(next);
    if (next.length === length && prev.length < length) props.onComplete?.(next);
    return true;
  };

  // Collapsed carets remap onto the slot they sit in (a one-char selection), so
  // Backspace clears the active slot and arrows move the highlight slot by slot.
  const syncSelection = (input: HTMLInputElement): void => {
    if (document.activeElement !== input) {
      mss(null);
      mse(null);
      return;
    }
    const text = input.value;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    let dir = input.selectionDirection ?? "forward";
    let mappedStart = -1;
    let mappedEnd = -1;
    if (text.length !== 0 && start !== null && end !== null) {
      const collapsed = start === end;
      const atEndWithRoom = start === text.length && text.length < length;
      if (collapsed && !atEndWithRoom) {
        if (start === 0) {
          mappedStart = 0;
          mappedEnd = 1;
          dir = "forward";
        } else if (start === length) {
          mappedStart = start - 1;
          mappedEnd = start;
          dir = "backward";
        } else if (length > 1 && text.length > 1) {
          let offset = 0;
          if (prevSel[0] !== null && prevSel[1] !== null) {
            dir = start < prevSel[1] ? "backward" : "forward";
            const wasSlotSelection = prevSel[0] === prevSel[1] && prevSel[0] < length;
            if (dir === "backward" && !wasSlotSelection) offset = -1;
          }
          mappedStart = offset + start;
          mappedEnd = offset + start + 1;
        }
      }
    }
    if (mappedStart !== -1 && mappedEnd !== -1 && mappedStart !== mappedEnd) {
      input.setSelectionRange(mappedStart, mappedEnd, dir);
    }
    const s = mappedStart !== -1 ? mappedStart : start;
    const e = mappedEnd !== -1 ? mappedEnd : end;
    mss(s === null ? null : s);
    mse(e === null ? null : e);
    prevSel = [s, e, dir];
  };

  const onInput = (event: Event): void => {
    if (props.disabled) return;
    const input = event.target as HTMLInputElement;
    const next = input.value.slice(0, length);
    if (!accept(next)) input.value = value();
    syncSelection(input);
  };

  const onFocus = (event: Event): void => {
    if (props.disabled) return;
    const input = event.target as HTMLInputElement;
    focused(true);
    const at = Math.min(input.value.length, length - 1);
    input.setSelectionRange(at, input.value.length);
    mss(at);
    mse(input.value.length);
    prevSel = [at, input.value.length, "forward"];
  };

  const onBlur = (): void => {
    focused(false);
    mss(null);
    mse(null);
  };

  const onPaste = (event: ClipboardEvent): void => {
    if (props.disabled) return;
    const input = event.target as HTMLInputElement;
    const data = event.clipboardData?.getData("text/plain") ?? "";
    event.preventDefault();
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    const current = value();
    const merged = (start !== end
      ? current.slice(0, start) + data + current.slice(end)
      : current.slice(0, start) + data + current.slice(start)).slice(0, length);
    if (!accept(merged)) return;
    input.value = merged;
    const at = Math.min(merged.length, length - 1);
    input.setSelectionRange(at, merged.length);
    mss(at);
    mse(merged.length);
    prevSel = [at, merged.length, "forward"];
  };

  const wirings: (() => void)[] = [];

  const rootStyle = `position: relative; cursor: ${props.disabled ? "default" : "text"}; user-select: none`;
  const inputStyle = "position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; text-align: left; color: transparent; caret-color: transparent; background-color: transparent; border: 0 solid transparent; outline: none; box-shadow: none; pointer-events: all";

  return (
    <div
      data-slot="input-otp"
      style={rootStyle}
      class={
        [base, props.class]
      }
      hook:afterMount={(node) => {
        if (!(node instanceof HTMLElement)) return;
        const input = node.querySelector<HTMLInputElement>("[data-input-otp]");
        if (!input) return;
        const stops: (() => void)[] = [];
        for (const slotEl of Array.from(node.querySelectorAll<HTMLElement>("[data-slot='input-otp-slot'][data-index]"))) {
          const index = Number(slotEl.getAttribute("data-index"));
          const caretBox = slotEl.querySelector<HTMLElement>(":scope > div");
          const char = document.createTextNode("");
          slotEl.insertBefore(char, slotEl.firstChild);
          stops.push(effect(() => {
            const ch = value()[index] ?? "";
            if (char.data !== ch) char.data = ch;
            if (isActive(index)) slotEl.setAttribute("data-active", "true");
            else slotEl.removeAttribute("data-active");
            if (caretBox) caretBox.style.display = isActive(index) && ch === "" ? "" : "none";
          }));
        }
        const onSelectionChange = () => syncSelection(input);
        document.addEventListener("selectionchange", onSelectionChange, { capture: true });
        stops.push(effect(() => {
          const v = value();
          if (input.value !== v) {
            input.value = v;
            syncSelection(input);
          }
        }));
        wirings.push(() => {
          document.removeEventListener("selectionchange", onSelectionChange, { capture: true });
          while (stops.length) stops.pop()!();
        });
      }}
      hook:beforeDestroy={() => {
        while (wirings.length) wirings.pop()!();
      }}
    >
      {props.children}
      <input
        data-input-otp="true"
        type="text"
        inputmode="numeric"
        autocomplete="one-time-code"
        spellcheck="false"
        pattern={pattern ? pattern.source : undefined}
        autofocus={props.autoFocus}
        disabled={props.disabled}
        style={inputStyle}
        on:input={onInput}
        on:focus={onFocus}
        on:blur={onBlur}
        on:paste={onPaste}
        class={
          [control]
        }
      />
    </div>
  );
}

interface InputOTPGroupProps {
  children?: HellaChildren;
  class?: string;
}

export function InputOTPGroup(props: InputOTPGroupProps): JSX.Element {
  return (
    <div
      data-slot="input-otp-group"
      class={
        [group, props.class]
      }
    >
      {props.children}
    </div>
  );
}

interface InputOTPSlotProps {
  /** Slot position this mirror renders; the root wires its char and caret state after mount. */
  index: number;
  class?: string;
}

export function InputOTPSlot(props: InputOTPSlotProps): JSX.Element {
  return (
    <div
      data-slot="input-otp-slot"
      data-index={props.index}
      class={
        [slot, props.class]
      }
    >
      <div
        class={
          [caretWrap]
        }
        style="display: none"
      >
        <div
          class={
            [caret]
          }
        />
      </div>
    </div>
  );
}

interface InputOTPSeparatorProps {
  class?: string;
}

export function InputOTPSeparator(props: InputOTPSeparatorProps): JSX.Element {
  return (
    <div data-slot="input-otp-separator" role="separator" class={props.class}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="lucide lucide-minus"
        aria-hidden="true"
      >
        <path d="M5 12h14" />
      </svg>
    </div>
  );
}
