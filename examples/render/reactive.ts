import { render, signal } from "../../lib";
import { HellaElement } from "../../lib/dom/types";

const isActive = signal(false);

const foo = (): HellaElement => {
  return {
    class: { active: isActive() },
    tag: "p",
    children: `Active: ${isActive()}`,
  };
};

render(
  () => ({
    tag: "div",
    class: { active: isActive() },
    children: [
      {
        tag: "button",
        onclick: () => isActive.set(!isActive()),
        children: "Toggle Active",
      },
      foo(),
    ],
  }),
  "#app"
);
