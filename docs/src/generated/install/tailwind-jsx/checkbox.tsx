import { signal } from "@hellajs/core";
import { cn } from "./cn.js";

interface CheckboxProps {
  /** Checked state. A boolean seeds the internal signal; an accessor makes the checkbox controlled — clicks then only report through `onCheckedChange`. */
  checked?: boolean | (() => boolean);
  /** Indeterminate (mixed) state. A boolean seeds the internal signal; an accessor makes it controlled. Wins over `checked` for rendering. */
  indeterminate?: boolean | (() => boolean);
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  ariaInvalid?: boolean;
  id?: string;
  class?: string;
}

/** The check icon (refs/icons/check.svg), created per call so reactive swaps never share nodes between clones. */
const checkIcon = (): JSX.Element => (
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
    aria-hidden="true"
    class={
      cn("size-3.5")
    }
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export default function Checkbox(props: CheckboxProps): JSX.Element {
  const checkedAccessor = typeof props.checked === "function" ? props.checked : undefined;
  const indeterminateAccessor = typeof props.indeterminate === "function" ? props.indeterminate : undefined;
  const internalChecked = signal(typeof props.checked === "boolean" ? props.checked : false);
  const internalIndeterminate = signal(typeof props.indeterminate === "boolean" ? props.indeterminate : false);

  const checked = (): boolean => (checkedAccessor ? checkedAccessor() : internalChecked());
  const indeterminate = (): boolean => (indeterminateAccessor ? indeterminateAccessor() : internalIndeterminate());
  const state = (): "checked" | "unchecked" | "indeterminate" =>
    indeterminate() ? "indeterminate" : checked() ? "checked" : "unchecked";
  const ariaChecked = (): "true" | "false" | "mixed" =>
    indeterminate() ? "mixed" : checked() ? "true" : "false";

  const toggle = (): void => {
    if (props.disabled) return;
    const next = !checked();
    if (!checkedAccessor) internalChecked(next);
    if (!indeterminateAccessor) internalIndeterminate(false);
    props.onCheckedChange?.(next);
  };

  return (
    <button
      type="button"
      role="checkbox"
      data-slot="checkbox"
      id={props.id}
      aria-checked={ariaChecked()}
      data-state={state()}
      disabled={props.disabled ? true : undefined}
      aria-invalid={props.ariaInvalid ? "true" : undefined}
      class={
        cn("peer size-4 shrink-0 rounded-[4px] border border-input shadow-xs transition-shadow outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:bg-input/30 dark:aria-invalid:ring-destructive/40 dark:data-[state=checked]:bg-primary", props.class)
      }
      on:click={() => toggle()}
    >
      <span
        data-slot="checkbox-indicator"
        class={
          cn("grid place-content-center text-current transition-none")
        }
      >
        {() => (state() === "unchecked" ? null : checkIcon())}
      </span>
    </button>
  );
}
