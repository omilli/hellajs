import { buildData } from "./data";
import { html, render, signal, deepSignal, type DeepSignal } from "../../lib";

const { Div, Table, Tbody, Tr, Td, Button, Span, A, H1 } = html;

interface BenchData {
  id: number;
  label: string;
}

type ReactiveRow = DeepSignal<BenchData>;

const items = signal<ReactiveRow[]>([]);
const selected = signal<number | undefined>(undefined);

const create = (count: number) => {
  const data = buildData(count);
  const stores = new Array<ReactiveRow>(count);
  for (let i = 0; i < count; i++) {
    stores[i] = deepSignal(data[i]);
  }
  items.set(stores);
};

const append = (count: number) => {
  const current = items();
  const data = buildData(count);
  const newItems = new Array<ReactiveRow>(count);
  for (let i = 0; i < count; i++) {
    newItems[i] = deepSignal(data[i]);
  }
  items.set([...current, ...newItems]);
};

const update = () => {
  const data = items();
  for (let i = 0; i < data.length; i += 10) {
    data[i].update({ label: data[i]('label') + ' !!!' });
  }
};

const remove = (id: number) => {
  const data = items();
  for (let i = 0; i < data.length; i++) {
    if (data[i]('id') === id) {
      const newData = data.slice(0, i).concat(data.slice(i + 1));
      items.set(newData);
      break;
    }
  }
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
  const getId = () => item('id');
  const getLabel = () => item('label');
  const getClass = () => (selected() === item('id') ? 'danger' : '');
  const vNode = Tr(
    {
      key: item('id'),
      item: item,
      class: getClass,
      'data-id': item('id'),
    },
    Td({ class: 'col-md-1' }, getId),
    Td({ class: 'col-md-4' },
      A({
        class: 'lbl',
        onClick: () => select(item('id'))
      }, getLabel),
    ),
    Td({ class: 'col-md-1' },
      A({
        class: 'remove',
        onClick: () => remove(item('id'))
      }, Span({ class: 'glyphicon glyphicon-remove', ariaHidden: 'true' })),
    ),
  );
  return vNode;
};

const ActionButton = (
  id: string,
  label: string,
  onClick: () => void
) => Button(
  {
    id,
    class: 'btn btn-primary btn-block',
    onClick
  },
  label
);

const Bench = Div({ id: 'main' },
  Div({ class: 'container' },
    Div({ class: 'jumbotron' },
      Div({ class: 'row' },
        Div({ class: 'col-md-6' }, H1('Benchmark')),
        Div({ class: 'row' },
          ActionButton('run', 'Create 1,000 rows', () => create(1000)),
          ActionButton('runlots', 'Create 10,000 rows', () => create(10000)),
          ActionButton('append', 'Append 1,000 rows', () => append(1000)),
          ActionButton('update', 'Update every 10th row', () => update()),
          ActionButton('clear', 'Clear', () => clear()),
          ActionButton('swaprows', 'Swap Rows', () => swapRows()),
        ),
      ),
    ),
    Table({ class: 'table table-hover table-striped test-data' },
      Tbody({ id: 'tbody' },
        () => {
          const rows = items().map((item) => Row(item));
          return rows;
        }
      ),
    ),
    Span({ class: 'preloadicon glyphicon glyphicon-remove' }, ''),
  ),
);

render(Bench);