// Re-export utilities from separate modules for backward compatibility
export { logger } from "./logger.js";
export { fileExists, ensureDir, readJson, writeJson, scanDirRecursive } from "./fs.js";
export { execCommand, execCommandInherited } from "./exec.js";
export { projectRoot, packagesDir, pluginsDir, getPackagePath, getPackagePaths } from "./paths.js";
