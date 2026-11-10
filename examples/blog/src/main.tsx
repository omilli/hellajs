import { style } from "@hellajs/css";
import { mount } from "@hellajs/dom";
import { currentView } from "./router";
import { appStore } from "./state";
import "./theme";

const container = style({
  maxWidth: "48rem",
  margin: "0 auto",
  padding: "1rem",
  h1: {
    fontSize: "1.5rem",
    marginBottom: "1rem",
  },
});

const App = (
  <div class={container}>
    <h1>{appStore.title}</h1>
    {currentView}
  </div>
);

mount(App, "#app");
