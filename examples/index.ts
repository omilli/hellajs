import { html, render, router } from "../src";
import "./router";

const { nav, a } = html;

render(
  nav({ mount: "#nav" }, [
    a({ onclick: () => router.navigate("/bench") }, "Benchmark"),
    a({ onclick: () => router.navigate("/todo") }, "Todo"),
  ])
);
