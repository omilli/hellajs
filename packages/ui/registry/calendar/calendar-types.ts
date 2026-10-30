import type { HTMLAttributes } from "@hellajs/dom";

export type CalendarMode = "single" | "multiple" | "range";

export interface CalendarRange {
  from?: Date;
  to?: Date;
}

export type CalendarSelection = Date | Date[] | CalendarRange | undefined;

export type CalendarClassKey =
  | "root"
  | "months"
  | "month"
  | "nav"
  | "button_previous"
  | "button_next"
  | "month_caption"
  | "caption_label"
  | "month_grid"
  | "weekdays"
  | "weekday"
  | "week"
  | "day"
  | "day_button";

export interface CalendarProps extends HTMLAttributes<"div"> {
  /** Selection behavior; defaults to `"single"`. */
  mode?: CalendarMode;
  /** Initial selection in the shape the mode calls for; selection is uncontrolled, `onSelect` reports every change. */
  selected?: CalendarSelection;
  onSelect?: (selected: CalendarSelection) => void;
  /** Controlled visible-month accessor; when provided it snaps the view back on every change, winning over internal navigation. */
  month?: () => Date;
  onMonthChange?: (anchor: Date) => void;
  /** Initial visible month; defaults to the current month. */
  defaultMonth?: Date;
  /** Predicate blocking selection and keyboard activation; outside days are always disabled. */
  disabled?: (date: Date) => boolean;
  /** Renders leading/trailing adjacent-month days; defaults to `true`. */
  showOutsideDays?: boolean;
  /** Always renders six week rows so month-to-month navigation never resizes the grid. */
  fixedWeeks?: boolean;
  /** First day of the week; `0` = Sunday (default) through `6` = Saturday. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Omits the previous/next month navigation. */
  hideNavigation?: boolean;
  /** Per-part class hook overrides merged next to the component classes. */
  classNames?: Partial<Record<CalendarClassKey, string>>;
  class?: string;
}

export interface CalendarDayButtonProps extends HTMLAttributes<"button"> {
  /** The day this button renders; also emitted as `data-day` (locale string, per the ref). */
  day: Date;
  /** Reactive-capable selected flag; renders `data-selected-single` when the day is selected outside a range span. */
  selectedSingle?: boolean | (() => boolean);
  rangeStart?: boolean | (() => boolean);
  rangeEnd?: boolean | (() => boolean);
  rangeMiddle?: boolean | (() => boolean);
  /** Reactive-capable disabled flag; renders the disabled state attributes (wired, not spread). */
  disabled?: boolean | (() => boolean);
  /** Reactive-capable roving-focus flag; drives `tabindex` 0/-1. */
  focused?: boolean | (() => boolean);
  /** Marks the day as today with `aria-current="date"`. */
  today?: boolean;
  class?: string;
}
