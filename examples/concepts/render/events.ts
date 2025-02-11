import { render } from "../../../lib";

render(
  {
    tag: "button",
    classes: "btn",
    onclick: () => console.log("clicked"),
    data: {
      id: "submit-btn",
      testid: "submit",
    },
    content: "Click me",
  },
  "#app"
);
