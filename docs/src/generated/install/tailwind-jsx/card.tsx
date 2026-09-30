import type { HellaChildren } from "@hellajs/dom";
import { cn } from "./cn.js";

interface CardPartProps {
  children?: HellaChildren;
  class?: string;
}

export default function Card(props: CardPartProps): JSX.Element {
  return (
    <div
      data-slot="card"
      class={
        cn("flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm", props.class)
      }
    >
      {props.children}
    </div>
  );
}

export function CardHeader(props: CardPartProps): JSX.Element {
  return (
    <div
      data-slot="card-header"
      class={
        cn("@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6", props.class)
      }
    >
      {props.children}
    </div>
  );
}

export function CardTitle(props: CardPartProps): JSX.Element {
  return (
    <div
      data-slot="card-title"
      class={
        cn("leading-none font-semibold", props.class)
      }
    >
      {props.children}
    </div>
  );
}

export function CardDescription(props: CardPartProps): JSX.Element {
  return (
    <div
      data-slot="card-description"
      class={
        cn("text-sm text-muted-foreground", props.class)
      }
    >
      {props.children}
    </div>
  );
}

export function CardAction(props: CardPartProps): JSX.Element {
  return (
    <div
      data-slot="card-action"
      class={
        cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", props.class)
      }
    >
      {props.children}
    </div>
  );
}

export function CardContent(props: CardPartProps): JSX.Element {
  return (
    <div
      data-slot="card-content"
      class={
        cn("px-6", props.class)
      }
    >
      {props.children}
    </div>
  );
}

export function CardFooter(props: CardPartProps): JSX.Element {
  return (
    <div
      data-slot="card-footer"
      class={
        cn("flex items-center px-6 [.border-t]:pt-6", props.class)
      }
    >
      {props.children}
    </div>
  );
}
