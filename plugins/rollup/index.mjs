import { transformSync } from '@babel/core';
import babelHellaJS from 'babel-plugin-hellajs';
import presetTypeScript from '@babel/preset-typescript';

export default function rollupHellaJS() {
  return {
    name: 'rollup-plugin-hellajs',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('.jsx') && !id.endsWith('.tsx')) return null;
      const result = transformSync(code, {
        plugins: [babelHellaJS],
        presets: [presetTypeScript],
        filename: id,
        ast: false,
        sourceMaps: true,
        configFile: false,
      });
      if (typeof result?.code === 'string') {
        return { code: result.code, map: result.map || null };
      }
      return null;
    },
  };
}
