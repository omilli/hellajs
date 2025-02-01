import { css, html, render, router, routerRedirect } from "../src";

const { nav, a } = html;

router.start({
  "/": "/bench",
  "/bench": async () => {
    const { BenchApp } = await import("./benchmark/app");
    render(BenchApp);
    return () => console.log("cleanup bench");
  },
  "/todo": async () => {
    const { TodoApp } = await import("./todo/app");
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
