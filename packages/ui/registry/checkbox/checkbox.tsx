import { checkbox } from "@hellajs/headless";
import type { CheckboxProps } from "./checkbox-types.js";

// @hella:styles
declare const base: string;
declare const icon: string;
declare const indicator: string;
// @hella:end

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
      // @hella:compose
      [icon]
      // @hella:end
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
        // @hella:compose
        [base, cls]
        // @hella:end
      }
      {...attrs}
    >
      <Indicator
        class={
          // @hella:compose
          [indicator]
          // @hella:end
        }
      >
        {checkIcon()}
      </Indicator>
    </Root>
  );
}
