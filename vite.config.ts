// vite.config.ts
import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [dts({ include: ["lib"] })],
  build: {
    target: "esnext",
    minify: "esbuild",
    lib: {
      entry: resolve(__dirname, "lib/index.ts"),
      name: "hella",
      fileName: (format) => `index.${format}.js`,
      formats: ["es", "umd", "cjs"],
    },
  },
  esbuild: {
    pure: ["console.warn", "console.error"],
    legalComments: "none",
  },
});
