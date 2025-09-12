import { readdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { fileExists, logger } from "./utils/index.js";

const CONFIG = {
	GLOB_DIRS: ["packages", "plugins", "docs", "scripts"],
	ROOT_CLAUDE_FILE: "./CLAUDE.md",
	OUTPUT_FILE: "./AGENTS.md",
	TARGET_FILES: ["CLAUDE.md"],
};

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


async function batchProcess(items, processor) {
	return (await Promise.all(items.map(processor))).filter(Boolean);
}







async function findClaudeFilesFactory() {
	const cache = new Map();
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


async function processSingleFile(filePath) {
	try {
		const content = await retry(() => readFile(filePath, "utf8"));
		await writeAgentsFile(filePath, content);
		return {
			source: filePath,
			success: true,
		};
	} catch (error) {
		logger.error(`Failed to process file ${filePath}:`, error);
		throw error;
	}
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
			const result = await processSingleFile(CONFIG.ROOT_CLAUDE_FILE);
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
			const results = await batchProcess(files, (filePath) =>
				processSingleFile(filePath),
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

async function writeAgentsFile(claudeFilePath, content) {
	const agentsFilePath = claudeFilePath.replace(/CLAUDE\.md$/, "AGENTS.md");
	await retry(() => writeFile(agentsFilePath, content, "utf8"));
	logger.success(`Written ${agentsFilePath}`);
}

async function execute() {
	const stats = {
		filesProcessed: 0,
		errors: 0,
	};
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
