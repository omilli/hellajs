import { calendar } from "@hellajs/headless";
import type { HTMLAttributes } from "@hellajs/dom";

type CalendarMode = "single" | "multiple" | "range";

interface CalendarRange {
  from?: Date;
  to?: Date;
}

type CalendarSelection = Date | Date[] | CalendarRange | undefined;

type CalendarClassKey =
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

interface CalendarProps extends HTMLAttributes<"div"> {
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

interface CalendarDayButtonProps extends HTMLAttributes<"button"> {
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

import { css, style } from "@hellajs/css";
import { tokens } from "./tokens.js";

const base = style("calendar", {
  backgroundColor: tokens.background,
  padding: "0.75rem",
  width: "fit-content",
  "--cell-size": "2rem",
});

const months = style("calendar-months", {
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
  position: "relative",
  "@media (min-width: 48rem)": {
    flexDirection: "row",
  },
});

const month = style("calendar-month", {
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
  width: "100%",
});

const monthCaption = style("calendar-caption", {
  alignItems: "center",
  display: "flex",
  height: "var(--cell-size)",
  justifyContent: "center",
  paddingInline: "var(--cell-size)",
  width: "100%",
});

const captionLabel = style("calendar-caption-label", {
  fontSize: "0.875rem",
  fontWeight: "500",
  userSelect: "none",
});

const nav = style("calendar-nav", {
  alignItems: "center",
  display: "flex",
  gap: "0.25rem",
  justifyContent: "space-between",
  left: "0",
  position: "absolute",
  right: "0",
  top: "0",
  width: "100%",
});

/** The ref's nav buttons: ghost icon-class button tokens with the default size tokens pre-merged out against `size-(--cell-size)`/`p-0`. */
const navButton = style("calendar-nav-button", {
  alignItems: "center",
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  boxSizing: "border-box",
  display: "inline-flex",
  flexShrink: "0",
  fontSize: "0.875rem",
  fontWeight: "500",
  gap: "0.5rem",
  height: "var(--cell-size)",
  justifyContent: "center",
  lineHeight: "1.25rem",
  outlineStyle: "none",
  padding: "0",
  transition: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  userSelect: "none",
  whiteSpace: "nowrap",
  width: "var(--cell-size)",
  "& svg": {
    flexShrink: "0",
    pointerEvents: "none",
  },
  "&:focus-visible": {
    borderColor: tokens.ring,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
  },
  "&:disabled": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&[aria-disabled='true']": {
    opacity: "0.5",
  },
  "&[aria-invalid='true']": {
    borderColor: tokens.destructive,
  },
  "&[aria-invalid='true']:focus-visible": {
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 20%, transparent)`,
  },
  "&:hover": {
    backgroundColor: tokens.accent,
    color: tokens.accentForeground,
  },
  "&:is(.dark *)": {
    "&:hover": {
      backgroundColor: `color-mix(in oklab, ${tokens.accent} 50%, transparent)`,
    },
    "&[aria-invalid='true']:focus-visible": {
      boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 40%, transparent)`,
    },
  },
});

const icon = style("calendar-icon", {
  height: "1rem",
  width: "1rem",
});

const monthGrid = style("calendar-grid", {
  borderCollapse: "collapse",
  width: "100%",
});

const weekdays = style("calendar-weekdays", {
  display: "flex",
});

const weekday = style("calendar-weekday", {
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  color: tokens.mutedForeground,
  flex: "1 1 0%",
  fontSize: "0.8rem",
  fontWeight: "400",
  userSelect: "none",
});

const week = style("calendar-week", {
  display: "flex",
  marginTop: "0.5rem",
  width: "100%",
});

const day = style("calendar-day", {
  aspectRatio: "1 / 1",
  height: "100%",
  padding: "0",
  position: "relative",
  textAlign: "center",
  userSelect: "none",
  width: "100%",
});

/** The ref's CalendarDayButton: ghost icon-class tokens with the conflicts the ref's `cn()` resolves pre-merged; range/selection state rides the button's own data attributes. */
const dayButton = style("calendar-day-button", {
  alignItems: "center",
  aspectRatio: "1 / 1",
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  boxSizing: "border-box",
  color: "inherit",
  display: "flex",
  flexDirection: "column",
  flexShrink: "0",
  fontSize: "0.875rem",
  fontWeight: "400",
  gap: "0.25rem",
  justifyContent: "center",
  lineHeight: "1",
  minWidth: "var(--cell-size)",
  outlineStyle: "none",
  transition: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  whiteSpace: "nowrap",
  width: "100%",
  "& > span": {
    fontSize: "0.75rem",
    opacity: "0.7",
  },
  "& svg": {
    flexShrink: "0",
    pointerEvents: "none",
  },
  "&:focus-visible": {
    borderColor: tokens.ring,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
  },
  "&:disabled": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&[aria-invalid='true']": {
    borderColor: tokens.destructive,
  },
  "&[aria-invalid='true']:focus-visible": {
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 20%, transparent)`,
  },
  "&:hover": {
    backgroundColor: tokens.accent,
    color: tokens.accentForeground,
  },
  "&:is(.dark *)": {
    "&:hover": {
      backgroundColor: `color-mix(in oklab, ${tokens.accent} 50%, transparent)`,
      color: tokens.accentForeground,
    },
    "&[aria-invalid='true']:focus-visible": {
      boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 40%, transparent)`,
    },
  },
  "&[data-selected-single='true']": {
    backgroundColor: tokens.primary,
    color: tokens.primaryForeground,
  },
  "&[data-range-start='true']": {
    backgroundColor: tokens.primary,
    borderRadius: `calc(${tokens.radius} * 0.8)`,
    color: tokens.primaryForeground,
  },
  "&[data-range-end='true']": {
    backgroundColor: tokens.primary,
    borderRadius: `calc(${tokens.radius} * 0.8)`,
    color: tokens.primaryForeground,
  },
  "&[data-range-middle='true']": {
    backgroundColor: tokens.accent,
    borderRadius: "0",
    color: tokens.accentForeground,
  },
});

css({
  "[data-slot='calendar-day'][data-today='true']": {
    backgroundColor: tokens.accent,
    borderRadius: `calc(${tokens.radius} * 0.8)`,
    color: tokens.accentForeground,
  },
  "[data-slot='calendar-day'][data-today='true'][data-selected='true']": {
    borderRadius: "0",
  },
  "[data-slot='calendar-day'][data-outside='true']": {
    color: tokens.mutedForeground,
  },
  "[data-slot='calendar-day'][data-disabled='true']": {
    color: tokens.mutedForeground,
    opacity: "0.5",
  },
  "[data-slot='calendar-day'][data-hidden='true']": {
    visibility: "hidden",
  },
  "[data-slot='calendar-day'][data-range-start='true']": {
    backgroundColor: tokens.accent,
    borderBottomLeftRadius: `calc(${tokens.radius} * 0.8)`,
    borderTopLeftRadius: `calc(${tokens.radius} * 0.8)`,
  },
  "[data-slot='calendar-day'][data-range-middle='true']": {
    borderRadius: "0",
  },
  "[data-slot='calendar-day'][data-range-end='true']": {
    backgroundColor: tokens.accent,
    borderBottomRightRadius: `calc(${tokens.radius} * 0.8)`,
    borderTopRightRadius: `calc(${tokens.radius} * 0.8)`,
  },
  "[data-slot='calendar-day']:first-child[data-selected='true'] button": {
    borderBottomLeftRadius: `calc(${tokens.radius} * 0.8)`,
    borderTopLeftRadius: `calc(${tokens.radius} * 0.8)`,
  },
  "[data-slot='calendar-day']:last-child[data-selected='true'] button": {
    borderBottomRightRadius: `calc(${tokens.radius} * 0.8)`,
    borderTopRightRadius: `calc(${tokens.radius} * 0.8)`,
  },
  "[data-slot='calendar-day'][data-focused='true'] [data-slot='calendar-day-button']": {
    borderColor: tokens.ring,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
    position: "relative",
    zIndex: "10",
  },
  "[data-slot='card-content'] [data-slot='calendar']": {
    backgroundColor: "transparent",
  },
  "[data-slot='popover-content'] [data-slot='calendar']": {
    backgroundColor: "transparent",
  },
});

const chevronLeftIcon = (): JSX.Element => (
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
    aria-hidden="true"
    class={
      [icon]
    }
  >
    <path d="m15 18-6-6 6-6" />
  </svg>
);

const chevronRightIcon = (): JSX.Element => (
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
    aria-hidden="true"
    class={
      [icon]
    }
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
);

/**
 * Zero-dependency month-grid calendar over the `@hellajs/headless` `calendar()`
 * factory: the factory owns the view model (month paging, selection, roving
 * focus, range preview, keyboard) and this composition styles its parts with
 * the `classNames` hooks. Single, multiple, and range selection;
 * previous/next month navigation; `numberOfMonths > 1`, `fromDate`/`toDate`
 * bounds, custom `formatters`, and week numbers are out of scope.
 */
export function Calendar({
  mode,
  selected,
  onSelect,
  month: monthProp,
  onMonthChange,
  defaultMonth,
  disabled,
  showOutsideDays,
  fixedWeeks,
  weekStartsOn,
  hideNavigation,
  classNames,
  class: cls,
  ...attrs
}: CalendarProps): JSX.Element {
  const Cal = calendar({
    mode,
    value: selected,
    onValueChange: onSelect,
    month: monthProp,
    onMonthChange,
    defaultMonth,
    disabled,
    showOutsideDays,
    fixedWeeks,
    weekStartsOn,
  });

  return (
    <Cal.Root
      data-slot="calendar"
      class={
        [base, classNames?.root, cls]
      }
      {...attrs}
    >
      <Cal.Months
        class={
          [months, classNames?.months]
        }
      >
        <Cal.Month
          class={
            [month, classNames?.month]
          }
        >
          <Cal.Caption
            class={
              [monthCaption, classNames?.month_caption]
            }
          >
            <Cal.CaptionLabel
              class={
                [captionLabel, classNames?.caption_label]
              }
            />
          </Cal.Caption>
          {hideNavigation === true ? undefined : (
            <Cal.Nav
              class={
                [nav, classNames?.nav]
              }
            >
              <Cal.PrevButton
                class={
                  [navButton, classNames?.button_previous]
                }
              >
                {chevronLeftIcon()}
              </Cal.PrevButton>
              <Cal.NextButton
                class={
                  [navButton, classNames?.button_next]
                }
              >
                {chevronRightIcon()}
              </Cal.NextButton>
            </Cal.Nav>
          )}
          <Cal.Grid
            class={
              [monthGrid, classNames?.month_grid]
            }
            weekdaysClass={
              [weekdays, classNames?.weekdays]
            }
            weekdayClass={
              [weekday, classNames?.weekday]
            }
            weekClass={
              [week, classNames?.week]
            }
            dayClass={
              [day, classNames?.day]
            }
            dayButtonClass={
              [dayButton, classNames?.day_button]
            }
          />
        </Cal.Month>
      </Cal.Months>
    </Cal.Root>
  );
}

/**
 * The ref's manual-composition day part: a ghost icon-class button carrying the
 * selection/range data attributes over the headless factory's `DayButton`.
 * State flags accept plain booleans or reactive accessors, so a composed
 * calendar drives them live while a standalone call passes static values.
 */
export function CalendarDayButton({ class: cls, ...attrs }: CalendarDayButtonProps): JSX.Element {
  const { DayButton } = calendar();
  return (
    <DayButton
      class={
        [dayButton, cls]
      }
      {...attrs}
    />
  );
}
