import { render, signal } from "../../lib";

const isActive = signal(false);

// Dynamic content
render({
  tag: "div",
  mount: "#app",
  class: () => ({ active: isActive() }),
  children: [
    {
      tag: "button",
      onclick: () => isActive.set(!isActive()),
      children: "Click me",
    },
    {
      class: () => ({ active: isActive() }),
      tag: "p",
      children: () => `Active: ${isActive()}`,
    },
    {
      tag: "p",
      children: `foo`,
    },
  ],
});
