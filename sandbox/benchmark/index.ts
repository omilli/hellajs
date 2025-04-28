import { buildData } from "./data";
import { html, type VNode, rdom } from "../../src/dom";
import { createSignal, createStore, type ReactiveObject } from "../../src/reactive";

const { Div, Table, Tbody, Tr, Td, Button, Span, A, H1 } = html;

interface BenchData {
  id: number;
  label: string;
}

type ReactiveRow = ReactiveObject<BenchData>;

const items = createSignal<ReactiveRow[]>([]);
const selected = createSignal<number | undefined>(undefined);

const create = (count: number) => {
  items.set(buildData(count).map(item => createStore(item)));
};

const append = (count: number) => {
  items.set([...items.get(), ...buildData(count).map(item => createStore(item))]);
};

const update = () => {
  const data = items.get();
  for (let i = 0; i < data.length; i += 10) {
    if (data[i]) data[i].set('label', data[i].get('label') + ' !!!');
  }
};

const remove = (id: number) => {
  const data = [...items.get()];
  const idx = data.findIndex(d => d?.get('id') === id);
  if (idx !== -1) {
    data.splice(idx, 1);
    items.set(data);
  }
};

const select = (id: number) => {
  selected.set(id);
};

const clear = () => {
  items.set([]);
};

const swapRows = () => {
  const data = items.get();
  if (data.length > 998 && data[1] && data[998]) {
    const newData = [...data];
    newData[1] = data[998];
    newData[998] = data[1];
    items.set(newData);
  }
};

function Row(item: ReactiveRow): VNode {
  return Tr(
    {
      key: item.get('id'),
      item: item,
      class: () => (selected.get() === item.get('id') ? 'danger' : ''),
      'data-id': item.get('id'),
    },
    Td({ class: 'col-md-1' }, () => item.get('id')),
    Td({ class: 'col-md-4' },
      A({ class: 'lbl', onClick: () => select(item.get('id')) }, () => item.get('label')),
    ),
    Td({ class: 'col-md-1' },
      A({ class: 'remove', onClick: () => remove(item.get('id')) },
        Span({ class: 'glyphicon glyphicon-remove', ariaHidden: 'true' }),
      ),
    ),
  );
}

function DataTable(): VNode {
  return Table(
    { class: 'table table-hover table-striped test-data' },
    Tbody(
      { id: 'tbody' },
      () => items.get().map(item => Row(item))
    ),
  );
}

const Bench = Div({ id: 'main' },
  Div({ class: 'container' },
    Div({ class: 'jumbotron' },
      Div({ class: 'row' },
        Div({ class: 'col-md-6' }, H1({}, 'Benchmark')),
        Div({ class: 'row' },
          Button(
            { onClick: () => create(1000), class: 'btn btn-primary btn-block' },
            'Create 1,000 rows'
          ),
          Button(
            { onClick: () => create(10000), class: 'btn btn-primary btn-block' },
            'Create 10,000 rows'
          ),
          Button(
            { onClick: () => append(1000), class: 'btn btn-primary btn-block' },
            'Append 1,000 rows'
          ),
          Button(
            { onClick: update, class: 'btn btn-primary btn-block' },
            'Update every 10th row'
          ),
          Button({ onClick: clear, class: 'btn btn-primary btn-block' }, 'Clear'),
          Button({ onClick: swapRows, class: 'btn btn-primary btn-block' }, 'Swap Rows'),
        ),
      ),
    ),
    DataTable(),
    Span({ class: 'preloadicon glyphicon glyphicon-remove' }, ''),
  ),
);

const app = document.getElementById('app');
if (app) {
  rdom(Bench, app);
} else {
  console.error('No #app element found');
}