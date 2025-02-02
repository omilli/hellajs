import { css, html, render, router, routerRedirect } from "../src";

const appRouter = router();

appRouter.start({
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

const { $, a } = html;

const styles = {
  link: css({
    padding: 10,
    margin: 10,
    textDecoration: "none",
    cursor: "pointer",
    border: "1px solid rgba(255, 255, 255, 0.3)",
    borderRadius: 5,
    ":hover": {
      backgroundColor: "rgba(255, 255, 255, 0.1)",
    },
  }),
};

render(
  $({ mount: "#nav" }, [
    a(
      { css: styles.link, onclick: () => appRouter.navigate("/bench") },
      "Benchmark"
    ),
    a(
      { css: styles.link, onclick: () => appRouter.navigate("/todo") },
      () => "Todo"
    ),
  ])
);

// import { mount } from "../src";

// mount({ tag: "div", mount: "app", children: "Hello, World!" });
