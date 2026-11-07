import { signal, computed } from "@hellajs/core";
import { mount } from "@hellajs/dom";
import { css } from "@hellajs/css";

css({
  body: {
    textAlign: "center",
  },
  button: {
    margin: "0.1rem",
  },
});

const Counter = () => {
  const count = signal(0);

  const increment = () => count(count() + 1);
  const decrement = () => count(count() - 1);
  const reset = () => count(0);
  const isDisabled = computed(() => count() === 0);

  return (
    <>
      <h1>Counter: {count}</h1>
      <div>
        <button on:click={decrement} disabled={isDisabled}>
          -
        </button>

        <button on:click={increment}>+</button>

        <button on:click={reset} disabled={isDisabled}>
          Reset
        </button>
      </div>
    </>
  );
};

mount(Counter, "#app");
