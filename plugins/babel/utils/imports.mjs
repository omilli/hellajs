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

// Ensure forEach import exists in program
export function ensureForEachImport(t, program) {
  let hasForEachImport = false;

  program.node.body.forEach(node => {
    if (
      t.isImportDeclaration(node) &&
      node.source.value === '@hellajs/dom' &&
      node.specifiers.some(
        s => t.isImportSpecifier(s) && t.isIdentifier(s.imported) && s.imported.name === 'forEach'
      )
    ) {
      hasForEachImport = true;
    }
  });

  if (!hasForEachImport) {
    program.node.body.unshift(
      t.importDeclaration(
        [t.importSpecifier(t.identifier('forEach'), t.identifier('forEach'))],
        t.stringLiteral('@hellajs/dom')
      )
    );
  }
}
