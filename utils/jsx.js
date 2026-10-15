// JSX test preload: compiles .tsx test files (entries and imports) under
// `bun test` through babel-plugin-hellajs. Registered alongside the HappyDOM
// preload in bunfig.toml [test] preload. The `presets: [presetTypeScript]`
// line is load-bearing: parserOpts alone leaves TS annotations in the output
// and the `js` loader fails with `Unexpected :`.
import { transformAsync } from "@babel/core";
import babelHellaJS from "babel-plugin-hellajs";
import presetTypeScript from "@babel/preset-typescript";

Bun.plugin({
  name: "hellajs-jsx-test-preload",
  setup(build) {
    build.onLoad({ filter: /\.tsx$/ }, async (args) => {
      if (args.path.includes("node_modules")) return undefined;
      const source = await Bun.file(args.path).text();
      const result = await transformAsync(source, {
        filename: args.path,
        plugins: [babelHellaJS],
        presets: [presetTypeScript],
        sourceType: "module",
        babelrc: false,
        configFile: false
      });
      return { contents: result.code, loader: "js" };
    });
  }
});
