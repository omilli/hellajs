import { buildData } from "./data";
import { html, render, signal, record, type RecordSignal } from "../../lib";

const { Div, Table, Tbody, Tr, Td, Button, Span, A, H1 } = html;

interface BenchData {
  id: number;
  label: string;
}

type ReactiveRow = RecordSignal<BenchData>;

const items = signal<ReactiveRow[]>([]);
const selected = signal<number | undefined>(undefined);

const create = (count: number) => {
  const data = buildData(count);
  const reactiveItems = data.map(item => record(item));
  items.set(reactiveItems);
};

const append = (count: number) => {
  items.set([
    ...items(),
    ...buildData(count).map(item => record(item))
  ]);
};

const update = () => {
  const data = items();
  for (let i = 0, len = data.length; i < len; i += 10) {
    data[i].update({ label: data[i]('label') + ' !!!' });
  }
};

const remove = (id: number) => {
  items.set(items().filter(item => item("id") !== id));
};

const select = (id: number) => {
  selected.set(id);
};

const clear = () => {
  items.set([]);
};

const swapRows = () => {
  const data = items();
  if (data.length > 998) {
    const newData = [...data];
    [newData[1], newData[998]] = [newData[998], newData[1]];
    items.set(newData);
  }
};

const Row = (item: ReactiveRow) => {
  const id = item('id');
  const label = () => item('label');

  return Tr({
    key: id,
    item: item,
    class: () => (selected() === id ? 'danger' : ''),
    'data-id': id,
  },
    Td({ class: 'col-md-1' }, id),
    Td({ class: 'col-md-4' },
      A({
        class: 'lbl',
        onclick: () => select(id)
      }, label()),
    ),
    Td({ class: 'col-md-1' },
      A({
        class: 'remove',
        onclick: () => remove(id)
      }, Span({ class: 'glyphicon glyphicon-remove', ariaHidden: 'true' })),
    ),
  );
}

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
            ActionButton('run', 'Create 1,000 rows', () => create(1000)),
            ActionButton('runlots', 'Create 10,000 rows', () => create(10000)),
            ActionButton('append', 'Append 1,000 rows', () => append(1000)),
            ActionButton('update', 'Update every 10th row', () => update()),
            ActionButton('clear', 'Clear', () => clear()),
            ActionButton('swaprows', 'Swap Rows', () => swapRows()),
          )
        ),
      ),
    ),
    Table({ class: 'table table-hover table-striped test-data' },
      Tbody({ id: 'tbody' },
        () => items().map((item) => Row(item))
      ),
    ),
    Span({ class: 'preloadicon glyphicon glyphicon-remove' }, ''),
  ),
);

render(Bench);