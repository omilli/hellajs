import { store } from "../../../lib";

interface AppStore {
  counter: number;
  double: () => number;
  setCounter: (value: number) => void;
}

const appStore = store<AppStore>(
  (state) => ({
    counter: 0,
    double: () => state.counter() * 2,
    setCounter: (value: number) => state.counter.set(value), // Internal updates work
  }),
  { readonly: true }
);

//External updates are prevented
appStore.counter.set(2); // Warning: Cannot modify readonly store signal
appStore.set({ counter: 3 }); // Warning: Cannot modify readonly store
console.log(appStore.counter()); // 0

// Internal updates through methods should work but dont
appStore.setCounter(10);
console.log(appStore.counter()); // 10
