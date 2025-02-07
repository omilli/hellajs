import { render } from "../../lib";

render(
  {
    tag: "div",
    class: "greeting",
    children: ["Hello World"],
  },
  "#app"
);
