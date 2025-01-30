import { css, html } from "../../src";
import { benchStore } from "./store";

const { div, button, table, tr, td, h1 } = html;

export const BenchApp = () =>
  div({ mount: "app" }, [
    div([
      h1("Hella"),
      div([
        button({ onclick: benchStore.oneK }, "Create 1,000 rows"),
        button({ onclick: benchStore.tenK }, "Create 10,000 rows"),
        button({ onclick: benchStore.add }, "Append 1,000 rows"),
        button({ onclick: benchStore.update }, "Update every 10th row"),
        button({ onclick: benchStore.clear }, "Clear"),
        button({ onclick: benchStore.swap }, "Swap Rows"),
      ]),
    ]),
    table(() =>
      benchStore.data().map((item) =>
        tr([
          td(item.id),
          td(
            {
              style: item.selected ? "color: red" : "",
              onclick: () => benchStore.select(item.id),
            },
            item.label
          ),
          td(
            {
              css: css({ cursor: "pointer" }),
              onclick: () => benchStore.remove(item.id),
            },
            "X"
          ),
        ])
      )
    ),
  ]);
