import fs from "node:fs";
import path from "node:path";
import {
  execCommand,
  execCommandInherited,
  isValidPackage,
  isValidPlugin,
  projectRoot,
  packagesDir,
  pluginsDir,
  logger,
} from "./utils/index.ts";

/**
 * The vp CLI from the locally installed vite-plus (never a global binary).
 * The measurement target is the entry-graph per-module dist artifacts
 * (top-level `dist` .js files plus `dist/internal`), the ui registry minus
 * the `cn`/`tokens` data artifacts, and every plugin .mjs source (vite/rollup
 * read 0% by design: thin wrappers whose `index.mjs` is excluded — their
 * suites cover option forwarding, not source). `bundle.js` is verified by
 * each package's `tests/bundle.test.ts` smoke test (export parity), not
 * measured.
 *
 * Reporting is vitest's own text reporter. Scoped runs narrow the
 * `--coverage.include` globs to the target workspace instead of filtering
 * rendered rows: sibling dists that test helpers load stay uninstrumented,
 * the "All files" aggregate is vitest's count-weighted total over the scope,
 * and the stock table's uncovered-line numbers are kept (they reference the
 * dist files, near-verbatim copies of the lib sources).
 *
 * `--coverage` must precede the `--coverage.*` flags on the vp command line
 * — nested flags appearing before it are silently ignored (the run stays
 * green and renders a repo-wide table).
 */
const vpBin = path.join(projectRoot, "node_modules", ".bin", "vp");

/** Coverage include/exclude flags measuring every workspace (unscoped runs). */
function repoFlags(): string[] {
  return [
    "--coverage.include=packages/*/dist/*.js",
    "--coverage.include=packages/*/dist/internal/*.js",
    "--coverage.include=packages/*/dist/utils/*.js",
    "--coverage.include=packages/ui/dist/registry/**/*.js",
    "--coverage.include=plugins/**/*.mjs",
    "--coverage.exclude=packages/*/dist/bundle.js",
    "--coverage.exclude=packages/*/dist/**/*.min.js",
    "--coverage.exclude=packages/ui/dist/registry/**/cn.js",
    "--coverage.exclude=packages/ui/dist/registry/**/tokens*.js",
    `--coverage.exclude=plugins/**/index.mjs`,
  ];
}

/**
 * Coverage include/exclude flags narrowed to one workspace so vitest's table
 * scopes itself. Packages measure their dist artifacts; ui additionally
 * measures the registry minus the `cn`/`tokens` data artifacts; plugins
 * measure their `.mjs` sources (plugins have no dist).
 */
function scopeFlags(name: string, kind: "package" | "plugin"): string[] {
  if (kind === "plugin")
    return [
      `--coverage.include=plugins/${name}/**/*.mjs`,
      `--coverage.exclude=plugins/${name}/index.mjs`,
    ];
  const root = `packages/${name}/dist`;
  return [
    `--coverage.include=${root}/*.js`,
    `--coverage.include=${root}/internal/*.js`,
    `--coverage.include=${root}/utils/*.js`,
    `--coverage.exclude=${root}/bundle.js`,
    `--coverage.exclude=${root}/**/*.min.js`,
    ...(name === "ui"
      ? [
          `--coverage.include=${root}/registry/**/*.js`,
          `--coverage.exclude=${root}/registry/**/cn.js`,
          `--coverage.exclude=${root}/registry/**/tokens*.js`,
        ]
      : []),
  ];
}

/**
 * Run `vp test` with inherited stdio so test output and the coverage table
 * stream live; exit non-zero when the run fails (its own output is the
 * failure report). NODE_OPTIONS delivers `--expose-gc` to the vp process
 * and the worker forks it spawns (poolOptions.execArgv does not propagate;
 * gc()-dependent tests need the global).
 */
async function runTests(testPath: string | null, coverageFlags: string[]): Promise<void> {
  const env = {
    ...process.env,
    NODE_OPTIONS: [process.env.NODE_OPTIONS, "--expose-gc"].filter(Boolean).join(" "),
  };
  try {
    await execCommandInherited(
      vpBin,
      [
        "test",
        ...(testPath ? [testPath] : []),
        "--coverage",
        ...coverageFlags,
        "--coverage.reporter=text",
        "--coverage.reportOnFailure",
      ],
      { env },
    );
  } catch {
    logger.error(
      `vp test ${testPath ? `"${testPath}" ` : ""}failed — see the streamed output above`,
    );
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const scopeName = args.find((arg) => !arg.startsWith("--"));

  if (!scopeName) {
    logger.info("Running full coverage...");
    await execCommand(process.execPath, ["./scripts/bundle.ts", "--quiet"], { cwd: projectRoot });
    await runTests(null, repoFlags());
    return;
  }

  const kind: "package" | "plugin" | null = isValidPackage(scopeName)
    ? "package"
    : isValidPlugin(scopeName)
      ? "plugin"
      : null;
  if (!kind) {
    logger.error(`Package or plugin "${scopeName}" not found or invalid`);
    process.exit(1);
  }

  const workspaceDir = kind === "package" ? packagesDir : pluginsDir;
  const testDir = path.join(workspaceDir, scopeName, "tests");
  if (!fs.existsSync(testDir)) {
    logger.error(`No tests directory found for ${kind} "${scopeName}"`);
    process.exit(1);
  }

  logger.info(`Running scoped coverage for ${kind} ${scopeName}...`);
  await execCommand(process.execPath, ["./scripts/bundle.ts", "--quiet"], { cwd: projectRoot });
  await runTests(
    `${kind === "package" ? "packages" : "plugins"}/${scopeName}/tests`,
    scopeFlags(scopeName, kind),
  );
}

if (process.argv[1] === import.meta.filename) {
  main().catch((error: Error) => {
    logger.error(`Coverage failed: ${error.message}`);
    process.exit(1);
  });
}
