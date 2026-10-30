import { checkbox } from "@hellajs/headless";
import type { HTMLAttributes } from "@hellajs/dom";

interface CheckboxProps extends HTMLAttributes<"button"> {
  class?: string;
  /** Checked state. A boolean seeds the internal signal; an accessor makes the checkbox controlled — clicks then only report through `onCheckedChange`. */
  checked?: boolean | (() => boolean);
  /** Indeterminate (mixed) state. A boolean seeds the internal signal; an accessor makes it controlled. Wins over `checked` for rendering. */
  indeterminate?: boolean | (() => boolean);
  onCheckedChange?: (checked: boolean) => void;
}
import { cn } from "./cn.js";

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

export function Checkbox({
  checked,
  indeterminate,
  onCheckedChange,
  disabled,
  class: cls,
  ...attrs
}: CheckboxProps): JSX.Element {
  const { Root, Indicator } = checkbox({ checked, indeterminate, onCheckedChange });
  return (
    <Root
      disabled={disabled}
      class={
        cn("peer size-4 shrink-0 rounded-[4px] border border-input shadow-xs transition-shadow outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:bg-input/30 dark:aria-invalid:ring-destructive/40 dark:data-[state=checked]:bg-primary", cls)
      }
      {...attrs}
    >
      <Indicator
        class={
          cn("grid place-content-center text-current transition-none")
        }
      >
        {checkIcon()}
      </Indicator>
    </Root>
  );
}
