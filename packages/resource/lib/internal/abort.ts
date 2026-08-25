/**
 * Abort/timeout/external-signal wiring shared by the resource fetch pipeline,
 * mutations, and prefetch.
 */

/**
 * @internal
 * Races a request promise against its abort signal: rejects with a DOMException
 * named AbortError (message configurable) when the signal fires or has already fired.
 * The abort listener is removed when it fires ({ once }) so repeated races on one
 * signal do not accumulate listeners.
 * @param promise - The in-flight request promise to race against abort
 * @param signal - The request's own abort signal
 * @param message - Rejection message; defaults to "Request was aborted"
 */
export function raceAbort<T>(promise: Promise<T>, signal: AbortSignal, message = "Request was aborted"): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      const onAbort = () => reject(new DOMException(message, "AbortError"));
      if (signal.aborted) {
        onAbort();
      } else {
        signal.addEventListener("abort", onAbort, { once: true });
      }
    })
  ]);
}

/**
 * @internal
 * Wires a timeout and an external abort signal onto a request controller.
 * An already-aborted external signal aborts the controller synchronously before
 * any fetch starts. Returns a release() that clears the timer and detaches the
 * external listener — callers must invoke it on every settle path so per-request
 * wiring does not accumulate on long-lived signals.
 * @param controller - This request's abort controller
 * @param options.timeout - Optional ms before the controller aborts itself
 * @param options.abortSignal - Optional external signal forwarded onto the controller
 * @returns A release function clearing all wired controls
 */
export function wireRequestControls(
  controller: AbortController,
  options: { timeout?: number; abortSignal?: AbortSignal }
): () => void {
  const { timeout, abortSignal } = options;
  const releases: Array<() => void> = [];

  if (abortSignal) {
    if (abortSignal.aborted) {
      controller.abort();
    } else {
      const onAbort = () => controller.abort();
      abortSignal.addEventListener("abort", onAbort, { once: true });
      releases.push(() => abortSignal.removeEventListener("abort", onAbort));
    }
  }

  if (timeout && timeout > 0) {
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const clearOnAbort = () => clearTimeout(timeoutId);
    controller.signal.addEventListener("abort", clearOnAbort);
    releases.push(() => {
      clearTimeout(timeoutId);
      controller.signal.removeEventListener("abort", clearOnAbort);
    });
  }

  /** Clears every wired control; safe to call once from each settle path. */
  return () => {
    let i = 0;
    while (i < releases.length) releases[i++]!();
  };
}
