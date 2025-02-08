import { store } from "../../../lib";

interface AppStore {
  counter: number;
  double: () => number;
}

const appStore = store<AppStore>((state) => ({
  counter: 0,
  double: () => state.counter() * 2,
}));

appStore.set({ counter: 1 });

console.log(appStore.counter());
console.log(appStore.double());
