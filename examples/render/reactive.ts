import { render, signal } from "../../lib";

const isActive = signal(false);

render(() => ({
  tag: "div",
  mount: "#app",
  class: { active: isActive() },
  children: [
    {
      tag: "button",
      onclick: () => isActive.set(!isActive()),
      children: "Toggle Active",
    },
    {
      class: { active: isActive() },
      tag: "p",
      children: `Active: ${isActive()}`,
    },
  ],
}));
