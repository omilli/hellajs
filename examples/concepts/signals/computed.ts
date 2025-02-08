import { computed, effect, html, render, signal } from "../../../lib";

const counter = signal(0);
const double = computed(() => counter() * 2);

effect(() => {
  console.log(`Counter Effect: ${counter()}, Double Effect: ${double()}`);
});

const { button } = html;
render(
  () =>
    button(
      { onclick: () => counter.set(counter() + 1) },
      `Counter: ${counter()}, Double: ${double()}`
    ),
  "#app"
);

const clear = setInterval(() => {
  counter.set(counter() + 1);
  // You must be inside a render or effect to get immediate computation.
  // Double in this context will be 1 iteration behind eg:
  // Counter Interval: 3, Double Interval: 4
  console.log(`Counter Interval: ${counter()}, Double Interval: ${double()}`);
  if (counter() >= 5) {
    clearInterval(clear);
  }
}, 10000);
