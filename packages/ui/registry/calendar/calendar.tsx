import { calendar } from "@hellajs/headless";
import type { CalendarProps, CalendarDayButtonProps } from "./calendar-types.js";

// @hella:styles
declare const base: string;
declare const captionLabel: string;
declare const day: string;
declare const dayButton: string;
declare const icon: string;
declare const month: string;
declare const monthCaption: string;
declare const monthGrid: string;
declare const months: string;
declare const nav: string;
declare const navButton: string;
declare const week: string;
declare const weekday: string;
declare const weekdays: string;
// @hella:end

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
      // @hella:compose
      [icon]
      // @hella:end
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
      // @hella:compose
      [icon]
      // @hella:end
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
        // @hella:compose
        [base, classNames?.root, cls]
        // @hella:end
      }
      {...attrs}
    >
      <Cal.Months
        class={
          // @hella:compose
          [months, classNames?.months]
          // @hella:end
        }
      >
        <Cal.Month
          class={
            // @hella:compose
            [month, classNames?.month]
            // @hella:end
          }
        >
          <Cal.Caption
            class={
              // @hella:compose
              [monthCaption, classNames?.month_caption]
              // @hella:end
            }
          >
            <Cal.CaptionLabel
              class={
                // @hella:compose
                [captionLabel, classNames?.caption_label]
                // @hella:end
              }
            />
          </Cal.Caption>
          {hideNavigation === true ? undefined : (
            <Cal.Nav
              class={
                // @hella:compose
                [nav, classNames?.nav]
                // @hella:end
              }
            >
              <Cal.PrevButton
                class={
                  // @hella:compose
                  [navButton, classNames?.button_previous]
                  // @hella:end
                }
              >
                {chevronLeftIcon()}
              </Cal.PrevButton>
              <Cal.NextButton
                class={
                  // @hella:compose
                  [navButton, classNames?.button_next]
                  // @hella:end
                }
              >
                {chevronRightIcon()}
              </Cal.NextButton>
            </Cal.Nav>
          )}
          <Cal.Grid
            class={
              // @hella:compose
              [monthGrid, classNames?.month_grid]
              // @hella:end
            }
            weekdaysClass={
              // @hella:compose
              [weekdays, classNames?.weekdays]
              // @hella:end
            }
            weekdayClass={
              // @hella:compose
              [weekday, classNames?.weekday]
              // @hella:end
            }
            weekClass={
              // @hella:compose
              [week, classNames?.week]
              // @hella:end
            }
            dayClass={
              // @hella:compose
              [day, classNames?.day]
              // @hella:end
            }
            dayButtonClass={
              // @hella:compose
              [dayButton, classNames?.day_button]
              // @hella:end
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
        // @hella:compose
        [dayButton, cls]
        // @hella:end
      }
      {...attrs}
    />
  );
}
