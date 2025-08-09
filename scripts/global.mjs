import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { minify } from "terser";

const bundlePath = process.argv[2]; // e.g. "dist/hella-dom.global.js"
const globalNamespace = process.argv[3] || "hella.dom"; // e.g. "hella.dom" or just "window"

if (!bundlePath) {
  console.error("Usage: node global.mjs <bundlePath> [globalNamespace]");
  process.exit(1);
}

let code = readFileSync(bundlePath, "utf8");

// Find the export object name (e.g. exports_lib or similar)
const exportObjMatch = code.match(/var (exports_\w+) = \{\};\s*__export\(\1, \{/);
if (!exportObjMatch) {
  console.error("Could not find export object in bundle.");
  process.exit(1);
}
const exportObj = exportObjMatch[1];

// Append code to assign all exports to window.hella.dom (or custom global)
const append = `\n;(function() {\n  var target = window;\n  ${globalNamespace.split('.').map((seg, i, arr) => {
  return `target = target['${seg}'] = target['${seg}'] || {};`;
}).join('\n  ')}\n  for (var k in ${exportObj}) {\n    if (${exportObj}.hasOwnProperty(k)) target[k] = ${exportObj}[k];\n  }\n})();\n`;

let finalCode = code + append;

// Minify with terser, preserving export names
(async () => {
  try {
    const reserved = [
      "mount", "forEach", "html", "show", "signal", "effect", "computed", "batch", "untracked", "store", "resource", "router", "navigate", "route", "css", "cssVar", "cssReset", "cssVarReset", "slot"
    ];
    const minified = await minify(finalCode, {
      compress: true,
      mangle: {
        reserved: reserved.length ? reserved : undefined
      },
      format: {
        comments: false
      }
    });
    writeFileSync(bundlePath, minified.code, "utf8");
    console.log(`Exports assigned and minified to window.${globalNamespace} in ${bundlePath}`);
  } catch (e) {
    console.error("Terser minification failed:", e);
    writeFileSync(bundlePath, finalCode, "utf8");
    console.log(`Exports assigned to window.${globalNamespace} in ${bundlePath} (not minified)`);
  }
})();
