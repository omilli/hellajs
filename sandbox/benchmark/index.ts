import { buildData } from "./data";
import { html, render, signal, List } from "../../lib";

const { Div, Table, Tbody, Tr, Td, Button, Span, A, H1 } = html;

interface BenchData {
  id: number;
  label: string;
}

const data = signal<BenchData[]>([]);
const Rows = List(data);
const selected = signal<number | undefined>(undefined);

const update = () => {
  const { store } = Rows;
  for (let i = 0, len = store.length; i < len; i += 10) {
    store[i].$update({ label: `${store[i].label} !!!` });
  }
};

const swapRows = () => {
  const { store } = Rows;
  if (store.length > 998) {
    const newData = [...store];
    [newData[1], newData[998]] = [newData[998], newData[1]];
    data.set(newData);
  }
};

const ActionButton = (
  id: string,
  label: string,
  onclick: () => void
) =>
  Div({ class: "col-sm-6" },
    Button(
      {
        id,
        class: 'btn btn-primary btn-block col-md-6',
        onclick
      },
      label
    )
  );

const Bench = Div({ id: 'main' },
  Div({ class: 'container' },
    Div({ class: 'jumbotron' },
      Div({ class: 'row' },
        Div({ class: 'col-md-6' }, H1('Benchmark')),
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
        Rows((row) =>
          Tr({
            class: () => (selected() === row.id ? 'danger' : ''),
            'data-id': row.id,
          },
            Td({ class: 'col-md-1' }, row.id),
            Td({ class: 'col-md-4' },
              A({
                class: 'lbl',
                onclick: () => selected.set(row.id)
              }, row.$.label),
            ),
            Td({ class: 'col-md-1' },
              A({
                class: 'remove',
                onclick: () => data.set(data().filter(i => i.id !== row.id))
              }, Span({ class: 'glyphicon glyphicon-remove', ariaHidden: 'true' })),
            ),
          )
        )
      ),
    ),
    Span({ class: 'preloadicon glyphicon glyphicon-remove' }, ''),
  ),
);

render(Bench);