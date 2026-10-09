import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

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

interface InputGroupProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  /** Renders data-disabled="true" on the group; addons read it for their opacity state. */
  disabled?: boolean;
  class?: string;
}

export default function InputGroup({ disabled, children, class: cls, ...attrs }: InputGroupProps): JSX.Element {
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

interface InputGroupAddonProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  align?: "inline-start" | "inline-end" | "block-start" | "block-end";
  class?: string;
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

interface InputGroupButtonProps extends HTMLAttributes<"button"> {
  children?: HellaChildren;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "xs" | "sm" | "icon-xs" | "icon-sm";
  class?: string;
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

interface InputGroupTextProps extends HTMLAttributes<"span"> {
  children?: HellaChildren;
  class?: string;
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

interface InputGroupInputProps extends HTMLAttributes<"input"> {
  class?: string;
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

interface InputGroupTextareaProps extends HTMLAttributes<"textarea"> {
  class?: string;
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
