/**
 * @fileoverview Optimized instruction synchronization script for HellaJS monorepo
 * @description Syncs CLAUDE.md files and agent instructions across directories with
 * improved performance, error handling, and DevOps best practices
 * @author ops-agent
 * @version 2.0.0
 */

import { readdir, readFile, writeFile, mkdir, access, constants } from 'fs/promises';
import { join, dirname, basename } from 'path';
import { performance } from 'perf_hooks';

// Configuration constants
const CONFIG = {
  GLOB_DIRS: ['packages', 'plugins', 'docs', 'scripts'],
  OUTPUT_DIR: '.github/instructions',
  AGENTS_DIR: '.claude/agents',
  GEMINI_AGENTS_DIR: '.gemini/agents',
  TARGET_FILES: ['CLAUDE.md'],
  EXCLUDED_DIRS: new Set(['node_modules', '.git', 'dist', '.next', 'coverage']),
  MAX_RETRIES: 3,
  RETRY_DELAY: 100, // ms
  BATCH_SIZE: 10,
  LOG_LEVELS: { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3 },
  LOG_LEVEL: 2 // INFO level by default
};

// Performance tracking
const perf = {
  start: 0,
  operations: new Map(),
  
  /**
   * Start timing an operation
   * @param {string} operation - Operation name
   */
  startTimer(operation) {
    this.operations.set(operation, performance.now());
  },
  
  /**
   * End timing and log duration
   * @param {string} operation - Operation name
   */
  endTimer(operation) {
    const start = this.operations.get(operation);
    if (start) {
      const duration = Math.round(performance.now() - start);
      logger.debug(`Operation '${operation}' completed in ${duration}ms`);
      this.operations.delete(operation);
      return duration;
    }
    return 0;
  }
};

/**
 * Enhanced logger with different log levels
 */
const logger = {
  /**
   * Log error message
   * @param {string} message - Error message
   * @param {Error} [error] - Optional error object
   */
  error(message, error) {
    if (CONFIG.LOG_LEVEL >= CONFIG.LOG_LEVELS.ERROR) {
      console.error(`❌ ERROR: ${message}`);
      if (error) console.error(error.stack || error.message);
    }
  },
  
  /**
   * Log warning message
   * @param {string} message - Warning message
   */
  warn(message) {
    if (CONFIG.LOG_LEVEL >= CONFIG.LOG_LEVELS.WARN) {
      console.warn(`⚠️  WARN: ${message}`);
    }
  },
  
  /**
   * Log info message
   * @param {string} message - Info message
   */
  info(message) {
    if (CONFIG.LOG_LEVEL >= CONFIG.LOG_LEVELS.INFO) {
      console.log(`ℹ️  INFO: ${message}`);
    }
  },
  
  /**
   * Log debug message
   * @param {string} message - Debug message
   */
  debug(message) {
    if (CONFIG.LOG_LEVEL >= CONFIG.LOG_LEVELS.DEBUG) {
      console.log(`🐛 DEBUG: ${message}`);
    }
  },
  
  /**
   * Log sync operation
   * @param {string} source - Source file path
   * @param {string} target - Target file path
   */
  sync(source, target) {
    this.info(`Synced: ${source} -> ${target}`);
  }
};

/**
 * Utility functions for common operations
 */
const utils = {
  /**
   * Retry an async operation with exponential backoff
   * @param {Function} operation - Async function to retry
   * @param {number} maxRetries - Maximum retry attempts
   * @param {number} delay - Initial delay in ms
   * @returns {Promise<*>} Operation result
   */
  async retry(operation, maxRetries = CONFIG.MAX_RETRIES, delay = CONFIG.RETRY_DELAY) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          throw new Error(`Operation failed after ${maxRetries} attempts: ${error.message}`);
        }
        
        const backoffDelay = delay * Math.pow(2, attempt - 1);
        logger.debug(`Retry ${attempt}/${maxRetries} after ${backoffDelay}ms: ${error.message}`);
        await this.sleep(backoffDelay);
      }
    }
    
    throw lastError;
  },
  
  /**
   * Sleep for specified duration
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
  
  /**
   * Check if file exists
   * @param {string} filePath - Path to check
   * @returns {Promise<boolean>} True if file exists
   */
  async fileExists(filePath) {
    try {
      await access(filePath, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  },
  
  /**
   * Safely create directory with retries
   * @param {string} dirPath - Directory path
   * @returns {Promise<void>}
   */
  async ensureDir(dirPath) {
    return this.retry(async () => {
      await mkdir(dirPath, { recursive: true });
    });
  },
  
  /**
   * Batch process items with concurrency control
   * @param {Array} items - Items to process
   * @param {Function} processor - Async function to process each item
   * @param {number} batchSize - Number of items to process concurrently
   * @returns {Promise<Array>} Results array
   */
  async batchProcess(items, processor, batchSize = CONFIG.BATCH_SIZE) {
    const results = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(async (item, index) => {
          try {
            return await processor(item, i + index);
          } catch (error) {
            logger.error(`Batch processing failed for item ${i + index}:`, error);
            throw error;
          }
        })
      );
      
      // Collect successful results and log failures
      for (const [index, result] of batchResults.entries()) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          logger.error(`Failed to process item ${i + index}: ${result.reason.message}`);
        }
      }
    }
    
    return results.filter(Boolean);
  }
};

/**
 * Frontmatter and content processing utilities
 */
const contentUtils = {
  /**
   * Generate frontmatter for package
   * @param {string} pkg - Package name
   * @param {string} baseDir - Base directory
   * @returns {string} Formatted frontmatter
   */
  getFrontmatter(pkg, baseDir) {
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
  },
  
  /**
   * Parse frontmatter from content
   * @param {string} content - File content
   * @returns {Object} Parsed frontmatter and body
   */
  parseFrontmatter(content) {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);
    
    if (!match) {
      return { frontmatter: null, body: content };
    }
    
    const [, frontmatterText, body] = match;
    const frontmatter = {};
    
    // Parse YAML-like frontmatter
    frontmatterText.split('\n').forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim();
        const value = line.slice(colonIndex + 1).trim();
        frontmatter[key] = value;
      }
    });
    
    return { frontmatter, body: body.trim() };
  },
  
  /**
   * Extract examples from description text
   * @param {string} text - Description text
   * @returns {Object} Processed description and examples
   */
  extractExamples(text) {
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
  },
  
  /**
   * Process agent content for different output formats
   * @param {string} content - Raw agent content
   * @param {string} agentName - Agent name
   * @returns {string} Processed content
   */
  processAgentContent(content) {
    const lines = content.split('\n');
    const frontmatterBounds = this.findFrontmatterBounds(lines);
    
    if (!frontmatterBounds) {
      return content; // No frontmatter found
    }
    
    const { start, end } = frontmatterBounds;
    const frontmatterLines = lines.slice(start + 1, end);
    const markdownContent = lines.slice(end + 1).join('\n');
    
    // Extract metadata from frontmatter
    const metadata = this.extractMetadata(frontmatterLines);
    const filteredFrontmatter = this.filterFrontmatter(frontmatterLines, ['name', 'description']);
    
    // Process examples from markdown content
    const examplesMatch = markdownContent.match(/## Examples\s*([\s\S]*?)\s*## Role/);
    let examples = examplesMatch ? examplesMatch[1].trim() : '';
    let cleanMarkdown = markdownContent.replace(/## Examples[\s\S]*?## Role/, '## Role');
    
    // Build agent header
    const agentHeader = this.buildAgentHeader(metadata, examples);
    
    // Reconstruct content
    if (agentHeader) {
      cleanMarkdown = cleanMarkdown.replace(/^## Role/m, agentHeader);
    }
    
    let result = '';
    if (filteredFrontmatter.length > 0) {
      result += '---\n' + filteredFrontmatter.join('\n') + '\n---\n';
    }
    result += `\n${cleanMarkdown}`;
    
    return result;
  },
  
  /**
   * Find frontmatter boundaries in content lines
   * @param {Array<string>} lines - Content lines
   * @returns {Object|null} Frontmatter boundaries or null
   */
  findFrontmatterBounds(lines) {
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
  },
  
  /**
   * Extract metadata from frontmatter lines
   * @param {Array<string>} lines - Frontmatter lines
   * @returns {Object} Extracted metadata
   */
  extractMetadata(lines) {
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
  },
  
  /**
   * Filter frontmatter lines, excluding specified keys
   * @param {Array<string>} lines - Frontmatter lines
   * @param {Array<string>} excludeKeys - Keys to exclude
   * @returns {Array<string>} Filtered lines
   */
  filterFrontmatter(lines, excludeKeys = []) {
    return lines.filter(line => {
      return !excludeKeys.some(key => 
        line.match(new RegExp(`^${key}:\\s*`))
      );
    });
  },
  
  /**
   * Build agent header from metadata
   * @param {Object} metadata - Agent metadata
   * @param {string} examples - Examples content
   * @returns {string} Formatted agent header
   */
  buildAgentHeader(metadata, examples) {
    const { name, description } = metadata;
    
    if (!name && !description) {
      return '';
    }
    
    const { text: cleanDesc, examples: extractedExamples } = this.extractExamples(description);
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
};

/**
 * File discovery and processing
 */
class FileProcessor {
  constructor() {
    this.discoveredFiles = new Map();
    this.processedCount = 0;
  }
  
  /**
   * Recursively find CLAUDE.md files in directory
   * @param {string} dir - Directory to search
   * @returns {Promise<Array<string>>} Array of file paths
   */
  async findClaudeFiles(dir) {
    const results = [];
    
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      const subdirPromises = [];
      
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        
        if (entry.isDirectory()) {
          if (!CONFIG.EXCLUDED_DIRS.has(entry.name)) {
            subdirPromises.push(this.findClaudeFiles(fullPath));
          }
        } else if (entry.isFile() && CONFIG.TARGET_FILES.includes(entry.name)) {
          results.push(fullPath);
        }
      }
      
      // Process subdirectories concurrently
      if (subdirPromises.length > 0) {
        const subdirResults = await Promise.allSettled(subdirPromises);
        
        for (const result of subdirResults) {
          if (result.status === 'fulfilled') {
            results.push(...result.value);
          } else {
            logger.warn(`Failed to process subdirectory: ${result.reason.message}`);
          }
        }
      }
    } catch (error) {
      logger.error(`Failed to read directory ${dir}:`, error);
    }
    
    return results;
  }
  
  /**
   * Extract package name from file path
   * @param {string} filePath - File path
   * @param {string} baseDir - Base directory
   * @returns {string} Package name
   */
  extractPackageName(filePath) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    const parts = normalizedPath.split('/');
    
    if (parts.length >= 3 && ['packages', 'plugins', 'scripts'].includes(parts[0])) {
      return parts[1];
    } else if (parts.length >= 2 && parts[0] === 'docs') {
      return 'docs';
    }
    
    return basename(dirname(filePath));
  }
  
  /**
   * Process a single CLAUDE.md file
   * @param {string} filePath - Source file path
   * @param {string} baseDir - Base directory
   * @returns {Promise<Object>} Processing result
   */
  async processSingleFile(filePath, baseDir) {
    const startTime = performance.now();
    
    try {
      const pkg = this.extractPackageName(filePath);
      const content = await utils.retry(() => readFile(filePath, 'utf8'));
      
      const outputs = await Promise.allSettled([
        this.writeInstructionFile(filePath, content, pkg, baseDir),
        this.writeGeminiFile(filePath, content)
      ]);
      
      const processingTime = Math.round(performance.now() - startTime);
      this.processedCount++;
      
      return {
        source: filePath,
        pkg,
        success: outputs.every(result => result.status === 'fulfilled'),
        processingTime,
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
  
  /**
   * Write instruction file with frontmatter
   * @param {string} sourceFile - Source file path
   * @param {string} content - File content
   * @param {string} pkg - Package name
   * @param {string} baseDir - Base directory
   * @returns {Promise<string>} Output file path
   */
  async writeInstructionFile(sourceFile, content, pkg, baseDir) {
    const outFile = join(CONFIG.OUTPUT_DIR, `${pkg}.instructions.md`);
    const finalContent = contentUtils.getFrontmatter(pkg, baseDir) + content;
    
    await utils.ensureDir(dirname(outFile));
    await utils.retry(() => writeFile(outFile, finalContent, 'utf8'));
    
    logger.sync(sourceFile, outFile);
    return outFile;
  }
  
  /**
   * Write GEMINI.md file
   * @param {string} sourceFile - Source file path
   * @param {string} content - File content
   * @returns {Promise<string>} Output file path
   */
  async writeGeminiFile(sourceFile, content) {
    const geminiFile = join(dirname(sourceFile), 'GEMINI.md');
    
    await utils.retry(() => writeFile(geminiFile, content, 'utf8'));
    
    logger.sync(sourceFile, geminiFile);
    return geminiFile;
  }
}

/**
 * Agent synchronization handler
 */
class AgentProcessor {
  constructor() {
    this.processedAgents = [];
  }
  
  /**
   * Get list of agent files
   * @returns {Promise<Array<string>>} Agent file names
   */
  async getAgentFiles() {
    try {
      if (!(await utils.fileExists(CONFIG.AGENTS_DIR))) {
        logger.info('Agents directory not found, skipping agent sync');
        return [];
      }
      
      const entries = await readdir(CONFIG.AGENTS_DIR, { withFileTypes: true });
      return entries
        .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
        .map(entry => entry.name);
    } catch (error) {
      logger.warn(`Failed to read agents directory: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Process a single agent file
   * @param {string} fileName - Agent file name
   * @returns {Promise<Object>} Processing result
   */
  async processSingleAgent(fileName) {
    const sourcePath = join(CONFIG.AGENTS_DIR, fileName);
    const baseName = basename(fileName, '.md');
    
    try {
      const content = await utils.retry(() => readFile(sourcePath, 'utf8'));
      
      const outputs = await Promise.allSettled([
        this.writeInstructionFile(sourcePath, content, baseName),
        this.writeGeminiAgent(sourcePath, content, baseName)
      ]);
      
      this.processedAgents.push(baseName);
      
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
  
  /**
   * Write agent instruction file
   * @param {string} sourcePath - Source file path
   * @param {string} content - File content
   * @param {string} baseName - Base name
   * @returns {Promise<string>} Output file path
   */
  async writeInstructionFile(sourcePath, content, baseName) {
    const outputPath = join(CONFIG.OUTPUT_DIR, `${baseName}.instructions.md`);
    const processedContent = contentUtils.processAgentContent(content);
    
    await utils.ensureDir(CONFIG.OUTPUT_DIR);
    await utils.retry(() => writeFile(outputPath, processedContent, 'utf8'));
    
    logger.sync(sourcePath, outputPath);
    return outputPath;
  }
  
  /**
   * Write GEMINI agent file
   * @param {string} sourcePath - Source file path
   * @param {string} content - File content
   * @param {string} baseName - Base name
   * @returns {Promise<string>} Output file path
   */
  async writeGeminiAgent(sourcePath, content, baseName) {
    const geminiAgentDir = join(CONFIG.GEMINI_AGENTS_DIR, baseName);
    const geminiOutputPath = join(geminiAgentDir, 'GEMINI.md');
    
    await utils.ensureDir(geminiAgentDir);
    await utils.retry(() => writeFile(geminiOutputPath, content, 'utf8'));
    
    logger.sync(sourcePath, geminiOutputPath);
    return geminiOutputPath;
  }
  
  /**
   * Process all agent files
   * @returns {Promise<Array>} Processing results
   */
  async processAllAgents() {
    perf.startTimer('agent-sync');
    
    const agentFiles = await this.getAgentFiles();
    
    if (agentFiles.length === 0) {
      perf.endTimer('agent-sync');
      return [];
    }
    
    logger.info(`Processing ${agentFiles.length} agent files...`);
    
    const results = await utils.batchProcess(
      agentFiles,
      async (fileName) => await this.processSingleAgent(fileName)
    );
    
    const duration = perf.endTimer('agent-sync');
    logger.info(`Agent sync completed: ${results.length} agents processed in ${duration}ms`);
    
    return results;
  }
}

/**
 * Root CLAUDE.md file processor
 */
class RootProcessor {
  /**
   * Process root CLAUDE.md file
   * @returns {Promise<Object>} Processing result
   */
  async processRoot() {
    perf.startTimer('root-sync');
    
    try {
      if (!(await utils.fileExists('CLAUDE.md'))) {
        logger.info('Root CLAUDE.md not found, skipping root sync');
        perf.endTimer('root-sync');
        return null;
      }
      
      const content = await utils.retry(() => readFile('CLAUDE.md', 'utf8'));
      
      const outputs = await Promise.allSettled([
        this.writeCopilotInstructions(content),
        this.writeGeminiFile(content)
      ]);
      
      const duration = perf.endTimer('root-sync');
      
      return {
        source: 'CLAUDE.md',
        success: outputs.every(result => result.status === 'fulfilled'),
        processingTime: duration,
        outputs: outputs.map(result => ({
          status: result.status,
          reason: result.reason?.message
        }))
      };
    } catch (error) {
      logger.error('Failed to process root CLAUDE.md:', error);
      perf.endTimer('root-sync');
      throw error;
    }
  }
  
  /**
   * Write Copilot instructions file
   * @param {string} content - CLAUDE.md content
   * @returns {Promise<string>} Output file path
   */
  async writeCopilotInstructions(content) {
    const outFile = join('.github', 'copilot-instructions.md');
    const finalContent = contentUtils.getFrontmatter('root', 'root') + content;
    
    await utils.ensureDir(dirname(outFile));
    await utils.retry(() => writeFile(outFile, finalContent, 'utf8'));
    
    logger.sync('CLAUDE.md', outFile);
    return outFile;
  }
  
  /**
   * Write GEMINI.md file with enhanced content
   * @param {string} baseContent - Base CLAUDE.md content
   * @returns {Promise<string>} Output file path
   */
  async writeGeminiFile(baseContent) {
    let geminiContent = baseContent;
    
    // Try to enhance with agent information
    try {
      const agentProcessor = new AgentProcessor();
      const agentFiles = await agentProcessor.getAgentFiles();
      
      if (agentFiles.length > 0) {
        const agentSections = await this.processAgentSections(agentFiles);
        
        if (agentSections.length > 0) {
          geminiContent = geminiContent.replace(
            /The available agents are:[\s\S]*?(?=\n##|$)/, 
            ''
          );
          geminiContent += '\n\n' + agentSections.join('\n\n');
        }
      }
    } catch (error) {
      logger.warn('Failed to enhance GEMINI.md with agent content:', error);
    }
    
    await utils.retry(() => writeFile('GEMINI.md', geminiContent, 'utf8'));
    
    logger.sync('CLAUDE.md', 'GEMINI.md');
    return 'GEMINI.md';
  }
  
  /**
   * Process agent sections for GEMINI enhancement
   * @param {Array<string>} agentFiles - Agent file names
   * @returns {Promise<Array<string>>} Processed agent sections
   */
  async processAgentSections(agentFiles) {
    const results = await utils.batchProcess(
      agentFiles,
      async (fileName) => {
        const agentPath = join(CONFIG.AGENTS_DIR, fileName);
        const content = await readFile(agentPath, 'utf8');
        
        const { frontmatter, body } = contentUtils.parseFrontmatter(content);
        
        if (!frontmatter) return null;
        
        let formattedSection = '';
        
        if (frontmatter.name) {
          formattedSection += `## ${frontmatter.name}\n\n`;
        }
        
        if (frontmatter.description) {
          const { text, examples } = contentUtils.extractExamples(frontmatter.description);
          formattedSection += `### Description\n${text}\n\n`;
          
          if (examples.length > 0) {
            formattedSection += `### Examples\n${examples.map(e => `- ${e}`).join('\n')}\n\n`;
          }
        }
        
        // Add extra hash to headers in body content
        const processedBody = body.replace(/^(#+)/gm, '$1#');
        formattedSection += processedBody;
        
        return formattedSection.trim();
      }
    );
    
    return results.filter(Boolean);
  }
}

/**
 * Main synchronization orchestrator
 */
class SyncOrchestrator {
  constructor() {
    this.fileProcessor = new FileProcessor();
    this.agentProcessor = new AgentProcessor();
    this.rootProcessor = new RootProcessor();
    this.stats = {
      filesProcessed: 0,
      agentsProcessed: 0,
      errors: 0,
      totalTime: 0
    };
  }
  
  /**
   * Discover all CLAUDE.md files across directories
   * @returns {Promise<Map>} Map of base directories to file lists
   */
  async discoverFiles() {
    perf.startTimer('file-discovery');
    
    const fileMap = new Map();
    
    const discoveryPromises = CONFIG.GLOB_DIRS.map(async (baseDir) => {
      try {
        if (await utils.fileExists(baseDir)) {
          const files = await this.fileProcessor.findClaudeFiles(baseDir);
          fileMap.set(baseDir, files);
          logger.debug(`Discovered ${files.length} files in ${baseDir}`);
        } else {
          logger.debug(`Directory ${baseDir} not found`);
          fileMap.set(baseDir, []);
        }
      } catch (error) {
        logger.error(`Failed to discover files in ${baseDir}:`, error);
        fileMap.set(baseDir, []);
        this.stats.errors++;
      }
    });
    
    await Promise.allSettled(discoveryPromises);
    
    const totalFiles = Array.from(fileMap.values()).reduce((sum, files) => sum + files.length, 0);
    const duration = perf.endTimer('file-discovery');
    
    logger.info(`File discovery completed: ${totalFiles} files found in ${duration}ms`);
    
    return fileMap;
  }
  
  /**
   * Process CLAUDE.md files
   * @returns {Promise<Array>} Processing results
   */
  async syncClaudeFiles() {
    const fileMap = await this.discoverFiles();
    const allResults = [];
    
    for (const [baseDir, files] of fileMap) {
      if (files.length === 0) continue;
      
      perf.startTimer(`sync-${baseDir}`);
      logger.info(`Processing ${files.length} files in ${baseDir}...`);
      
      try {
        const results = await utils.batchProcess(
          files,
          async (filePath) => await this.fileProcessor.processSingleFile(filePath, baseDir)
        );
        
        allResults.push(...results);
        this.stats.filesProcessed += results.length;
        
        const duration = perf.endTimer(`sync-${baseDir}`);
        logger.info(`Completed ${baseDir}: ${results.length} files processed in ${duration}ms`);
      } catch (error) {
        logger.error(`Failed to process files in ${baseDir}:`, error);
        this.stats.errors++;
        perf.endTimer(`sync-${baseDir}`);
      }
    }
    
    return allResults;
  }
  
  /**
   * Execute complete synchronization
   * @returns {Promise<Object>} Sync results summary
   */
  async execute() {
    perf.start = performance.now();
    logger.info('Starting instruction synchronization...');
    
    try {
      // Create output directories upfront
      await Promise.allSettled([
        utils.ensureDir(CONFIG.OUTPUT_DIR),
        utils.ensureDir(CONFIG.GEMINI_AGENTS_DIR)
      ]);
      
      // Execute all sync operations concurrently
      const [rootResult, claudeResults, agentResults] = await Promise.allSettled([
        this.rootProcessor.processRoot(),
        this.syncClaudeFiles(),
        this.agentProcessor.processAllAgents()
      ]);
      
      // Collect statistics
      this.stats.totalTime = Math.round(performance.now() - perf.start);
      this.stats.agentsProcessed = (agentResults.status === 'fulfilled' ? agentResults.value.length : 0);
      
      // Log results
      this.logResults(rootResult, claudeResults, agentResults);
      
      return {
        success: this.stats.errors === 0,
        stats: this.stats,
        rootResult: rootResult.status === 'fulfilled' ? rootResult.value : null,
        claudeResults: claudeResults.status === 'fulfilled' ? claudeResults.value : [],
        agentResults: agentResults.status === 'fulfilled' ? agentResults.value : []
      };
    } catch (error) {
      logger.error('Synchronization failed:', error);
      this.stats.errors++;
      throw error;
    }
  }
  
  /**
   * Log synchronization results
   * @param {PromiseSettledResult} rootResult - Root processing result
   * @param {PromiseSettledResult} claudeResults - Claude files processing result
   * @param {PromiseSettledResult} agentResults - Agent processing result
   */
  logResults(rootResult, claudeResults, agentResults) {
    logger.info('\n📊 Synchronization Summary:');
    logger.info(`├── Total time: ${this.stats.totalTime}ms`);
    logger.info(`├── Files processed: ${this.stats.filesProcessed}`);
    logger.info(`├── Agents processed: ${this.stats.agentsProcessed}`);
    logger.info(`├── Errors: ${this.stats.errors}`);
    
    if (rootResult.status === 'fulfilled' && rootResult.value) {
      logger.info(`├── Root CLAUDE.md: ✅ (${rootResult.value.processingTime}ms)`);
    } else {
      logger.info('├── Root CLAUDE.md: ⏭️  (skipped or failed)');
    }
    
    if (claudeResults.status === 'fulfilled') {
      const successful = claudeResults.value.filter(r => r.success).length;
      const failed = claudeResults.value.length - successful;
      logger.info(`├── Package files: ✅ ${successful} / ❌ ${failed}`);
    }
    
    if (agentResults.status === 'fulfilled') {
      const successful = agentResults.value.filter(r => r.success).length;
      const failed = agentResults.value.length - successful;
      logger.info(`└── Agent files: ✅ ${successful} / ❌ ${failed}`);
    }
    
    if (this.stats.errors === 0) {
      logger.info('\n✅ Synchronization completed successfully!');
    } else {
      logger.warn(`\n⚠️  Synchronization completed with ${this.stats.errors} errors`);
    }
  }
}

/**
 * Main execution function
 * @returns {Promise<void>}
 */
async function main() {
  const orchestrator = new SyncOrchestrator();
  
  try {
    const results = await orchestrator.execute();
    process.exit(results.success ? 0 : 1);
  } catch (error) {
    logger.error('Synchronization failed completely:', error);
    process.exit(1);
  }
}

// Execute if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { SyncOrchestrator, CONFIG, logger, utils, contentUtils };