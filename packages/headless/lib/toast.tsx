import { isFunction, signal } from "@hellajs/core";
import { ForEach, Portal, $ref } from "@hellajs/dom";
import { onDrag } from "./utils/onDrag";
import type {
  PromiseMessages,
  ToastApi,
  ToastData,
  ToastHandle,
  ToastItemProps,
  ToastOptions,
  ToastRecord,
  ToastTimer,
  ToastVariant,
  ToasterProps,
} from "./types/components";

/** Cap on simultaneously visible toasts; overflow retires the oldest immediately. */
const VISIBLE_CAP = 3;

/** Milliseconds a removed toast stays mounted for the exit collapse before the queue splices it. */
const EXIT_MS = 200;

/** Auto-dismiss budget when a toast call passes no duration. */
const DEFAULT_DURATION = 4000;

/** Release fraction of the toast's width past which a horizontal swipe dismisses. */
const SWIPE_DISMISS_RATIO = 0.45;

// Module-level singleton: enqueue must reach the stack without threading state
// through the tree, so one module owns one queue per app.
const toasts = signal<ToastRecord[]>([]);
let nextId = 0;

/** Live countdown per toast: the timeout handle plus the remaining budget when hover has paused it. */
const timers = new Map<number, ToastTimer>();

/** Clears one record's armed timeout and drops its countdown entry. */
function clearToastTimer(id: number): void {
  const timer = timers.get(id);
  if (timer?.timeout !== undefined) clearTimeout(timer.timeout);
  timers.delete(id);
}

/**
 * Retires one toast: clears its countdown, flips the record's `removed` flag
 * (the li renders `data-removed` for the exit collapse), and splices the queue
 * after the exit budget. A double retire is a no-op.
 */
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
  timers.set(record.id, {
    timeout: setTimeout(() => {
      clearToastTimer(record.id);
      markRemoved(record.id);
    }, duration),
    remaining: duration,
    startedAt: Date.now(),
  });
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
  timer.timeout = setTimeout(
    () => {
      clearToastTimer(id);
      markRemoved(id);
    },
    Math.max(0, timer.remaining),
  );
}

/** Retires every toast beyond the visible cap, oldest first. */
function enforceCap(): void {
  const visible = toasts().filter((entry) => !entry.data().removed);
  let i = VISIBLE_CAP;
  const len = visible.length;
  while (i < len) {
    markRemoved(visible[i]!.id);
    i++;
  }
}

/**
 * Creates one queue record (fresh id, per-toast data signal), wires its
 * live-element behavior, prepends it (newest first), enforces the visible
 * cap, and returns the `{ id, dismiss() }` handle.
 */
function pushToast(init: {
  message: string;
  description?: string;
  type: ToastVariant;
  action?: ToastOptions["action"];
  duration: number;
}): ToastHandle {
  const id = ++nextId;
  const record: ToastRecord = { id, data: signal<ToastData>({ id, removed: false, ...init }) };
  wireToast(record);
  toasts([record, ...toasts()]);
  enforceCap();
  return { id, dismiss: () => markRemoved(id) };
}

/**
 * The toast queue: call it anywhere to enqueue a card onto the shared stack.
 * Returns a `{ id, dismiss() }` handle; `toast.promise` and `toast.dismiss`
 * hang off the same callable.
 *
 * ```tsx
 * import { toast, Toaster } from "@hellajs/headless";
 *
 * toast("Saved", { description: "Your work is safe", type: "success" });
 * toast.promise(save(), { loading: "Saving", success: "Saved", error: "Failed" });
 * toast.dismiss();
 * ```
 */
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
  const settle = (message: string, type: ToastVariant): void => {
    const record = toasts().find((entry) => entry.id === handle.id);
    if (record === undefined || record.data().removed) return;
    record.data({
      ...record.data(),
      message,
      type,
      duration: messages.duration ?? DEFAULT_DURATION,
    });
    armToastTimer(record);
  };
  promise.then(
    (data) =>
      settle(
        // isFunction's predicate narrows by assignability, and the generic `data: T`
        // param blocks the exclusion both ways — cast each arm to its real signature.
        isFunction(messages.success)
          ? (messages.success as (data: T) => string)(data)
          : (messages.success as string),
        "success",
      ),
    (error: unknown) =>
      settle(
        isFunction(messages.error)
          ? (messages.error as (error: unknown) => string)(error)
          : (messages.error as string),
        "error",
      ),
  );
  return handle;
};

toast.dismiss = (id?: number): void => {
  if (id === undefined) {
    const live = [...toasts()];
    let i = 0;
    const len = live.length;
    while (i < len) {
      markRemoved(live[i]!.id);
      i++;
    }
    return;
  }
  markRemoved(id);
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
  $ref(`[data-toast-id="${record.id}"]`).hooks({
    afterMount: (element) => {
      // The li is an HTML element: direct property access is sound, and the
      // old instanceof guard's return arm was uncoverable.
      const node = element as HTMLElement;
      node.style.setProperty("--toast-height", `${node.offsetHeight}px`);
      armToastTimer(record);
      node.addEventListener("pointerenter", () => pauseToastTimer(record.id));
      node.addEventListener("pointerleave", () => resumeToastTimer(record.id));
      teardown.push(
        onDrag(node, {
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
        }),
      );
    },
    beforeDestroy: () => {
      clearToastTimer(record.id);
      while (teardown.length) teardown.pop()!();
    },
  });
}

/**
 * One queue entry as a stacked card: the behavior-bearing `li` the wiring
 * targets. All visual state rides on attributes — `data-depth` carries the
 * stack transform, `data-removed` the exit collapse, `data-dragging` the
 * swipe's transition suspension — so the pointer drag can own
 * `style.transform` directly without a reactive style writer clobbering it.
 * Children replace the default semantic content (message, description,
 * action, close); styling stays in the wrapper.
 *
 * ```tsx
 * <ToastItem record={record} class={cardClass}>
 *   <span>{record.data().message}</span>
 * </ToastItem>
 * ```
 */
export function ToastItem({
  record,
  richColors,
  children,
  class: cls,
  ...attrs
}: ToastItemProps): JSX.Element {
  const data = record.data;
  const depth = (): number =>
    toasts()
      .filter((entry) => !entry.data().removed)
      .findIndex((entry) => entry.id === record.id);
  return (
    <li
      data-slot="toast"
      data-type={data().type}
      data-toast-id={String(record.id)}
      data-depth={depth() >= 0 ? String(depth()) : undefined}
      data-removed={data().removed ? "true" : undefined}
      data-rich-colors={richColors === true ? "true" : undefined}
      class={cls}
      {...attrs}
    >
      {children ?? (
        <>
          <div data-slot="toast-title">{() => data().message}</div>
          {() =>
            data().description === undefined
              ? []
              : [<div data-slot="toast-description">{data().description}</div>]
          }
          {() => {
            const action = data().action;
            if (action === undefined) return [];
            return [
              <button
                type="button"
                data-slot="toast-action"
                on:click={() => {
                  action.onclick();
                  markRemoved(data().id);
                }}
              >
                {action.label}
              </button>,
            ];
          }}
          <button
            type="button"
            data-slot="toast-close"
            aria-label="Close"
            on:click={() => markRemoved(data().id)}
          >
            ×
          </button>
        </>
      )}
    </li>
  );
}

/**
 * Portals the toast stack into document.body and renders the module queue.
 * The queue is the module singleton: mount one Toaster per app and call
 * `toast()` from anywhere that imports the module. Children replace the
 * default card: the render function receives the queue record, and a
 * `ToastItem` composition keeps the behavior wiring on the li.
 *
 * ```tsx
 * <Toaster position="bottom-right">
 *   {(record) => <ToastCard record={record} class={cardClass} />}
 * </Toaster>
 * ```
 */
export function Toaster({
  position = "bottom-right",
  richColors,
  children,
  class: cls,
  ...attrs
}: ToasterProps): JSX.Element {
  // Babel compiles a JSX component child to a one-element array; a direct
  // component call passes the render function bare. Normalize to the function.
  const renderCard = isFunction(children)
    ? children
    : Array.isArray(children)
      ? (children[0] as ToasterProps["children"] | undefined)
      : undefined;
  return (
    <Portal to="body">
      <ol data-slot="toaster" data-position={position} aria-live="polite" class={cls} {...attrs}>
        <ForEach
          each={toasts}
          use={(record: ToastRecord) =>
            renderCard ? (
              renderCard(record)
            ) : (
              <ToastItem record={record} richColors={richColors === true} />
            )
          }
        />
      </ol>
    </Portal>
  );
}

/**
 * Clears the shared queue, every live countdown, and the id counter (test
 * and introspection; called by `resetHeadless`). A pending exit splice
 * filters an already-empty queue, so no timer bookkeeping survives.
 * @internal
 */
export function resetToastState(): void {
  const live = [...toasts()];
  let i = 0;
  const len = live.length;
  while (i < len) {
    clearToastTimer(live[i]!.id);
    i++;
  }
  toasts([]);
  nextId = 0;
}
