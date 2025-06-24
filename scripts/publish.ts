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
if (!npmToken) {
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

function publishPackage(pkg) {
  const pkgDir = path.join(projectRoot, pkg);
  log(`\n📦 Publishing @hellajs/${pkg}`);
  try {
    // Write .npmrc with token
    fs.writeFileSync(path.join(pkgDir, ".npmrc"), `//registry.npmjs.org/:_authToken=${npmToken}\n`);
    let cmd = `npm publish`;
    if (tag) cmd += ` --tag ${tag}`;
    if (dryRun) cmd += ` --dry-run`;
    execSync(cmd, { cwd: pkgDir, stdio: "inherit" });
    fs.unlinkSync(path.join(pkgDir, ".npmrc"));
    log(`✅ Published @hellajs/${pkg}`);
    return true;
  } catch (e) {
    error(`❌ Failed to publish @hellajs/${pkg}:`, e.message || e);
    return false;
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
