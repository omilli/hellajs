import { computed, effect, signal } from "../../../lib";

const counter = signal(0);
const double = computed(() => counter() * 2);

effect(() => {
  console.log(`Counter Effect: ${counter()}, Double Effect: ${double()}`);
});

const clear = setInterval(() => {
  counter.set(counter() + 1);
  if (counter() >= 5) {
    clearInterval(clear);
  }
}, 1000);
