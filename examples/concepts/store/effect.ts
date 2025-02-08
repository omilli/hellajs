import { effect, store } from "../../../lib";

interface AppStore {
  counter: number;
  double: () => number;
}

const appStore = store<AppStore>((state) => ({
  counter: 0,
  double: () => state.counter() * 2,
}));

effect(() => {
  const state = appStore.computed();
  console.log("Store state:", {
    counter: state.counter,
    double: state.double,
  });
});

setInterval(() => {
  appStore.set({ counter: appStore.counter() + 1 });
}, 1000);
