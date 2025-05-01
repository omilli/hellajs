import { html, render, signal, List, Component, type Signal } from "../../lib";

const { Div, Table, Tbody, Tr, Td, Button, Span, A, H1 } = html;

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
  for (let i = 0, d = data(), len = d.length; i < len; i += 10) {
    d[i].label.set(`${d[i].label()} !!!`);
  }
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
) => Component(() =>
  Div({ class: "col-sm-6" },
    Button({ id, onclick, class: 'btn btn-primary btn-block col-md-6' },
      label
    )
  )
);

const DataRows = Component(data, (row) =>
  Tr({ 'data-id': row.id, class: () => (selected() === row.id ? 'danger' : '') },
    Td({ class: 'col-md-1' }, row.id),
    Td({ class: 'col-md-4' },
      A({ class: 'lbl', onclick: () => selected.set(row.id) },
        row.label
      ),
    ),
    Td({ class: 'col-md-1' },
      A({ class: 'remove', onclick: () => data.set(data().filter(i => i.id !== row.id)) },
        Span({ class: 'glyphicon glyphicon-remove', ariaHidden: 'true' })
      ),
    ),
  )
);

const Bench = Component(() =>
  Div({ id: 'main' },
    Div({ class: 'container' },
      Div({ class: 'jumbotron' },
        Div({ class: 'row' },
          Div({ class: 'col-md-6' }, H1('HellaJS Keyed')),
          Div({ class: 'col-md-6' },
            Div({ class: 'row' },
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
      Table({ class: 'table table-hover table-striped test-data' },
        Tbody({ id: 'tbody' },
          DataRows
        ),
      ),
      Span({ class: 'preloadicon glyphicon glyphicon-remove' }, ''),
    ),
  )
);

render(Bench);