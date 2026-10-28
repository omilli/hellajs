import rollupHellaJS from "rollup-plugin-hellajs";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";

const TERSER_OPTIONS = {
  module: true,
  compress: { passes: 3 },
  mangle: true,
};

export default {
  input: "src/main.tsx",
  output: {
    file: "dist/main.js",
    format: "iife",
  },
  plugins: [
    typescript(),
    rollupHellaJS(),
    resolve(),
    process.env.production && terser(TERSER_OPTIONS),
  ].filter(Boolean),
};
