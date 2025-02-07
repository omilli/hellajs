import { render } from "../../lib";

render({
  tag: "button",
  mount: "#app",
  class: "btn",
  onclick: () => console.log("clicked"),
  data: {
    id: "submit-btn",
    testid: "submit",
  },
  children: ["Click me"],
});
