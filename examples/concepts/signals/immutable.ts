import { immutable, effect, signal } from "../../../lib";

const maxRetries = immutable(3);

const config = immutable({
  apiUrl: "https://api.example.com",
  maxRetries: maxRetries(),
  timeout: 5000,
});

effect(() => {
  console.log("Config changed:", config());
});

config().timeout = 15000;

config.set({
  ...config(),
  timeout: 10000,
  maxRetries: 5,
});

const a = signal({
  value: 1,
  config: {
    validate: (val: number) => val > 0,
  },
});
