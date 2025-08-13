// scripts/sync-instructions.mjs
// Syncs all CLAUDE.md files into .github/instructions/*.instructions.md with Copilot replacements
// Usage: bun scripts/sync-instructions.mjs

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname, basename } from 'path';

const GLOB_DIRS = ['packages', 'plugins', 'docs', 'scripts'];
const OUTPUT_DIR = '.github/instructions';
function getFrontmatter(pkg, baseDir) {
  let applyTo = "**";
  
  if (baseDir === 'packages') {
    applyTo = `packages/${pkg}/**`;
  } else if (baseDir === 'plugins') {
    applyTo = `plugins/${pkg}/**`;
  } else if (baseDir === 'scripts') {
    applyTo = `scripts/**`;
  } else if (pkg === 'docs') {
    applyTo = `docs/**`;
  }
  
  return `---
applyTo: "${applyTo}"
---

`;
}

async function findClaudeFiles(dir) {
  let results = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
      results = results.concat(await findClaudeFiles(fullPath));
    } else if (entry.isFile() && entry.name === 'CLAUDE.md') {
      results.push(fullPath);
    }
  }
  return results;
}

async function syncClaudeFiles() {
  // Sync root CLAUDE.md if it exists
  try {
    const rootClaude = 'CLAUDE.md';
    const outFile = join('.github', 'copilot-instructions.md');
    const raw = await readFile(rootClaude, 'utf8');
    const final = getFrontmatter('root', 'root') + raw;
    await mkdir(dirname(outFile), { recursive: true });
    await writeFile(outFile, final, 'utf8');
    console.log(`Synced: ${rootClaude} -> ${outFile}`);
  } catch { }

  for (const baseDir of GLOB_DIRS) {
    let claudeFiles = [];
    try {
      claudeFiles = await findClaudeFiles(baseDir);
    } catch { }
    for (const file of claudeFiles) {
      const rel = file.replace(/\\/g, '/');
      // e.g. packages/core/CLAUDE.md => core.instructions.md
      //      plugins/vite/CLAUDE.md => vite.instructions.md
      //      scripts/foo/CLAUDE.md => foo.instructions.md
      //      docs/CLAUDE.md => docs.instructions.md
      let pkg = '';
      const parts = rel.split('/');
      if (parts.length >= 3 && (parts[0] === 'packages' || parts[0] === 'plugins' || parts[0] === 'scripts')) {
        pkg = parts[1];
      } else if (parts.length >= 2 && parts[0] === 'docs') {
        pkg = 'docs';
      } else {
        pkg = basename(dirname(file));
      }
      const outFile = join(OUTPUT_DIR, `${pkg}.instructions.md`);
      const raw = await readFile(file, 'utf8');
      const final = getFrontmatter(pkg, baseDir) + raw;
      await mkdir(dirname(outFile), { recursive: true });
      await writeFile(outFile, final, 'utf8');
      console.log(`Synced: ${file} -> ${outFile}`);
    }
  }
}

async function copyClaudeToGemini() {
  const claudeFiles = await findClaudeFiles(process.cwd());
  for (const file of claudeFiles) {
    const newFile = join(dirname(file), 'GEMINI.md');
    const content = await readFile(file, 'utf8');
    await writeFile(newFile, content, 'utf8');
    console.log(`Copied: ${file} -> ${newFile}`);
  }
}

Promise.all([
  syncClaudeFiles(),
  copyClaudeToGemini(),
]).catch(e => {
  console.error(e);
  process.exit(1);
});
