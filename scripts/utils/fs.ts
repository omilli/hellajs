import { constants, promises as fs } from "node:fs";
import path from "node:path";

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function readJson<T = unknown>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, "utf8");
  return JSON.parse(content);
}

export async function writeJson(
  filePath: string,
  data: unknown,
): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

export async function scanDirRecursive(
  dir: string,
  pattern: RegExp,
): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs
    .readdir(dir, { withFileTypes: true })
    .catch(() => [] as Awaited<ReturnType<typeof fs.readdir>>);
  for (const entry of entries) {
    const name = entry.name as string;
    const fullPath = path.join(dir, name);
    if (entry.isDirectory()) {
      files.push(...(await scanDirRecursive(fullPath, pattern)));
    } else if (entry.isFile() && pattern.test(name)) {
      files.push(fullPath);
    }
  }
  return files;
}
