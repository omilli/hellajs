import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// Dry run script for changesets workflow
const log = (...msgs) => console.log(...msgs);
const error = (...msgs) => console.error(...msgs);

const projectRoot = path.resolve(process.cwd());

function parseChangesets() {
  const changesetDir = path.join(projectRoot, ".changeset");
  if (!fs.existsSync(changesetDir)) {
    log("🦋 No changesets found");
    return {};
  }
  
  const changesetFiles = fs.readdirSync(changesetDir)
    .filter(file => file.endsWith('.md') && file !== 'README.md');
  
  if (changesetFiles.length === 0) {
    log("🦋 No pending changesets");
    return {};
  }
  
  const changes = {};
  
  for (const file of changesetFiles) {
    const content = fs.readFileSync(path.join(changesetDir, file), 'utf8');
    const parts = content.split('---');
    
    if (parts.length >= 3) {
      const frontmatter = parts[1].trim();
      const description = parts[2].trim();
      
      const lines = frontmatter.split('\n');
      for (const line of lines) {
        if (line.includes(':')) {
          const [pkg, version] = line.split(':').map(s => s.trim().replace(/["']/g, ''));
          if (!changes[pkg]) {
            changes[pkg] = { version, descriptions: [] };
          }
          if (description && !changes[pkg].descriptions.includes(description)) {
            changes[pkg].descriptions.push(description);
          }
        }
      }
    }
  }
  
  return changes;
}

function getPackageCurrentVersion(packageName) {
  let packagePath;
  
  if (packageName.startsWith('@hellajs/')) {
    const pkgName = packageName.replace('@hellajs/', '');
    packagePath = path.join(projectRoot, "packages", pkgName, "package.json");
  } else if (packageName.endsWith('-plugin-hellajs')) {
    const pluginName = packageName.replace('-plugin-hellajs', '').replace('babel-plugin', 'babel');
    packagePath = path.join(projectRoot, "plugins", pluginName, "package.json");
  }
  
  if (packagePath && fs.existsSync(packagePath)) {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return pkg.version;
  }
  
  return "unknown";
}

function calculateNewVersion(currentVersion, bumpType) {
  const parts = currentVersion.split('.').map(Number);
  
  switch (bumpType) {
    case 'major':
      return `${parts[0] + 1}.0.0`;
    case 'minor':  
      return `${parts[0]}.${parts[1] + 1}.0`;
    case 'patch':
    default:
      return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
  }
}

function simulatePeerDependencyUpdates(changes) {
  const updates = [];
  
  // Check for core package updates
  if (changes['@hellajs/core']) {
    const currentVersion = getPackageCurrentVersion('@hellajs/core');
    const newVersion = calculateNewVersion(currentVersion, changes['@hellajs/core'].version);
    
    const packagesDir = path.join(projectRoot, "packages");
    if (fs.existsSync(packagesDir)) {
      const packages = fs.readdirSync(packagesDir).filter(pkg => pkg !== 'core');
      for (const pkg of packages) {
        const pkgJsonPath = path.join(packagesDir, pkg, "package.json");
        if (fs.existsSync(pkgJsonPath)) {
          const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
          if (pkgJson.dependencies && pkgJson.dependencies["@hellajs/core"]) {
            updates.push(`  - @hellajs/${pkg}: @hellajs/core dependency → ^${newVersion}`);
          }
          if (pkgJson.peerDependencies && pkgJson.peerDependencies["@hellajs/core"]) {
            updates.push(`  - @hellajs/${pkg}: @hellajs/core peerDependency → ^${newVersion}`);
          }
        }
      }
    }
  }
  
  // Check for babel plugin updates
  if (changes['babel-plugin-hellajs']) {
    const currentVersion = getPackageCurrentVersion('babel-plugin-hellajs');
    const newVersion = calculateNewVersion(currentVersion, changes['babel-plugin-hellajs'].version);
    
    const pluginsDir = path.join(projectRoot, "plugins");
    const pluginPackages = ['rollup', 'vite'];
    
    for (const plugin of pluginPackages) {
      const pluginPkgPath = path.join(pluginsDir, plugin, 'package.json');
      if (fs.existsSync(pluginPkgPath)) {
        const pluginPkgJson = JSON.parse(fs.readFileSync(pluginPkgPath, 'utf8'));
        if (pluginPkgJson.dependencies && pluginPkgJson.dependencies['babel-plugin-hellajs']) {
          updates.push(`  - ${plugin}-plugin-hellajs: babel-plugin-hellajs dependency → ^${newVersion}`);
        }
      }
    }
  }
  
  return updates;
}

function dryRun() {
  log("🧪 Changesets Dry Run Analysis");
  log("=================================");
  
  const changes = parseChangesets();
  
  if (Object.keys(changes).length === 0) {
    log("📦 No packages would be published (no changesets found)");
    return;
  }
  
  log("\n📦 Packages that would be published:");
  for (const [packageName, change] of Object.entries(changes)) {
    const currentVersion = getPackageCurrentVersion(packageName);
    const newVersion = calculateNewVersion(currentVersion, change.version);
    
    log(`\n  ${packageName}`);
    log(`    Current: ${currentVersion}`);
    log(`    New: ${newVersion} (${change.version} bump)`);
    
    if (change.descriptions.length > 0) {
      log(`    Changes:`);
      for (const desc of change.descriptions) {
        log(`      - ${desc}`);
      }
    }
  }
  
  const peerDepUpdates = simulatePeerDependencyUpdates(changes);
  if (peerDepUpdates.length > 0) {
    log("\n🔗 Peer dependency updates that would be made:");
    for (const update of peerDepUpdates) {
      log(update);
    }
  }
  
  log("\n🔨 Build process that would run:");
  log("  - bun bundle --all --quiet");
  
  log("\n🧪 Tests that would run:");
  log("  - bun test (all package tests)");
  
  log("\n📤 Publish commands that would run:");
  for (const packageName of Object.keys(changes)) {
    log(`  - npm publish (${packageName} with provenance)`);
  }
  
  log("\n✅ Dry run complete - no actual changes were made");
}

// Check if we can run changeset version dry run
function changesetVersionDryRun() {
  try {
    log("\n🔍 Running changeset version preview...");
    execSync("changeset version --snapshot preview", { stdio: "inherit" });
  } catch (e) {
    log("ℹ️  Changeset version preview not available (likely no changesets)");
  }
}

if (import.meta.main) {
  dryRun();
  changesetVersionDryRun();
}