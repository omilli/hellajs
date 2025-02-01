// vite.config.ts
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "esnext",
    minify: "esbuild",
    rollupOptions: {
      treeshake: {},
    },
  },
  esbuild: {
    pure: ["console.log", "console.warn", "console.error"],
    legalComments: "none",
  },
});
