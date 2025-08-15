import fs from "fs";
import path from "path";

const projectRoot = path.resolve(process.cwd());
const packagesDir = path.join(projectRoot, "packages");
const pluginsDir = path.join(projectRoot, "plugins");

/**
 * Get all package directories and their package.json data
 */
export function getAllPackages() {
	const packages = [];

	// Get packages from packages/ directory
	if (fs.existsSync(packagesDir)) {
		const packageDirs = fs.readdirSync(packagesDir).filter((dir) => {
			const packagePath = path.join(packagesDir, dir);
			return (
				fs.statSync(packagePath).isDirectory() &&
				fs.existsSync(path.join(packagePath, "package.json"))
			);
		});

		for (const dir of packageDirs) {
			const packagePath = path.join(packagesDir, dir);
			const packageJsonPath = path.join(packagePath, "package.json");
			const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
			packages.push({
				name: packageJson.name,
				version: packageJson.version,
				path: packagePath,
				packageJson,
				type: "package",
			});
		}
	}

	// Get plugins from plugins/ directory
	if (fs.existsSync(pluginsDir)) {
		const pluginDirs = fs.readdirSync(pluginsDir).filter((dir) => {
			const pluginPath = path.join(pluginsDir, dir);
			return (
				fs.statSync(pluginPath).isDirectory() &&
				fs.existsSync(path.join(pluginPath, "package.json"))
			);
		});

		for (const dir of pluginDirs) {
			const packagePath = path.join(pluginsDir, dir);
			const packageJsonPath = path.join(packagePath, "package.json");
			const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
			packages.push({
				name: packageJson.name,
				version: packageJson.version,
				path: packagePath,
				packageJson,
				type: "plugin",
			});
		}
	}

	return packages;
}

/**
 * Get all package directories that have package.json files
 */
export function getPackageDirectories() {
	if (!fs.existsSync(packagesDir)) {
		return [];
	}

	return fs.readdirSync(packagesDir).filter((pkg) => {
		const pkgDir = path.join(packagesDir, pkg);
		return (
			fs.statSync(pkgDir).isDirectory() &&
			fs.existsSync(path.join(pkgDir, "package.json"))
		);
	});
}

/**
 * Get the package directory path from package name
 */
export function getPackagePath(packageName) {
	if (packageName.startsWith("@hellajs/")) {
		return path.join(packagesDir, packageName.replace("@hellajs/", ""));
	} else if (packageName.endsWith("-plugin-hellajs")) {
		return path.join(pluginsDir, packageName.replace("-plugin-hellajs", ""));
	}
	return null;
}

/**
 * Get packages that have changesets and will be published
 */
export function getPackagesWithChangesets() {
	const changesetDir = path.join(projectRoot, ".changeset");
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

export { projectRoot, packagesDir, pluginsDir };
