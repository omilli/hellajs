import { defineConfig } from "vite-plus";
import viteHellaJS from "vite-plugin-hellajs";

export default defineConfig({
  plugins: [viteHellaJS()],
  resolve: {
    alias: {
      "@utils": new URL("./utils", import.meta.url).pathname,
    },
  },
  test: {
    environment: "happy-dom",
    pool: "forks",
    isolate: false,
    include: ["packages/*/tests/**/*.test.{ts,tsx}", "plugins/*/tests/**/*.test.ts"],
    // happy-dom emulates real navigation for non-intercepted _blank anchor
    // clicks (router intercept tests): the child page fetches localhost and
    // logs raw ECONNREFUSED blocks after the summary. Disabling child-page
    // navigation removes that fetch; same-frame and hash navigation are
    // unaffected (the detached-Window check short-circuits first).
    environmentOptions: {
      happyDOM: {
        settings: { navigation: { disableChildPageNavigation: true } },
      },
    },
  },
  // Oxfmt with vp defaults (printWidth 80, Prettier-compatible) is the style
  // authority for code. md/mdx stay excluded: doc-structure's fence
  // conventions, em-dash rewrites, and the docs style guide police them
  // structurally — a formatter would race those guards. Generated dirs are
  // ignored because `docs-ui` regenerates them byte-exact from the ui
  // registry; tutorial/example sources are ignored because reformatting them
  // breaks lint:structure's Complete-Code parity checks against their mdx.
  fmt: {
    ignorePatterns: [
      "**/*.md",
      "**/*.mdx",
      "memory/**",
      "plans/**",
      ".agents/**",
      ".bench/**",
      "docs/**",
      "packages/ui/tests/.tmp/**",
      "**/dist/**",
      "**/.doc-snippets/**",
      ".plans-runner/**",
    ],
  },
  lint: {
    plugins: ["typescript"],
    options: { typeAware: true, typeCheck: true },
    jsPlugins: ["./lint/hellajs.js"],
    ignorePatterns: [
      "**/node_modules/**",
      "**/dist/**",
      "**/out/**",
      "**/.cache/**",
      "**/.astro/**",
      "**/coverage/**",
      "packages/ui/tests/.tmp/**",
      "docs/**",
      ".agents/**",
      ".doc-snippets/**",
      ".plans-runner/**",
      "plans/**",
    ],
    rules: {
      "hella/no-iterator-loops": "error",
      "hella/no-raw-typeof-compare": "error",
      "hella/tests-api": "error",
      "no-constant-condition": ["error", { checkLoops: false }],
      "no-useless-assignment": "error",
      "no-unused-labels": "error",
      "prefer-const": "error",
      // Off list carried over from the former eslint.config.mjs — the rules
      // below fired as noise under oxlint defaults but were disabled (or did
      // not exist) in the eslint world. Style rules are NOT mapped: oxfmt
      "no-unused-expressions": "off",
      "no-unsafe-optional-chaining": "off",
      "typescript/no-this-alias": "off",
      "typescript/no-floating-promises": "off",
      "typescript/restrict-template-expressions": "off",
      "typescript/no-base-to-string": "off",
      "typescript/unbound-method": "off",
      "typescript/no-redundant-type-constituents": "off",
      "typescript/no-implied-eval": "off",
      "typescript/require-array-sort-compare": "off",
      "typescript/no-useless-default-assignment": "off",
      "typescript/no-unsafe-unary-minus": "off",
      "unicorn/no-new-array": "off",
      "unicorn/no-useless-spread": "off",
      "unicorn/no-useless-fallback-in-spread": "off",
      "unicorn/prefer-string-starts-ends-with": "off",
    },
  },
});
