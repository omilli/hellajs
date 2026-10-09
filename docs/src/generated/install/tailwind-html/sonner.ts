import { signal } from "@hellajs/core";
import type { Signal } from "@hellajs/core";
import { $ref, ForEach, html, onDrag, Portal } from "@hellajs/dom";
import type { HTMLAttributes, HellaChild, HellaNode } from "@hellajs/dom";
import { cn } from "./cn.js";

const toasterPositions = {
  "top-left": "flex-col justify-start items-start [--enter-offset:-100%] [--stack-offset:1.5rem] [--stack-origin:top]",
  "top-center": "flex-col justify-start items-center [--enter-offset:-100%] [--stack-offset:1.5rem] [--stack-origin:top]",
  "top-right": "flex-col justify-start items-end [--enter-offset:-100%] [--stack-offset:1.5rem] [--stack-origin:top]",
  "bottom-left": "flex-col-reverse justify-start items-start [--enter-offset:100%] [--stack-offset:-1.5rem] [--stack-origin:bottom]",
  "bottom-center": "flex-col-reverse justify-start items-center [--enter-offset:100%] [--stack-offset:-1.5rem] [--stack-origin:bottom]",
  "bottom-right": "flex-col-reverse justify-start items-end [--enter-offset:100%] [--stack-offset:-1.5rem] [--stack-origin:bottom]",
};

/** Semantic toast flavor; a toast without one renders `data-type="default"` with no icon. */
type ToastType = "success" | "error" | "warning" | "info";

/** Everything the toast li renders, including the promise-loading flavor. */
type ToastVariant = ToastType | "loading" | "default";

/** Edge the toast stack pins to. */
type ToasterPosition = "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";

/** Per-toast options: secondary line, a tinted icon flavor, an action button, and the auto-dismiss budget. */
interface ToastOptions {
  description?: string;
  type?: ToastType;
  action?: { label: string; onclick: () => void };
  /** Milliseconds before auto-dismiss; defaults to 4000. Hover pauses the countdown; `Infinity` sticks. */
  duration?: number;
}

/** Queue handle returned by every toast call. */
interface ToastHandle {
  id: number;
  dismiss(): void;
}

/** One toast's rendered state; `removed` starts the exit collapse. */
interface ToastData {
  id: number;
  message: string;
  description?: string;
  type: ToastVariant;
  action?: { label: string; onclick: () => void };
  duration: number;
  removed: boolean;
}

/** Queue entry: stable identity for keyed reconciliation plus a signal so in-place updates re-render the li. */
interface ToastRecord {
  id: number;
  data: Signal<ToastData>;
}

/** Cap on simultaneously visible toasts; overflow retires the oldest immediately. */
const VISIBLE_CAP = 3;

/** Milliseconds a removed toast stays mounted for the exit fade before the queue splices it. */
const EXIT_MS = 200;

/** Auto-dismiss budget when a toast call passes no duration. */
const DEFAULT_DURATION = 4000;

/** Release fraction of the toast's width past which a horizontal swipe dismisses. */
const SWIPE_DISMISS_RATIO = 0.45;

const toasts = signal<ToastRecord[]>([]);
let nextId = 0;

/** Live countdown per toast: the timeout handle plus the remaining budget when hover has paused it. */
interface ToastTimer {
  timeout?: ReturnType<typeof setTimeout>;
  remaining: number;
  startedAt: number;
}

const timers = new Map<number, ToastTimer>();

function clearToastTimer(id: number): void {
  const timer = timers.get(id);
  if (timer?.timeout !== undefined) clearTimeout(timer.timeout);
  timers.delete(id);
}

function markRemoved(id: number): void {
  const record = toasts().find((entry) => entry.id === id);
  if (record === undefined || record.data().removed) return;
  clearToastTimer(id);
  record.data({ ...record.data(), removed: true });
  setTimeout(() => {
    toasts(toasts().filter((entry) => entry.id !== id));
  }, EXIT_MS);
}

/** Arms a fresh full-budget countdown; `Infinity` durations stick and never arm. */
function armToastTimer(record: ToastRecord): void {
  clearToastTimer(record.id);
  const duration = record.data().duration;
  if (duration === Infinity || record.data().removed) return;
  timers.set(record.id, { timeout: setTimeout(() => { clearToastTimer(record.id); markRemoved(record.id); }, duration), remaining: duration, startedAt: Date.now() });
}

/** Freezes the live countdown, folding elapsed time into the remaining budget. */
function pauseToastTimer(id: number): void {
  const timer = timers.get(id);
  if (timer === undefined || timer.timeout === undefined) return;
  clearTimeout(timer.timeout);
  timer.timeout = undefined;
  timer.remaining -= Date.now() - timer.startedAt;
}

/** Restarts the countdown from the paused remainder; an exhausted budget fires immediately. */
function resumeToastTimer(id: number): void {
  const timer = timers.get(id);
  if (timer === undefined || timer.timeout !== undefined) return;
  timer.startedAt = Date.now();
  timer.timeout = setTimeout(() => { clearToastTimer(id); markRemoved(id); }, Math.max(0, timer.remaining));
}

/** Retires every toast beyond the visible cap, oldest first. */
function enforceCap(): void {
  const visible = toasts().filter((entry) => !entry.data().removed);
  for (let i = VISIBLE_CAP; i < visible.length; i++) markRemoved(visible[i]!.id);
}

function pushToast(init: { message: string; description?: string; type: ToastVariant; action?: ToastOptions["action"]; duration: number }): ToastHandle {
  const id = ++nextId;
  const record: ToastRecord = { id, data: signal<ToastData>({ id, removed: false, ...init }) };
  wireToast(record);
  toasts([record, ...toasts()]);
  enforceCap();
  return { id, dismiss: () => markRemoved(id) };
}

/** Per-phase messages for `toast.promise`; either phase accepts a plain string or a function of the settled value. */
interface PromiseMessages<T> {
  loading: string;
  success: string | ((data: T) => string);
  error: string | ((error: unknown) => string);
  duration?: number;
}

/** Toast queue API: `toast(message, options)`, `toast.promise(...)`, and `toast.dismiss(...)`. */
export interface ToastApi {
  (message: string, options?: ToastOptions): ToastHandle;
  /** Sticky loading toast that swaps to the success (or error) flavor and message when the promise settles. */
  promise<T>(promise: Promise<T>, messages: PromiseMessages<T>): ToastHandle;
  /** Retires one toast by id, or every toast when called without one. */
  dismiss(id?: number): void;
}

export const toast: ToastApi = (message: string, options?: ToastOptions): ToastHandle => {
  return pushToast({
    message,
    description: options?.description,
    type: options?.type ?? "default",
    action: options?.action,
    duration: options?.duration ?? DEFAULT_DURATION,
  });
};

toast.promise = <T,>(promise: Promise<T>, messages: PromiseMessages<T>): ToastHandle => {
  const handle = pushToast({ message: messages.loading, type: "loading", duration: Infinity });
  const settle = (message: string, type: ToastType): void => {
    const record = toasts().find((entry) => entry.id === handle.id);
    if (record === undefined || record.data().removed) return;
    record.data({ ...record.data(), message, type, duration: messages.duration ?? DEFAULT_DURATION });
    armToastTimer(record);
  };
  promise.then(
    (data) => settle(typeof messages.success === "function" ? messages.success(data) : messages.success, "success"),
    (error: unknown) => settle(typeof messages.error === "function" ? messages.error(error) : messages.error, "error"),
  );
  return handle;
};

toast.dismiss = (id?: number): void => {
  if (id === undefined) {
    for (const record of [...toasts()]) markRemoved(record.id);
    return;
  }
  markRemoved(id);
};

/** Lucide path data from refs/icons, keyed by flavor; the loader spins through its `data-type` rule. */
const ICON_PATHS: Partial<Record<ToastVariant, HellaChild[]>> = {
  success: [html`<circle cx="12" cy="12" r="10" />` as HellaChild, html`<path d="m9 12 2 2 4-4" />` as HellaChild],
  error: [html`<path d="m15 9-6 6" />` as HellaChild, html`<path d="M2.586 16.726A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2h6.624a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586z" />` as HellaChild, html`<path d="m9 9 6 6" />` as HellaChild],
  warning: [html`<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />` as HellaChild, html`<path d="M12 9v4" />` as HellaChild, html`<path d="M12 17h.01" />` as HellaChild],
  info: [html`<circle cx="12" cy="12" r="10" />` as HellaChild, html`<path d="M12 16v-4" />` as HellaChild, html`<path d="M12 8h.01" />` as HellaChild],
  loading: [html`<path d="M21 12a9 9 0 1 1-6.219-8.56" />` as HellaChild],
};
/**
 * Wires one record's live-element behavior exactly once, at enqueue time:
 * the toast li slots into the portaled ol after that ol's one-and-only mount
 * walk, and only mount/hydrate roots and Portal insertions deliver hooks —
 * so the wiring rides a $ref, which queues its ops until the li appears,
 * registers them on the element, and drives the mount queue itself.
 */
function wireToast(record: ToastRecord): void {
  let dragging = false;
  let dragOffset = 0;
  let toastWidth = 0;
  const teardown: (() => void)[] = [];
  $ref(`[data-toast-id="${"t1"}-${record.id}"]`).hooks({
    afterMount: (element) => {
      // The li is an HTML element: direct property access is sound, and the
      // old instanceof guard's return arm was uncoverable.
      const node = element as HTMLElement;
      node.style.setProperty("--toast-height", `${node.offsetHeight}px`);
      armToastTimer(record);
      node.addEventListener("pointerenter", () => pauseToastTimer(record.id));
      node.addEventListener("pointerleave", () => resumeToastTimer(record.id));
      teardown.push(onDrag(node, {
        onStart: (event) => {
          if (record.data().removed) return;
          const hit = event.target as HTMLElement | null;
          if (hit?.closest?.("button, a, input, textarea, select, [data-no-drag]")) return;
          dragging = true;
          pauseToastTimer(record.id);
          toastWidth = node.getBoundingClientRect().width;
          node.setAttribute("data-dragging", "true");
        },
        onMove: (delta) => {
          if (!dragging) return;
          dragOffset = delta.dx;
          node.style.transform = `translateX(${dragOffset}px)`;
        },
        onEnd: () => {
          if (!dragging) return;
          dragging = false;
          node.removeAttribute("data-dragging");
          resumeToastTimer(record.id);
          if (toastWidth > 0 && Math.abs(dragOffset) >= toastWidth * SWIPE_DISMISS_RATIO) {
            markRemoved(record.id);
          } else {
            // Spring back: data-dragging is gone, so the restored transition
            // animates the cleared transform back to the depth rule's look.
            node.style.transform = "";
          }
          dragOffset = 0;
        },
      }));
    },
    beforeDestroy: () => {
      clearToastTimer(record.id);
      while (teardown.length) teardown.pop()!();
    },
  });
}

interface ToastItemProps {
  record: ToastRecord;
  richColors?: boolean;
}

/**
 * One queue entry as a stacked card. All visual state rides on attributes —
 * `data-depth` carries the stack transform, `data-removed` the exit collapse,
 * `data-dragging` the swipe's transition suspension — so the pointer drag can
 * own `style.transform` directly without a reactive style writer clobbering it.
 */
function ToastItem(props: ToastItemProps): HellaNode {
  const data = props.record.data;
  const depth = (): number => toasts().filter((entry) => !entry.data().removed).findIndex((entry) => entry.id === props.record.id);
  // Precomputed for the template: the runtime parser only substitutes pure
  // slot attribute values, never text-and-slot mixtures.
  const toastId = `${"t1"}-${props.record.id}`;
  return html`
    <li
      data-slot="sonner-toast"
      data-sonner-toast="true"
      data-type="${() => data().type}"
      data-toast-id="${toastId}"
      data-depth="${() => { const d = depth(); return d >= 0 ? String(d) : undefined; }}"
      data-removed="${() => data().removed ? "true" : undefined}"
      data-rich-colors="${props.richColors === true ? "true" : undefined}"
      class="${
        cn("pointer-events-auto relative z-40 flex w-[356px] max-w-[calc(100vw-2rem)] items-center gap-2 rounded-md border bg-popover p-4 text-sm text-popover-foreground shadow-md transition-all max-h-(--toast-height,16rem) animate-in fade-in-0 group-data-[position^=top]/toaster:slide-in-from-top-6 group-data-[position^=bottom]/toaster:slide-in-from-bottom-6 [transform-origin:var(--stack-origin,bottom)] data-[depth=1]:z-30 data-[depth=2]:z-20 data-[depth=3]:z-10 data-[depth=1]:[transform:translateY(calc(var(--stack-offset)*1))_scale(0.95)] data-[depth=2]:[transform:translateY(calc(var(--stack-offset)*2))_scale(0.9)] data-[depth=3]:[transform:translateY(calc(var(--stack-offset)*3))_scale(0.85)] data-[dragging=true]:transition-none data-[removed=true]:pointer-events-none data-[removed=true]:opacity-0 data-[removed=true]:max-h-0 data-[removed=true]:overflow-hidden data-[removed=true]:py-0 [&:hover_[data-slot=sonner-close]]:opacity-100 data-[rich-colors=true]:data-[type=success]:border-green-600 data-[rich-colors=true]:data-[type=success]:bg-green-50 data-[rich-colors=true]:data-[type=success]:text-green-800 data-[rich-colors=true]:data-[type=error]:border-red-600 data-[rich-colors=true]:data-[type=error]:bg-red-50 data-[rich-colors=true]:data-[type=error]:text-red-800 data-[rich-colors=true]:data-[type=warning]:border-amber-600 data-[rich-colors=true]:data-[type=warning]:bg-amber-50 data-[rich-colors=true]:data-[type=warning]:text-amber-800 data-[rich-colors=true]:data-[type=info]:border-blue-600 data-[rich-colors=true]:data-[type=info]:bg-blue-50 data-[rich-colors=true]:data-[type=info]:text-blue-800 dark:data-[rich-colors=true]:data-[type=success]:border-green-700 dark:data-[rich-colors=true]:data-[type=success]:bg-green-950 dark:data-[rich-colors=true]:data-[type=success]:text-green-300 dark:data-[rich-colors=true]:data-[type=error]:border-red-700 dark:data-[rich-colors=true]:data-[type=error]:bg-red-950 dark:data-[rich-colors=true]:data-[type=error]:text-red-300 dark:data-[rich-colors=true]:data-[type=warning]:border-amber-700 dark:data-[rich-colors=true]:data-[type=warning]:bg-amber-950 dark:data-[rich-colors=true]:data-[type=warning]:text-amber-300 dark:data-[rich-colors=true]:data-[type=info]:border-blue-700 dark:data-[rich-colors=true]:data-[type=info]:bg-blue-950 dark:data-[rich-colors=true]:data-[type=info]:text-blue-300")
      }"
    >
      ${() => {
        const paths = ICON_PATHS[data().type];
        if (paths === undefined) return [];
        return [html`
          <span
            data-slot="sonner-icon"
            data-type="${data().type}"
            class="${
              cn("inline-flex shrink-0 items-center [&>svg]:size-4 data-[type=success]:text-green-600 data-[type=error]:text-red-600 data-[type=warning]:text-amber-500 data-[type=info]:text-blue-500 dark:data-[type=success]:text-green-500 dark:data-[type=error]:text-red-500 dark:data-[type=warning]:text-amber-400 dark:data-[type=info]:text-blue-400 data-[type=loading]:[&>svg]:animate-spin")
            }"
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
              ${paths}
            </svg>
          </span>
        ` as HellaNode];
      }}
      <div
        data-slot="sonner-content"
        class="${
          cn("flex min-w-0 flex-1 flex-col gap-0.5")
        }"
      >
        <div
          data-slot="sonner-title"
          class="${
            cn("font-medium leading-5")
          }"
        >
          ${() => data().message}
        </div>
        ${() => data().description === undefined ? [] : [html`
          <div
            data-slot="sonner-description"
            class="${
              cn("opacity-90")
            }"
          >${data().description}</div>
        ` as HellaNode]}
      </div>
      ${() => {
        const action = data().action;
        if (action === undefined) return [];
        return [html`
          <button
            type="button"
            data-slot="sonner-action"
            class="${
              cn("inline-flex h-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-current/30 bg-transparent px-3 text-xs font-medium text-inherit transition-colors hover:bg-current/10")
            }"
            e:click="${() => {
              action.onclick();
              markRemoved(data().id);
            }}"
          >${action.label}</button>
        ` as HellaNode];
      }}
      <button
        type="button"
        data-slot="sonner-close"
        class="${
          cn("absolute top-2 right-2 inline-flex shrink-0 cursor-pointer items-center rounded-[calc(var(--radius)*0.5)] border-none bg-transparent p-1 opacity-0 text-inherit transition-opacity focus-visible:opacity-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&>svg]:size-4")
        }"
        e:click="${() => markRemoved(data().id)}"
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
    </li>
  ` as HellaNode;
}

interface ToasterProps extends HTMLAttributes<"ol"> {
  class?: string;
  position?: ToasterPosition;
  /** Tints the whole card per flavor (sonner's richColors); icons are tinted either way. */
  richColors?: boolean;
}

/**
 * Portals the toast stack into document.body and renders the module queue.
 * The queue is the singleton in this file: mount one Toaster per app and call
 * `toast()` from anywhere that imports the same copied module.
 */
export default function Toaster({ position = "bottom-right", richColors, class: cls, ...attrs }: ToasterProps): HellaNode {
  return html`
    ${Portal({
      to: "body",
      children: [
        html`
          <ol
            data-slot="sonner-toaster"
            data-sonner-toaster="true"
            data-position="${position}"
            aria-live="polite"
            class="${
              cn("pointer-events-none fixed inset-0 z-[100] flex list-none flex-col gap-3 p-4 group/toaster", toasterPositions[position], cls)
            }"
            ...${attrs}
          >${ForEach({ each: toasts, use: (record: ToastRecord) => ToastItem({ record, richColors: richColors === true }) as HellaChild })}</ol>
        ` as HellaChild,
      ],
    })}
  ` as HellaNode;
}
