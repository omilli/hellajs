import { createFilter } from '@rollup/pluginutils';
import { transformAsync } from '@babel/core';
import babelHellaJS from './babel-hellajs.mjs'; // Rename your Babel plugin file if needed

export default function rollupHellaJS(options = {}) {
  const filter = createFilter(options.include || ['**/*.[jt]sx', '**/*.[jt]s'], options.exclude);
  return {
    name: 'rollup-plugin-hellajs',
    async transform(code, id) {
      if (!filter(id)) return null;
      const result = await transformAsync(code, {
        filename: id,
        presets: [require.resolve('@babel/preset-typescript')],
        plugins: [babelHellaJS],
        sourceMaps: true,
        babelrc: false,
        configFile: false,
      });
      if (!result) return null;
      return {
        code: result.code,
        map: result.map || null,
      };
    },
  };
}
