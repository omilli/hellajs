import fs from "fs";
import path from "path";
import { projectRoot, packagesDir, pluginsDir, changesetDir, getPackagePath } from "./paths.js";

/**
 * Get all package directories and their package.json data
 */
export function getAllPackages() {
	const packages = [];

	// Get packages from packages/ directory
	packages.push(...getPackagesFromDirectory(packagesDir, "package"));

	// Get plugins from plugins/ directory  
	packages.push(...getPackagesFromDirectory(pluginsDir, "plugin"));

	return packages;
}

/**
 * Helper function to get packages from a specific directory
 * @param {string} directory - The directory to scan
 * @param {string} type - The type of packages ("package" or "plugin")
 * @returns {Array} Array of package objects
 */
function getPackagesFromDirectory(directory, type) {
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
		const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
		
		return {
			name: packageJson.name,
			version: packageJson.version,
			path: packagePath,
			packageJson,
			type,
		};
	});
}

/**
 * Get all package directories that have package.json files
 */
export function getPackageDirectories() {
	return getPackageDirsByType(packagesDir);
}

/**
 * Helper function to get package directories from a specific directory
 * @param {string} directory - The directory to scan
 * @returns {Array} Array of package directory names
 */
function getPackageDirsByType(directory) {
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

/**
 * Get the package directory path from package name
 */


/**
 * Get packages that have changesets and will be published
 */
export function getPackagesWithChangesets() {
	if (!fs.existsSync(changesetDir)) {
		return [];
	}

	const changesetFiles = fs
		.readdirSync(changesetDir)
		.filter((file) => file.endsWith(".md") && file !== "README.md");

	const packagesWithChanges = new Set();

	for (const file of changesetFiles) {
		const content = fs.readFileSync(path.join(changesetDir, file), "utf8");
		const frontmatter = content.split("---")[1];
		if (frontmatter) {
			const lines = frontmatter.split("\n");
			for (const line of lines) {
				if (line.includes(":")) {
					const [pkg] = line.split(":");
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

// Re-export from paths for backward compatibility
export { projectRoot, packagesDir, pluginsDir, getPackagePath } from "./paths.js";
