import { addComponent } from "./addComponent";
import { initProject } from "./initProject";
import { listComponents } from "./listComponents";
import type { UiFormat, UiLang, UiStyle } from "./types";

/** Parsed command line: positional words plus recognized flag values. */
interface ParsedArgs {
  positional: string[];
  dir?: string;
  overwrite: boolean;
  force: boolean;
  style?: string;
  format?: string;
  lang?: string;
}

/** Command and flag overview printed when a command is missing or unknown. */
const USAGE = `Usage: hellajs-ui <command> [options]

Commands:
  init             write hella.ui.json and add the theme entry
  add <name>...    copy registry components into your project
  list             print every registry component

Options:
  --style css|tailwind   registry style to copy on add
  --format jsx|html      source format to copy on add
  --lang js|ts           output language to copy on add (default ts)
  --dir <path>           target project root
  --overwrite            replace existing files on add
  --force                rewrite an existing hella.ui.json on init`;

/**
 * Splits command-line arguments into positionals and flags. Flags take a
 * space-separated value (`--dir path`); `--overwrite` and `--force` are bare.
 */
function parseArgs(args: string[]): ParsedArgs {
  const parsed: ParsedArgs = { positional: [], overwrite: false, force: false };
  let i = 0;
  while (i < args.length) {
    const arg = args[i]!;
    i++;
    if (arg === "--overwrite") {
      parsed.overwrite = true;
    } else if (arg === "--force") {
      parsed.force = true;
    } else if (arg === "--dir" || arg === "--style" || arg === "--format" || arg === "--lang") {
      const value = args[i];
      i++;
      if (value === undefined) {
        throw new Error(`[ui] main: flag ${arg} requires a value`);
      }
      if (arg === "--dir") parsed.dir = value;
      else if (arg === "--style") parsed.style = value;
      else if (arg === "--format") parsed.format = value;
      else parsed.lang = value;
    } else if (arg.startsWith("--")) {
      throw new Error(`[ui] main: unknown flag "${arg}"`);
    } else {
      parsed.positional.push(arg);
    }
  }
  return parsed;
}

/**
 * CLI entry point: dispatches `init`, `add`, and `list`. The bin runner passes
 * process.argv minus the script path and exits on the returned code. A missing
 * or unknown command prints the usage overview before the throw.
 * @param argv Command-line arguments, command name first.
 * @returns Process exit code, 0 on success.
 * @throws {Error} When the command is missing or unknown, a flag is unknown or
 * value-less, or the dispatched command fails.
 */
export async function main(argv: string[]): Promise<number> {
  const [command = "", ...args] = argv;
  if (command === "init") {
    const parsed = parseArgs(args);
    initProject({ dir: parsed.dir, force: parsed.force });
    return 0;
  }
  if (command === "add") {
    const parsed = parseArgs(args);
    addComponent(parsed.positional, {
      dir: parsed.dir,
      overwrite: parsed.overwrite,
      style: parsed.style as UiStyle,
      format: parsed.format as UiFormat,
      lang: parsed.lang as UiLang,
    });
    return 0;
  }
  if (command === "list") {
    console.log(listComponents().join("\n"));
    return 0;
  }
  throw new Error(`${USAGE}\n[ui] main: unknown command "${command}"`);
}
