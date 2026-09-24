import { html } from "@hellajs/dom";
import { effect, signal } from "@hellajs/core";
import type { HellaChildren, HellaNode } from "@hellajs/dom";

// @hella:styles
// @hella:end

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

export default function InputOTP(props: InputOTPProps): HellaNode {
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
    let start = input.selectionStart;
    let end = input.selectionEnd;
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

  return html`
    <div
      data-slot="input-otp"
      style="${rootStyle}"
      class="${
        // @hella:compose
        [base, props.class]
        // @hella:end
      }"
      hook:afterMount="${(node: Element) => {
        if (!(node instanceof HTMLElement)) return;
        const input = node.querySelector<HTMLInputElement>("[data-input-otp]");
        if (!input) return;
        const stops: (() => void)[] = [];
        for (const slot of Array.from(node.querySelectorAll<HTMLElement>("[data-slot='input-otp-slot'][data-index]"))) {
          const index = Number(slot.getAttribute("data-index"));
          const caretWrap = slot.querySelector<HTMLElement>(":scope > div");
          const char = document.createTextNode("");
          slot.insertBefore(char, slot.firstChild);
          stops.push(effect(() => {
            const ch = value()[index] ?? "";
            if (char.data !== ch) char.data = ch;
            if (isActive(index)) slot.setAttribute("data-active", "true");
            else slot.removeAttribute("data-active");
            if (caretWrap) caretWrap.style.display = isActive(index) && ch === "" ? "" : "none";
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
      }}"
      hook:beforeDestroy="${() => {
        while (wirings.length) wirings.pop()!();
      }}"
    >${() => props.children}<input
        data-input-otp="true"
        type="text"
        inputmode="numeric"
        autocomplete="one-time-code"
        spellcheck="false"
        pattern="${pattern ? pattern.source : undefined}"
        autofocus="${props.autoFocus}"
        disabled="${props.disabled}"
        style="${inputStyle}"
        e:input="${onInput}"
        e:focus="${onFocus}"
        e:blur="${onBlur}"
        e:paste="${onPaste}"
        class="${
          // @hella:compose
          [control]
          // @hella:end
        }"
      />
    </div>
  ` as HellaNode;
}

interface InputOTPGroupProps {
  children?: HellaChildren;
  class?: string;
}

export function InputOTPGroup(props: InputOTPGroupProps): HellaNode {
  return html`
    <div
      data-slot="input-otp-group"
      class="${
        // @hella:compose
        [group, props.class]
        // @hella:end
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface InputOTPSlotProps {
  /** Slot position this mirror renders; the root wires its char and caret state after mount. */
  index: number;
  class?: string;
}

export function InputOTPSlot(props: InputOTPSlotProps): HellaNode {
  return html`
    <div
      data-slot="input-otp-slot"
      data-index="${props.index}"
      class="${
        // @hella:compose
        [slot, props.class]
        // @hella:end
      }"
    >
      <div
        class="${
          // @hella:compose
          [caretWrap]
          // @hella:end
        }"
        style="display: none"
      >
        <div
          class="${
            // @hella:compose
            [caret]
            // @hella:end
          }"
        ></div>
      </div>
    </div>
  ` as HellaNode;
}

interface InputOTPSeparatorProps {
  class?: string;
}

export function InputOTPSeparator(props: InputOTPSeparatorProps): HellaNode {
  return html`
    <div data-slot="input-otp-separator" role="separator" class="${props.class}">
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
  ` as HellaNode;
}
