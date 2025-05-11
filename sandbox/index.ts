// import "./bench"

import { html, signal, mount, forEach, show } from "@hellajs/core";

const { div, button, p, span } = html;

const items = signal<number[]>([]);
const showFoo = signal(true);

function Foo({ label }: { label: string }) {
  const foo = signal(label);

  return div(
    p({ onclick: () => items.set([]) }, foo),
  );
}

function Counter() {
  const count = signal(0);

  return div({ class: count },
    show(
      showFoo,
      Foo({ label: "Foo" }),
      div("Not Foo")
    ),
    button({ onclick: () => showFoo.set(!showFoo()) }, "Toggle Foo"),
    div(
      forEach(items, (item) => span(item))
    ),
    p("Count: ",
      span(count)
    ),
    button({ onclick: () => count.set(count() + 1) },
      "Increment"
    ),
    show(
      [() => count() > 10, div("Over 10")],
      [() => count() > 5 && count() <= 10, div("Over 5")],
      [div("Under 5")]
    ),
    () => count() % 2 === 0
      ? p("Even")
      : div("Odd"),
  )
}

function a(condition: any) {
  return () => {
    return condition;
  }
}

mount(Counter);
