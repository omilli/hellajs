import { render } from "../../lib";

render(
  {
    tag: "div",
    class: "card",
    children: [
      {
        tag: "h2",
        children: ["Card Title"],
      },
      {
        tag: "p",
        children: ["Card content"],
      },
    ],
  },
  "#app"
);
