import { defineConfig } from "vite";
export default defineConfig({
  build: {
    target: "esnext",
    minify: "esbuild",
    rollupOptions: {
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
      },
    },
  },
});
