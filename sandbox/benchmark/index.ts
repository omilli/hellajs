import { buildData } from "./data";
import { html, render, signal, store, List, type Store } from "../../lib";
import { computed } from "../../lib/reactive";

const { Div, Table, Tbody, Tr, Td, Button, Span, A, H1 } = html;

interface BenchData {
  id: number;
  label: string;
}

type ReactiveRow = Store<BenchData>;

const data = signal<BenchData[]>([]);
const rows = computed<ReactiveRow[]>(() => data().map(item => store(item)));
const selected = signal<number | undefined>(undefined);

const update = () => {
  const rowData = rows();
  for (let i = 0, len = rowData.length; i < len; i += 10) {
    rowData[i].$update({ label: `${rowData[i].label} !!!` });
  }
};

const swapRows = () => {
  const rowData = rows();
  if (rowData.length > 998) {
    const newData = [...rowData];
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
        () => List(rows).map((item) =>
          Tr({
            class: () => (selected() === item.id ? 'danger' : ''),
            'data-id': item.id,
          },
            Td({ class: 'col-md-1' }, item.id),
            Td({ class: 'col-md-4' },
              A({
                class: 'lbl',
                onclick: () => selected.set(item.id)
              }, item.$.label),
            ),
            Td({ class: 'col-md-1' },
              A({
                class: 'remove',
                onclick: () => data.set(data().filter(i => i.id !== item.id))
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