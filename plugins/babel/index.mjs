import { types as t } from '@babel/core';
// @ts-ignore
import jsxSyntax from '@babel/plugin-syntax-jsx';

export default function babelHellaJS() {
  return {
    inherits: jsxSyntax.default || jsxSyntax,
    visitor: {
      Program: {
        enter(path) {
          let hasHtmlImport = false;
          path.node.body.forEach(node => {
            if (
              t.isImportDeclaration(node) &&
              node.source.value === '@hellajs/dom' &&
              node.specifiers.some(
                s =>
                  t.isImportSpecifier(s) &&
                  t.isIdentifier(s.imported) &&
                  s.imported.name === 'html'
              )
            ) {
              hasHtmlImport = true;
            }
          });
          if (!hasHtmlImport) {
            path.node.body.unshift(
              t.importDeclaration(
                [t.importSpecifier(t.identifier('html'), t.identifier('html'))],
                t.stringLiteral('@hellajs/dom')
              )
            );
          }
        }
      },
      JSXElement(path) {
        const opening = path.node.openingElement;
        const tag = opening.name.name;
        const isComponent = tag && tag[0] === tag[0].toUpperCase();
        const props = opening.attributes.length
          ? t.objectExpression(
            opening.attributes.map(attr => {
              if (t.isJSXAttribute(attr)) {
                return t.objectProperty(
                  t.identifier(attr.name.name),
                  attr.value && attr.value.expression !== undefined ? attr.value.expression : attr.value
                );
              } else if (t.isJSXSpreadAttribute(attr)) {
                return t.spreadElement(attr.argument);
              }
              return null;
            }).filter(Boolean)
          )
          : t.objectExpression([]);
        const children = path.node.children
          .map(child => {
            if (t.isJSXText(child)) {
              if (typeof child.value === 'string' && child.value.trim()) {
                return t.stringLiteral(child.value.trim());
              }
              return null;
            } else if (t.isJSXExpressionContainer(child)) {
              if (child.expression == null) return null;
              return child.expression;
            } else if (t.isJSXElement(child)) {
              return child;
            }
            return null;
          })
          .filter(Boolean);
        if (isComponent) {
          path.replaceWith(
            t.callExpression(
              t.identifier(tag),
              [props, ...children]
            )
          );
        } else {
          path.replaceWith(
            t.callExpression(
              t.memberExpression(
                t.identifier('html'),
                t.identifier(tag)
              ),
              [props, ...children]
            )
          );
        }
      },
      JSXFragment(path) {
        // Transform <>...</> into html.$({}, ...children)
        const children = path.node.children
          .map(child => {
            if (t.isJSXText(child)) {
              if (typeof child.value === 'string' && child.value.trim()) {
                return t.stringLiteral(child.value.trim());
              }
              return null;
            } else if (t.isJSXExpressionContainer(child)) {
              if (child.expression == null) return null;
              return child.expression;
            } else if (t.isJSXElement(child) || t.isJSXFragment(child)) {
              return child;
            }
            return null;
          })
          .filter(Boolean);
        path.replaceWith(
          t.callExpression(
            t.memberExpression(
              t.identifier('html'),
              t.identifier('$')
            ),
            [t.objectExpression([]), ...children]
          )
        );
      },
    },
  };
}
