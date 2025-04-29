import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Builds an aggressively minified browser bundle for benchmarking.
 * Creates a single self-contained file with no external dependencies.
 */
function buildBenchmark() {
	try {
		const __filename = fileURLToPath(import.meta.url);
		const __dirname = path.dirname(__filename);
		const rootDir = path.resolve(__dirname, "..");

		// Define source and output paths
		const benchmarkEntry = path.join(rootDir, "sandbox/benchmark/index.ts");
		const htmlSource = path.join(rootDir, "sandbox/index.html");
		const outDir = path.join(rootDir, "dist/benchmark");
		const outJs = path.join(outDir, "bundle.js");
		const outHtml = path.join(outDir, "index.html");

		console.log("Building optimized browser bundle...");

		// Clean the output directory if it exists
		if (fs.existsSync(outDir)) {
			fs.rmSync(outDir, { recursive: true, force: true });
		}

		// Create output directory
		fs.mkdirSync(outDir, { recursive: true });

		// Skip SWC and use esbuild directly for both transpilation and bundling
		console.log(`Creating browser bundle from ${benchmarkEntry}...`);

		// Use esbuild for complete bundling process
		execSync(
			`npx esbuild ${benchmarkEntry} --bundle --minify --format=esm --target=es2020 --outfile=${outJs}`,
			{ stdio: "inherit", cwd: rootDir }
		);

		// Process HTML file
		console.log(`Processing HTML from ${htmlSource}...`);
		let htmlContent = fs.readFileSync(htmlSource, "utf-8");

		// Replace the script source with our bundle
		htmlContent = htmlContent.replace(
			'<script type="module" src="/sandbox/"></script>',
			'<script src="./bundle.js"></script>'
		);

		// Write the processed HTML file
		fs.writeFileSync(outHtml, htmlContent);

		// Display bundle size info
		const bundleSize = fs.statSync(outJs).size;
		const bundleSizeKb = (bundleSize / 1024).toFixed(2);

		console.log(`✨ Benchmark bundle created successfully (${bundleSizeKb} KB)`);
		console.log(`   HTML: ${outHtml}`);
		console.log(`   JS: ${outJs}`);
	} catch (error) {
		console.error("\nError:", error instanceof Error ? error.message : error);
		console.error("🔥 Build failed");
		process.exit(1);
	}
}

// Execute the build function
buildBenchmark();