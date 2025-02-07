import { render } from "../../lib";

render(
  {
    tag: "button",
    class: "btn",
    onclick: () => console.log("clicked"),
    data: {
      id: "submit-btn",
      testid: "submit",
    },
    children: ["Click me"],
  },
  "#app"
);
