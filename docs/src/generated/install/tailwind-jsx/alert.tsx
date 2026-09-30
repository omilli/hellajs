import type { HellaChildren } from "@hellajs/dom";
import { cn } from "./cn.js";

const variants = {
  default: "bg-card text-card-foreground",
  destructive: "bg-card text-destructive *:data-[slot=alert-description]:text-destructive/90 [&>svg]:text-current",
};

interface AlertProps {
  children?: HellaChildren;
  variant?: "default" | "destructive";
  class?: string;
}

export default function Alert(props: AlertProps): JSX.Element {
  return (
    <div
      data-slot="alert"
      role="alert"
      class={
        cn(
          "relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-lg border px-4 py-3 text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
          variants[props.variant ?? "default"],
          props.class,
        )
      }
    >
      {props.children}
    </div>
  );
}

interface AlertPartProps {
  children?: HellaChildren;
  class?: string;
}

export function AlertTitle(props: AlertPartProps): JSX.Element {
  return (
    <div
      data-slot="alert-title"
      class={
        cn("col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight", props.class)
      }
    >
      {props.children}
    </div>
  );
}

export function AlertDescription(props: AlertPartProps): JSX.Element {
  return (
    <div
      data-slot="alert-description"
      class={
        cn("col-start-2 grid justify-items-start gap-1 text-sm text-muted-foreground [&_p]:leading-relaxed", props.class)
      }
    >
      {props.children}
    </div>
  );
}
