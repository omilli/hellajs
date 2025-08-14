import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

// Parse command line arguments
const args = process.argv.slice(2);
const isQuiet = args.includes("--quiet");
const buildAll = args.includes("--all");
const packageName = args.find(arg => !arg.startsWith("--"));

const log = (...msgs) => {
	if (!isQuiet) console.log(...msgs);
};

const error = (...msgs) => {
	console.error(...msgs);
};

// Define build order - core must be first, others can follow
const BUILD_ORDER = ["core", "css", "dom", "store", "router", "resource"];

function buildPackage(pkgName) {
	try {
		const __filename = fileURLToPath(import.meta.url);
		const __dirname = path.dirname(__filename);
		const projectRoot = path.resolve(__dirname, "..");

		// Determine paths based on package structure
		const packageDir = path.join(projectRoot, "packages", pkgName);
		const entryPoint = path.join(packageDir, "lib/index.ts");
		const outDir = path.join(packageDir, "dist");

		// Use package tsconfig (all packages have their own tsconfig.json)
		const tsconfigPath = path.join(packageDir, "tsconfig.json");

		// Read package.json to get peer dependencies
		const packageJsonPath = path.join(packageDir, "package.json");
		const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
		const peerDeps = Object.keys(packageJson.peerDependencies || {});

		// Create external flags for bun build
		const externals = peerDeps.map(dep => `--external ${dep}`).join(" ");

		// Validate package exists
		if (!fs.existsSync(packageDir)) {
			error(`❌ Package "${pkgName}" not found at ${packageDir}`);
			return false;
		}

		if (!fs.existsSync(entryPoint)) {
			error(`❌ Entry point not found at ${entryPoint}`);
			return false;
		}

		if (!fs.existsSync(tsconfigPath)) {
			error(`❌ tsconfig.json not found at ${tsconfigPath}`);
			return false;
		}

		log(`📦 Building package: @hellajs/${pkgName}`);
		if (peerDeps.length > 0) {
			log(`🔗 External peer dependencies: ${peerDeps.join(", ")}`);
		}

		// --- Clean the output directory ---
		if (fs.existsSync(outDir)) {
			fs.rmSync(outDir, { recursive: true, force: true });
		}
		fs.mkdirSync(outDir, { recursive: true });

		// --- Modern ESM bundle (minified but not mangled for better DX) ---
		const esmBundle = path.join(outDir, `${pkgName}.js`);
		const esmBuildCmd = `bun build lib/index.ts --format=esm --outfile=dist/${pkgName}.js --minify-syntax --minify-whitespace --sourcemap --target=browser ${externals}`;
		execSync(esmBuildCmd, { stdio: isQuiet ? "ignore" : "inherit", cwd: packageDir });

		// --- Move bundle files to dist (bun places them in lib/) ---
		const libBundle = path.join(packageDir, 'lib', `${pkgName}.js`);
		const libSourceMap = path.join(packageDir, 'lib', `${pkgName}.js.map`);
		if (fs.existsSync(libBundle)) {
			fs.renameSync(libBundle, esmBundle);
		}
		if (fs.existsSync(libSourceMap)) {
			fs.renameSync(libSourceMap, path.join(outDir, `${pkgName}.js.map`));
		}

		// --- TypeScript declarations ---
		const tscDeclarationCommand = `bun tsc --project ${tsconfigPath} --emitDeclarationOnly --outDir ${outDir}`;
		execSync(tscDeclarationCommand, { stdio: isQuiet ? "ignore" : "inherit", cwd: packageDir });

		log(`✨ Build completed for @hellajs/${pkgName}`);

		// Show file sizes
		if (fs.existsSync(esmBundle)) {
			const fileContents = fs.readFileSync(esmBundle);
			const stats = fs.statSync(esmBundle);
			const gzipSize = gzipSync(fileContents).length;
			log(`📊 Bundle size: ${(stats.size / 1024).toFixed(2)}KB`);
			log(`📦 Gzip size: ${(gzipSize / 1024).toFixed(2)}KB`);
		}

		return true;
	} catch (buildError) {
		error(`\nError building ${pkgName}:`, buildError instanceof Error ? buildError.message : buildError);
		return false;
	}
}

// Main execution
try {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);
	const projectRoot = path.resolve(__dirname, "..");

	if (buildAll) {
		// Build all packages in dependency order
		const packagesDir = path.join(projectRoot, "packages");
		if (!fs.existsSync(packagesDir)) {
			error("❌ Packages directory not found");
			process.exit(1);
		}

		// Get available packages
		const availablePackages = fs.readdirSync(packagesDir).filter(pkg => {
			const pkgDir = path.join(packagesDir, pkg);
			return fs.statSync(pkgDir).isDirectory() && fs.existsSync(path.join(pkgDir, "package.json"));
		});

		// Build packages in defined order, but only if they exist
		const packagesToBuild = BUILD_ORDER.filter(pkg => availablePackages.includes(pkg));

		// Add any packages not in BUILD_ORDER to the end
		const remainingPackages = availablePackages.filter(pkg => !BUILD_ORDER.includes(pkg));
		packagesToBuild.push(...remainingPackages);

		log(`🚀 Building ${packagesToBuild.length} packages in dependency order:`);
		log(`📋 Build order: ${packagesToBuild.join(" → ")}`);

		const results = [];

		// Build packages sequentially in order
		for (const pkg of packagesToBuild) {
			const success = buildPackage(pkg);
			results.push({ name: pkg, success });

			// Stop if core fails (since others depend on it)
			if (!success && pkg === "core") {
				error("❌ Core build failed - stopping build process");
				process.exit(1);
			}
		}

		const successful = results.filter(r => r.success).length;
		const failed = results.filter(r => !r.success);

		log(`\n📈 Build Summary:`);
		log(`✅ Successful: ${successful}/${packagesToBuild.length}`);

		if (failed.length > 0) {
			error(`❌ Failed: ${failed.map(f => f.name).join(", ")}`);
			process.exit(1);
		}

		log(`🎉 All packages built successfully!`);
	} else {
		// Build single package
		if (!packageName) {
			error("❌ Please specify a package name or use --all flag");
			error("Usage: bun run bundle <package> [--quiet]");
			error("       bun run bundle --all [--quiet]");
			process.exit(1);
		}

		const success = buildPackage(packageName);
		if (!success) {
			error("🔥 Build failed");
			process.exit(1);
		}
	}
} catch (error) {
	console.error("\nUnexpected error:", error instanceof Error ? error.message : error);
	console.error("🔥 Build failed");
	process.exit(1);
}