// scripts/utils/logger.js
export const logger = {
  error(message, error) {
    console.error(`❌ ERROR: ${message}`);
    if (error) console.error(error.stack || error.message);
  },
  warn(message, error) {
    console.warn(`⚠️  WARN: ${message}`);
    if (error) console.warn(error.stack || error.message);
  },
  info(message) {
    console.log(`ℹ️  INFO: ${message}`);
  },
  final(success, errors) {
    if (errors === 0) {
      console.log('\n✅ Operation completed successfully!');
    } else {
      console.warn(`\n⚠️  Operation completed with ${errors} errors`);
    }
  }
};

// scripts/utils/fs.js
import { promises as fs, constants } from 'fs';
import path from 'path';

export async function fileExists(filePath) {
  try {
    await fs.access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function readJson(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content);
}

export async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

export async function scanDirRecursive(dir, pattern) {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await scanDirRecursive(fullPath, pattern));
    } else if (entry.isFile() && pattern.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}
