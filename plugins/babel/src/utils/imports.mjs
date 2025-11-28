// Import management utilities

// Ensure CSS import exists in program
export function ensureCssImport(t, program) {
  let hasCssImport = false;

  program.node.body.forEach(node => {
    if (
      t.isImportDeclaration(node) &&
      node.source.value === '@hellajs/css' &&
      node.specifiers.some(
        s => t.isImportSpecifier(s) && t.isIdentifier(s.imported) && s.imported.name === 'css'
      )
    ) {
      hasCssImport = true;
    }
  });

  if (!hasCssImport) {
    program.node.body.unshift(
      t.importDeclaration(
        [t.importSpecifier(t.identifier('css'), t.identifier('css'))],
        t.stringLiteral('@hellajs/css')
      )
    );
  }
}

// Ensure component import exists in program
export function ensureCreateComponentImport(t, program) {
  let hasCreateComponentImport = false;

  program.node.body.forEach(node => {
    if (
      t.isImportDeclaration(node) &&
      node.source.value === '@hellajs/dom' &&
      node.specifiers.some(
        s => t.isImportSpecifier(s) && t.isIdentifier(s.imported) && s.imported.name === 'componentScope'
      )
    ) {
      hasCreateComponentImport = true;
    }
  });

  if (!hasCreateComponentImport) {
    program.node.body.unshift(
      t.importDeclaration(
        [t.importSpecifier(t.identifier('componentScope'), t.identifier('componentScope'))],
        t.stringLiteral('@hellajs/dom')
      )
    );
  }
}

// Ensure ForEach import exists in program
export function ensureForEachImport(t, program) {
  const body = program.node.body;

  // Check if ForEach is already imported from @hellajs/dom
  for (const node of body) {
    if (t.isImportDeclaration(node) && node.source.value === '@hellajs/dom') {
      const hasForEach = node.specifiers.some(
        spec => t.isImportSpecifier(spec) && spec.imported.name === 'ForEach'
      );
      if (hasForEach) return;

      // Add ForEach to existing import
      node.specifiers.push(
        t.importSpecifier(t.identifier('ForEach'), t.identifier('ForEach'))
      );
      return;
    }
  }

  // No @hellajs/dom import, create new one
  program.node.body.unshift(
    t.importDeclaration(
      [t.importSpecifier(t.identifier('ForEach'), t.identifier('ForEach'))],
      t.stringLiteral('@hellajs/dom')
    )
  );
}
