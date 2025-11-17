import { signal, batch, type Signal } from "@hellajs/core";

export interface RowSchema {
  id: number;
  label: Signal<string>;
}

const adjectives = ["pretty", "large", "big", "small", "tall", "short", "long", "handsome", "plain", "quaint", "clean", "elegant", "easy", "angry", "crazy", "helpful", "mushy", "odd", "unsightly", "adorable", "important", "inexpensive", "cheap", "expensive", "fancy"];
const colors = ["red", "yellow", "blue", "green", "pink", "brown", "purple", "brown", "white", "black", "orange"];
const nouns = ["table", "chair", "house", "bbq", "desk", "car", "pony", "cookie", "sandwich", "burger", "pizza", "mouse", "keyboard"];

const random = (max: number) => Math.round(Math.random() * 1000) % max;

let nextId = 1;

const buildData = (count: number) => {
  return Array.from({ length: count }, () => ({
    id: nextId++,
    label: signal(
      `${adjectives[random(adjectives.length)]} ${colors[random(colors.length)]} ${nouns[random(nouns.length)]}`
    )
  }));
};

export const rows = signal<RowSchema[]>([]);

export const selected = signal<number | undefined>(undefined);

export const create = (count: number) => rows(buildData(count));

export const append = (count: number) => rows([...rows(), ...buildData(count)]);

export const update = () => batch(() =>
  rows().forEach((row, i) => i % 10 === 0 && row.label(`${row.label()} !!!`))
);

export const swap = () => {
  const list = [...rows()];
  if (list.length > 998) {
    let item = list[1]!;
    list[1] = list[998]!;
    list[998] = item;
    rows(list);
  }
};

export const remove = (id: number) => rows(rows().filter(row => row.id !== id));

export const clear = () => rows([]);