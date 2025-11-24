import { signal, batch } from "@hellajs/core";

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

export const rows = signal([]);

export const selected = signal(undefined);

export const create = (count) => rows(buildData(count));

export const append = (count) => rows([...rows(), ...buildData(count)]);

export const update = () => batch(() =>
  rows().forEach((row, i) => i % 10 === 0 && row.label(`${row.label()} !!!`))
);

export const swap = () => {
  const list = [...rows()];
  if (list.length > 998) {
    let item = list[1];
    list[1] = list[998];
    list[998] = item;
    rows(list);
  }
};

export const remove = (id) => rows(rows().filter(row => row.id !== id));

export const clear = () => rows([]);
