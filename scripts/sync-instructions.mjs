// scripts/sync-instructions.mjs
// Syncs all CLAUDE.md files and simplified .claude/agents into .github/instructions/*.instructions.md
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


async function syncAgents() {
  const agentsDir = '.claude/agents';
  const outputDir = '.github/instructions';

  try {
    const entries = await readdir(agentsDir, { withFileTypes: true });
    await mkdir(outputDir, { recursive: true });

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        const sourcePath = join(agentsDir, entry.name);
        const baseName = basename(entry.name, '.md');
        const outputPath = join(outputDir, `${baseName}.instructions.md`);

        const content = await readFile(sourcePath, 'utf8');
        const processedContent = processAgentContent(content, baseName);
        await writeFile(outputPath, processedContent, 'utf8');
        console.log(`Synced: ${sourcePath} -> ${outputPath}`);
      }
    }
  } catch (error) {
    console.log(`Skipped agent sync: ${error.message}`);
  }
}

function processAgentContent(content, agentName) {
  // Parse frontmatter and content
  const lines = content.split('\n');
  let frontmatterEnd = -1;
  let frontmatterStart = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      if (frontmatterStart === -1) {
        frontmatterStart = i;
      } else {
        frontmatterEnd = i;
        break;
      }
    }
  }

  if (frontmatterStart === -1 || frontmatterEnd === -1) {
    // No frontmatter, just return content as-is
    return content;
  }

  // Extract frontmatter and remove name/description if present
  const frontmatterLines = lines.slice(frontmatterStart + 1, frontmatterEnd);
  let name = '';
  let description = '';
  let examples = '';
  const filteredFrontmatter = [];

  for (let line of frontmatterLines) {
    const nameMatch = line.match(/^name:\s*(.+)$/);
    const descMatch = line.match(/^description:\s*(.+)$/);
    if (nameMatch) {
      name = nameMatch[1].trim();
      continue;
    }
    if (descMatch) {
      description = descMatch[1].trim();
      continue;
    }
    filteredFrontmatter.push(line);
  }

  // Get markdown content after frontmatter
  let markdownContent = lines.slice(frontmatterEnd + 1).join('\n');

  // Extract examples block if present (between ## Examples and ## Role)
  const examplesMatch = markdownContent.match(/## Examples\s*([\s\S]*?)\s*## Role/);
  if (examplesMatch) {
    examples = examplesMatch[1].trim();
    // Remove old examples block from markdownContent
    markdownContent = markdownContent.replace(/## Examples[\s\S]*?## Role/, '## Role');
  }

  // Build agent header if name/description present
  let agentHeader = '';
  if (name || description) {
    let formattedDescription = description;
    let formattedExamples = examples;

    // Extract <example>...</example> blocks from description
    const exampleRegex = /<example>(.*?)<\/example>/g;
    let exampleMatches = [];
    let descWithoutExamples = formattedDescription;
    let match;
    while ((match = exampleRegex.exec(formattedDescription)) !== null) {
      exampleMatches.push(match[1].trim());
    }
    if (exampleMatches.length > 0) {
      // Remove "Examples:" and all <example>...</example> from description
      descWithoutExamples = descWithoutExamples.replace(/Examples:\s*/g, '');
      descWithoutExamples = descWithoutExamples.replace(exampleRegex, '').trim();
      // Format examples as bullet points
      formattedExamples = exampleMatches.map(e => `- ${e}`).join('\n');
    }

    agentHeader += `# Agent\n\n${name}\n\n## Description\n\n${descWithoutExamples}\n`;
    if (formattedExamples) {
      agentHeader += `\n## Examples\n${formattedExamples}\n`;
    }
    agentHeader += `\n## Role\n`;
  }

  // Insert agentHeader above ## Role
  if (agentHeader) {
    // Replace first occurrence of ## Role with agentHeader
    markdownContent = markdownContent.replace(/^## Role/m, agentHeader);
  }

  // Reconstruct without name/description in frontmatter
  let result = '';
  if (filteredFrontmatter.length > 0) {
    result += '---\n' + filteredFrontmatter.join('\n') + '\n---\n';
  }
  result += `\n${markdownContent}`;

  return result;
}

Promise.all([
  syncClaudeFiles(),
  syncAgents(),
]).catch(e => {
  console.error(e);
  process.exit(1);
});
