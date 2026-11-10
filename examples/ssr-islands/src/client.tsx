import { signal } from "@hellajs/core";
import { mount } from "@hellajs/dom";

const count = signal(0);

const Counter = () => (
  <>
    <p>Count: {count}</p>
    <button on:click={() => count(count() + 1)}>Increment</button>
  </>
);

mount(Counter, "#app");
