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
                let key = attr.name.name;
                // Convert camelCase data/aria to kebab-case
                if (/^(data|aria)[A-Z]/.test(key)) {
                  key = key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
                }
                return t.objectProperty(
                  /^data-|^aria-/.test(key)
                    ? t.stringLiteral(key)
                    : t.identifier(key),
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
          // If there are children, add them to props
          let finalProps = props;
          if (children.length > 0) {
            finalProps = t.objectExpression([
              ...props.properties,
              t.objectProperty(
                t.identifier("children"),
                children.length === 1 ? children[0] : t.arrayExpression(children)
              )
            ]);
          }
          path.replaceWith(
            t.callExpression(
              t.identifier(tag),
              [finalProps]
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
