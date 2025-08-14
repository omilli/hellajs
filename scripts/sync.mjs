import { readdir, readFile, writeFile } from 'fs/promises';
import { join, dirname, basename } from 'path';
import { logger, fileExists, ensureDir } from './utils/common.js';

const CONFIG = {
  GLOB_DIRS: ['packages', 'plugins', 'docs', 'scripts'],
  OUTPUT_DIR: '.github/instructions',
  AGENTS_DIR: '.claude/agents',
  GEMINI_AGENTS_DIR: '.gemini/agents',
  TARGET_FILES: ['CLAUDE.md']
};

async function retry(operation, maxRetries = 3, delay = 100) {
  let attempt = 0, lastError;
  while (++attempt <= maxRetries) {
    try { return await operation(); }
    catch (error) {
      lastError = error;
      if (attempt === maxRetries) throw new Error(`Operation failed after ${maxRetries} attempts: ${error.message}`);
      await sleep(delay << (attempt - 1));
    }
  }
  throw lastError;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// fileExists and ensureDir now imported from utils/common.js

async function batchProcess(items, processor) {
  return (await Promise.all(items.map(processor))).filter(Boolean);
}

function getFrontmatter(pkg, baseDir) {
  const applyToMapping = {
    packages: `packages/${pkg}/**`,
    plugins: `plugins/${pkg}/**`,
    scripts: 'scripts/**',
    docs: 'docs/**'
  };
  const applyTo = (baseDir === 'docs' && pkg === 'docs')
    ? applyToMapping.docs
    : applyToMapping[baseDir] || '**';
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
  frontmatterText.split('\n').forEach(line => {
    const colonIndex = line.indexOf(':');
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
    examples.push(match[1].replace(/\n/g, ' ').trim());
  }
  const cleanText = text
    .replace(exampleRegex, '')
    .replace(/Examples:\s*/g, '')
    .trim();
  return { text: cleanText, examples };
}

function findFrontmatterBounds(lines) {
  let start = -1;
  let end = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      if (start === -1) {
        start = i;
      } else {
        end = i;
        break;
      }
    }
  }
  return (start !== -1 && end !== -1) ? { start, end } : null;
}

function extractMetadata(lines) {
  const metadata = { name: '', description: '' };
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
  return lines.filter(line => {
    return !excludeKeys.some(key =>
      line.match(new RegExp(`^${key}:\\s*`))
    );
  });
}

function buildAgentHeader(metadata, examples) {
  const { name, description } = metadata;
  if (!name && !description) {
    return '';
  }
  const { text: cleanDesc, examples: extractedExamples } = extractExamples(description);
  const formattedExamples = extractedExamples.length > 0
    ? extractedExamples.map(e => `- ${e}`).join('\n')
    : examples;
  let header = `# Agent\n\n${name}\n\n## Description\n\n${cleanDesc}\n`;
  if (formattedExamples) {
    header += `\n## Examples\n${formattedExamples}\n`;
  }
  header += '\n## Role\n';
  return header;
}

function processAgentContent(content) {
  const lines = content.split('\n');
  const frontmatterBounds = findFrontmatterBounds(lines);
  if (!frontmatterBounds) {
    return content;
  }
  const { start, end } = frontmatterBounds;
  const frontmatterLines = lines.slice(start + 1, end);
  const markdownContent = lines.slice(end + 1).join('\n');
  const metadata = extractMetadata(frontmatterLines);
  const filteredFrontmatter = filterFrontmatter(frontmatterLines, ['name', 'description']);
  const examplesMatch = markdownContent.match(/## Examples\s*([\s\S]*?)\s*## Role/);
  let examples = examplesMatch ? examplesMatch[1].trim() : '';
  let cleanMarkdown = markdownContent.replace(/## Examples[\s\S]*?## Role/, '## Role');
  const agentHeader = buildAgentHeader(metadata, examples);
  if (agentHeader) {
    cleanMarkdown = cleanMarkdown.replace(/^## Role/m, agentHeader);
  }
  let result = '';
  if (filteredFrontmatter.length > 0) {
    result += '---\n' + filteredFrontmatter.join('\n') + '\n---\n';
  }
  result += `\n${cleanMarkdown}`;
  return result;
}

async function findClaudeFilesFactory() {
  const cache = new Map();
  async function findClaudeFiles(dir) {
    if (cache.has(dir)) return cache.get(dir);
    let results = [];
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      const subdirs = entries.filter(e => e.isDirectory()).map(e => join(dir, e.name));
      results = entries.filter(e => e.isFile() && CONFIG.TARGET_FILES.includes(e.name)).map(e => join(dir, e.name));
      if (subdirs.length) {
        const nested = await Promise.all(subdirs.map(d => findClaudeFiles(d)));
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
  const normalizedPath = filePath.replace(/\\/g, '/');
  const parts = normalizedPath.split('/');
  if (parts.length >= 3 && ['packages', 'plugins', 'scripts'].includes(parts[0])) {
    return parts[1];
  } else if (parts.length >= 2 && parts[0] === 'docs') {
    return 'docs';
  }
  return basename(dirname(filePath));
}

async function processSingleFile(filePath, baseDir, findClaudeFiles) {
  try {
    const pkg = extractPackageName(filePath);
    const content = await retry(() => readFile(filePath, 'utf8'));
    const outputs = await Promise.allSettled([
      writeInstructionFile(filePath, content, pkg, baseDir),
      writeGeminiFile(filePath, content)
    ]);
    return {
      source: filePath,
      pkg,
      success: outputs.every(result => result.status === 'fulfilled'),
      outputs: outputs.map(result => ({
        status: result.status,
        reason: result.reason?.message
      }))
    };
  } catch (error) {
    logger.error(`Failed to process file ${filePath}:`, error);
    throw error;
  }
}

async function writeInstructionFile(sourceFile, content, pkg, baseDir) {
  const outFile = join(CONFIG.OUTPUT_DIR, `${pkg}.instructions.md`);
  const finalContent = getFrontmatter(pkg, baseDir) + content;
  await ensureDir(dirname(outFile));
  await retry(() => writeFile(outFile, finalContent, 'utf8'));
  return outFile;
}

async function writeGeminiFile(sourceFile, content) {
  const geminiFile = join(dirname(sourceFile), 'GEMINI.md');
  await retry(() => writeFile(geminiFile, content, 'utf8'));
  return geminiFile;
}

async function getAgentFiles() {
  try {
    if (!(await fileExists(CONFIG.AGENTS_DIR))) {
      return [];
    }
    const entries = await readdir(CONFIG.AGENTS_DIR, { withFileTypes: true });
    return entries
      .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
      .map(entry => entry.name);
  } catch (error) {
    return [];
  }
}

async function processSingleAgent(fileName) {
  const sourcePath = join(CONFIG.AGENTS_DIR, fileName);
  const baseName = basename(fileName, '.md');
  try {
    const content = await retry(() => readFile(sourcePath, 'utf8'));
    const outputs = await Promise.allSettled([
      writeAgentInstructionFile(sourcePath, content, baseName),
      writeGeminiAgent(sourcePath, content, baseName)
    ]);
    return {
      agent: baseName,
      source: sourcePath,
      success: outputs.every(result => result.status === 'fulfilled'),
      outputs: outputs.map(result => ({
        status: result.status,
        reason: result.reason?.message
      }))
    };
  } catch (error) {
    logger.error(`Failed to process agent ${baseName}:`, error);
    throw error;
  }
}

async function writeAgentInstructionFile(sourcePath, content, baseName) {
  const outputPath = join(CONFIG.OUTPUT_DIR, `${baseName}.instructions.md`);
  const processedContent = processAgentContent(content);
  await ensureDir(CONFIG.OUTPUT_DIR);
  await retry(() => writeFile(outputPath, processedContent, 'utf8'));
  return outputPath;
}

async function writeGeminiAgent(sourcePath, content, baseName) {
  const geminiAgentDir = join(CONFIG.GEMINI_AGENTS_DIR, baseName);
  const geminiOutputPath = join(geminiAgentDir, 'GEMINI.md');
  await ensureDir(geminiAgentDir);
  await retry(() => writeFile(geminiOutputPath, content, 'utf8'));
  return geminiOutputPath;
}

async function processAllAgents() {
  const agentFiles = await getAgentFiles();
  if (agentFiles.length === 0) {
    return [];
  }
  const results = await batchProcess(
    agentFiles,
    async (fileName) => await processSingleAgent(fileName)
  );
  return results;
}

async function processRoot() {
  try {
    if (!(await fileExists('CLAUDE.md'))) {
      return null;
    }
    const content = await retry(() => readFile('CLAUDE.md', 'utf8'));
    const outputs = await Promise.allSettled([
      writeCopilotInstructions(content),
      writeRootGeminiFile(content)
    ]);
    return {
      source: 'CLAUDE.md',
      success: outputs.every(result => result.status === 'fulfilled'),
      outputs: outputs.map(result => ({
        status: result.status,
        reason: result.reason?.message
      }))
    };
  } catch (error) {
    logger.error('Failed to process root CLAUDE.md:', error);
    throw error;
  }
}

async function writeCopilotInstructions(content) {
  const outFile = join('.github', 'copilot-instructions.md');
  const finalContent = getFrontmatter('root', 'root') + content;
  await ensureDir(dirname(outFile));
  await retry(() => writeFile(outFile, finalContent, 'utf8'));
  return outFile;
}

async function writeRootGeminiFile(baseContent) {
  let geminiContent = baseContent;
  try {
    const agentFiles = await getAgentFiles();
    if (agentFiles.length > 0) {
      const agentSections = await processAgentSections(agentFiles);
      if (agentSections.length > 0) {
        geminiContent = geminiContent.replace(
          /The available agents are:[\s\S]*?(?=\n##|$)/,
          ''
        );
        geminiContent += '\n\n' + agentSections.join('\n\n');
      }
    }
  } catch (error) { }
  await retry(() => writeFile('GEMINI.md', geminiContent, 'utf8'));
  return 'GEMINI.md';
}

async function processAgentSections(agentFiles) {
  const results = await batchProcess(
    agentFiles,
    async (fileName) => {
      const agentPath = join(CONFIG.AGENTS_DIR, fileName);
      const content = await readFile(agentPath, 'utf8');
      const { frontmatter, body } = parseFrontmatter(content);
      if (!frontmatter) return null;
      let formattedSection = '';
      if (frontmatter.name) {
        formattedSection += `## ${frontmatter.name}\n\n`;
      }
      if (frontmatter.description) {
        const { text, examples } = extractExamples(frontmatter.description);
        formattedSection += `### Description\n${text}\n\n`;
        if (examples.length > 0) {
          formattedSection += `### Examples\n${examples.map(e => `- ${e}`).join('\n')}\n\n`;
        }
      }
      const processedBody = body.replace(/^(#+)/gm, '$1#');
      formattedSection += processedBody;
      return formattedSection.trim();
    }
  );
  return results.filter(Boolean);
}

async function discoverFiles(findClaudeFiles) {
  const fileMap = new Map();
  await Promise.all(CONFIG.GLOB_DIRS.map(async baseDir => {
    try {
      fileMap.set(baseDir, await fileExists(baseDir) ? await findClaudeFiles(baseDir) : []);
    } catch (error) {
      logger.error(`Failed to discover files in ${baseDir}:`, error);
      fileMap.set(baseDir, []);
    }
  }));
  return fileMap;
}

async function syncClaudeFiles(stats, findClaudeFiles) {
  const fileMap = await discoverFiles(findClaudeFiles);
  const allResults = [];
  for (const [baseDir, files] of fileMap) {
    if (!files.length) continue;
    try {
      const results = await batchProcess(files, (filePath, i) => processSingleFile(filePath, baseDir, findClaudeFiles));
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
    agentsProcessed: 0,
    errors: 0
  };
  await Promise.allSettled([
    ensureDir(CONFIG.OUTPUT_DIR),
    ensureDir(CONFIG.GEMINI_AGENTS_DIR)
  ]);
  const findClaudeFiles = await findClaudeFilesFactory();
  const [rootResult, claudeResults, agentResults] = await Promise.allSettled([
    processRoot(),
    syncClaudeFiles(stats, findClaudeFiles),
    processAllAgents()
  ]);
  stats.agentsProcessed = (agentResults.status === 'fulfilled' ? agentResults.value.length : 0);
  logger.final(stats.errors === 0, stats.errors);
  return {
    success: stats.errors === 0,
    stats,
    rootResult: rootResult.status === 'fulfilled' ? rootResult.value : null,
    claudeResults: claudeResults.status === 'fulfilled' ? claudeResults.value : [],
    agentResults: agentResults.status === 'fulfilled' ? agentResults.value : []
  };
}

async function main() {
  try {
    const results = await execute();
    process.exit(results.success ? 0 : 1);
  } catch (error) {
    logger.error('Synchronization failed completely:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}