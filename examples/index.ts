import { css, html, render, router, routerRedirect } from "../src";
import { BenchApp } from "./benchmark/app";
import { TodoApp } from "./todo/app";

const { nav, a } = html;

router.start({
  "/bench": () => {
    render(BenchApp);
  },
  "/todo": () => {
    render(TodoApp);
  },
});

routerRedirect("/", "/bench");

render(
  nav(
    {
      mount: "nav",
      css: css({
        padding: 10,
        a: {
          cursor: "pointer",
        },
      }),
    },
    [
      a({ onclick: () => router.navigate("/bench") }, "Benchmark"),
      a({ onclick: () => router.navigate("/todo") }, () => "Todo"),
    ]
  )
);
