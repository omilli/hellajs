import { render } from "../../../lib";

render(
  {
    tag: "div",
    classes: "card",
    content: [
      {
        tag: "h2",
        content: "Card Title",
      },
      {
        tag: "p",
        content: "Card content",
      },
    ],
  },
  "#app"
);
