import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// Usage: node scripts/publish.js <package> [--tag=beta] [--dry] [--all] [--plugins] [--name <plugin>]
const args = process.argv.slice(2);
const isAll = args.includes("--all");
const dryRun = args.includes("--dry");
const tagArg = args.find(a => a.startsWith("--tag="));
const tag = tagArg ? tagArg.split("=")[1] : undefined;
const isPlugins = args.includes("--plugins");
const nameIndex = args.indexOf("--name");
const pluginName = nameIndex !== -1 ? args[nameIndex + 1] : undefined;
const packageName = !isPlugins ? args.find(a => !a.startsWith("--")) : undefined;

const npmToken = process.env.NPM_TOKEN;
if (!npmToken && !dryRun) {
  console.error("❌ NPM_TOKEN environment variable is required.");
  process.exit(1);
}

const log = (...msgs) => console.log(...msgs);
const error = (...msgs) => console.error(...msgs);

const projectRoot = isPlugins
  ? path.resolve(__dirname, "..", "plugins")
  : path.resolve(__dirname, "..", "packages");
const packages = fs.readdirSync(projectRoot).filter(pkg => {
  const pkgDir = path.join(projectRoot, pkg);
  return fs.statSync(pkgDir).isDirectory() && fs.existsSync(path.join(pkgDir, "package.json"));
});

const bumpType = args.includes('--major') ? 'major'
  : args.includes('--minor') ? 'minor'
    : args.includes('--patch') ? 'patch'
      : null;

const bumpVersion = function bumpVersion(version, type) {
  const parts = version.split('.').map(Number);
  if (type === 'major') {
    parts[0]++;
    parts[1] = 0;
    parts[2] = 0;
  } else if (type === 'minor') {
    parts[1]++;
    parts[2] = 0;
  } else if (type === 'patch') {
    parts[2]++;
  }
  return parts.join('.');
};

const skipBuild = args.includes("--skip-build");
const skipTest = isPlugins || args.includes("--skip-test");

function runTestsForPackage(pkg) {
  if (skipTest) {
    log(`⚡ Skipping tests for ${pkg}`);
    return true;
  }
  // Try ./tests/[pkg].test.js
  const testFile = path.resolve(__dirname, "..", "tests", `${pkg}.test.js`);
  if (fs.existsSync(testFile)) {
    log(`🔎 Running tests: ${testFile}`);
    try {
      execSync(`bun bundle ${pkg} && bun test ${testFile}`, { stdio: "inherit" });
      return true;
    } catch (e) {
      error(`❌ Tests failed for ${pkg}`);
      return false;
    }
  }
  // Try ./tests/[pkg]/
  const testDir = path.resolve(__dirname, "..", "tests", pkg);
  if (fs.existsSync(testDir) && fs.statSync(testDir).isDirectory()) {
    log(`🔎 Running tests in folder: ${testDir}`);
    try {
      execSync(`bun bundle ${pkg} && bun test ${testDir}`, { stdio: "inherit" });
      return true;
    } catch (e) {
      error(`❌ Tests failed for ${pkg}`);
      return false;
    }
  }
  log(`ℹ️ No tests found for ${pkg}`);
  return true;
}

function updatePluginDepsIfBabel(pkg, newVersion) {
  if (pkg !== 'babel') return;
  const pluginPkgs = ['rollup', 'vite'];
  for (const plugin of pluginPkgs) {
    const pluginPkgPath = path.join(projectRoot, '..', 'plugins', plugin, 'package.json');
    if (fs.existsSync(pluginPkgPath)) {
      const pluginPkgJson = JSON.parse(fs.readFileSync(pluginPkgPath, 'utf8'));
      if (pluginPkgJson.dependencies && pluginPkgJson.dependencies['babel-plugin-hellajs']) {
        pluginPkgJson.dependencies['babel-plugin-hellajs'] = `^${newVersion}`;
        fs.writeFileSync(pluginPkgPath, JSON.stringify(pluginPkgJson, null, 2) + '\n');
        log(`🔗 Updated babel-plugin-hellajs dep in ${plugin} to ^${newVersion}`);
      }
    }
  }
}

function publishPackage(pkg) {
  const pkgDir = path.join(projectRoot, pkg);
  const displayName = isPlugins ? pkg : `@hellajs/${pkg}`;
  log(`\n📦 Publishing ${displayName}`);
  if (!runTestsForPackage(pkg)) {
    error(`❌ Aborting publish: tests failed for ${pkg}`);
    return false;
  }
  let wroteNpmrc = false;
  try {
    // Bump version if requested (skip in dry run)
    if (bumpType && !dryRun) {
      const pkgJsonPath = path.join(pkgDir, 'package.json');
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      const oldVersion = pkgJson.version;
      const newVersion = bumpVersion(oldVersion, bumpType);
      pkgJson.version = newVersion;
      fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n');
      log(`🔼 Bumped version: ${oldVersion} → ${newVersion}`);
      if (isPlugins && pkg === 'babel') {
        updatePluginDepsIfBabel(pkg, newVersion);
      }
    }
    if (dryRun) {
      log(`🧪 Dry run: would publish ${displayName}`);
      return true;
    }
    // Write .npmrc with token
    fs.writeFileSync(path.join(pkgDir, ".npmrc"), `//registry.npmjs.org/:_authToken=${npmToken}\n`);
    wroteNpmrc = true;
    if (!skipBuild) {
      // Try to run build script if present
      const pkgJsonPath = path.join(pkgDir, 'package.json');
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      if (pkgJson.scripts && pkgJson.scripts.build) {
        log(`🔨 Running build for ${displayName}`);
        execSync('npm run build', { cwd: pkgDir, stdio: 'inherit' });
      }
    } else {
      log(`⚡ Skipping build for ${displayName}`);
    }
    let cmd = isPlugins
      ? `npm publish --access public`
      : `npm publish --workspaces --access public`;
    if (tag) cmd += ` --tag ${tag}`;
    execSync(cmd, { cwd: pkgDir, stdio: "inherit" });
    log(`✅ Published ${displayName}`);
    return true;
  } catch (e) {
    error(`❌ Failed to publish ${displayName}:`, e.message || e);
    return false;
  } finally {
    if (wroteNpmrc) {
      try { fs.unlinkSync(path.join(pkgDir, ".npmrc")); } catch { }
    }
  }
}

if (isPlugins) {
  if (isAll) {
    let allOk = true;
    for (const pkg of packages) {
      allOk = publishPackage(pkg) && allOk;
    }
    process.exit(allOk ? 0 : 1);
  } else if (pluginName) {
    if (!packages.includes(pluginName)) {
      error(`❌ Plugin '${pluginName}' not found in plugins/`);
      process.exit(1);
    }
    const ok = publishPackage(pluginName);
    process.exit(ok ? 0 : 1);
  } else {
    error("❌ Please specify --name <plugin> or use --all with --plugins");
    process.exit(1);
  }
} else {
  if (isAll) {
    let allOk = true;
    for (const pkg of packages) {
      allOk = publishPackage(pkg) && allOk;
    }
    process.exit(allOk ? 0 : 1);
  } else {
    if (!packageName) {
      error("❌ Please specify a package name or use --all");
      process.exit(1);
    }
    const ok = publishPackage(packageName);
    process.exit(ok ? 0 : 1);
  }
}
