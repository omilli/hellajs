import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileExists, logger } from "./utils/index.js";

interface SyncStats {
  filesProcessed: number;
  errors: number;
}

interface SyncResult {
  success: boolean;
  stats: SyncStats;
  results: { source: string; success: boolean }[];
}

const CONFIG = {
  GLOB_DIRS: ["packages", "plugins", "docs", "scripts"] as const,
  ROOT_AGENTS_FILE: "./AGENTS.md",
  INSTRUCTIONS_DIR: ".github/instructions",
  TARGET_FILES: ["AGENTS.md"],
};

async function retry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 100,
): Promise<T> {
  let attempt = 0,
    lastError: Error | undefined;
  while (++attempt <= maxRetries) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (attempt === maxRetries) throw lastError;
      await sleep(delay << (attempt - 1));
    }
  }
  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function batchProcess<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
): Promise<R[]> {
  return (await Promise.all(items.map(processor))).filter(Boolean);
}

async function findAgentsFilesFactory(): Promise<
  (dir: string) => Promise<string[]>
> {
  const cache = new Map<string, string[]>();
  async function findAgentsFiles(dir: string): Promise<string[]> {
    if (cache.has(dir)) return cache.get(dir)!;
    let results: string[] = [];
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
          subdirs.map((d) => findAgentsFiles(d)),
        );
        results.push(...nested.flat());
      }
    } catch (error) {
      logger.error(`Failed to read directory ${dir}:`, error as Error);
    }
    cache.set(dir, results);
    return results;
  }
  return findAgentsFiles;
}

async function processSingleFile(
  filePath: string,
): Promise<{ source: string; success: boolean }> {
  try {
    const content = await retry(() => readFile(filePath, "utf8"));
    await writeClaudeFile(filePath, content);
    await writeInstructionFile(filePath, content);
    return {
      source: filePath,
      success: true,
    };
  } catch (error) {
    logger.error(`Failed to process file ${filePath}:`, error as Error);
    throw error;
  }
}

async function discoverFiles(
  findAgentsFiles: (dir: string) => Promise<string[]>,
): Promise<Map<string, string[]>> {
  const fileMap = new Map<string, string[]>();
  await Promise.all(
    CONFIG.GLOB_DIRS.map(async (baseDir) => {
      try {
        fileMap.set(
          baseDir,
          (await fileExists(baseDir))
            ? await findAgentsFiles(baseDir)
            : [],
        );
      } catch (error) {
        logger.error(
          `Failed to discover files in ${baseDir}:`,
          error as Error,
        );
        fileMap.set(baseDir, []);
      }
    }),
  );
  return fileMap;
}

async function syncAgentsFiles(
  stats: SyncStats,
  findAgentsFiles: (dir: string) => Promise<string[]>,
): Promise<{ source: string; success: boolean }[]> {
  const fileMap = await discoverFiles(findAgentsFiles);
  const allResults: { source: string; success: boolean }[] = [];

  if (await fileExists(CONFIG.ROOT_AGENTS_FILE)) {
    try {
      const result = await processSingleFile(CONFIG.ROOT_AGENTS_FILE);
      allResults.push(result);
      stats.filesProcessed += 1;
    } catch (error) {
      logger.error(
        `Failed to process root AGENTS.md:`,
        error as Error,
      );
      stats.errors++;
    }
  }

  for (const [baseDir, files] of fileMap) {
    if (!files.length) continue;
    try {
      const results = await batchProcess(files, (filePath) =>
        processSingleFile(filePath),
      );
      allResults.push(...results);
      stats.filesProcessed += results.length;
    } catch (error) {
      logger.error(
        `Failed to process files in ${baseDir}:`,
        error as Error,
      );
      stats.errors++;
    }
  }

  return allResults;
}

async function writeClaudeFile(
  agentsFilePath: string,
  content: string,
): Promise<void> {
  const claudeFilePath = agentsFilePath.replace(/AGENTS\.md$/, "CLAUDE.md");
  await retry(() => writeFile(claudeFilePath, content, "utf8"));
  logger.success(`Written ${claudeFilePath}`);
}

async function writeInstructionFile(
  agentsFilePath: string,
  content: string,
): Promise<void> {
  let instructionFilePath: string, applyToPattern: string;

  if (agentsFilePath === CONFIG.ROOT_AGENTS_FILE) {
    instructionFilePath = ".github/copilot-instructions.md";
    applyToPattern = "**";
  } else {
    await mkdir(CONFIG.INSTRUCTIONS_DIR, { recursive: true });
    const parts = agentsFilePath.split("/");
    parts.pop();
    const folderName = parts[parts.length - 1];
    applyToPattern = `${parts.join("/")}/**`;
    instructionFilePath = join(
      CONFIG.INSTRUCTIONS_DIR,
      `${folderName}.instructions.md`,
    );
  }

  const frontmatter = `---\napplyTo: "${applyToPattern}"\n---\n\n`;
  const fileContent = frontmatter + content;

  await retry(() => writeFile(instructionFilePath, fileContent, "utf8"));
  logger.success(`Written ${instructionFilePath}`);
}

async function execute(): Promise<SyncResult> {
  const stats: SyncStats = {
    filesProcessed: 0,
    errors: 0,
  };
  const findAgentsFiles = await findAgentsFilesFactory();
  const results = await syncAgentsFiles(stats, findAgentsFiles);

  if (stats.errors === 0) {
    logger.success("Synchronization completed successfully!");
  } else {
    logger.warn(`Synchronization completed with ${stats.errors} errors`);
  }

  return {
    success: stats.errors === 0,
    stats,
    results,
  };
}

async function main(): Promise<void> {
  try {
    const results = await execute();
    process.exit(results.success ? 0 : 1);
  } catch (error) {
    logger.error("Synchronization failed completely:", error as Error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
