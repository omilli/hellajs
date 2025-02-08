import { render, html, signal } from "../../lib";

const counter = signal(0);

const { div, p } = html;

const App = () =>
  div(
    {
      onRender: (element) => {
        console.log("div:after", element);
      },
    },
    p(
      {
        onPreRender: () => {
          const p = document.querySelector("p");
          console.log("p:before", p?.innerHTML);
        },
        onRender: () => {
          console.log("p:after", counter());
        },
      },
      counter
    )
  );

render(App, "#app");

setInterval(() => {
  counter.set(counter() + 1);
}, 5000);
