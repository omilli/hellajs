import { css } from "@hellajs/css";

css({
  button: {
    padding: "0.5rem 1rem",
    border: "1px solid #2563eb",
  },
});

export const App = () => (
  <div>
    <h1>SSR Islands</h1>
    <div id="app"></div>
  </div>
);
