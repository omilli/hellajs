import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

try {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);
	const rootDir = path.resolve(__dirname, "..");
	const entryPoint = path.join(rootDir, "lib/api.ts");
	const outDir = path.join(rootDir, "dist");
	const tsconfigPath = path.join(rootDir, "lib/tsconfig.json");

	// --- Clean the output directory ---
	if (fs.existsSync(outDir)) {
		fs.rmSync(outDir, { recursive: true, force: true });
	}

	// --- Build ESM ---
	const esmBuildCommand = `bun build ${entryPoint} --format=esm --target=browser --outfile=${path.join(outDir, "index.esm.js")} --minify`;
	execSync(esmBuildCommand, { stdio: "inherit", cwd: rootDir });

	// --- Build CJS ---
	const cjsBuildCommand = `bun build ${entryPoint} --format=cjs --target=node --outfile=${path.join(outDir, "index.cjs.js")} --minify`;
	execSync(cjsBuildCommand, { stdio: "inherit", cwd: rootDir });

	// --- Build UMD (using IIFE format) ---
	const umdBuildCommand = `bun build ${entryPoint} --format=iife --target=browser --outfile=${path.join(outDir, "index.umd.js")} --minify`;
	execSync(umdBuildCommand, { stdio: "inherit", cwd: rootDir });

	// --- Generate Declaration Files ---
	const tscCommand = `bun tsc --project ${tsconfigPath}`;
	execSync(tscCommand, { stdio: "inherit", cwd: rootDir });

	console.log("✨ Build completed");
} catch (error) {
	console.error("\nError:", error instanceof Error ? error.message : error);
	console.error("🔥 Build failed");
	process.exit(1);
}
