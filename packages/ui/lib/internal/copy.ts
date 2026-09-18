import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

/**
 * Optional copyFiles behavior: destination-name overrides and a content
 * transform applied to each file's text before it lands.
 */
export interface CopyOptions {
  /** Destination file names keyed by source file name; unlisted files keep their basename. */
  rename?: Record<string, string>;
  /** Applied to each file's text before write, with the source file name; identity when absent. */
  transform?: (text: string, file: string) => string;
}

/**
 * Copies registry files into the project's components directory, creating it
 * when absent. Existing files are skipped with a warning unless overwrite.
 * @param baseDir Registry folder holding the files.
 * @param files File names inside baseDir.
 * @param componentsDir Destination directory.
 * @param overwrite Replace existing files. Default false.
 * @param options Rename map and content transform. Identity defaults.
 * @internal
 */
export function copyFiles(baseDir: string, files: string[], componentsDir: string, overwrite = false, options: CopyOptions = {}): void {
  mkdirSync(componentsDir, { recursive: true });
  let i = 0;
  const len = files.length;
  while (i < len) {
    const file = files[i++]!;
    const name = options.rename?.[file] ?? basename(file);
    const dest = join(componentsDir, name);
    if (!overwrite && existsSync(dest)) {
      console.warn(`[ui] copyFiles: ${name} already exists in ${componentsDir}, skipped (pass --overwrite to replace)`);
      continue;
    }
    const text = readFileSync(join(baseDir, file), "utf8");
    writeFileSync(dest, options.transform === undefined ? text : options.transform(text, file));
  }
}
