import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

// Parse command line arguments
const args = process.argv.slice(2);
const isQuiet = args.includes("--quiet");
const buildAll = args.includes("--all");
const packageName = args.find(arg => !arg.startsWith("--"));

const log = (...msgs: any[]) => {
	if (!isQuiet) console.log(...msgs);
};

const error = (...msgs: any[]) => {
	console.error(...msgs);
};

// Define build order - core must be first, others can follow
const BUILD_ORDER = ["core", "dom", "store", "router", "resource"];

function buildPackage(pkgName: string) {
	try {
		const __filename = fileURLToPath(import.meta.url);
		const __dirname = path.dirname(__filename);
		const projectRoot = path.resolve(__dirname, "..");

		// Determine paths based on package structure
		const packageDir = path.join(projectRoot, "packages", pkgName);
		const entryPoint = path.join(packageDir, "lib/index.ts");
		const outDir = path.join(packageDir, "dist");
		const esmDir = path.join(outDir, "esm");
		const esmMinDir = path.join(outDir, "esm-min");

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
		fs.mkdirSync(esmDir, { recursive: true });
		fs.mkdirSync(esmMinDir, { recursive: true });

		// --- ESM multi-file build (preserve imports) ---
		const tscEsmCommand = `bun tsc --project ${tsconfigPath} --outDir ${esmDir} --declaration false --emitDeclarationOnly false`;
		execSync(tscEsmCommand, { stdio: isQuiet ? "ignore" : "inherit", cwd: packageDir });

		// --- ESM multi-file minified (optional, using bun build per file) ---
		const walk = (dir: string) => {
			for (const file of fs.readdirSync(dir)) {
				const abs = path.join(dir, file);
				const rel = path.relative(path.join(packageDir, "lib"), abs);
				if (fs.statSync(abs).isDirectory()) {
					walk(abs);
				} else if (
					file.endsWith(".ts") &&
					!file.endsWith(".test.ts") &&
					file !== "tsconfig.json"
				) {
					const outFileMin = path.join(esmMinDir, rel.replace(/\.ts$/, ".js"));
					fs.mkdirSync(path.dirname(outFileMin), { recursive: true });
					const cmdMin = `bun build ${abs} --format=esm --outfile=${outFileMin} --minify ${externals}`;
					execSync(cmdMin, { stdio: isQuiet ? "ignore" : "inherit", cwd: packageDir });
				}
			}
		};

		// Only walk if lib directory exists
		const libDir = path.join(packageDir, "lib");
		if (fs.existsSync(libDir)) {
			walk(libDir);
		}

		// --- Browser: ESM single file (unminified) ---
		const esmUnminified = path.join(outDir, `hella-${pkgName}.esm.js`);
		const esmBuildUnmin = `bun build ${entryPoint} --format=esm --outfile=${esmUnminified} ${externals}`;
		execSync(esmBuildUnmin, { stdio: isQuiet ? "ignore" : "inherit", cwd: packageDir });

		// --- Browser: ESM single file (minified) ---
		const esmMinified = path.join(outDir, `hella-${pkgName}.esm.min.js`);
		const esmBuildMin = `bun build ${entryPoint} --format=esm --outfile=${esmMinified} --minify ${externals}`;
		execSync(esmBuildMin, { stdio: isQuiet ? "ignore" : "inherit", cwd: packageDir });

		// --- Browser: Gzip minified ESM bundle ---
		const gzipped = esmMinified + ".gz";
		const minifiedContent = fs.readFileSync(esmMinified);
		const gzippedContent = zlib.gzipSync(minifiedContent);
		fs.writeFileSync(gzipped, gzippedContent);

		// --- NodeJS: CJS bundle ---
		const cjsOutput = path.join(outDir, `hellajs-${pkgName}.cjs.js`);
		const cjsBuildCommand = `bun build ${entryPoint} --format=cjs --target=node --outfile=${cjsOutput} ${externals}`;
		execSync(cjsBuildCommand, { stdio: isQuiet ? "ignore" : "inherit", cwd: packageDir });

		// --- NodeJS: TypeScript declarations ---
		const tscDeclarationCommand = `bun tsc --project ${tsconfigPath} --emitDeclarationOnly --outDir ${outDir}`;
		execSync(tscDeclarationCommand, { stdio: isQuiet ? "ignore" : "inherit", cwd: packageDir });

		log(`✨ Build completed for @hellajs/${pkgName}`);

		// Show file sizes
		if (fs.existsSync(esmMinified)) {
			const stats = fs.statSync(esmMinified);
			const gzipStats = fs.statSync(gzipped);
			log(`📊 Minified: ${(stats.size / 1024).toFixed(2)}KB`);
			log(`📊 Gzipped: ${(gzipStats.size / 1024).toFixed(2)}KB`);
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

		const results: { name: string; success: boolean }[] = [];

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