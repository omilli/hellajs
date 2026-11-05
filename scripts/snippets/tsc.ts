import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { projectRoot } from "../utils/index.ts";

/**
 * The tsc driver for emitted snippet corpora: generated `tsconfig.json`
 * writer, raw tsc invocation, diagnostic parser, and the two-pass grammar
 * quarantine — ported verbatim from `doc-snippets.ts`. Corpus roots, skip
 * policy, and diagnostic exemptions stay with each consumer.
 */

/** One tsc diagnostic as printed by `--pretty false`. */
export interface TscDiagnostic {
  file: string;
  line: number;
  col: number;
  code: string;
  message: string;
}

/**
 * Writes a tsconfig for an emitted corpus directory: extends the repo base,
 * maps `@hellajs/*` to package sources, JSX preserve (typed against dom's
 * global JSX namespace via each module's own imports). `exclude` quarantines
 * grammar-error files for the second semantic pass.
 * @param dir The corpus directory
 * @param packages Package names to map `@hellajs/<name>` path aliases for
 * @param exclude Tier-relative file paths to exclude from compilation
 * @returns The written config path
 */
export function writeTsconfig(
  dir: string,
  packages: readonly string[],
  exclude: string[] = [],
): string {
  const rel = path.relative(dir, projectRoot).split(path.sep).join("/");
  const paths: Record<string, string[]> = {};
  for (const pkg of packages) {
    paths[`@hellajs/${pkg}`] = [`${rel}/packages/${pkg}/lib/index.ts`];
    paths[`@hellajs/${pkg}/*`] = [`${rel}/packages/${pkg}/lib/*`];
  }
  const config = {
    extends: `${rel}/tsconfig.base.json`,
    compilerOptions: {
      noEmit: true,
      // The corpus is check-only, but the base config's declaration-emit
      // flags leak TS6424 here under TypeScript 7 (the native engine runs
      // declaration-emit serialization analysis even under `noEmit`).
      declaration: false,
      emitDeclarationOnly: false,
      allowJs: true,
      checkJs: false,
      noUncheckedIndexedAccess: true,
      jsx: "preserve",
      paths,
    },
    include: ["./**/*.ts", "./**/*.tsx", "./**/*.js"],
    exclude: ["tsconfig.json", ...exclude],
  };
  const file = path.join(dir, "tsconfig.json");
  fs.writeFileSync(file, JSON.stringify(config, null, 2));
  return file;
}

/**
 * Runs tsc on the emitted corpus. Raw `spawnSync` (not `execCommand`) because
 * tsc intentionally exits 2 whenever findings exist — the output must be
 * captured, not rejected (guides/scripts.md's sanctioned non-zero exception).
 * @param configPath The generated tsconfig to compile
 * @returns Raw tsc stdout
 */
export function runTsc(configPath: string): string {
  const result = spawnSync(
    path.join(projectRoot, "node_modules/.bin/tsc"),
    ["-p", configPath, "--noEmit", "--pretty", "false"],
    {
      encoding: "utf-8",
      cwd: projectRoot,
    },
  );
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

/**
 * Parses tsc output into diagnostics.
 * @param raw tsc stdout
 * @returns Parsed diagnostics
 */
export function parseDiagnostics(raw: string): TscDiagnostic[] {
  const diagnostics: TscDiagnostic[] = [];
  for (const m of raw.matchAll(/^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/gm)) {
    diagnostics.push({
      file: m[1]!,
      line: Number(m[2]!),
      col: Number(m[3]!),
      code: m[4]!,
      message: m[5]!,
    });
  }
  return diagnostics;
}

/**
 * Checks an emitted corpus directory with the two-pass tsc protocol: pass 1
 * finds grammar-error (TS1xxx) files and quarantines them via config
 * `exclude` (TS skips semantic checking of a file with parse errors), pass 2
 * re-checks the rest so semantic findings surface. Quarantined files'
 * grammar findings are still reported.
 * @param dir The corpus directory (holds a tsconfig written by `writeTsconfig`)
 * @param packages Package names for the `@hellajs/*` path mappings
 * @param exempt Optional policy hook: diagnostics it returns true for are
 * dropped from the report (doc-snippets exempts relative-specifier TS2307s)
 * @returns The corpus' relevant diagnostics (grammar + non-exempt semantic)
 */
export function typecheckDir(
  dir: string,
  packages: readonly string[],
  exempt?: (diagnostic: TscDiagnostic) => boolean,
): TscDiagnostic[] {
  let configPath = writeTsconfig(dir, packages);
  let grammarFindings: TscDiagnostic[] = [];
  const grammarFiles = new Set<string>();
  for (let pass = 1; pass <= 2; pass++) {
    const diagnostics = parseDiagnostics(runTsc(configPath));
    const grammar = diagnostics.filter((d) => /^TS1\d{3}$/.test(d.code));
    if (pass === 1 && grammar.length > 0) {
      grammarFindings = grammar;
      for (const d of grammar) grammarFiles.add(d.file);
      configPath = writeTsconfig(
        dir,
        packages,
        [...grammarFiles].map((file) => `./${path.relative(dir, file)}`),
      );
      continue;
    }
    return [
      ...grammarFindings,
      ...diagnostics.filter(
        (d) => !grammarFiles.has(d.file) && !(exempt !== undefined && exempt(d)),
      ),
    ];
  }
  return grammarFindings;
}
