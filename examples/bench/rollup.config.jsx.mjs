import rollupHellaJS from '../../plugins/rollup/index.mjs';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src-jsx/main.tsx',
  output: {
    file: 'dist/main.js',
    format: 'iife',
  },
  plugins: [
    typescript({
      tsconfig: './src-jsx/tsconfig.json',
    }),
    rollupHellaJS(),
    resolve(),
    terser(),
  ],
};
