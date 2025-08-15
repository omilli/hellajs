import fs from "fs";
import path from "path";

/**
 * Get the current version of a package from its package.json
 */
export function getPackageVersion(packagePath) {
	const packageJsonPath = path.join(packagePath, "package.json");
	if (!fs.existsSync(packageJsonPath)) return null;

	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
	return packageJson.version;
}

/**
 * Bump version based on type
 */
export function bumpVersion(version, bumpType) {
	const [major, minor, patch] = version.split(".").map(Number);

	switch (bumpType) {
		case "major":
			return `${major + 1}.0.0`;
		case "minor":
			return `${major}.${minor + 1}.0`;
		case "patch":
		default:
			return `${major}.${minor}.${patch + 1}`;
	}
}

/**
 * Determine which bump type is higher priority
 */
export function getHigherBumpType(current, newBump) {
	const priority = { major: 3, minor: 2, patch: 1 };
	const currentPriority = priority[current] || 1;
	const newPriority = priority[newBump] || 1;
	return newPriority > currentPriority ? newBump : current;
}

/**
 * Parse changeset files to determine version bump types
 */
export function parseChangesetBumps() {
	const projectRoot = path.resolve(process.cwd());
	const changesetDir = path.join(projectRoot, ".changeset");
	const packageBumps = new Map();

	if (!fs.existsSync(changesetDir)) {
		return packageBumps;
	}

	const changesetFiles = fs
		.readdirSync(changesetDir)
		.filter((file) => file.endsWith(".md") && file !== "README.md");

	for (const file of changesetFiles) {
		const content = fs.readFileSync(path.join(changesetDir, file), "utf8");
		const frontmatter = content.split("---")[1];
		if (frontmatter) {
			const lines = frontmatter.split("\n");
			for (const line of lines) {
				if (line.includes(":")) {
					const [pkg, bump] = line.split(":");
					const cleanPkg = pkg.trim().replace(/["']/g, "");
					const cleanBump = bump.trim().replace(/["']/g, "");

					if (
						cleanPkg.startsWith("@hellajs/") ||
						cleanPkg.endsWith("-plugin-hellajs")
					) {
						// Track the highest bump type for each package
						const currentBump = packageBumps.get(cleanPkg) || "patch";
						const newBump = getHigherBumpType(currentBump, cleanBump);
						packageBumps.set(cleanPkg, newBump);
					}
				}
			}
		}
	}

	return packageBumps;
}

/**
 * Update peer dependencies in a package
 */
export function updatePeerDependencies(packagePath, updates, dryRun = false) {
	const packageJsonPath = path.join(packagePath, "package.json");
	if (!fs.existsSync(packageJsonPath)) return { changed: false, changes: [] };

	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
	let changed = false;
	const changes = [];

	for (const [depName, newVersion] of Object.entries(updates)) {
		// Update peer dependencies
		if (packageJson.peerDependencies && packageJson.peerDependencies[depName]) {
			const oldVersion = packageJson.peerDependencies[depName];
			const newVersionSpec = `^${newVersion}`;

			if (!dryRun) {
				packageJson.peerDependencies[depName] = newVersionSpec;
			}

			changes.push({
				type: "peerDependency",
				dependency: depName,
				from: oldVersion,
				to: newVersionSpec,
			});
			changed = true;
		}

		// Update regular dependencies (for plugins depending on babel-plugin-hellajs)
		if (packageJson.dependencies && packageJson.dependencies[depName]) {
			const oldVersion = packageJson.dependencies[depName];
			const newVersionSpec = `^${newVersion}`;

			if (!dryRun) {
				packageJson.dependencies[depName] = newVersionSpec;
			}

			changes.push({
				type: "dependency",
				dependency: depName,
				from: oldVersion,
				to: newVersionSpec,
			});
			changed = true;
		}
	}

	if (changed && !dryRun) {
		fs.writeFileSync(
			packageJsonPath,
			JSON.stringify(packageJson, null, 2) + "\n",
		);
	}

	return { changed, changes };
}
