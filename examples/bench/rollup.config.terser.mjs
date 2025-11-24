import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/main.ts',
  output: {
    file: 'dist/main.js',
    format: 'iife',
  },
  plugins: [
    typescript({
      tsconfig: './src/tsconfig.json',
    }),
    resolve(),
    terser(),
  ],
};
