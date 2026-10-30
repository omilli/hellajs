import { toggleSwitch } from "@hellajs/headless";
import type { SwitchProps } from "./switch-types.js";

// @hella:styles
declare const base: string;
declare const thumb: string;
// @hella:end

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  class: cls,
  ...attrs
}: SwitchProps): JSX.Element {
  const { Root, Indicator } = toggleSwitch({ checked, onCheckedChange });
  return (
    <Root
      data-size="default"
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
          [thumb]
          // @hella:end
        }
      />
    </Root>
  );
}
