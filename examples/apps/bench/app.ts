import { html, render } from "../../../lib";
import { benchStore } from "./store";

const { div, button, table, tr, td, h1, span } = html;

export const BenchApp = () =>
  div([
    div([
      h1("Benchmark App"),
      div([
        button({ onclick: benchStore.oneK }, "Create 1,000 rows"),
        button({ onclick: benchStore.tenK }, "Create 10,000 rows"),
        button({ onclick: benchStore.add }, "Append 1,000 rows"),
        button({ onclick: benchStore.update }, "Update every 10th"),
        button({ onclick: benchStore.clear }, "Clear rows"),
        button({ onclick: benchStore.swap }, "Swap 2nd and 10th"),
      ]),
    ]),
    table(
      benchStore.data().map((item) =>
        tr([
          td(item.id),
          td(
            {
              classes: { selected: item.selected },
              style: item.selected ? "color: red" : "",
              onclick: () => benchStore.select(item.id),
            },
            item.label
          ),
          td([
            span(
              {
                onclick: () => benchStore.remove(item.id),
              },
              "X"
            ),
          ]),
        ])
      )
    ),
  ]);

render(BenchApp, "#app");
