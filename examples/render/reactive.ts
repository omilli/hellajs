import { render, signal } from "../../lib";

const isActive = signal(false);

render(
  () => ({
    tag: "div",
    class: { active: isActive() },
    children: [
      {
        tag: "button",
        id: "toggle",
        onclick: () => isActive.set(!isActive()),
        children: "Toggle Active",
      },
      {
        class: { active: isActive() },
        tag: "p",
        children: `Active: ${isActive()}`,
      },
    ],
  }),
  "#app"
);
