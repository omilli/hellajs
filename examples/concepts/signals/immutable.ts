import { immutable } from "../../../lib";

const config = immutable("config", {
  apiUrl: "https://api.example.com",
  maxRetries: 3,
  timeout: 5000,
});

console.log(config());

// config.set({ ...config(), maxRetries: 5 });
config().timeout = 10000;

console.log(config());
