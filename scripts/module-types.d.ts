/**
 * Ambient module declarations for untyped runtime dependencies.
 * `@babel/preset-typescript` ships no type declarations and has no
 * `@types/babel__preset-typescript` package on npm.
 */
declare module "@babel/preset-typescript" {
  const preset: import("@babel/core").PluginItem;
  export default preset;
}
