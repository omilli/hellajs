import babelHellaJS from 'babel-plugin-hellajs';
import { transformSync } from '@babel/core';
import presetTypeScript from '@babel/preset-typescript';
import { readFileSync } from 'fs';

export default function rollupHellaJS() {
  return {
    name: 'rollup-plugin-hellajs',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source.endsWith('.jsx') || source.endsWith('.tsx')) {
        return this.resolve(source, importer, { skipSelf: true }).then(res => res && res.id);
      }
      return null;
    },
    load(id) {
      if (id.endsWith('.jsx') || id.endsWith('.tsx')) {
        const code = readFileSync(id, 'utf8');
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
        return { code: result.code, map: result.map };
      }
      return null;
    },
    transform(code, id) {
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
