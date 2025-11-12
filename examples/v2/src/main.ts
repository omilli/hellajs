import { signal } from "@hellajs/core";
import { forEach, html, mount, on } from "./lib";

interface Row {
  id: number;
  label: string;
}

const ADJECTIVES = ["pretty", "large", "big", "small", "tall", "short", "long", "handsome", "plain", "quaint", "clean", "elegant", "easy", "angry", "crazy", "helpful", "mushy", "odd", "unsightly", "adorable", "important", "inexpensive", "cheap", "expensive", "fancy"];
const COLORS = ["red", "yellow", "blue", "green", "pink", "brown", "purple", "brown", "white", "black", "orange"];
const NOUNS = ["table", "chair", "house", "bbq", "desk", "car", "pony", "cookie", "sandwich", "burger", "pizza", "mouse", "keyboard"];

const random = (max: number) => Math.round(Math.random() * 1000) % max;

let nextId = 1;

const buildData = (count: number): Row[] => {
  const data: Row[] = [];
  let i = 0;
  while (i < count) {
    data.push({
      id: nextId++,
      label: `${ADJECTIVES[random(ADJECTIVES.length)]} ${COLORS[random(COLORS.length)]} ${NOUNS[random(NOUNS.length)]}`
    });
    i++;
  }
  return data;
};

const rows = signal<Row[]>([]);
const selected = signal<number | undefined>(undefined);

const run = () => rows(buildData(1000));
const runlots = () => rows(buildData(10000));
const add = () => rows([...rows(), ...buildData(1000)]);
const update = () => {
  const current = rows();
  const updated: Row[] = [];
  let i = 0;
  while (i < current.length) {
    const row = current[i]!;
    updated.push(i % 10 === 0 ? { id: row.id, label: `${row.label} !!!` } : row);
    i++;
  }
  rows(updated);
};
const clear = () => rows([]);
const swap = () => {
  const list = [...rows()];
  if (list.length > 998) {
    const temp = list[1]!;
    list[1] = list[998]!;
    list[998] = temp;
    rows(list);
  }
};

const selectRow = (el: Element) => {
  const id = Number(el.closest('tr')!.getAttribute('data-id'));
  selected(id);
};

const remove = (el: Element) => {
  const id = Number(el.closest('tr')!.getAttribute('data-id'));
  rows(rows().filter(row => row.id !== id));
};

const tbody = () => forEach(rows(), row => {
  const isDanger = selected() === row.id;
  return html`
    <tr data-key="${row.id}" class="${isDanger ? 'danger' : ''}" data-id="${row.id}">
      <td class="col-md-1">${row.id}</td>
      <td class="col-md-4">
        <a class="lbl">${row.label}</a>
      </td>
      <td class="col-md-1">
        <a class="remove">
          <span class="glyphicon glyphicon-remove"></span>
        </a>
      </td>
    </tr>`;
});

on({
  event: "click",
  target: ".lbl",
  handler: selectRow,
  delegate: ".container"
});

on({
  event: "click",
  target: ".remove",
  handler: remove,
  delegate: ".container"
});

const bench = () => {
  return html`<div id="main">
    <div class="container">
      <div class="jumbotron">
        <div class="row">
          <div class="col-md-6">
            <h1>HellaJS v2 Keyed</h1>
          </div>
          <div class="col-md-6">
            <div class="row">
              <div class="col-sm-6">
                <button id="run" class="btn btn-primary btn-block col-md-6" type="button" onClick="${run}">
                  Create 1,000 rows
                </button>
              </div>
              <div class="col-sm-6">
                <button id="runlots" class="btn btn-primary btn-block col-md-6" type="button" onClick="${runlots}">
                  Create 10,000 rows
                </button>
              </div>
              <div class="col-sm-6">
                <button id="add" class="btn btn-primary btn-block col-md-6" type="button" onClick="${add}">
                  Append 1,000 rows
                </button>
              </div>
              <div class="col-sm-6">
                <button id="update" class="btn btn-primary btn-block col-md-6" type="button" onClick="${update}">
                  Update every 10th row
                </button>
              </div>
              <div class="col-sm-6">
                <button id="clear" class="btn btn-primary btn-block col-md-6" type="button" onClick="${clear}">
                  Clear
                </button>
              </div>
              <div class="col-sm-6">
                <button id="swap" class="btn btn-primary btn-block col-md-6" type="button" onClick="${swap}">
                  Swap Rows
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <table class="table table-hover table-striped test-rows">
        <tbody>
          ${tbody()}
        </tbody>
      </table>
      <span class="preloadicon glyphicon glyphicon-remove" aria-hidden="true"></span>
    </div>
  </div>`;
};

mount(bench);
