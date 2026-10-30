import { toast, Toaster as HeadlessToaster, ToastItem } from "@hellajs/headless";
import type { HellaChild, HTMLAttributes } from "@hellajs/dom";
import type { ToastApi, ToastRecord, ToastVariant, ToasterPosition } from "@hellajs/headless";

interface ToasterProps extends HTMLAttributes<"ol"> {
  class?: string;
  position?: ToasterPosition;
  /** Tints the whole card per flavor (sonner's richColors); icons are tinted either way. */
  richColors?: boolean;
}
import { cn } from "./cn.js";

export type { ToastApi };

const toasterPositions = {
  "top-left":
    "flex-col justify-start items-start [--enter-offset:-100%] [--stack-offset:1.5rem] [--stack-origin:top]",
  "top-center":
    "flex-col justify-start items-center [--enter-offset:-100%] [--stack-offset:1.5rem] [--stack-origin:top]",
  "top-right":
    "flex-col justify-start items-end [--enter-offset:-100%] [--stack-offset:1.5rem] [--stack-origin:top]",
  "bottom-left":
    "flex-col-reverse justify-start items-start [--enter-offset:100%] [--stack-offset:-1.5rem] [--stack-origin:bottom]",
  "bottom-center":
    "flex-col-reverse justify-start items-center [--enter-offset:100%] [--stack-offset:-1.5rem] [--stack-origin:bottom]",
  "bottom-right":
    "flex-col-reverse justify-start items-end [--enter-offset:100%] [--stack-offset:-1.5rem] [--stack-origin:bottom]",
};

/** Lucide path data from refs/icons, keyed by flavor; the loader spins through its `data-type` rule. */
const ICON_PATHS: Partial<Record<ToastVariant, HellaChild[]>> = {
  success: [<circle cx="12" cy="12" r="10" />, <path d="m9 12 2 2 4-4" />],
  error: [
    <path d="m15 9-6 6" />,
    <path d="M2.586 16.726A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2h6.624a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586z" />,
    <path d="m9 9 6 6" />,
  ],
  warning: [
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />,
    <path d="M12 9v4" />,
    <path d="M12 17h.01" />,
  ],
  info: [<circle cx="12" cy="12" r="10" />, <path d="M12 16v-4" />, <path d="M12 8h.01" />],
  loading: [<path d="M21 12a9 9 0 1 1-6.219-8.56" />],
};

/**
 * One queue record as the styled sonner card: icon, content, action, and
 * close inside the headless-wired li — the queue, timers, and swipe live in
 * `@hellajs/headless`, so this markup carries styling only.
 */
function ToastCard({
  record,
  richColors,
}: {
  record: ToastRecord;
  richColors: boolean;
}): JSX.Element {
  const data = record.data;
  return (
    <ToastItem
      record={record}
      richColors={richColors}
      data-slot="sonner-toast"
      data-sonner-toast="true"
      class={
        cn("pointer-events-auto relative z-40 flex w-[356px] max-w-[calc(100vw-2rem)] items-center gap-2 rounded-md border bg-popover p-4 text-sm text-popover-foreground shadow-md transition-all max-h-(--toast-height,16rem) animate-in fade-in-0 group-data-[position^=top]/toaster:slide-in-from-top-6 group-data-[position^=bottom]/toaster:slide-in-from-bottom-6 [transform-origin:var(--stack-origin,bottom)] data-[depth=1]:z-30 data-[depth=2]:z-20 data-[depth=3]:z-10 data-[depth=1]:[transform:translateY(calc(var(--stack-offset)*1))_scale(0.95)] data-[depth=2]:[transform:translateY(calc(var(--stack-offset)*2))_scale(0.9)] data-[depth=3]:[transform:translateY(calc(var(--stack-offset)*3))_scale(0.85)] data-[dragging=true]:transition-none data-[removed=true]:pointer-events-none data-[removed=true]:opacity-0 data-[removed=true]:max-h-0 data-[removed=true]:overflow-hidden data-[removed=true]:py-0 [&:hover_[data-slot=sonner-close]]:opacity-100 data-[rich-colors=true]:data-[type=success]:border-green-600 data-[rich-colors=true]:data-[type=success]:bg-green-50 data-[rich-colors=true]:data-[type=success]:text-green-800 data-[rich-colors=true]:data-[type=error]:border-red-600 data-[rich-colors=true]:data-[type=error]:bg-red-50 data-[rich-colors=true]:data-[type=error]:text-red-800 data-[rich-colors=true]:data-[type=warning]:border-amber-600 data-[rich-colors=true]:data-[type=warning]:bg-amber-50 data-[rich-colors=true]:data-[type=warning]:text-amber-800 data-[rich-colors=true]:data-[type=info]:border-blue-600 data-[rich-colors=true]:data-[type=info]:bg-blue-50 data-[rich-colors=true]:data-[type=info]:text-blue-800 dark:data-[rich-colors=true]:data-[type=success]:border-green-700 dark:data-[rich-colors=true]:data-[type=success]:bg-green-950 dark:data-[rich-colors=true]:data-[type=success]:text-green-300 dark:data-[rich-colors=true]:data-[type=error]:border-red-700 dark:data-[rich-colors=true]:data-[type=error]:bg-red-950 dark:data-[rich-colors=true]:data-[type=error]:text-red-300 dark:data-[rich-colors=true]:data-[type=warning]:border-amber-700 dark:data-[rich-colors=true]:data-[type=warning]:bg-amber-950 dark:data-[rich-colors=true]:data-[type=warning]:text-amber-300 dark:data-[rich-colors=true]:data-[type=info]:border-blue-700 dark:data-[rich-colors=true]:data-[type=info]:bg-blue-950 dark:data-[rich-colors=true]:data-[type=info]:text-blue-300")
      }
    >
      {() => {
        const paths = ICON_PATHS[data().type];
        if (paths === undefined) return [];
        return [
          <span
            data-slot="sonner-icon"
            data-type={data().type}
            class={
              cn("inline-flex shrink-0 items-center [&>svg]:size-4 data-[type=success]:text-green-600 data-[type=error]:text-red-600 data-[type=warning]:text-amber-500 data-[type=info]:text-blue-500 dark:data-[type=success]:text-green-500 dark:data-[type=error]:text-red-500 dark:data-[type=warning]:text-amber-400 dark:data-[type=info]:text-blue-400 data-[type=loading]:[&>svg]:animate-spin")
            }
          >
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
              class="size-4"
            >
              {paths}
            </svg>
          </span>,
        ];
      }}
      <div
        data-slot="sonner-content"
        class={
          cn("flex min-w-0 flex-1 flex-col gap-0.5")
        }
      >
        <div
          data-slot="sonner-title"
          class={
            cn("font-medium leading-5")
          }
        >
          {() => data().message}
        </div>
        {() =>
          data().description === undefined
            ? []
            : [
                <div
                  data-slot="sonner-description"
                  class={
                    cn("opacity-90")
                  }
                >
                  {data().description}
                </div>,
              ]
        }
      </div>
      {() => {
        const action = data().action;
        if (action === undefined) return [];
        return [
          <button
            type="button"
            data-slot="sonner-action"
            class={
              cn("inline-flex h-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-current/30 bg-transparent px-3 text-xs font-medium text-inherit transition-colors hover:bg-current/10")
            }
            on:click={() => {
              action.onclick();
              toast.dismiss(data().id);
            }}
          >
            {action.label}
          </button>,
        ];
      }}
      <button
        type="button"
        data-slot="sonner-close"
        class={
          cn("absolute top-2 right-2 inline-flex shrink-0 cursor-pointer items-center rounded-[calc(var(--radius)*0.5)] border-none bg-transparent p-1 opacity-0 text-inherit transition-opacity focus-visible:opacity-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&>svg]:size-4")
        }
        on:click={() => toast.dismiss(data().id)}
      >
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
          class="size-4"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
        <span class="sr-only">Close</span>
      </button>
    </ToastItem>
  );
}

/**
 * Portals the styled toast stack into document.body over the shared headless
 * queue: mount one Toaster per app, then call `toast()` from anywhere that
 * imports this file (the re-export binds the same singleton).
 */
export function Toaster({
  position = "bottom-right",
  richColors,
  class: cls,
  ...attrs
}: ToasterProps): JSX.Element {
  return (
    <HeadlessToaster
      position={position}
      richColors={richColors}
      data-slot="sonner-toaster"
      data-sonner-toaster="true"
      class={
        cn("pointer-events-none fixed inset-0 z-[100] flex list-none flex-col gap-3 p-4 group/toaster", toasterPositions[position], cls)
      }
      {...attrs}
    >
      {(record: ToastRecord) => <ToastCard record={record} richColors={richColors === true} />}
    </HeadlessToaster>
  );
}

export { toast };
