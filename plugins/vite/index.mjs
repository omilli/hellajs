import babelHellaJS from 'babel-plugin-hellajs';
import { transformSync } from '@babel/core';
import presetTypeScript from '@babel/preset-typescript';

export default function viteHellaJS() {
  return {
    name: 'vite-plugin-hellajs',
    enforce: 'pre',
    async transform(code, id) {
      // Transform all JS/TS files for JSX and html`` templates
      if (!id.endsWith('.jsx') && !id.endsWith('.tsx') && !id.endsWith('.js') && !id.endsWith('.ts')) return null;

      // Skip node_modules
      if (id.includes('node_modules')) return null;

      const result = transformSync(code, {
        plugins: [babelHellaJS],
        presets: id.endsWith('.tsx') || id.endsWith('.ts') ? [presetTypeScript] : [],
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
