/**
 * Ambient module declarations for untyped runtime dependencies.
 * `@babel/plugin-syntax-jsx` ships no type declarations and has no
 * `@types/babel__plugin-syntax-jsx` package on npm.
 */
declare module "@babel/plugin-syntax-jsx" {
  const plugin: import("@babel/core").PluginItem;
  export default plugin;
}
