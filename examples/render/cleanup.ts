import { render, signal } from "../../lib";

const counter = signal(0);

const app = render(
  () => ({
    tag: "div",
    children: [
      {
        tag: "h1",
        children: "Counter",
      },
      {
        tag: "p",
        children: `Count: ${counter()}`,
      },
      {
        tag: "button",
        onclick: () => counter.set(counter() + 1),
        children: "Increment",
      },
      {
        tag: "button",
        onclick: () => counter.set(counter() - 1),
        children: "Decrement",
      },
      {
        tag: "button",
        onclick: () => counter.set(0),
        children: "Reset",
      },
    ],
  }),
  "#app"
);

setTimeout(() => {
  app();
}, 3000);
