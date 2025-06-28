import { transformSync } from '@babel/core';
import babelHellaJS from '../babel';
import presetTypeScript from '@babel/preset-typescript';

export default function viteHellaJS() {
  return {
    name: 'vite-plugin-hellajs',
    enforce: 'pre',
    async transform(code, id) {
      if (!id.endsWith('.jsx') && !id.endsWith('.tsx')) return null;
      const result = transformSync(code, {
        plugins: [babelHellaJS],
        presets: [presetTypeScript],
        filename: id,
        ast: false,
        sourceMaps: true,
        configFile: false,
        babelrc: false,
        parserOpts: { plugins: ['jsx'] },
      });
      if (typeof result?.code === 'string') {
        return { code: result.code, map: result.map || null };
      }
      return null;
    },
  };
}
