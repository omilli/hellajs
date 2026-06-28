import fs from "node:fs";
import path from "node:path";
import {
  logger,
  execCommand,
  execCommandInherited,
  getAllPackages,
  getPackagePath,
} from "./utils/index.js";

interface UpdateResult {
  changed: boolean;
  changes: { type: string; dependency: string; from: string; to: string }[];
}

/**
 * Update peer dependencies in a package
 */
function updatePeerDependencies(
  packagePath: string,
  updates: Record<string, string>,
  dryRun = false,
): UpdateResult {
  const packageJsonPath = path.join(packagePath, "package.json");
  if (!fs.existsSync(packageJsonPath))
    return { changed: false, changes: [] };

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  let changed = false;
  const changes: UpdateResult["changes"] = [];

  for (const [depName, newVersion] of Object.entries(updates)) {
    // Update peer dependencies
    if (
      packageJson.peerDependencies &&
      packageJson.peerDependencies[depName]
    ) {
      const oldVersion = packageJson.peerDependencies[depName];
      const newVersionSpec = `^${newVersion}`;

      if (!dryRun) {
        packageJson.peerDependencies[depName] = newVersionSpec;
      }

      changes.push({
        type: "peerDependency",
        dependency: depName,
        from: oldVersion,
        to: newVersionSpec,
      });
      changed = true;
    }

    // Update regular dependencies (for plugins depending on babel-plugin-hellajs)
    if (
      packageJson.dependencies &&
      packageJson.dependencies[depName]
    ) {
      const oldVersion = packageJson.dependencies[depName];
      const newVersionSpec = `^${newVersion}`;

      if (!dryRun) {
        packageJson.dependencies[depName] = newVersionSpec;
      }

      changes.push({
        type: "dependency",
        dependency: depName,
        from: oldVersion,
        to: newVersionSpec,
      });
      changed = true;
    }
  }

  if (changed && !dryRun) {
    fs.writeFileSync(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2) + "\n",
    );
  }

  return { changed, changes };
}

/**
 * HellaJS Publishing Script
 *
 * This script is designed to be run by the `changesets/action` in a CI environment.
 * It handles updating peer dependencies, committing the changes, and publishing packages.
 */
async function publish(): Promise<void> {
  logger.info("🚀 Starting HellaJS publishing...");

  const allPackages = getAllPackages();
  const packageVersions = new Map(
    allPackages.map((p) => [p.name, p.version]),
  );

  // Update peer dependencies with new versions
  if (packageVersions.has("@hellajs/core")) {
    const coreVersion = packageVersions.get("@hellajs/core")!;
    logger.info(
      `Updating @hellajs/core peer dependencies to v${coreVersion}...`,
    );

    const coreDepPackages = [
      "@hellajs/dom",
      "@hellajs/store",
      "@hellajs/resource",
      "@hellajs/router",
      "@hellajs/css",
    ];
    for (const pkgName of coreDepPackages) {
      const pkgPath = getPackagePath(pkgName);
      if (pkgPath) {
        updatePeerDependencies(pkgPath, { "@hellajs/core": coreVersion });
      }
    }
  }

  if (packageVersions.has("babel-plugin-hellajs")) {
    const babelVersion = packageVersions.get("babel-plugin-hellajs")!;
    logger.info(
      `Updating babel-plugin-hellajs dependencies to v${babelVersion}...`,
    );

    const pluginDepPackages = [
      "vite-plugin-hellajs",
      "rollup-plugin-hellajs",
    ];
    for (const pkgName of pluginDepPackages) {
      const pkgPath = getPackagePath(pkgName);
      if (pkgPath) {
        updatePeerDependencies(pkgPath, {
          "babel-plugin-hellajs": babelVersion,
        });
      }
    }
  }

  // Commit the peer dependency updates
  try {
    const status = (await execCommand("git", ["status", "--porcelain"])).stdout.trim();
    if (status) {
      logger.info("Committing peer dependency updates...");
      await execCommand("git", ["config", "--local", "user.email", "action@github.com"]);
      await execCommand("git", ["config", "--local", "user.name", "GitHub Action"]);
      await execCommand("git", ["add", "./**/package.json"]);

      // Check if there are actually staged changes before committing
      const stagedStatus = (
        await execCommand("git", ["diff", "--cached", "--name-only"])
      ).stdout.trim();
      if (stagedStatus) {
        await execCommand("git", [
          "commit",
          "-m",
          "chore: update peer dependencies",
          "--no-verify",
        ]);
        logger.info("✅ Committed peer dependency updates");
      } else {
        logger.info("No peer dependency changes to commit after staging.");
      }
    } else {
      logger.info("No peer dependency changes to commit.");
    }
  } catch (error) {
    logger.warn(
      "⚠️  Failed to commit peer dependency updates.",
      error as Error,
    );
    // Don't exit - continue with publishing
  }

  // Publish packages
  logger.info("Publishing packages with changeset...");
  try {
    await execCommandInherited("changeset", ["publish"]);
    logger.info("✅ Publishing completed successfully!");
  } catch (error) {
    logger.error("Failed to publish with changeset", error as Error);
    process.exit(1);
  }
}

// CLI execution
if (import.meta.main) {
  await publish();
}
