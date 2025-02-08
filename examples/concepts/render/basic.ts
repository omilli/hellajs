import { render } from "../../../lib";
import { HellaElement } from "../../../lib/dom/types";

const greeting: HellaElement<"div"> = {
  tag: "div",
  content: "Hello World",
};

render(greeting, "#app");
