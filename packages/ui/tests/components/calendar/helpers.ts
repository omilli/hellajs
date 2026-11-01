import { expect } from "vite-plus/test";
import { delay } from "@utils/test-helpers.js";
import { renderVariant } from "../../helpers/variants-core";
import { type CalendarVariantProps } from "./variants";

export const JAN_2024 = new Date(2024, 0, 1);
export const FEB_2024 = new Date(2024, 1, 1);
export const FEB_2100 = new Date(2100, 1, 1);
export const MAR_2025 = new Date(2025, 2, 1);
export const DEC_2025 = new Date(2025, 11, 1);

/** Typed render through the shared harness: the calendar carries no hook wiring — delegated events and scoped effects manage themselves — so there is nothing to await beyond the synchronous render. */
export function calendarRoot(
  variant: { render: (props: CalendarVariantProps) => unknown },
  props: CalendarVariantProps,
): HTMLElement {
  return renderVariant(variant as never, props) as HTMLElement;
}

/** The day cell (td) for an ISO key, or null between rebuilds. */
export function dayCell(root: HTMLElement, iso: string): HTMLElement | null {
  return root.querySelector(`[data-slot='calendar-day'][data-date='${iso}']`);
}

/** The day button inside an ISO-keyed cell. */
export function dayButton(root: HTMLElement, iso: string): HTMLButtonElement {
  const cell = dayCell(root, iso);
  expect(cell).not.toBeNull();
  return cell!.querySelector("button")!;
}

/** Polls (microtask hops) until a month rebuild has landed the cell for an ISO key. */
export async function awaitCell(root: HTMLElement, iso: string): Promise<HTMLElement> {
  for (let i = 0; i < 50; i++) {
    const cell = dayCell(root, iso);
    if (cell) return cell;
    await delay();
  }
  expect(dayCell(root, iso)).not.toBeNull();
  return dayCell(root, iso)!;
}

/** Dispatches a bubbling click at a day button; delegated handlers resolve it on the body listener. */
export function click(root: HTMLElement, iso: string): void {
  dayButton(root, iso).dispatchEvent(new Event("click", { bubbles: true }));
}

/** Focuses a day button and dispatches a bubbling keydown at it. */
export function press(root: HTMLElement, iso: string, key: string): void {
  const button = dayButton(root, iso);
  button.focus();
  button.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
}

/** Polls (microtask hops) until the roving focus has landed on the ISO-keyed day button. */
export async function awaitFocus(root: HTMLElement, iso: string): Promise<void> {
  for (let i = 0; i < 50; i++) {
    const button = dayCell(root, iso)?.querySelector("button");
    if (button && document.activeElement === button) return;
    await delay();
  }
  expect(document.activeElement).toBe(dayCell(root, iso)?.querySelector("button") ?? null);
}

/** The caption text ("March 2025"). */
export function caption(root: HTMLElement): string {
  return root.querySelector("[data-slot='calendar-caption-label']")!.textContent ?? "";
}
