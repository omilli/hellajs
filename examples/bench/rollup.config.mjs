import rollupHellaJS from "rollup-plugin-hellajs";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

export default {
  input: "src/main.tsx",
  output: {
    file: "dist/main.js",
    format: "iife",
  },
  plugins: [typescript(), rollupHellaJS(), resolve()],
};
