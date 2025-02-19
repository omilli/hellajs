import { HELLA_REACTIVE } from "../lib/reactive";

export function tick(): Promise<unknown> {
  return new Promise((resolve) => {
    const ticker = setInterval(() => {
      if (HELLA_REACTIVE.pendingEffects.size === 0) {
        clearInterval(ticker);
        resolve(null);
      }
    }, 10);
  });
}
