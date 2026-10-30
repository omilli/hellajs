import { effect, isFunction, signal } from "@hellajs/core";
import type {
  InputOtpGroupProps,
  InputOtpOptions,
  InputOtpParts,
  InputOtpRootProps,
  InputOtpSeparatorProps,
  InputOtpSlotProps,
} from "./types/parts";

/**
 * Creates the input-otp part set: `Root` + `Group` + `Slot` + `Separator`. The closure owns
 * the code value — controlled through a `value` accessor when passed, an internal signal when
 * a static string seeds it. One transparent input overlays the slots and holds the whole code,
 * so native caret, selection, and paste keep working; the root remaps the caret onto slot
 * ranges and mirrors each slot's character, active ring, and blinking caret after mount
 * (typing advances the caret slot by slot, backspace clears and retreats, paste fills from the
 * caret, a `pattern` mask rejects non-matching input, and the transition to a full code
 * reports `onComplete` once). `Root` drains the wiring at unmount. Call in component scope so
 * the state signal disposes with the component.
 *
 * ```tsx
 * const Otp = inputOtp({ value, onValueChange, maxLength: 6 });
 *
 * <Otp.Root>
 *   <Otp.Group>
 *     <Otp.Slot index={0} />
 *     <Otp.Separator />
 *     <Otp.Slot index={1} />
 *   </Otp.Group>
 * </Otp.Root>
 * ```
 * @param options Controlled-or-seeded `value`, `maxLength` (default 6), `onValueChange`,
 * `onComplete`, `pattern` mask, `autofocus`, and `disabled`.
 * @returns The part set, composed as `Otp.Root`-style members.
 */
export function inputOtp(options: InputOtpOptions = {}): InputOtpParts {
  const length = options.maxLength ?? 6;
  const valueProp = options.value;
  const pattern = options.pattern;
  const autofocus = options.autofocus;
  const disabled = options.disabled;
  const onValueChange = options.onValueChange;
  const onComplete = options.onComplete;
  const mask = pattern === undefined ? null : new RegExp(pattern);

  const internal = signal(isFunction(valueProp) ? "" : (valueProp ?? ""));
  const value = (): string => (isFunction(valueProp) ? valueProp() : internal());

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
    if (next.length > 0 && mask && !mask.test(next)) return false;
    if (!isFunction(valueProp)) internal(next);
    onValueChange?.(next);
    if (next.length === length && prev.length < length) onComplete?.(next);
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
    if (disabled) return;
    const input = event.target as HTMLInputElement;
    const next = input.value.slice(0, length);
    if (!accept(next)) input.value = value();
    syncSelection(input);
  };

  const onFocus = (event: Event): void => {
    if (disabled) return;
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
    if (disabled) return;
    const input = event.target as HTMLInputElement;
    const data = event.clipboardData?.getData("text/plain") ?? "";
    event.preventDefault();
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    const current = value();
    const merged = (
      start !== end
        ? current.slice(0, start) + data + current.slice(end)
        : current.slice(0, start) + data + current.slice(start)
    ).slice(0, length);
    if (!accept(merged)) return;
    input.value = merged;
    const at = Math.min(merged.length, length - 1);
    input.setSelectionRange(at, merged.length);
    mss(at);
    mse(merged.length);
    prevSel = [at, merged.length, "forward"];
  };

  const wirings: (() => void)[] = [];

  const rootStyle = `position: relative; cursor: ${disabled ? "default" : "text"}; user-select: none`;
  const inputStyle =
    "position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; text-align: left; color: transparent; caret-color: transparent; background-color: transparent; border: 0 solid transparent; outline: none; box-shadow: none; pointer-events: all";

  const Root = (props: InputOtpRootProps): JSX.Element => {
    const { children, class: cls, inputClass, ...attrs } = props;
    return (
      <div
        data-slot="input-otp"
        style={rootStyle}
        class={cls}
        hook:afterMount={(node) => {
          if (!(node instanceof HTMLElement)) return;
          const input = node.querySelector<HTMLInputElement>("[data-input-otp]");
          if (!input) return;
          const stops: (() => void)[] = [];
          const slotEls = Array.from(
            node.querySelectorAll<HTMLElement>("[data-slot='input-otp-slot'][data-index]"),
          );
          const slotCount = slotEls.length;
          let i = 0;
          while (i < slotCount) {
            const slotEl = slotEls[i]!;
            const index = Number(slotEl.getAttribute("data-index"));
            const caretBox = slotEl.querySelector<HTMLElement>(":scope > div");
            const char = document.createTextNode("");
            slotEl.insertBefore(char, slotEl.firstChild);
            stops.push(
              effect(() => {
                const ch = value()[index] ?? "";
                if (char.data !== ch) char.data = ch;
                if (isActive(index)) slotEl.setAttribute("data-active", "true");
                else slotEl.removeAttribute("data-active");
                if (caretBox) caretBox.style.display = isActive(index) && ch === "" ? "" : "none";
              }),
            );
            i++;
          }
          const onSelectionChange = () => syncSelection(input);
          document.addEventListener("selectionchange", onSelectionChange, { capture: true });
          stops.push(
            effect(() => {
              const v = value();
              if (input.value !== v) {
                input.value = v;
                syncSelection(input);
              }
            }),
          );
          wirings.push(() => {
            document.removeEventListener("selectionchange", onSelectionChange, { capture: true });
            while (stops.length) stops.pop()!();
          });
        }}
        hook:beforeDestroy={() => {
          while (wirings.length) wirings.pop()!();
        }}
        {...attrs}
      >
        {children}
        <input
          data-input-otp="true"
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          spellcheck="false"
          pattern={pattern}
          autofocus={autofocus ? true : undefined}
          disabled={disabled ? true : undefined}
          style={inputStyle}
          on:input={onInput}
          on:focus={onFocus}
          on:blur={onBlur}
          on:paste={onPaste}
          class={inputClass}
        />
      </div>
    );
  };

  const Group = (props: InputOtpGroupProps): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    return (
      <div data-slot="input-otp-group" class={cls} {...attrs}>
        {children}
      </div>
    );
  };

  const Slot = (props: InputOtpSlotProps): JSX.Element => {
    const { index, class: cls, caretWrapClass, caretClass, ...attrs } = props;
    return (
      <div data-slot="input-otp-slot" data-index={index} class={cls} {...attrs}>
        <div class={caretWrapClass} style="display: none">
          <div class={caretClass} />
        </div>
      </div>
    );
  };

  const Separator = (props: InputOtpSeparatorProps): JSX.Element => {
    const { class: cls, ...attrs } = props;
    return (
      <div data-slot="input-otp-separator" role="separator" class={cls} {...attrs}>
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
  };

  return { Root, Group, Slot, Separator };
}
