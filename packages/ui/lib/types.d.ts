/** Registry style copied on `add`: `css` composes through `@hellajs/css` scoped classes, `tailwind` through the shared `cn` helper. */
export type UiStyle = "css" | "tailwind";

/** Source format copied on `add`: `.tsx` for JSX, `*-html.ts` for runtime `html` templates. */
export type UiFormat = "jsx" | "html";

/** Output language copied on `add`: `ts` copies TypeScript source verbatim, `js` strips types at copy time for plain JavaScript. */
export type UiLang = "js" | "ts";

export interface UiConfig {
  /** Project folder copied component source lands in. Default "src/components". */
  componentsDir: string;
  /** Registry style copied on `add` when the command passes none. Default "css". */
  style: UiStyle;
  /** Source format copied on `add` when the command passes none. Default "jsx". */
  format: UiFormat;
  /** Output language copied on `add` when the command passes none. Default "ts". */
  lang: UiLang;
}

export interface AddOptions {
  /** Project root holding package.json and hella.ui.json. Defaults to process cwd. */
  dir?: string;
  /** Replace existing files instead of skipping them. Default false. */
  overwrite?: boolean;
  /** Registry style; overrides hella.ui.json. */
  style?: UiStyle;
  /** Source format; overrides hella.ui.json. */
  format?: UiFormat;
  /** Output language; overrides hella.ui.json. */
  lang?: UiLang;
}

export interface InitOptions {
  /** Project root holding package.json and hella.ui.json. Defaults to process cwd. */
  dir?: string;
  /** Rewrite an existing hella.ui.json with defaults. Default false. */
  force?: boolean;
}

export interface RegistryStyleFiles {
  /** Files copied for this style, resolved relative to `registry/<name>/`. */
  files: string[];
  /** Extra npm packages the copied source imports at runtime, beyond the entry's shared `deps`. */
  deps: string[];
  /** Registry entries this style also requires. */
  registryDependencies: string[];
}

export interface RegistryEntry {
  /** Files copied for every style, resolved relative to `registry/<name>/`. */
  files?: string[];
  /** npm packages the copied source imports at runtime, for every style. */
  deps?: string[];
  /** Per-style slot: the style's own files, deps, and registry dependencies on top of the shared fields. */
  styles?: Partial<Record<UiStyle, RegistryStyleFiles>>;
}

export interface RegistryManifest {
  /** Registry entries keyed by component name. */
  entries: Record<string, RegistryEntry>;
}
