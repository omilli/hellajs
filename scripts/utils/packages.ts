import fs from "node:fs";
import path from "node:path";
import { packagesDir, pluginsDir, changesetDir } from "./paths.js";

interface PackageEntry {
  name: string;
  version: string;
  path: string;
  packageJson: Record<string, unknown>;
  type: string;
}

export function getAllPackages(): PackageEntry[] {
  const packages: PackageEntry[] = [];

  packages.push(...getPackagesFromDirectory(packagesDir, "package"));
  packages.push(...getPackagesFromDirectory(pluginsDir, "plugin"));

  return packages;
}

function getPackagesFromDirectory(
  directory: string,
  type: string,
): PackageEntry[] {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const packageDirs = fs.readdirSync(directory).filter((dir) => {
    const packagePath = path.join(directory, dir);
    return (
      fs.statSync(packagePath).isDirectory() &&
      fs.existsSync(path.join(packagePath, "package.json"))
    );
  });

  return packageDirs.map((dir) => {
    const packagePath = path.join(directory, dir);
    const packageJsonPath = path.join(packagePath, "package.json");
    const raw = fs.readFileSync(packageJsonPath, "utf8");
    const packageJson = JSON.parse(raw);

    return {
      name: packageJson.name as string,
      version: packageJson.version as string,
      path: packagePath,
      packageJson,
      type,
    };
  });
}

export function getPackageDirectories(): string[] {
  return getPackageDirsByType(packagesDir);
}

function getPackageDirsByType(directory: string): string[] {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs.readdirSync(directory).filter((pkg) => {
    const pkgDir = path.join(directory, pkg);
    return (
      fs.statSync(pkgDir).isDirectory() &&
      fs.existsSync(path.join(pkgDir, "package.json"))
    );
  });
}

export function getPackagesWithChangesets(): string[] {
  if (!fs.existsSync(changesetDir)) {
    return [];
  }

  const changesetFiles = fs
    .readdirSync(changesetDir)
    .filter((file) => file.endsWith(".md") && file !== "README.md");

  const packagesWithChanges = new Set<string>();

  for (const file of changesetFiles) {
    const content = fs.readFileSync(path.join(changesetDir, file), "utf8");
    const frontmatter = content.split("---")[1];
    if (frontmatter) {
      const lines = frontmatter.split("\n");
      for (const line of lines) {
        if (line.includes(":")) {
          const [pkg = ""] = line.split(":");
          const cleanPkg = pkg.trim().replace(/["']/g, "");
          if (
            cleanPkg.startsWith("@hellajs/") ||
            cleanPkg.endsWith("-plugin-hellajs")
          ) {
            packagesWithChanges.add(cleanPkg);
          }
        }
      }
    }
  }

  return Array.from(packagesWithChanges);
}
