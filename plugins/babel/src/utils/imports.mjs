// Import management utilities

// Get imported name from specifier (handles both Identifier and StringLiteral)
function getImportedName(spec) {
  if (!spec.imported) return null;
  return spec.imported.name || spec.imported.value;
}

// Check if a specifier imports a specific name
function hasNamedImport(t, specifiers, name) {
  return specifiers.some(
    spec => t.isImportSpecifier(spec) && getImportedName(spec) === name
  );
}

// Add named import to existing declaration or create new one
function ensureNamedImport(t, program, source, name) {
  const body = program.node.body;

  for (const node of body) {
    if (t.isImportDeclaration(node) && node.source.value === source) {
      if (hasNamedImport(t, node.specifiers, name)) return;

      node.specifiers.push(
        t.importSpecifier(t.identifier(name), t.identifier(name))
      );
      return;
    }
  }

  program.node.body.unshift(
    t.importDeclaration(
      [t.importSpecifier(t.identifier(name), t.identifier(name))],
      t.stringLiteral(source)
    )
  );
}

// Ensure CSS import exists in program
export function ensureCssImport(t, program) {
  ensureNamedImport(t, program, '@hellajs/css', 'css');
}

// Ensure component import exists in program
export function ensureCreateComponentImport(t, program) {
  ensureNamedImport(t, program, '@hellajs/dom', 'component');
}

// Ensure ForEach import exists in program
export function ensureForEachImport(t, program) {
  ensureNamedImport(t, program, '@hellajs/dom', 'ForEach');
}

// Ensure Portal import exists in program
export function ensurePortalImport(t, program) {
  ensureNamedImport(t, program, '@hellajs/dom', 'Portal');
}

// Ensure Lazy import exists in program
export function ensureLazyImport(t, program) {
  ensureNamedImport(t, program, '@hellajs/dom', 'Lazy');
}
