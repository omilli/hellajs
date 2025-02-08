import { store } from "../../../lib";

interface AppStore {
  readProp: number;
  mutableProp: number;
  setImmutable: (value: number) => void;
}

const appStore = store<AppStore>(
  (state) => ({
    readProp: 0,
    mutableProp: 0,
    setImmutable: (value: number) => state.readProp.set(value),
  }),
  { readonly: ["readProp"] } // Set true for all properties
);

appStore.readProp.set(2); // Warning: Cannot modify readonly store signal
appStore.mutableProp.set(5);
appStore.setImmutable(10);
console.log(appStore.readProp(), appStore.mutableProp()); // 10, 5
