import { render } from "../../lib";

render({
  tag: "div",
  mount: "#app",
  class: "greeting",
  children: ["Hello World"],
});
