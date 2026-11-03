import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import { calendar } from "@hellajs/headless";

export function CalendarDemo() {
  const picked = signal<Date | undefined>(undefined);

  const Calendar = calendar({
    defaultMonth: new Date(2025, 2, 1),
    onValueChange: (next) => picked(next as Date),
  });

  const calendarDemo = style({
    '& [data-slot="calendar-day"][data-outside="true"] [data-slot="calendar-day-button"]': {
      opacity: 0.5,
    },
    '& [data-slot="calendar-day-button"][data-selected-single="true"]': {
      backgroundColor: "#e8e8f2",
      color: "#18181f",
    },
    "& .note": {
      fontSize: "0.875rem",
      margin: 0,
      opacity: 0.7,
    },
  });

  return (
    <div class={calendarDemo}>
      <Calendar.Root>
        <Calendar.Months>
          <Calendar.Month>
            <Calendar.Caption>
              <Calendar.CaptionLabel />
            </Calendar.Caption>
            <Calendar.Nav>
              <Calendar.PrevButton>{"<"}</Calendar.PrevButton>
              <Calendar.NextButton>{">"}</Calendar.NextButton>
            </Calendar.Nav>
            <Calendar.Grid />
          </Calendar.Month>
        </Calendar.Months>
      </Calendar.Root>
      <p class="note">
        {() => (picked() ? `Picked ${picked()!.toLocaleDateString()}` : "Pick a day.")}
      </p>
    </div>
  );
}
