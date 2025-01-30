import { html, render, router, routerRedirect } from "../src";
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
  nav({ mount: "nav" }, [
    a({ onclick: () => router.navigate("/bench") }, "Benchmark"),
    a({ onclick: () => router.navigate("/todo") }, () => "Todo"),
  ])
);
