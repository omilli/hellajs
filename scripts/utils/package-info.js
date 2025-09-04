/**
 * Package information utilities for HellaJS build scripts
 */
import fs from "fs";
import { getPackagePaths } from "./paths.js";
import { readJson } from "./fs.js";

/**
 * Get comprehensive package information with validation
 * @param {string} packageName - Name of the package (without @hellajs/ prefix)
 * @param {boolean} validate - Whether to validate required files exist
 * @returns {Promise<Object>} Package information object
 */
export async function getPackageInfo(packageName, validate = true) {
	const paths = getPackagePaths(packageName);
	
	if (validate) {
		const validations = [
			{ path: paths.packageDir, name: "package directory" },
			{ path: paths.packageJsonPath, name: "package.json" },
			{ path: paths.entryPoint, name: "entry point" },
			{ path: paths.tsconfigPath, name: "tsconfig.json" },
		];
		
		for (const { path: filePath, name } of validations) {
			if (!fs.existsSync(filePath)) {
				throw new Error(`${name} not found: ${filePath}`);
			}
		}
	}
	
	const packageJson = await readJson(paths.packageJsonPath);
	const peerDeps = Object.keys(packageJson.peerDependencies || {});
	
	return {
		name: packageName,
		fullName: packageJson.name,
		version: packageJson.version,
		dir: paths.packageDir,
		entryPoint: paths.entryPoint,
		tsconfigPath: paths.tsconfigPath,
		distDir: paths.distDir,
		cacheDir: paths.cacheDir,
		peerDeps,
		packageJson,
	};
}

/**
 * Check if a package directory exists and has a package.json
 * @param {string} packageName - Name of the package
 * @returns {boolean} Whether the package is valid
 */
export function isValidPackage(packageName) {
	const { packageDir, packageJsonPath } = getPackagePaths(packageName);
	return fs.existsSync(packageDir) && fs.existsSync(packageJsonPath);
}