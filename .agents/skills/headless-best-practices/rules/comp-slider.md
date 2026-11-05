---
title: Drive slider values as thumb arrays and commit on release
impact: MEDIUM
impactDescription: writing a scalar into the array-shaped value breaks thumb geometry, and treating every onValueChange as final turns drags into commit storms
tags: slider
---

## Drive slider values as thumb arrays and commit on release

`slider(options)` owns its value as a NUMBER ARRAY - the thumb count is the rendered `Thumb` set, keyed by `index`; a missing `value` seeds the `[min, max]` pair and a static array seeds the internal signal, while an accessor makes the slider controlled (writes report through `onValueChange` only). Pointer drags pick the nearest thumb and map track position through quantize/clamp with `step` decimals setting the rounding precision and `minStepsBetweenThumbs` enforcing the gap; `onValueChange` fires per accepted move (drag and keyboard alike) and `onValueCommit` fires when an interaction ENDS - drag release and each accepted key step. Mirror live drags through `onValueChange` and persist through `onValueCommit`, not the reverse. `Track`/`Range`/`Thumb` position styles are factory-owned; `orientation: "vertical"` maps from the bottom edge.

**Incorrect (what is wrong):**

```tsx
import { signal } from "@hellajs/core";
import { slider } from "@hellajs/headless";

const price = signal(0); // scalar: the value contract is number[] - one
// thumb renders with NaN geometry and the second thumb has no value at all
const Price = slider({ min: 0, max: 500, onValueChange: (next) => price(next[0] ?? 0) });
```

**Correct (what is right):**

```tsx
import { signal } from "@hellajs/core";
import { slider } from "@hellajs/headless";

const price = signal([0, 100]);
const savePrice = (next: number[]): void => undefined;
const Price = slider({
  min: 0,
  max: 500,
  step: 10,
  minStepsBetweenThumbs: 2,
  value: () => price(), // accessor: controlled - reports only
  onValueChange: (next) => price(next), // live drag mirror
  onValueCommit: (next) => savePrice(next), // release and key steps
});

const PriceFilter = () => (
  <Price.Root>
    <Price.Track>
      <Price.Range />
    </Price.Track>
    <Price.Thumb index={0} />
    <Price.Thumb index={1} />
  </Price.Root>
);
```

Reference: `packages/headless/lib/slider.tsx` and `packages/headless/tests/slider.test.ts`
