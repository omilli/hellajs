import { html, render, signal, For, Component, type Signal, batch } from "@hellajs/core";

const { div, table, tbody, tr, td, button, span, a, h1 } = html;

const adjectives = ["pretty", "large", "big", "small", "tall", "short", "long", "handsome", "plain", "quaint", "clean", "elegant", "easy", "angry", "crazy", "helpful", "mushy", "odd", "unsightly", "adorable", "important", "inexpensive", "cheap", "expensive", "fancy"];
const colors = ["red", "yellow", "blue", "green", "pink", "brown", "purple", "brown", "white", "black", "orange"];
const nouns = ["table", "chair", "house", "bbq", "desk", "car", "pony", "cookie", "sandwich", "burger", "pizza", "mouse", "keyboard"];

const random = (max: number) => Math.round(Math.random() * 1000) % max;

let nextId = 1;

const buildData = (count: number) => {
  let data = new Array(count);
  for (let i = 0; i < count; i++) {
    const label = signal(
      `${adjectives[random(adjectives.length)]} ${colors[random(colors.length)]} ${nouns[random(nouns.length)]}`
    );
    data[i] = { id: nextId++, label };
  }
  return data;
};

interface BenchData {
  id: number;
  label: Signal<string>;
}

const data = signal<BenchData[]>([]);
const selected = signal<number | undefined>(undefined);

const update = () => {
  batch(() => {
    for (let i = 0, d = data(), len = d.length; i < len; i += 10) {
      d[i].label.set(`${d[i].label()} !!!`);
    }
  })
};

const swapRows = () => {
  const list = data().slice();
  if (list.length > 998) {
    let item = list[1];
    list[1] = list[998];
    list[998] = item;
    data.set(list);
  }
};

const ActionButton = (
  id: string,
  label: string,
  onclick: () => void
) =>
  div({ class: "col-sm-6" },
    button({ id, onclick, class: 'btn btn-primary btn-block col-md-6' },
      label
    )
  )

const Bench = Component(() =>
  div({ id: 'main' },
    div({ class: 'container' },
      div({ class: 'jumbotron' },
        div({ class: 'row' },
          div({ class: 'col-md-6' }, h1('HellaJS Keyed')),
          div({ class: 'col-md-6' },
            div({ class: 'row' },
              ActionButton('run', 'Create 1,000 rows', () => data.set(buildData(1000))),
              ActionButton('runlots', 'Create 10,000 rows', () => data.set(buildData(10000))),
              ActionButton('append', 'Append 1,000 rows', () => data.set([...data(), ...buildData(1000)])),
              ActionButton('update', 'Update every 10th row', () => update()),
              ActionButton('clear', 'Clear', () => data.set([])),
              ActionButton('swaprows', 'Swap Rows', () => swapRows()),
            )
          ),
        ),
      ),
      table({ class: 'table table-hover table-striped test-data' },
        tbody({ id: 'tbody' },
          For(data, (row) =>
            tr({ key: row.id, 'data-id': row.id, class: () => (selected() === row.id ? 'danger' : '') },
              td({ class: 'col-md-1' }, row.id),
              td({ class: 'col-md-4' },
                a({ class: 'lbl', onclick: () => selected.set(row.id) },
                  row.label
                ),
              ),
              td({ class: 'col-md-1' },
                a({ class: 'remove', onclick: () => data.set(data().filter(i => i.id !== row.id)) },
                  span({ class: 'glyphicon glyphicon-remove', ariaHidden: 'true' })
                ),
              ),
            )
          )
        ),
      ),
      span({ class: 'preloadicon glyphicon glyphicon-remove' }, ''),
    ),
  )
);

render(Bench);