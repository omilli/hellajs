import { effect, signal } from "@hellajs/core";
import type { Signal } from "@hellajs/core";

/**
 * The exit machine's consumer surface: the render gate, the `data-state`
 * accessor, and the immediate-unmount trigger.
 * @internal
 */
export interface ExitMachine {
  /** The render gate: true keeps the subtree mounted, including the closed-flip hold while the exit animation runs. */
  visible: Signal<boolean>;
  /** The `data-state` accessor: `"open"` while the open getter reads true, `"closed"` otherwise. */
  state: () => "open" | "closed";
  /** Unmounts now: clears any armed fallback, then flips `visible` false. Called by the fallback timer and by the consumer's `animationend` exit handler. */
  finishExit: () => void;
}

/**
 * The visible/exit machine shared by the overlay factories. `visible` alone
 * gates the render so an open→closed flip never unmounts before the exit
 * starts (reading the open getter in the template would flash the subtree away
 * one evaluation early). Flip to open renders immediately — a mid-exit reopen
 * clears the pending fallback and keeps the mounted subtree; flip to closed
 * holds the subtree under `data-state="closed"` until the consumer's
 * `animationend` handler calls `finishExit`, or the fallback budget unmounts
 * it. The open-watcher effect registers here and disposes with the enclosing
 * component scope — call in component scope.
 * @internal
 * @param isOpen The open-state getter the watcher tracks.
 * @param fallbackMs Milliseconds before an exit no `animationend` resolved unmounts the held subtree. Default 250.
 * @returns The `visible` gate, the `state` accessor, and `finishExit`.
 */
export function createExitMachine(isOpen: () => boolean, fallbackMs = 250): ExitMachine {
  const visible = signal(false);
  let wasOpen = false;
  let fallback: ReturnType<typeof setTimeout> | undefined;

  const finishExit = (): void => {
    if (fallback !== undefined) {
      clearTimeout(fallback);
      fallback = undefined;
    }
    visible(false);
  };

  effect(() => {
    if (isOpen()) {
      wasOpen = true;
      if (fallback !== undefined) {
        clearTimeout(fallback);
        fallback = undefined;
      }
      visible(true);
    } else if (wasOpen) {
      wasOpen = false;
      visible(true);
      fallback = setTimeout(finishExit, fallbackMs);
    }
  });

  return {
    visible,
    state: (): "open" | "closed" => (isOpen() ? "open" : "closed"),
    finishExit,
  };
}
