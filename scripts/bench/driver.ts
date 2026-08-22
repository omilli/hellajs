/**
 * Playwright driver: measures each op in system Chrome under CPU throttle.
 *
 * Timing contract — end-to-end interaction latency, all in-page (IPC excluded
 * from the measured window):
 * - t0: a capture-phase `document` click listener installed via
 *   `addInitScript` records `performance.now()` at click dispatch.
 * - t1: an in-page promise polls the op's end-state predicate every
 *   `requestAnimationFrame` and resolves with `performance.now()` on the first
 *   frame presenting the verified end state.
 * A predicate that never becomes true trips a watchdog and fails the run —
 * a timing number for an unverified end state is garbage.
 */

import type { BenchOp } from "./ops.js";
import type { Page } from "playwright";
import { chromium } from "playwright";

/** Predicate watchdog: an op whose end state never verifies aborts the run. */
const WATCHDOG_MS = 30_000;

export interface OpResult {
  readonly id: string;
  readonly median: number;
  readonly mean: number;
}

export interface BenchResult {
  readonly chromeVersion: string;
  readonly ops: readonly OpResult[];
}

export interface DriverOptions {
  readonly url: string;
  readonly ops: readonly BenchOp[];
  readonly runs: number;
  readonly throttle: number;
  readonly headless: boolean;
}

/**
 * Build the in-page t1 expression for one op.
 *
 * @param predicate The op's end-state expression (sees `captured`).
 * @param captured The pre-click captured value (`null` when the op has no capture).
 * @returns An IIFE expression resolving via `performance.now()` on success.
 */
function timingExpression(predicate: string, captured: unknown): string {
  return `((captured) => new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      let satisfied = false;
      try { satisfied = Boolean(${predicate}); } catch { satisfied = false; }
      if (satisfied) { resolve(performance.now()); return; }
      if (Date.now() - started >= ${WATCHDOG_MS}) {
        reject(new Error("end-state predicate not satisfied within ${WATCHDOG_MS} ms"));
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }))(${JSON.stringify(captured)})`;
}

/**
 * Measure one run of an op: goto → setup clicks → capture → measured click → t1.
 *
 * @param page A fresh page with the t0 init script and throttle already applied.
 * @param url The staged app URL.
 * @param op The op to run.
 * @returns The verified duration in ms (t1 - t0).
 */
async function measureOnce(page: Page, url: string, op: BenchOp): Promise<number> {
  await page.goto(url);
  for (const selector of op.setup) {
    await page.click(selector);
  }
  const captured = op.capture
    ? await page.evaluate<unknown>(`(${op.capture})`)
    : null;

  await page.click(op.click);
  const t1 = await page.evaluate<number>(timingExpression(op.predicate, captured));
  const t0 = await page.evaluate<number>("window.__t0 ?? -1");
  if (t0 < 0) {
    throw new Error("t0 click listener never fired (window.__t0 unset)");
  }
  return t1 - t0;
}

/**
 * Compute the median of measured durations.
 *
 * @param durations Measured run durations in ms.
 * @returns The median (mean of the middle pair when the count is even).
 */
function medianOf(durations: number[]): number {
  const sorted = [...durations].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid] ?? -1
    : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

/**
 * Run the benchmark: per op, one unmeasured warmup + N measured runs.
 *
 * Every op gets a fresh page, its own CDP CPU-throttle session, and the t0
 * init script. The first (warmup) run is excluded from statistics.
 *
 * @param options Driver configuration (URL, ops, runs, throttle, headless).
 * @returns Per-op median/mean plus the Chrome version.
 */
export async function runBench(options: DriverOptions): Promise<BenchResult> {
  let browser;
  try {
    browser = await chromium.launch({
      channel: "chrome",
      headless: options.headless,
    });
  } catch (error: unknown) {
    throw new Error(
      "Failed to launch system Google Chrome (playwright channel \"chrome\"). " +
        "bun bench requires a local Google Chrome install; no browser is downloaded.",
      { cause: error },
    );
  }

  try {
    const context = await browser.newContext();
    const results: OpResult[] = [];

    for (const op of options.ops) {
      const page = await context.newPage();
      try {
        const cdp = await context.newCDPSession(page);
        await cdp.send("Emulation.setCPUThrottlingRate", {
          rate: options.throttle,
        });
        await page.addInitScript(() => {
          document.addEventListener(
            "click",
            () => {
              (window as { __t0?: number }).__t0 = performance.now();
            },
            { capture: true, passive: true },
          );
        });

        const durations: number[] = [];
        try {
          await measureOnce(page, options.url, op); // unmeasured warmup
          for (let i = 0; i < options.runs; i++) {
            durations.push(await measureOnce(page, options.url, op));
          }
        } catch (error: unknown) {
          throw new Error(
            `bench op "${op.id}" failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
            { cause: error },
          );
        }

        results.push({
          id: op.id,
          median: medianOf(durations),
          mean: durations.reduce((sum, d) => sum + d, 0) / durations.length,
        });
      } finally {
        await page.close();
      }
    }

    return { chromeVersion: browser.version(), ops: results };
  } finally {
    await browser.close();
  }
}
