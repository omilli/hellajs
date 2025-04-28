import { createSignal, createStore, h, setupReactiveVdom, type ReactiveObject, type RNode } from "../lib";
import { buildData } from "./benchmark/data";

interface BenchData {
  id: number;
  label: string;
}

function Bench(): RNode {
  const [items, setItems] = createSignal<ReactiveObject<BenchData>[]>([]);
  const [selected, setSelected] = createSignal<number | undefined>(undefined);

  const create = (count: number) => {
    setItems(buildData(count).map(item => createStore(item)));
  }

  const append = (count: number) => {
    setItems([...items(), ...buildData(count).map(item => createStore(item))]);
  };

  const update = () => {
    const newData = [...items()];
    for (let i = 0; i < newData.length; i += 10) {
      if (i < newData.length) {
        newData[i].set("label", `${newData[i].get("label")} !!!`);
      }
    }
    setItems(newData);
  };

  const remove = (id: number) => {
    const idx = items().findIndex((d) => d.get("id") === id);
    setItems([
      ...items().slice(0, idx),
      ...items().slice(idx + 1),
    ]);
  };

  const select = (id: number) => {
    setSelected(id);
  };

  const clear = () => {
    setItems([]);
  };

  const swapRows = () => {
    if (items().length > 998) {
      const newData = [...items()];
      const temp = newData[1];
      newData[1] = newData[998];
      newData[998] = temp;
      setItems(newData);
    }
  };

  return h("div", { id: "main" }, [
    h("div", { class: "container" }, [
      h("div", { class: "jumbotron" }, [
        h("div", { class: "row" }, [
          h("div", { class: "col-md-6" }, [
            h("h1", {}, "Benchmark")
          ]),
          h("div", { class: "row" }, [
            h("button", { onClick: () => create(1000), class: "btn btn-primary btn-block" }, "Create 1,000 rows"),
            h("button", { onClick: () => create(10000), class: "btn btn-primary btn-block", }, "Create 10,000 rows"),
            h("button", { onClick: () => append(1000), class: "btn btn-primary btn-block", }, "Append 1,000 rows"),
            h("button", { onClick: update, class: "btn btn-primary btn-block", }, "Update every 10th row"),
            h("button", { onClick: clear, class: "btn btn-primary btn-block", }, "Clear"),
            h("button", { onClick: swapRows, class: "btn btn-primary btn-block", }, "Swap Rows"),
          ])
        ]),

      ]),
      h("table", { class: "table table-hover table-striped test-data" }, [
        h(
          "tbody",
          { id: "tbody" },
          () => items().map((item) =>
            h(
              "tr",
              {
                key: item.get("id"),
                todo: item,
                class: () => selected() === item.get("id") ? "danger" : ""
              },
              [
                h("td", { class: "col-md-1" }, () => item.get("id")),
                h("td", { class: "col-md-4" }, [
                  h("a", {
                    class: "lbl",
                    onclick: () => select(item.get("id"))
                  },
                    () => item.get("label"))
                ]),
                h(
                  "td",
                  { class: "col-md-1" },
                  h("a",
                    {
                      class: "remove",
                      onclick: () => remove(item.get("id")),
                    },
                    h("span", { class: "glyphicon glyphicon-remove", ariaHidden: "true" }, [])
                  )
                ),
              ]
            )
          )
        ),
      ]),
      h("span", { class: "preloadicon glyphicon glyphicon-remove" }, "")
    ])
  ])
};

// Initialize the app
const app = document.getElementById("app");
if (app) {
  const vdom = Bench();
  setupReactiveVdom(vdom, app, app);
}