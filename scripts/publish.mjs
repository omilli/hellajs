import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// Usage: node scripts/publish.js <package> [--tag=beta] [--dry] [--all]
const args = process.argv.slice(2);
const isAll = args.includes("--all");
const dryRun = args.includes("--dry");
const tagArg = args.find(a => a.startsWith("--tag="));
const tag = tagArg ? tagArg.split("=")[1] : undefined;
const packageName = args.find(a => !a.startsWith("--"));

const npmToken = process.env.NPM_TOKEN;
if (!npmToken && !dryRun) {
  console.error("❌ NPM_TOKEN environment variable is required.");
  process.exit(1);
}

const log = (...msgs) => console.log(...msgs);
const error = (...msgs) => console.error(...msgs);

const projectRoot = path.resolve(__dirname, "..", "packages");
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

function runTestsForPackage(pkg) {
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

function publishPackage(pkg) {
  const pkgDir = path.join(projectRoot, pkg);
  log(`\n📦 Publishing @hellajs/${pkg}`);
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
    }
    if (dryRun) {
      log(`🧪 Dry run: would publish @hellajs/${pkg}`);
      return true;
    }
    // Write .npmrc with token
    fs.writeFileSync(path.join(pkgDir, ".npmrc"), `//registry.npmjs.org/:_authToken=${npmToken}\n`);
    wroteNpmrc = true;
    let cmd = `npm publish --workspaces --access public`;
    if (tag) cmd += ` --tag ${tag}`;
    execSync(cmd, { cwd: pkgDir, stdio: "inherit" });
    log(`✅ Published @hellajs/${pkg}`);
    return true;
  } catch (e) {
    error(`❌ Failed to publish @hellajs/${pkg}:`, e.message || e);
    return false;
  } finally {
    if (wroteNpmrc) {
      try { fs.unlinkSync(path.join(pkgDir, ".npmrc")); } catch {}
    }
  }
}

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
