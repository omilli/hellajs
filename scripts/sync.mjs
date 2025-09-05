import { readdir, readFile, writeFile } from "fs/promises";
import { basename, dirname, join } from "path";
import { ensureDir, fileExists, logger } from "./utils/index.js";

const CONFIG = {
	GLOB_DIRS: ["packages", "plugins", "docs", "scripts"],
	ROOT_CLAUDE_FILE: "./CLAUDE.md",
	OUTPUT_DIR: ".github/instructions",
	COPILOT_OUTPUT_FILE: ".github/copilot-instructions.md",
	TARGET_FILES: ["CLAUDE.md"],
};;;

async function retry(operation, maxRetries = 3, delay = 100) {
	let attempt = 0,
		lastError;
	while (++attempt <= maxRetries) {
		try {
			return await operation();
		} catch (error) {
			lastError = error;
			if (attempt === maxRetries)
				throw new Error(
					`Operation failed after ${maxRetries} attempts: ${error.message}`,
				);
			await sleep(delay << (attempt - 1));
		}
	}
	throw lastError;
}

function sleep(ms) {
	return new Promise((r) => setTimeout(r, ms));
}

// fileExists and ensureDir now imported from utils/common.js

async function batchProcess(items, processor) {
	return (await Promise.all(items.map(processor))).filter(Boolean);
}

function getFrontmatter(pkg, baseDir) {
	const applyToMapping = {
		packages: `packages/${pkg}/**`,
		plugins: `plugins/${pkg}/**`,
		scripts: "scripts/**",
		docs: "docs/**",
		copilot: "**", // Root CLAUDE.md applies to everything
	};
	const applyTo =
		baseDir === "docs" && pkg === "docs"
			? applyToMapping.docs
			: applyToMapping[pkg] || applyToMapping[baseDir] || "**";
	return `---\napplyTo: "${applyTo}"\n---\n\n`;
}

function parseFrontmatter(content) {
	const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
	const match = content.match(frontmatterRegex);
	if (!match) {
		return { frontmatter: null, body: content };
	}
	const [, frontmatterText, body] = match;
	const frontmatter = {};
	frontmatterText.split("\n").forEach((line) => {
		const colonIndex = line.indexOf(":");
		if (colonIndex > 0) {
			const key = line.slice(0, colonIndex).trim();
			const value = line.slice(colonIndex + 1).trim();
			frontmatter[key] = value;
		}
	});
	return { frontmatter, body: body.trim() };
}

function extractExamples(text) {
	const exampleRegex = /<example>(.*?)<\/example>/gs;
	const examples = [];
	let match;
	while ((match = exampleRegex.exec(text)) !== null) {
		examples.push(match[1].replace(/\n/g, " ").trim());
	}
	const cleanText =
		text
			.replace(exampleRegex, "")
			.replace(/Examples:\s*/g, "")
			.trim();
	return { text: cleanText, examples };
}

function findFrontmatterBounds(lines) {
	let start = -1;
	let end = -1;
	for (let i = 0; i < lines.length; i++) {
		if (lines[i].trim() === "---") {
			if (start === -1) {
				start = i;
			} else {
				end = i;
				break;
			}
		}
	}
	return start !== -1 && end !== -1 ? { start, end } : null;
}

function extractMetadata(lines) {
	const metadata = { name: "", description: "" };
	for (const line of lines) {
		const nameMatch = line.match(/^name:\s*(.+)$/);
		const descMatch = line.match(/^description:\s*(.+)$/);
		if (nameMatch) {
			metadata.name = nameMatch[1].trim();
		} else if (descMatch) {
			metadata.description = descMatch[1].trim();
		}
	}
	return metadata;
}

function filterFrontmatter(lines, excludeKeys = []) {
	return lines.filter((line) => {
		return !excludeKeys.some((key) => line.match(new RegExp(`^${key}:\s*`)));
	});
}

async function findClaudeFilesFactory() {
	const cache = new Map();
	await ensureDir(CONFIG.OUTPUT_DIR);
	async function findClaudeFiles(dir) {
		if (cache.has(dir)) return cache.get(dir);
		let results = [];
		try {
			const entries = await readdir(dir, { withFileTypes: true });
			const subdirs = entries
				.filter((e) => e.isDirectory())
				.map((e) => join(dir, e.name));
			results = entries
				.filter((e) => e.isFile() && CONFIG.TARGET_FILES.includes(e.name))
				.map((e) => join(dir, e.name));
			if (subdirs.length) {
				const nested = await Promise.all(
					subdirs.map((d) => findClaudeFiles(d)),
				);
				results.push(...nested.flat());
			}
		} catch (error) {
			logger.error(`Failed to read directory ${dir}:`, error);
		}
		cache.set(dir, results);
		return results;
	}
	return findClaudeFiles;
}

function extractPackageName(filePath) {
	const normalizedPath = filePath.replace(/\\\\/g, "/");
	const parts = normalizedPath.split("/");
	
	// Handle root CLAUDE.md file
	if (normalizedPath === "./CLAUDE.md" || normalizedPath === "CLAUDE.md") {
		return "copilot";
	}
	
	if (
		parts.length >= 3 &&
		["packages", "plugins", "scripts"].includes(parts[0])
	) {
		return parts[1];
	} else if (parts.length >= 2 && parts[0] === "docs") {
		return "docs";
	}
	return basename(dirname(filePath));
}

async function processSingleFile(filePath, baseDir, findClaudeFiles) {
	try {
		const pkg = extractPackageName(filePath);
		const content = await retry(() => readFile(filePath, "utf8"));
		const outputs = await Promise.allSettled([
			writeInstructionFile(filePath, content, pkg, baseDir),
			writeGeminiFile(filePath, content),
		]);
		return {
			source: filePath,
			pkg,
			success: outputs.every((result) => result.status === "fulfilled"),
			outputs: outputs.map((result) => ({
				status: result.status,
				reason: result.reason?.message,
			})),
		};
	} catch (error) {
		logger.error(`Failed to process file ${filePath}:`, error);
		throw error;
	}
}

async function writeInstructionFile(sourceFile, content, pkg, baseDir) {
	// Special handling for root CLAUDE.md file
	const outFile = pkg === "copilot" 
		? CONFIG.COPILOT_OUTPUT_FILE
		: join(CONFIG.OUTPUT_DIR, `${pkg}.instructions.md`);
	const finalContent = getFrontmatter(pkg, baseDir) + content;
	await ensureDir(dirname(outFile));
	await retry(() => writeFile(outFile, finalContent, "utf8"));
	return outFile;
}

async function writeGeminiFile(sourceFile, content) {
	const sourceDir = dirname(sourceFile);
	const geminiFile = join(sourceDir, "GEMINI.md");
	let geminiContent = content;

	await retry(() => writeFile(geminiFile, geminiContent, "utf8"));
	return geminiFile;
}



async function discoverFiles(findClaudeFiles) {
	const fileMap = new Map();
	await Promise.all(
		CONFIG.GLOB_DIRS.map(async (baseDir) => {
			try {
				fileMap.set(
					baseDir,
					(await fileExists(baseDir)) ? await findClaudeFiles(baseDir) : [],
				);
			} catch (error) {
				logger.error(`Failed to discover files in ${baseDir}:`, error);
				fileMap.set(baseDir, []);
			}
		}),
	);
	return fileMap;
}

async function syncClaudeFiles(stats, findClaudeFiles) {
	const fileMap = await discoverFiles(findClaudeFiles);
	const allResults = [];
	
	// Process root CLAUDE.md file separately
	if (await fileExists(CONFIG.ROOT_CLAUDE_FILE)) {
		try {
			const result = await processSingleFile(CONFIG.ROOT_CLAUDE_FILE, ".", findClaudeFiles);
			allResults.push(result);
			stats.filesProcessed += 1;
		} catch (error) {
			logger.error(`Failed to process root CLAUDE.md:`, error);
			stats.errors++;
		}
	}
	
	// Process other CLAUDE.md files
	for (const [baseDir, files] of fileMap) {
		if (!files.length) continue;
		try {
			const results = await batchProcess(files, (filePath, i) =>
				processSingleFile(filePath, baseDir, findClaudeFiles),
			);
			allResults.push(...results);
			stats.filesProcessed += results.length;
		} catch (error) {
			logger.error(`Failed to process files in ${baseDir}:`, error);
			stats.errors++;
		}
	}
	return allResults;
}

async function execute() {
	const stats = {
		filesProcessed: 0,
		errors: 0,
	};
	await Promise.allSettled([
		ensureDir(CONFIG.OUTPUT_DIR),
	]);
	const findClaudeFiles = await findClaudeFilesFactory();
	const claudeResults = await syncClaudeFiles(stats, findClaudeFiles);

	if (stats.errors === 0) {
		logger.success("Synchronization completed successfully!");
	} else {
		logger.warn(`Synchronization completed with ${stats.errors} errors`);
	}

	return {
		success: stats.errors === 0,
		stats,
		claudeResults,
	};
}

async function main() {
	try {
		const results = await execute();
		process.exit(results.success ? 0 : 1);
	} catch (error) {
		logger.error("Synchronization failed completely:", error);
		process.exit(1);
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}
