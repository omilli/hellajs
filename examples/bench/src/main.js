import { signal, batch } from "@hellajs/core";
import { mount, html, template } from "../../../packages/dom";

const adjectives = ["pretty", "large", "big", "small", "tall", "short", "long", "handsome", "plain", "quaint", "clean", "elegant", "easy", "angry", "crazy", "helpful", "mushy", "odd", "unsightly", "adorable", "important", "inexpensive", "cheap", "expensive", "fancy"];
const colors = ["red", "yellow", "blue", "green", "pink", "brown", "purple", "brown", "white", "black", "orange"];
const nouns = ["table", "chair", "house", "bbq", "desk", "car", "pony", "cookie", "sandwich", "burger", "pizza", "mouse", "keyboard"];

const random = (max) => Math.round(Math.random() * 1000) % max;

let nextId = 1;

const buildData = (count) => {
  return Array.from({ length: count }, () => ({
    id: nextId++,
    label: signal(
      `${adjectives[random(adjectives.length)]} ${colors[random(colors.length)]} ${nouns[random(nouns.length)]}`
    )
  }));
};

const rows = signal([]);

const selected = signal(undefined);

const create = (count) => rows(buildData(count));

const append = (count) => rows([...rows(), ...buildData(count)])

const update = () => batch(() =>
  rows().forEach((row, i) => i % 10 === 0 && row.label(`${row.label()} !!!`))
);

const swap = () => {
  const list = [...rows()];
  if (list.length > 998) {
    let item = list[1];
    list[1] = list[998];
    list[998] = item;
    rows(list);
  }
};

const remove = (id) => rows(rows().filter(row => row.id !== id));

const clear = () => rows([]);

template("ActionButton", (props) => html`
  <div class="col-sm-6">
    <button
      id=${props.id}
      onClick=${props.onClick}
      class="btn btn-primary btn-block col-md-6"
      type="button"
    >
      ${props.text}
    </button>
  </div>
`);

const RowItem = template((row) => html`
  <tr class=${() => selected() === row.id ? 'danger' : ''} key=${row.id}>
    <td class="col-md-1">${row.id}</td>
    <td class="col-md-4">
      <a class="lbl" onClick=${() => selected(row.id)}>
        ${row.label}
      </a>
    </td>
    <td class="col-md-1">
      <a class="remove" onClick=${() => remove(row.id)}>
        <span class="glyphicon glyphicon-remove" ariaHidden="true"></span>
      </a>
    </td>
  </tr>
`);

mount(html`
  <div id="main">
    <div class="container">
      <div class="jumbotron">
        <div class="row">
          <div class="col-md-6">
            <h1>HellaJS Keyed</h1>
            <img src="logo.png" class="pull-right" alt="HellaJS Logo" />
          </div>
          <div class="col-md-6">
            <div class="row">
              <ActionButton id="run" onClick=${() => create(1000)} text="Create 1,000 rows"/>
              <ActionButton id="runlots" onClick=${() => create(10000)} text="Create 10,000 rows"/>
              <ActionButton id="add" onClick=${() => append(1000)} text="Append 1,000 rows"/>
              <ActionButton id="update" onClick=${update} text="Update every 10th row"/>
              <ActionButton id="clear" onClick=${clear} text="Clear"/>
              <ActionButton id="swaprows" onClick=${swap} text="Swap Rows"/>
            </div>
          </div>
        </div>
      </div>
      <table class="table table-hover table-striped test-rows">
        <tbody>
          <ForEach for=${rows} each=${(row) => RowItem(row)} />
        </tbody>
      </table>
      <span class="preloadicon glyphicon glyphicon-remove" ariaHidden="true"></span>
    </div>
  </div>
`);
