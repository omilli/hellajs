import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// This script handles changeset publishing with peer dependency updates
const log = (...msgs) => console.log(...msgs);
const error = (...msgs) => console.error(...msgs);

const projectRoot = path.resolve(process.cwd());
const packagesDir = path.join(projectRoot, "packages");
const pluginsDir = path.join(projectRoot, "plugins");

function updateCoreDepsInPackages(newCoreVersion) {
  if (!fs.existsSync(packagesDir)) return;

  const packages = fs.readdirSync(packagesDir).filter(pkg => {
    const pkgDir = path.join(packagesDir, pkg);
    return pkg !== "core" && fs.statSync(pkgDir).isDirectory() && fs.existsSync(path.join(pkgDir, "package.json"));
  });

  for (const pkg of packages) {
    const pkgJsonPath = path.join(packagesDir, pkg, "package.json");
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
    let changed = false;

    if (pkgJson.dependencies && pkgJson.dependencies["@hellajs/core"]) {
      pkgJson.dependencies["@hellajs/core"] = `^${newCoreVersion}`;
      changed = true;
    }
    if (pkgJson.peerDependencies && pkgJson.peerDependencies["@hellajs/core"]) {
      pkgJson.peerDependencies["@hellajs/core"] = `^${newCoreVersion}`;
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + "\n");
      log(`🔗 Updated @hellajs/core dep in ${pkg} to ^${newCoreVersion}`);
    }
  }
}

function updatePluginDepsIfBabel(newBabelVersion) {
  if (!fs.existsSync(pluginsDir)) return;

  const pluginPackages = ['rollup', 'vite'];
  for (const plugin of pluginPackages) {
    const pluginPkgPath = path.join(pluginsDir, plugin, 'package.json');
    if (fs.existsSync(pluginPkgPath)) {
      const pluginPkgJson = JSON.parse(fs.readFileSync(pluginPkgPath, 'utf8'));
      if (pluginPkgJson.dependencies && pluginPkgJson.dependencies['babel-plugin-hellajs']) {
        pluginPkgJson.dependencies['babel-plugin-hellajs'] = `^${newBabelVersion}`;
        fs.writeFileSync(pluginPkgPath, JSON.stringify(pluginPkgJson, null, 2) + '\n');
        log(`🔗 Updated babel-plugin-hellajs dep in ${plugin} to ^${newBabelVersion}`);
      }
    }
  }
}

function runTestsForPackage(pkg) {
  // Try ./tests/[pkg].test.js
  const testFile = path.resolve(projectRoot, "tests", `${pkg}.test.js`);
  if (fs.existsSync(testFile)) {
    log(`🔎 Running tests: ${testFile}`);
    try {
      execSync(`bun test ${testFile}`, { stdio: "inherit" });
      return true;
    } catch (e) {
      error(`❌ Tests failed for ${pkg}`);
      return false;
    }
  }

  // Try ./tests/[pkg]/
  const testDir = path.resolve(projectRoot, "tests", pkg);
  if (fs.existsSync(testDir) && fs.statSync(testDir).isDirectory()) {
    log(`🔎 Running tests in folder: ${testDir}`);
    try {
      execSync(`bun test ${testDir}`, { stdio: "inherit" });
      return true;
    } catch (e) {
      error(`❌ Tests failed for ${pkg}`);
      return false;
    }
  }

  log(`ℹ️ No tests found for ${pkg}`);
  return true;
}

// Get the published packages from changeset publish output
function getPublishedPackages() {
  // This will be called after changeset publish runs
  // For now, we'll read the changesets to determine what might be published
  const changesetDir = path.join(projectRoot, ".changeset");
  if (!fs.existsSync(changesetDir)) return [];

  const changesetFiles = fs.readdirSync(changesetDir)
    .filter(file => file.endsWith('.md') && file !== 'README.md');

  const publishedPackages = new Set();

  for (const file of changesetFiles) {
    const content = fs.readFileSync(path.join(changesetDir, file), 'utf8');
    const frontmatter = content.split('---')[1];
    if (frontmatter) {
      const lines = frontmatter.split('\n');
      for (const line of lines) {
        if (line.includes(':')) {
          const [pkg] = line.split(':');
          const cleanPkg = pkg.trim().replace(/["']/g, '');
          if (cleanPkg.startsWith('@hellajs/') || cleanPkg.endsWith('-plugin-hellajs')) {
            publishedPackages.add(cleanPkg);
          }
        }
      }
    }
  }

  return Array.from(publishedPackages);
}

// Pre-publish hook: Update peer dependencies based on what's about to be published
export function prePublish() {
  log("🔄 Running pre-publish peer dependency updates...");

  // Check if core package has changesets
  const corePackagePath = path.join(packagesDir, "core", "package.json");
  if (fs.existsSync(corePackagePath)) {
    const corePackage = JSON.parse(fs.readFileSync(corePackagePath, "utf8"));
    const currentVersion = corePackage.version;

    // Get published packages to see if core is being published
    const publishedPackages = getPublishedPackages();
    if (publishedPackages.includes("@hellajs/core")) {
      updateCoreDepsInPackages(currentVersion);
    }
  }

  // Check if babel plugin has changesets
  const babelPackagePath = path.join(pluginsDir, "babel", "package.json");
  if (fs.existsSync(babelPackagePath)) {
    const babelPackage = JSON.parse(fs.readFileSync(babelPackagePath, "utf8"));
    const currentVersion = babelPackage.version;

    const publishedPackages = getPublishedPackages();
    if (publishedPackages.includes("babel-plugin-hellajs")) {
      updatePluginDepsIfBabel(currentVersion);
    }
  }
}

// Main execution for changeset integration
if (import.meta.main) {
  const command = process.argv[2];

  if (command === "pre-publish") {
    prePublish();
  } else if (command === "test-all") {
    // Run all tests before publishing
    log("🧪 Running all tests before publish...");

    // Test packages
    if (fs.existsSync(packagesDir)) {
      const packages = fs.readdirSync(packagesDir).filter(pkg => {
        const pkgDir = path.join(packagesDir, pkg);
        return fs.statSync(pkgDir).isDirectory() && fs.existsSync(path.join(pkgDir, "package.json"));
      });

      for (const pkg of packages) {
        if (!runTestsForPackage(pkg)) {
          process.exit(1);
        }
      }
    }

    // Test plugins (usually no specific tests, but check anyway)
    log("✅ All package tests passed");
  } else {
    log("Usage: node scripts/version.mjs [pre-publish|test-all]");
  }
}