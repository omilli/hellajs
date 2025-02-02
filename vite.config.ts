// vite.config.ts
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "esnext",
  },
  esbuild: {
    pure: ["console.warn", "console.error"],
    legalComments: "none",
  },
});
