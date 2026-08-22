/**
 * Op definitions for the internal macro-benchmark.
 *
 * Each op is a verified interaction against the `examples/bench` keyed-table
 * app (a faithful krausest clone). Timing is meaningless unless the end state
 * is verified, so every op carries an in-page predicate that must become true
 * after the measured click.
 */

export interface BenchOp {
  /** Unique op id (also the `--ops` selector). */
  readonly id: string;
  /** Click selectors run (unmeasured) after page load to reach the op's start state. */
  readonly setup: readonly string[];
  /** Expression evaluated in the page before the measured click, or null. */
  readonly capture: string | null;
  /** The measured click selector — t0 is the click dispatch on this element. */
  readonly click: string;
  /** Expression evaluated in the page with `captured` bound to the captured value. */
  readonly predicate: string;
}

/** Build a row-count end-state expression.
 *
 * @param expected The row count the table must reach.
 * @returns The predicate expression.
 */
const COUNT = (expected: number): string =>
  `document.querySelectorAll("tbody tr").length === ${expected}`;

const CAPTURE_LABELS_0_1 = `(() => {
  const rows = document.querySelectorAll("tbody tr");
  return [
    rows[0]?.querySelector(".lbl")?.textContent?.trim() ?? "",
    rows[1]?.querySelector(".lbl")?.textContent?.trim() ?? "",
  ];
})()`;

const CAPTURE_LABELS_1_998 = `(() => {
  const rows = document.querySelectorAll("tbody tr");
  return [
    rows[1]?.querySelector(".lbl")?.textContent?.trim() ?? "",
    rows[998]?.querySelector(".lbl")?.textContent?.trim() ?? "",
  ];
})()`;

const SWAP_PREDICATE = `(() => {
  const rows = document.querySelectorAll("tbody tr");
  const first = rows[1]?.querySelector(".lbl")?.textContent?.trim();
  const second = rows[998]?.querySelector(".lbl")?.textContent?.trim();
  return first === captured[1] && second === captured[0];
})()`;

export const BENCH_OPS: readonly BenchOp[] = [
  {
    id: "create-1k",
    setup: [],
    capture: null,
    click: "#run",
    predicate: COUNT(1000),
  },
  {
    id: "create-10k",
    setup: [],
    capture: null,
    click: "#runlots",
    predicate: COUNT(10000),
  },
  {
    id: "append-1k",
    setup: ["#run"],
    capture: null,
    click: "#add",
    predicate: COUNT(2000),
  },
  {
    id: "update-10th",
    setup: ["#run"],
    capture: CAPTURE_LABELS_0_1,
    click: "#update",
    predicate: `(() => {
      const rows = document.querySelectorAll("tbody tr");
      const first = rows[0]?.querySelector(".lbl")?.textContent?.trim();
      const second = rows[1]?.querySelector(".lbl")?.textContent?.trim();
      return first !== captured[0] && second === captured[1];
    })()`,
  },
  {
    id: "clear",
    setup: ["#run"],
    capture: null,
    click: "#clear",
    predicate: COUNT(0),
  },
  {
    id: "swap",
    setup: ["#runlots"],
    capture: CAPTURE_LABELS_1_998,
    click: "#swaprows",
    predicate: SWAP_PREDICATE,
  },
  {
    id: "select",
    setup: ["#run"],
    capture: null,
    click: "tbody tr:nth-child(6) .lbl",
    predicate:
      'document.querySelector("tbody tr:nth-child(6)")?.classList.contains("danger") === true',
  },
  {
    id: "remove",
    setup: ["#run"],
    capture:
      'document.querySelector("tbody tr:nth-child(6) td")?.textContent?.trim() ?? ""',
    click: "tbody tr:nth-child(6) .remove",
    predicate: `(() => {
      const rows = document.querySelectorAll("tbody tr");
      const ids = [...rows].map((row) => row.querySelector("td")?.textContent?.trim());
      return rows.length === 999 && !ids.includes(captured);
    })()`,
  },
];

/**
 * List every valid op id (for `--ops` validation and error messages).
 *
 * @returns The op ids in canonical measurement order.
 */
export function getOpIds(): string[] {
  return BENCH_OPS.map((op) => op.id);
}
