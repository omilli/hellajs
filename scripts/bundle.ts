import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

try {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);
	const rootDir = path.resolve(__dirname, "..");
	const entryPoint = path.join(rootDir, "lib/index.ts");
	const outDir = path.join(rootDir, "dist");
	const esmDir = path.join(outDir, "esm");
	const esmMinDir = path.join(outDir, "esm-min");
	const tsconfigPath = path.join(rootDir, "lib/tsconfig.json");

	// --- Clean the output directory ---
	if (fs.existsSync(outDir)) {
		fs.rmSync(outDir, { recursive: true, force: true });
	}
	fs.mkdirSync(esmDir, { recursive: true });
	fs.mkdirSync(esmMinDir, { recursive: true });

	// --- ESM multi-file build (preserve imports) ---
	const tscEsmCommand = `bun tsc --project ${tsconfigPath} --outDir ${esmDir} --declaration false --emitDeclarationOnly false`;
	execSync(tscEsmCommand, { stdio: "inherit", cwd: rootDir });

	// --- ESM multi-file minified (optional, using bun build per file) ---
	const walk = (dir: string) => {
		for (const file of fs.readdirSync(dir)) {
			const abs = path.join(dir, file);
			const rel = path.relative(path.join(rootDir, "lib"), abs);
			if (fs.statSync(abs).isDirectory()) {
				walk(abs);
			} else if (
				file.endsWith(".ts") &&
				!file.endsWith(".test.ts") &&
				file !== "tsconfig.json"
			) {
				const outFileMin = path.join(esmMinDir, rel.replace(/\.ts$/, ".js"));
				fs.mkdirSync(path.dirname(outFileMin), { recursive: true });
				const cmdMin = `bun build ${abs} --format=esm --outfile=${outFileMin} --minify`;
				execSync(cmdMin, { stdio: "inherit", cwd: rootDir });
			}
		}
	};
	walk(path.join(rootDir, "lib"));

	// --- Browser: ESM single file (unminified) ---
	const esmUnminified = path.join(outDir, "hella.esm.js");
	const esmBuildUnmin = `bun build ${entryPoint} --format=esm --outfile=${esmUnminified}`;
	execSync(esmBuildUnmin, { stdio: "inherit", cwd: rootDir });

	// --- Browser: ESM single file (minified) ---
	const esmMinified = path.join(outDir, "hella.esm.min.js");
	const esmBuildMin = `bun build ${entryPoint} --format=esm --outfile=${esmMinified} --minify`;
	execSync(esmBuildMin, { stdio: "inherit", cwd: rootDir });

	// --- Browser: Gzip minified ESM bundle ---
	const gzipped = esmMinified + ".gz";
	const minifiedContent = fs.readFileSync(esmMinified);
	const gzippedContent = zlib.gzipSync(minifiedContent);
	fs.writeFileSync(gzipped, gzippedContent);

	// --- NodeJS: CJS bundle ---
	const cjsBuildCommand = `bun build ${entryPoint} --format=cjs --target=node --outfile=${path.join(outDir, "hella.cjs.js")}`;
	execSync(cjsBuildCommand, { stdio: "inherit", cwd: rootDir });

	// --- NodeJS: TypeScript declarations ---
	const tscDeclarationCommand = `bun tsc --project ${tsconfigPath} --emitDeclarationOnly --outDir ${outDir}`;
	execSync(tscDeclarationCommand, { stdio: "inherit", cwd: rootDir });

	console.log("✨ Build completed");
} catch (error) {
	console.error("\nError:", error instanceof Error ? error.message : error);
	console.error("🔥 Build failed");
	process.exit(1);
}