import { signal, batch } from "../../../packages/core/dist/core.js";
import { forEach, mount } from "../../../packages/dom/dist/dom.js";

const adjectives = ["pretty", "large", "big", "small", "tall", "short", "long", "handsome", "plain", "quaint", "clean", "elegant", "easy", "angry", "crazy", "helpful", "mushy", "odd", "unsightly", "adorable", "important", "inexpensive", "cheap", "expensive", "fancy"];
const colors = ["red", "yellow", "blue", "green", "pink", "brown", "purple", "brown", "white", "black", "orange"];
const nouns = ["table", "chair", "house", "bbq", "desk", "car", "pony", "cookie", "sandwich", "burger", "pizza", "mouse", "keyboard"];

const random = (max) => Math.round(Math.random() * 1000) % max;

let nextId = 1;

const buildData = (count) => {
  let d = new Array(count);
  for (let i = 0; i < count; i++) {
    const label = signal(
      `${adjectives[random(adjectives.length)]} ${colors[random(colors.length)]} ${nouns[random(nouns.length)]}`
    );
    d[i] = { id: nextId++, label };
  }
  return d;
};

const ActionButton = (props) => (
  <div class="col-sm-6">
    <button
      {...props}
      class="btn btn-primary btn-block col-md-6"
      type="button"
    >
      {props.children}
    </button>
  </div>
);

function Bench() {
  const rows = signal([]);
  const selected = signal(undefined);

  const create = (count) => rows(buildData(count));

  const append = (count) => rows([...rows(), ...buildData(count)])

  const update = () => {
    batch(() => {
      for (let i = 0, d = rows(), len = d.length; i < len; i += 10) {
        const label = d[i].label;
        label(`${label()} !!!`);
      }
    })
  };

  const swap = () => {
    const list = rows().slice();
    if (list.length > 998) {
      let item = list[1];
      list[1] = list[998];
      list[998] = item;
      rows(list);
    }
  };

  const remove = (id) => rows(rows().filter(row => row.id !== id));

  const clear = () => rows([]);

  return (
    <div id="main">
      <div class="container">
        <div class="jumbotron">
          <div class="row">
            <div class="col-md-6">
              <h1>HellaJS Keyed</h1>
            </div>
            <div class="col-md-6">
              <div class="row">
                <ActionButton id="create" onClick={create(1000)}>
                  Create 1,000 rows
                </ActionButton>
                <ActionButton id="runlots" onClick={create(10000)}>
                  Create 10,000 rows
                </ActionButton>
                <ActionButton id="add" onClick={append(1000)}>
                  Append 1,000 rows
                </ActionButton>
                <ActionButton id="update" onClick={update}>
                  Update every 10th row
                </ActionButton>
                <ActionButton id="clear" onClick={clear}>
                  Clear
                </ActionButton>
                <ActionButton id="swaprows" onClick={swap}>
                  Swap Rows
                </ActionButton>
              </div>
            </div>
          </div>
        </div>
        <table class="table table-hover table-striped test-rows">
          <tbody>
            {forEach(rows, (row) => (
              <tr class={selected() === row.id ? 'danger' : ''} key={row.id}>
                <td class="col-md-1">{row.id}</td>
                <td class="col-md-4">
                  <a class="lbl" onClick={selected(row.id)}>
                    {row.label()}
                  </a>
                </td>
                <td class="col-md-1">
                  <a class="remove" onClick={remove(row.id)}>
                    <span class="glyphicon glyphicon-remove" ariaHidden="true"></span>
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <span class="preloadicon glyphicon glyphicon-remove"></span>
      </div>
    </div>
  );
}

mount(Bench);
