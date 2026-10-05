import { signal } from "@hellajs/core";
import Calendar from "@registry/calendar/css/calendar.js";

const format = (date?: Date): string =>
  date ? date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";

export function CalendarDemo() {
  const picked = signal<Date | undefined>(undefined);

  return (
    <>
      <Calendar defaultMonth={new Date(2025, 2, 1)} onSelect={(date: Date) => picked(date)} />
      <p class="demo-muted">{() => (picked() ? `Currently ${format(picked())}` : "")}</p>
    </>
  );
}

export function CalendarRangeDemo() {
  const stay = signal<{ from?: Date; to?: Date }>({});
  const stayLabel = (): string => {
    const { from, to } = stay();
    if (!from) return "Pick a check-in date";
    return to ? `${format(from)} to ${format(to)}` : `${format(from)} to ...`;
  };

  return (
    <>
      <Calendar mode="range" defaultMonth={new Date(2025, 2, 1)} onSelect={(range: { from?: Date; to?: Date }) => stay(range)} />
      <p class="demo-muted">{() => stayLabel()}</p>
    </>
  );
}

export function CalendarDisabledDemo() {
  return (
    <>
      <Calendar defaultMonth={new Date(2025, 2, 1)} disabled={(date: Date) => date.getDay() === 0 || date.getDay() === 6} />
    </>
  );
}
