import { defineConfig } from 'vite';
import viteHellaJS from '../../plugins/vite/index.mjs';

export default defineConfig({
  plugins: [viteHellaJS()],
});
