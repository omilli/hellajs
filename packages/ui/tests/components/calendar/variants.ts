import { Calendar as CalendarCssDefault } from "../../../dist/registry/calendar/css/calendar";
import { Calendar as CalendarTailwindDefault } from "../../../dist/registry/calendar/tailwind/calendar";
import * as CalendarCssJsx from "../../../dist/registry/calendar/css/calendar";
import * as CalendarTailwindJsx from "../../../dist/registry/calendar/tailwind/calendar";
import type { HTMLAttributes } from "@hellajs/dom";
import type { ComponentVariant } from "../../helpers/variants-core";

/** Prop bag shared by every compiled Calendar variant (mirrors the emitted CalendarProps). */
export interface CalendarVariantProps extends HTMLAttributes<"div"> {
  mode?: "single" | "multiple" | "range";
  selected?: Date | Date[] | { from?: Date; to?: Date };
  onSelect?: (selected: Date | Date[] | { from?: Date; to?: Date } | undefined) => void;
  month?: () => Date;
  onMonthChange?: (month: Date) => void;
  defaultMonth?: Date;
  disabled?: (date: Date) => boolean;
  showOutsideDays?: boolean;
  fixedWeeks?: boolean;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  hideNavigation?: boolean;
  classNames?: Partial<Record<string, string>>;
  class?: string;
}
/** Prop bag for the compiled CalendarDayButton part (mirrors the emitted props). */
export interface CalendarDayButtonVariantProps extends HTMLAttributes<"button"> {
  day: Date;
  selectedSingle?: boolean | (() => boolean);
  rangeStart?: boolean | (() => boolean);
  rangeEnd?: boolean | (() => boolean);
  rangeMiddle?: boolean | (() => boolean);
  disabled?: boolean | (() => boolean);
  focused?: boolean | (() => boolean);
  today?: boolean;
  class?: string;
}
/**
 * Every compiled Calendar variant (the Calendar export) from dist/registry.
 * Calendar renders no children, so the suites carry no `child` wrapper.
 */
export const calendarVariants: ComponentVariant<CalendarVariantProps>[] = [
  { style: "css", render: CalendarCssDefault },
  { style: "tailwind", render: CalendarTailwindDefault },
];
/**
 * Every compiled CalendarDayButton part (the named export) from dist/registry.
 */
export const calendarDayButtonVariants: ComponentVariant<CalendarDayButtonVariantProps>[] = [
  { style: "css", render: CalendarCssJsx.CalendarDayButton },
  { style: "tailwind", render: CalendarTailwindJsx.CalendarDayButton },
];
