import { html, render, router, signal } from "../src";
import "./router";

const { nav, a } = html;

const bench = signal("Benchmark");

render(
  nav({ mount: "#nav" }, [
    a(
      {
        class: bench,
        onclick: () => {
          router.navigate("/bench");
        },
      },
      bench
    ),
    a({ onclick: () => router.navigate("/todo") }, () => "Todo"),
  ])
);
