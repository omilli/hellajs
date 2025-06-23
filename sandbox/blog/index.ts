// import "./router";

import { effect, signal } from "../../packages/core"
import { html, mount } from "../../packages/dom";

function App() {
  const counter = signal(0);
  setInterval(() => counter(counter() + 1), 1000);
  effect(() => console.log("Counter updated:", counter()));
  return html.div(() => counter());
}

mount(App, "#app");