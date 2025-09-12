/**
 * Path utilities for HellaJS build scripts
 */
import path from "path";

export const projectRoot = path.resolve(process.cwd());
export const packagesDir = path.join(projectRoot, "packages");
export const pluginsDir = path.join(projectRoot, "plugins");
export const testsDir = path.join(projectRoot, "tests");
export const scriptsDir = path.join(projectRoot, "scripts");
export const changesetDir = path.join(projectRoot, ".changeset");

/**
 * Get the package directory path from package name
 * @param {string} packageName - Name of the package
 * @returns {string|null} Path to package directory or null if not found
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
 * Get standard paths for a package
 * @param {string} packageName - Name of the package (without @hellajs/ prefix)
 * @returns {Object} Object containing common package paths
 */
export function getPackagePaths(packageName) {
	const packageDir = path.join(packagesDir, packageName);
	
	return {
		packageDir,
		packageJsonPath: path.join(packageDir, "package.json"),
		libDir: path.join(packageDir, "lib"),
		distDir: path.join(packageDir, "dist"),
		cacheDir: path.join(packageDir, ".build-cache"),
		entryPoint: path.join(packageDir, "lib/index.ts"),
		tsconfigPath: path.join(packageDir, "tsconfig.json"),
		testDir: path.join(packageDir, "tests"),
		testFile: path.join(packageDir, "tests", `${packageName}.test.ts`),
	};
}