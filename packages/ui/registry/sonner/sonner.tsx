import { toast, Toaster as HeadlessToaster, ToastItem } from "@hellajs/headless";
import type { HellaChild } from "@hellajs/dom";
import type { ToastApi, ToastRecord, ToastVariant } from "@hellajs/headless";
import type { ToasterProps } from "./sonner-types.js";

export type { ToastApi };

// @hella:styles
declare const actionButton: string;
declare const base: string;
declare const close: string;
declare const content: string;
declare const description: string;
declare const icon: string;
declare const item: string;
declare const title: string;
declare const toasterPositions: Record<string, string>;
// @hella:end

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
        // @hella:compose
        [item]
        // @hella:end
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
              // @hella:compose
              [icon]
              // @hella:end
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
          // @hella:compose
          [content]
          // @hella:end
        }
      >
        <div
          data-slot="sonner-title"
          class={
            // @hella:compose
            [title]
            // @hella:end
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
                    // @hella:compose
                    [description]
                    // @hella:end
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
              // @hella:compose
              [actionButton]
              // @hella:end
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
          // @hella:compose
          [close]
          // @hella:end
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
        // @hella:compose
        [base, toasterPositions[position], cls]
        // @hella:end
      }
      {...attrs}
    >
      {(record: ToastRecord) => <ToastCard record={record} richColors={richColors === true} />}
    </HeadlessToaster>
  );
}

export { toast };
