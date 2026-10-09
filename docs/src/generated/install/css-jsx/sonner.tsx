import { signal } from "@hellajs/core";
import type { Signal } from "@hellajs/core";
import { $ref, ForEach, onDrag, Portal } from "@hellajs/dom";
import type { HTMLAttributes, HellaChild } from "@hellajs/dom";

import { css, keyframes, style } from "@hellajs/css";

const enter = keyframes({
  from: { opacity: "0", transform: "translateY(var(--enter-offset, 100%))" },
});
const spin = keyframes({
  to: { transform: "rotate(360deg)" },
});

const base = style("sonner-base", {
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
  inset: "0",
  listStyle: "none",
  margin: "0",
  padding: "1rem",
  pointerEvents: "none",
  position: "fixed",
  zIndex: "100",
});

const toasterPositions = {
  "top-left": style("sonner-toaster-top-left", {
    alignItems: "flex-start",
    flexDirection: "column",
    justifyContent: "flex-start",
    "--enter-offset": "-100%",
    "--stack-offset": "1.5rem",
    "--stack-origin": "top",
  }),
  "top-center": style("sonner-toaster-top-center", {
    alignItems: "center",
    flexDirection: "column",
    justifyContent: "flex-start",
    "--enter-offset": "-100%",
    "--stack-offset": "1.5rem",
    "--stack-origin": "top",
  }),
  "top-right": style("sonner-toaster-top-right", {
    alignItems: "flex-end",
    flexDirection: "column",
    justifyContent: "flex-start",
    "--enter-offset": "-100%",
    "--stack-offset": "1.5rem",
    "--stack-origin": "top",
  }),
  "bottom-left": style("sonner-toaster-bottom-left", {
    alignItems: "flex-start",
    flexDirection: "column-reverse",
    justifyContent: "flex-start",
    "--enter-offset": "100%",
    "--stack-offset": "-1.5rem",
    "--stack-origin": "bottom",
  }),
  "bottom-center": style("sonner-toaster-bottom-center", {
    alignItems: "center",
    flexDirection: "column-reverse",
    justifyContent: "flex-start",
    "--enter-offset": "100%",
    "--stack-offset": "-1.5rem",
    "--stack-origin": "bottom",
  }),
  "bottom-right": style("sonner-toaster-bottom-right", {
    alignItems: "flex-end",
    flexDirection: "column-reverse",
    justifyContent: "flex-start",
    "--enter-offset": "100%",
    "--stack-offset": "-1.5rem",
    "--stack-origin": "bottom",
  }),
};

const item = style("sonner-item", {
  alignItems: "center",
  animation: `${enter} 400ms ease-out`,
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "calc(var(--radius) * 0.8)",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  color: "var(--popover-foreground)",
  display: "flex",
  fontSize: "0.875rem",
  gap: "0.5rem",
  maxHeight: "var(--toast-height, 16rem)",
  maxWidth: "calc(100vw - 2rem)",
  padding: "1rem",
  pointerEvents: "auto",
  position: "relative",
  transformOrigin: "var(--stack-origin, bottom)",
  transition: "opacity 200ms ease-out, transform 200ms ease-out, max-height 200ms ease-out, padding 200ms ease-out",
  width: "356px",
  zIndex: "4",
  "&[data-depth='1']": {
    transform: "translateY(calc(var(--stack-offset) * 1)) scale(0.95)",
    zIndex: "3",
  },
  "&[data-depth='2']": {
    transform: "translateY(calc(var(--stack-offset) * 2)) scale(0.9)",
    zIndex: "2",
  },
  "&[data-depth='3']": {
    transform: "translateY(calc(var(--stack-offset) * 3)) scale(0.85)",
    zIndex: "1",
  },
  "&[data-dragging='true']": {
    transitionProperty: "none",
  },
  "&[data-removed='true']": {
    maxHeight: "0",
    opacity: "0",
    overflow: "hidden",
    paddingBottom: "0",
    paddingTop: "0",
    pointerEvents: "none",
  },
  "&[data-rich-colors='true'][data-type='success']": {
    backgroundColor: "#f0fdf4",
    borderColor: "#16a34a",
    color: "#166534",
  },
  "&[data-rich-colors='true'][data-type='error']": {
    backgroundColor: "#fef2f2",
    borderColor: "#dc2626",
    color: "#991b1b",
  },
  "&[data-rich-colors='true'][data-type='warning']": {
    backgroundColor: "#fffbeb",
    borderColor: "#d97706",
    color: "#92400e",
  },
  "&[data-rich-colors='true'][data-type='info']": {
    backgroundColor: "#eff6ff",
    borderColor: "#2563eb",
    color: "#1e40af",
  },
  "&:is(.dark *)[data-rich-colors='true'][data-type='success']": {
    backgroundColor: "#052e16",
    borderColor: "#15803d",
    color: "#86efac",
  },
  "&:is(.dark *)[data-rich-colors='true'][data-type='error']": {
    backgroundColor: "#450a0a",
    borderColor: "#b91c1c",
    color: "#fca5a5",
  },
  "&:is(.dark *)[data-rich-colors='true'][data-type='warning']": {
    backgroundColor: "#451a03",
    borderColor: "#b45309",
    color: "#fcd34d",
  },
  "&:is(.dark *)[data-rich-colors='true'][data-type='info']": {
    backgroundColor: "#172554",
    borderColor: "#1d4ed8",
    color: "#93c5fd",
  },
});

const content = style("sonner-content", {
  display: "flex",
  flex: "1",
  flexDirection: "column",
  gap: "0.125rem",
  minWidth: "0",
});

const title = style("sonner-title", {
  fontWeight: "500",
  lineHeight: "1.25rem",
});

const description = style("sonner-description", {
  opacity: "0.9",
});

const icon = style("sonner-icon", {
  alignItems: "center",
  display: "inline-flex",
  flexShrink: "0",
  "& svg": {
    flexShrink: "0",
    height: "1rem",
    width: "1rem",
  },
  "&[data-type='success']": { color: "#16a34a" },
  "&[data-type='error']": { color: "#dc2626" },
  "&[data-type='warning']": { color: "#f59e0b" },
  "&[data-type='info']": { color: "#3b82f6" },
  "&:is(.dark *)[data-type='success']": { color: "#22c55e" },
  "&:is(.dark *)[data-type='error']": { color: "#ef4444" },
  "&:is(.dark *)[data-type='warning']": { color: "#fbbf24" },
  "&:is(.dark *)[data-type='info']": { color: "#60a5fa" },
  "&[data-type='loading'] svg": {
    animation: `${spin} 1s linear infinite`,
  },
});

const actionButton = style("sonner-action", {
  alignItems: "center",
  background: "transparent",
  border: "1px solid color-mix(in oklab, currentColor 30%, transparent)",
  borderRadius: "calc(var(--radius) * 0.8)",
  color: "inherit",
  cursor: "pointer",
  display: "inline-flex",
  flexShrink: "0",
  fontSize: "0.75rem",
  fontWeight: "500",
  height: "2rem",
  justifyContent: "center",
  padding: "0 0.75rem",
  transition: "background-color 150ms ease-out",
  "&:hover": {
    background: "color-mix(in oklab, currentColor 12%, transparent)",
  },
});

const close = style("sonner-close", {
  alignItems: "center",
  background: "transparent",
  border: "none",
  borderRadius: "calc(var(--radius) * 0.5)",
  color: "inherit",
  cursor: "pointer",
  display: "inline-flex",
  flexShrink: "0",
  opacity: "0",
  padding: "0.25rem",
  position: "absolute",
  right: "0.5rem",
  top: "0.5rem",
  transition: "opacity 150ms ease-out",
  "& svg": {
    flexShrink: "0",
    height: "1rem",
    width: "1rem",
  },
  "& span": {
    clip: "rect(0, 0, 0, 0)",
    borderWidth: "0",
    height: "1px",
    margin: "-1px",
    overflow: "hidden",
    padding: "0",
    position: "absolute",
    whiteSpace: "nowrap",
    width: "1px",
  },
  "&:focus-visible": {
    boxShadow: "0 0 0 2px var(--background), 0 0 0 4px var(--ring)",
    opacity: "1",
    outlineStyle: "none",
  },
});

css({
  "[data-slot='sonner-toast']:hover [data-slot='sonner-close']": {
    opacity: "1",
  },
});

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

// Module-level singleton: the file lands verbatim in user projects, so one
// copy/paste module carries one queue per app. The instance nonce scopes the
// per-toast $ref selectors to this copy when several compiled flavors of the
// same source coexist (a page running css- and tailwind-flavored copies).
// Nonce prefixing this copy's toast ids and $ref selectors (module-scoped).
const INSTANCE = "t1";

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
  success: [<circle cx="12" cy="12" r="10" />, <path d="m9 12 2 2 4-4" />],
  error: [<path d="m15 9-6 6" />, <path d="M2.586 16.726A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2h6.624a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586z" />, <path d="m9 9 6 6" />],
  warning: [<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />, <path d="M12 9v4" />, <path d="M12 17h.01" />],
  info: [<circle cx="12" cy="12" r="10" />, <path d="M12 16v-4" />, <path d="M12 8h.01" />],
  loading: [<path d="M21 12a9 9 0 1 1-6.219-8.56" />],
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
  $ref(`[data-toast-id="${INSTANCE}-${record.id}"]`).hooks({
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
function ToastItem(props: ToastItemProps): JSX.Element {
  const data = props.record.data;
  const depth = (): number => toasts().filter((entry) => !entry.data().removed).findIndex((entry) => entry.id === props.record.id);
  return (
    <li
      data-slot="sonner-toast"
      data-sonner-toast="true"
      data-type={data().type}
      data-toast-id={`${INSTANCE}-${props.record.id}`}
      data-depth={depth() >= 0 ? String(depth()) : undefined}
      data-removed={data().removed ? "true" : undefined}
      data-rich-colors={props.richColors === true ? "true" : undefined}
      class={
        [item]
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
              [icon]
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
          [content]
        }
      >
        <div
          data-slot="sonner-title"
          class={
            [title]
          }
        >
          {() => data().message}
        </div>
        {() => data().description === undefined ? [] : [
          <div
            data-slot="sonner-description"
            class={
              [description]
            }
          >{data().description}</div>,
        ]}
      </div>
      {() => {
        const action = data().action;
        if (action === undefined) return [];
        return [
          <button
            type="button"
            data-slot="sonner-action"
            class={
              [actionButton]
            }
            on:click={() => {
              action.onclick();
              markRemoved(data().id);
            }}
          >{action.label}</button>,
        ];
      }}
      <button
        type="button"
        data-slot="sonner-close"
        class={
          [close]
        }
        on:click={() => markRemoved(data().id)}
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
  );
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
export default function Toaster({ position = "bottom-right", richColors, class: cls, ...attrs }: ToasterProps): JSX.Element {
  return (
    <Portal to="body">
      <ol
        data-slot="sonner-toaster"
        data-sonner-toaster="true"
        data-position={position}
        aria-live="polite"
        class={
          [base, toasterPositions[position], cls]
        }
        {...attrs}
      >
        <ForEach each={toasts} use={(record: ToastRecord) => <ToastItem record={record} richColors={richColors === true} />} />
      </ol>
    </Portal>
  );
}
