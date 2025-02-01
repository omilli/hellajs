import { css, html } from "../../src";
import { benchStore } from "./store";

const { div, button, table, tr, td, h1, span } = html;

export const BenchApp = () =>
  div({ mount: "app" }, [
    div({ css: css({ margin: 10 }) }, [
      h1("Benchmark App"),
      div(
        {
          css: css({
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
          }),
        },
        [
          button({ onclick: benchStore.oneK }, "Create 1,000 rows"),
          button({ onclick: benchStore.tenK }, "Create 10,000 rows"),
          button({ onclick: benchStore.add }, "Append 1,000 rows"),
          button({ onclick: benchStore.update }, "Update every 10th"),
          button({ onclick: benchStore.clear }, "Clear rows"),
          button({ onclick: benchStore.swap }, "Swap 2nd and 10th"),
        ]
      ),
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
          td([
            span(
              {
                onclick: () => benchStore.remove(item.id),
              },
              "X"
            ),
          ]),
          td(span(item.id)),
        ])
      )
    ),
  ]);
