import { store } from "../../../lib";

interface AppStore {
  counter: number;
  double: () => number;
}

const appStore = store<AppStore>((state) => ({
  counter: 0,
  double: () => state.counter() * 2,
}));

appStore.effect(() => {
  console.log("Counter changed:", appStore.counter(), appStore.double());
});

appStore.set({ counter: 1 });

setTimeout(() => {
  appStore.cleanup();
  // This will not trigger the effect
  appStore.set({ counter: 10 });
  appStore.counter.set(20);
  console.log(appStore.counter());
}, 1000);
