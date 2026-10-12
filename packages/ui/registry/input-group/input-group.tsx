import type { InputGroupProps, InputGroupAddonProps, InputGroupButtonProps, InputGroupTextProps, InputGroupInputProps, InputGroupTextareaProps } from "./input-group-types.js";

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

export function InputGroup({ disabled, children, class: cls, ...attrs }: InputGroupProps): JSX.Element {
  return (
    <div
      data-slot="input-group"
      role="group"
      data-disabled={disabled ? "true" : undefined}
      class={
        // @hella:compose
        [base, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function InputGroupAddon({ align, children, class: cls, ...attrs }: InputGroupAddonProps): JSX.Element {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align ?? "inline-start"}
      class={
        // @hella:compose
        [
          addon,
          addonAlign[align ?? "inline-start"],
          cls,
        ]
        // @hella:end
      }
      e:click={(e: Event) => {
        const target = e.target as HTMLElement;
        if (target.closest("button")) return;
        target.closest('[data-slot="input-group"]')?.querySelector("input")?.focus();
      }}
      {...attrs}
    >
      {children}
    </div>
  );
}

export function InputGroupButton({ variant, size, children, class: cls, ...attrs }: InputGroupButtonProps): JSX.Element {
  return (
    <button
      type="button"
      data-slot="button"
      data-variant={variant ?? "ghost"}
      data-size={size ?? "xs"}
      class={
        // @hella:compose
        [
          buttonBase,
          buttonVariants[variant ?? "ghost"],
          buttonSizes[size ?? "xs"],
          sizes[size ?? "xs"],
          cls,
        ]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </button>
  );
}

export function InputGroupText({ children, class: cls, ...attrs }: InputGroupTextProps): JSX.Element {
  return (
    <span
      data-slot="input-group-text"
      class={
        // @hella:compose
        [text, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </span>
  );
}

export function InputGroupInput({ class: cls, ...attrs }: InputGroupInputProps): JSX.Element {
  return (
    <input
      data-slot="input-group-control"
      class={
        // @hella:compose
        [
          inputBase,
          inputFocus,
          inputInvalid,
          inputControl,
          cls,
        ]
        // @hella:end
      }
      {...attrs}
    />
  );
}

export function InputGroupTextarea({ class: cls, ...attrs }: InputGroupTextareaProps): JSX.Element {
  return (
    <textarea
      data-slot="input-group-control"
      class={
        // @hella:compose
        [
          textareaBase,
          textareaFocus,
          textareaInvalid,
          textareaControl,
          cls,
        ]
        // @hella:end
      }
      {...attrs}
    />
  );
}
