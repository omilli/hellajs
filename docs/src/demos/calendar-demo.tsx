import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import Calendar from "@registry/calendar/css/calendar.js";
import { muted } from "./demo-kit";

const stack = style({
  alignItems: "center",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
});



const format = (date?: Date): string =>
  date ? date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";

export default function CalendarDemo() {
  const picked = signal<Date | undefined>(undefined);

  return (
    <div class={stack}>
      <Calendar defaultMonth={new Date(2025, 2, 1)} onSelect={(date: Date) => picked(date)} />
      <p class={muted}>{() => (picked() ? `Currently ${format(picked())}` : "")}</p>
    </div>
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
    <div class={stack}>
      <Calendar mode="range" defaultMonth={new Date(2025, 2, 1)} onSelect={(range: { from?: Date; to?: Date }) => stay(range)} />
      <p class={muted}>{() => stayLabel()}</p>
    </div>
  );
}

export function CalendarDisabledDemo() {
  return (
    <div class={stack}>
      <Calendar defaultMonth={new Date(2025, 2, 1)} disabled={(date: Date) => date.getDay() === 0 || date.getDay() === 6} />
    </div>
  );
}
