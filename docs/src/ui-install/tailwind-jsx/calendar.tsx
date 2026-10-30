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
import { cn } from "./cn.js";

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
      cn("size-4")
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
      cn("size-4")
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
        cn("group/calendar w-fit bg-background p-3 [--cell-size:--spacing(8)] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent", classNames?.root, cls)
      }
      {...attrs}
    >
      <Cal.Months
        class={
          cn("relative flex flex-col gap-4 md:flex-row", classNames?.months)
        }
      >
        <Cal.Month
          class={
            cn("flex w-full flex-col gap-4", classNames?.month)
          }
        >
          <Cal.Caption
            class={
              cn("flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)", classNames?.month_caption)
            }
          >
            <Cal.CaptionLabel
              class={
                cn("font-medium select-none text-sm", classNames?.caption_label)
              }
            />
          </Cal.Caption>
          {hideNavigation === true ? undefined : (
            <Cal.Nav
              class={
                cn("absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1", classNames?.nav)
              }
            >
              <Cal.PrevButton
                class={
                  cn("inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 size-(--cell-size) p-0 select-none aria-disabled:opacity-50", classNames?.button_previous)
                }
              >
                {chevronLeftIcon()}
              </Cal.PrevButton>
              <Cal.NextButton
                class={
                  cn("inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 size-(--cell-size) p-0 select-none aria-disabled:opacity-50", classNames?.button_next)
                }
              >
                {chevronRightIcon()}
              </Cal.NextButton>
            </Cal.Nav>
          )}
          <Cal.Grid
            class={
              cn("w-full border-collapse", classNames?.month_grid)
            }
            weekdaysClass={
              cn("flex", classNames?.weekdays)
            }
            weekdayClass={
              cn("flex-1 rounded-md text-[0.8rem] font-normal text-muted-foreground select-none", classNames?.weekday)
            }
            weekClass={
              cn("mt-2 flex w-full", classNames?.week)
            }
            dayClass={
              cn("group/day relative aspect-square h-full w-full p-0 text-center select-none [&:last-child[data-selected=true]_button]:rounded-r-md [&:first-child[data-selected=true]_button]:rounded-l-md data-[today=true]:rounded-md data-[today=true]:bg-accent data-[today=true]:text-accent-foreground data-[today=true]:data-[selected=true]:rounded-none data-[outside=true]:text-muted-foreground data-[disabled=true]:text-muted-foreground data-[disabled=true]:opacity-50 data-[hidden=true]:invisible data-[range-start=true]:rounded-l-md data-[range-start=true]:bg-accent data-[range-middle=true]:rounded-none data-[range-end=true]:rounded-r-md data-[range-end=true]:bg-accent", classNames?.day)
            }
            dayButtonClass={
              cn("flex shrink-0 aspect-square size-auto w-full min-w-(--cell-size) flex-col items-center justify-center gap-1 rounded-md text-sm font-normal leading-none whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&>span]:text-xs [&>span]:opacity-70 hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 dark:hover:text-accent-foreground group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-[3px] group-data-[focused=true]/day:ring-ring/50 data-[range-end=true]:rounded-md data-[range-end=true]:rounded-r-md data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground data-[range-start=true]:rounded-md data-[range-start=true]:rounded-l-md data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground", classNames?.day_button)
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
        cn("flex shrink-0 aspect-square size-auto w-full min-w-(--cell-size) flex-col items-center justify-center gap-1 rounded-md text-sm font-normal leading-none whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&>span]:text-xs [&>span]:opacity-70 hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 dark:hover:text-accent-foreground group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-[3px] group-data-[focused=true]/day:ring-ring/50 data-[range-end=true]:rounded-md data-[range-end=true]:rounded-r-md data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground data-[range-start=true]:rounded-md data-[range-start=true]:rounded-l-md data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground", cls)
      }
      {...attrs}
    />
  );
}
