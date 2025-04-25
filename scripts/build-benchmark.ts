import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

  console.log("Building benchmark app...");

  // Clean the output directory if it exists
  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
  }

  // Create output directory
  fs.mkdirSync(outDir, { recursive: true });

  // Bundle the JavaScript
  console.log(`Bundling JavaScript from ${benchmarkEntry}...`);
  const buildCommand = `bun build ${benchmarkEntry} --target=browser --outfile=${outJs} --minify`;
  execSync(buildCommand, { stdio: "inherit", cwd: rootDir });

  // Copy and process the HTML file
  console.log(`Processing HTML from ${htmlSource}...`);
  let htmlContent = fs.readFileSync(htmlSource, "utf-8");

  // Replace the script source with our bundle
  htmlContent = htmlContent.replace(
    '<script type="module" src="/sandbox/"></script>',
    '<script src="./bundle.js"></script>'
  );

  // Write the processed HTML file
  fs.writeFileSync(outHtml, htmlContent);

  console.log(`✨ Benchmark app built successfully to ${outDir}`);
  console.log(`   HTML: ${outHtml}`);
  console.log(`   JS: ${outJs}`);

} catch (error) {
  console.error("\nError:", error instanceof Error ? error.message : error);
  console.error("🔥 Build failed");
  process.exit(1);
}
