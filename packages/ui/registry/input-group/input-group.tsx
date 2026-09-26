import type { HellaChildren } from "@hellajs/dom";

// @hella:styles
declare const addon: string;
declare const addonAlign: Record<string, string>;
declare const base: string;
declare const buttonBase: string;
declare const buttonSizes: Record<string, string>;
declare const buttonVariants: Record<string, string>;
declare const inputBase: string;
declare const inputControl: string;
declare const inputFocus: string;
declare const inputInvalid: string;
declare const sizes: Record<string, string>;
declare const text: string;
declare const textareaBase: string;
declare const textareaControl: string;
declare const textareaFocus: string;
declare const textareaInvalid: string;
// @hella:end

interface InputGroupProps {
  children?: HellaChildren;
  /** Renders data-disabled="true" on the group; addons read it for their opacity state. */
  disabled?: boolean;
  class?: string;
}

export default function InputGroup(props: InputGroupProps): JSX.Element {
  return (
    <div
      data-slot="input-group"
      role="group"
      data-disabled={props.disabled ? "true" : undefined}
      class={
        // @hella:compose
        [base, props.class]
        // @hella:end
      }
    >
      {props.children}
    </div>
  );
}

interface InputGroupAddonProps {
  children?: HellaChildren;
  align?: "inline-start" | "inline-end" | "block-start" | "block-end";
  class?: string;
}

export function InputGroupAddon(props: InputGroupAddonProps): JSX.Element {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={props.align ?? "inline-start"}
      class={
        // @hella:compose
        [
          addon,
          addonAlign[props.align ?? "inline-start"],
          props.class,
        ]
        // @hella:end
      }
      on:click={(e: Event) => {
        const target = e.target as HTMLElement;
        if (target.closest("button")) return;
        target.closest('[data-slot="input-group"]')?.querySelector("input")?.focus();
      }}
    >
      {props.children}
    </div>
  );
}

interface InputGroupButtonProps {
  children?: HellaChildren;
  type?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "xs" | "sm" | "icon-xs" | "icon-sm";
  class?: string;
  onclick?: () => void;
}

export function InputGroupButton(props: InputGroupButtonProps): JSX.Element {
  return (
    <button
      type={props.type ?? "button"}
      data-slot="button"
      data-variant={props.variant ?? "ghost"}
      data-size={props.size ?? "xs"}
      class={
        // @hella:compose
        [
          buttonBase,
          buttonVariants[props.variant ?? "ghost"],
          buttonSizes[props.size ?? "xs"],
          sizes[props.size ?? "xs"],
          props.class,
        ]
        // @hella:end
      }
      on:click={() => props.onclick?.()}
    >
      {props.children}
    </button>
  );
}

interface InputGroupTextProps {
  children?: HellaChildren;
  class?: string;
}

export function InputGroupText(props: InputGroupTextProps): JSX.Element {
  return (
    <span
      data-slot="input-group-text"
      class={
        // @hella:compose
        [text, props.class]
        // @hella:end
      }
    >
      {props.children}
    </span>
  );
}

interface InputGroupInputProps {
  value?: string | (() => string);
  type?: string;
  placeholder?: string;
  id?: string;
  ariaLabel?: string;
  ariaInvalid?: boolean;
  class?: string;
  oninput?: (v: string) => void;
}

export function InputGroupInput(props: InputGroupInputProps): JSX.Element {
  return (
    <input
      data-slot="input-group-control"
      type={props.type}
      placeholder={props.placeholder}
      id={props.id}
      ariaLabel={props.ariaLabel}
      aria-invalid={props.ariaInvalid ? "true" : undefined}
      value={props.value}
      class={
        // @hella:compose
        [
          inputBase,
          inputFocus,
          inputInvalid,
          inputControl,
          props.class,
        ]
        // @hella:end
      }
      on:input={(e: Event) => props.oninput?.((e.target as HTMLInputElement).value)}
    />
  );
}

interface InputGroupTextareaProps {
  value?: string | (() => string);
  placeholder?: string;
  id?: string;
  ariaLabel?: string;
  rows?: number;
  ariaInvalid?: boolean;
  class?: string;
  oninput?: (v: string) => void;
}

export function InputGroupTextarea(props: InputGroupTextareaProps): JSX.Element {
  return (
    <textarea
      data-slot="input-group-control"
      placeholder={props.placeholder}
      id={props.id}
      ariaLabel={props.ariaLabel}
      rows={props.rows}
      aria-invalid={props.ariaInvalid ? "true" : undefined}
      value={props.value}
      class={
        // @hella:compose
        [
          textareaBase,
          textareaFocus,
          textareaInvalid,
          textareaControl,
          props.class,
        ]
        // @hella:end
      }
      on:input={(e: Event) => props.oninput?.((e.target as HTMLTextAreaElement).value)}
    />
  );
}
