import { html, render, signal } from "../../../lib";

const { div, button, p } = html;

const isActive = signal(false);

const App = () =>
  div({ class: { active: isActive() } }, [
    button({
      id: "toggle",
      onclick: () => isActive.set(!isActive()),
    }),
    p({ class: { active: isActive() } }, `Active: ${isActive()}`),
  ]);

render(App, "#app");
