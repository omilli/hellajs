import { popover } from "@hellajs/headless";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

interface PopoverPartProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

interface PopoverDescriptionProps extends HTMLAttributes<"p"> {
  children?: HellaChildren;
  class?: string;
}

interface PopoverProps extends HTMLAttributes<"button"> {
  open?: () => boolean;
  onOpenChange?: (open: boolean) => void;
  /** Resolves the positioning anchor; defaults to the trigger element. */
  anchor?: () => Element | undefined;
  children?: HellaChildren;
  content: HellaChildren;
  class?: string;
}
import { cn } from "./cn.js";

export function PopoverHeader({ children, class: cls, ...attrs }: PopoverPartProps): JSX.Element {
  const { Header } = popover();
  return (
    <Header
      class={
        cn("flex flex-col gap-1 text-sm", cls)
      }
      {...attrs}
    >
      {children}
    </Header>
  );
}

export function PopoverTitle({ children, class: cls, ...attrs }: PopoverPartProps): JSX.Element {
  const { Title } = popover();
  return (
    <Title
      class={
        cn("font-medium", cls)
      }
      {...attrs}
    >
      {children}
    </Title>
  );
}

export function PopoverDescription({
  children,
  class: cls,
  ...attrs
}: PopoverDescriptionProps): JSX.Element {
  const { Description } = popover();
  return (
    <Description
      class={
        cn("text-muted-foreground", cls)
      }
      {...attrs}
    >
      {children}
    </Description>
  );
}

export function Popover({
  open,
  onOpenChange,
  anchor,
  children,
  content: contentSlot,
  class: cls,
  ...attrs
}: PopoverProps): JSX.Element {
  const { Trigger, Content } = popover({ open, onOpenChange, anchor });
  return (
    <Trigger
      class={
        cn("inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50 h-9 px-4 py-2 has-[>svg]:px-3", cls)
      }
      {...attrs}
    >
      {children}
      <Content
        class={
          cn("z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-hidden data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95")
        }
      >
        {contentSlot}
      </Content>
    </Trigger>
  );
}
