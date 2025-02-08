import { render, html } from "../../lib";

const { $, div, h1, h2, p, span } = html;

render(
  $([
    div({ class: "foo" }, h1("Foo")),
    div({ class: "bar" }, h2("Bar")),
    div({ class: "fizz" }, p("Fizz")),
    div({ class: "buzz" }, span("Buzz")),
  ]),
  "#app"
);
