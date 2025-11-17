import rollupHellaJS from '../../plugins/rollup/index.mjs';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

export default {
  input: 'src/main.ts',
  output: {
    file: 'dist/main.js',
    format: 'iife',
  },
  plugins: [
    rollupHellaJS(),
    resolve(),
    terser(),
  ],
};
