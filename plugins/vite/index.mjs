import { transformSync } from '@babel/core';
import babelHellaJS from '../babel/index.mjs';

export default function viteHellaJS() {
  return {
    name: 'vite-plugin-hellajs',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('.jsx') && !id.endsWith('.tsx')) return null;
      const result = transformSync(code, {
        plugins: [babelHellaJS],
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
