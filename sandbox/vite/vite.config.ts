import { defineConfig } from 'vite';
import rollupHellaJS from "../../plugins/rollup";

export default defineConfig({
  plugins: [rollupHellaJS()],
});