---
title: Select calendar values in the mode's shape
impact: MEDIUM
impactDescription: writing an array into a single-mode calendar or reading a range as a Date corrupts selection state and the range hover preview
tags: calendar, CalendarRows
---

## Select calendar values in the mode's shape

`calendar(options)` owns its selection in the `mode`'s shape: `"single"` reads and reports a `Date`, `"multiple"` a `Date[]` (insertion order), `"range"` a `{ from, to }` span with hover preview, reorder, and reset - the `value` option is a static seed or a controlled accessor in exactly that shape, and `onValueChange` reports defensive copies the same way. A controlled `month` accessor snaps the visible month back on every change (winning over internal navigation) while `onMonthChange` still reports paging from the buttons and spill-causing keys; `disabled(date)` blocks selection and keyboard activation (outside days always disabled). The tree is `Root > Months > Month > Caption/Nav/Grid` with `Grid` rendering the whole `role="grid"` table and owning the keyboard model; `CalendarRows.DayButton` is the manual-composition day part with boolean-or-accessor state flags for driving a composed grid live.

**Incorrect (what is wrong):**

```tsx
import { signal } from "@hellajs/core";
import { calendar } from "@hellajs/headless";

const picked = signal<Date[]>([]);
const Booker = calendar({ mode: "single", value: () => picked() }); // mode
// mismatch: single reads a Date, the accessor hands it an array, and every
// selection lands through a cast or corrupts the range math.
```

**Correct (what is right):**

```tsx
import { signal } from "@hellajs/core";
import { calendar, CalendarRows } from "@hellajs/headless";

const picked = signal(new Date());
const Booker = calendar({
  mode: "single",
  value: () => picked(),
  onValueChange: (value) => {
    if (value instanceof Date) picked(value); // the mode's shape
  },
  disabled: (date) => date.getDay() === 0, // Sundays
});

const CalendarHost = () => (
  <Booker.Root>
    <Booker.Months>
      <Booker.Month>
        <Booker.Caption>
          <Booker.CaptionLabel />
          <Booker.Nav>
            <Booker.PrevButton />
            <Booker.NextButton />
          </Booker.Nav>
        </Booker.Caption>
        <Booker.Grid />
      </Booker.Month>
    </Booker.Months>
  </Booker.Root>
);

const Today = (day: Date) => (
  <CalendarRows.DayButton day={day} today focused={false} disabled={false} />
);
```

Reference: `packages/headless/lib/calendar.tsx` and `packages/headless/tests/calendar.test.ts`
