import type { HellaChildren } from "@hellajs/dom";

// @hella:styles
// @hella:end

interface NativeSelectProps {
  children?: HellaChildren;
  value?: string | (() => string);
  size?: "sm" | "default";
  id?: string;
  ariaLabel?: string;
  ariaInvalid?: boolean;
  class?: string;
  onchange?: (v: string) => void;
}

export default function NativeSelect(props: NativeSelectProps): JSX.Element {
  return (
    <div
      data-slot="native-select-wrapper"
      class={
        // @hella:compose
        [wrapper]
        // @hella:end
      }
    >
      <select
        data-slot="native-select"
        data-size={props.size ?? "default"}
        id={props.id}
        ariaLabel={props.ariaLabel}
        aria-invalid={props.ariaInvalid ? "true" : undefined}
        value={props.value}
        hook:afterMount={(node) => {
          // Props apply before children mount: a value set on an optionless select
          // is lost, so re-apply the current value once the options exist.
          const select = node as HTMLSelectElement;
          select.value = (typeof props.value === "function" ? props.value() : props.value) ?? "";
        }}
        class={
          // @hella:compose
          [
            base,
            focus,
            invalid,
            props.class,
          ]
          // @hella:end
        }
        on:change={(e: Event) => props.onchange?.((e.target as HTMLSelectElement).value)}
      >
        {props.children}
      </select>      <svg
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
        data-slot="native-select-icon"
        class={
          // @hella:compose
          [icon]
          // @hella:end
        }
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

interface NativeSelectOptionProps {
  children?: HellaChildren;
  class?: string;
}

export function NativeSelectOption(props: NativeSelectOptionProps): JSX.Element {
  return (
    <option
      data-slot="native-select-option"
      class={
        // @hella:compose
        [option, props.class]
        // @hella:end
      }
    >
      {props.children}
    </option>
  );
}

export function NativeSelectOptGroup(props: NativeSelectOptionProps): JSX.Element {
  return (
    <optgroup
      data-slot="native-select-optgroup"
      class={
        // @hella:compose
        [optgroup, props.class]
        // @hella:end
      }
    >
      {props.children}
    </optgroup>
  );
}
