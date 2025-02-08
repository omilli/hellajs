import { store } from "../../../lib";
import { buildData } from "./data";

type BenchRow = { id: number; label: string; selected: boolean };

type BenchStore = {
  data: BenchRow[];
  oneK: () => void;
  tenK: () => void;
  add: () => void;
  update: () => void;
  swap: () => void;
  clear: () => void;
  remove: (id: number) => void;
  select: (id: number) => void;
};

export const benchStore = store<BenchStore>(
  (state) => {
    const build = (count: number) => {
      state.data.set(buildData(count));
    };

    const update = () => {
      state.data.set([
        ...state.data().map((item, idx) => {
          if (idx % 10 === 0) {
            return { ...item, label: item.label + " !!!" };
          }
          return item;
        }),
      ]);
    };

    const swap = () => {
      const newData = [...state.data()];
      [newData[1], newData[10]] = [newData[10], newData[1]];
      state.data.set(newData);
    };

    const clear = () => {
      state.data.set([]);
    };

    const remove = (id: number) => {
      const newData = state.data().filter((d) => d.id !== id);
      state.data.set(newData);
    };

    const select = (id: number) => {
      state.data.set([
        ...state.data().map((item) =>
          item.id !== id
            ? item
            : {
                ...item,
                selected: !item.selected,
              }
        ),
      ]);
    };

    return {
      data: [],
      selected: 0,
      oneK: () => build(1000),
      tenK: () => build(10000),
      add: () => state.data.set([...state.data(), ...buildData(1000)]),
      update,
      swap,
      clear,
      remove,
      select,
    };
  },
  { readonly: [] }
);
