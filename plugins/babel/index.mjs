import { types as t } from '@babel/core';
import jsxSyntax from '@babel/plugin-syntax-jsx';

export default function babelHellaJS() {
  return {
    inherits: jsxSyntax.default || jsxSyntax,
    visitor: {
      JSXElement(path) {
        const opening = path.node.openingElement;
        // Support JSXMemberExpression for tags like <UserSelect.Provider>
        function getTagCallee(nameNode) {
          if (t.isJSXIdentifier(nameNode)) {
            return t.identifier(nameNode.name);
          } else if (t.isJSXMemberExpression(nameNode)) {
            let object = getTagCallee(nameNode.object);
            let property = t.identifier(nameNode.property.name);
            return t.memberExpression(object, property);
          }
          throw new Error("Unsupported JSX tag type");
        }

        // Auto-transform <style>...</style> to css(...)
        if (t.isJSXIdentifier(opening.name, { name: 'style' })) {
          // Extract props as options
          const options = {};
          opening.attributes.forEach(attr => {
            if (t.isJSXAttribute(attr)) {
              const key = attr.name.name;
              if (attr.value && t.isStringLiteral(attr.value)) {
                options[key] = attr.value.value;
              }
            }
          });
          // Extract children (should be a single JSXExpressionContainer with an ObjectExpression)
          let cssObject = null;
          path.node.children.forEach(child => {
            if (t.isJSXExpressionContainer(child) && t.isObjectExpression(child.expression)) {
              cssObject = child.expression;
            }
          });
          // Build css(options) call
          const cssArgs = [cssObject ? cssObject : t.objectExpression([])];
          if (Object.keys(options).length > 0) {
            // Convert string options to correct types if possible
            const optsProps = Object.entries(options).map(([k, v]) =>
              t.objectProperty(t.identifier(k), v === 'true' ? t.booleanLiteral(true) : v === 'false' ? t.booleanLiteral(false) : t.stringLiteral(v))
            );
            cssArgs.push(t.objectExpression(optsProps));
          }
          // Ensure import { css } from "@hellajs/css" exists
          const program = path.findParent(p => p.isProgram());
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
          path.replaceWith(
            t.callExpression(
              t.identifier('css'),
              cssArgs
            )
          );
          return;
        }
        const tagCallee = getTagCallee(opening.name);
        const isComponent = (
          t.isJSXIdentifier(opening.name) && opening.name.name[0] === opening.name.name[0].toUpperCase()
        ) || t.isJSXMemberExpression(opening.name);
        const props = opening.attributes.length
          ? t.objectExpression(
            opening.attributes.map(attr => {
              if (t.isJSXAttribute(attr)) {
                let key = attr.name.name;
                // Convert camelCase data/aria to kebab-case
                if (/^(data|aria)[A-Z]/.test(key)) {
                  key = key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
                }
                const needsQuoting = /[-]/.test(key);
                return t.objectProperty(
                  needsQuoting || /^data-|^aria-/.test(key)
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
              // Skip JSX comments (expression == null or JSXEmptyExpression)
              if (
                child.expression == null ||
                t.isJSXEmptyExpression(child.expression)
              ) return null;
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
              tagCallee,
              [finalProps]
            )
          );
        } else {
          // For HTML tags, create a plain VNode object
          path.replaceWith(
            t.objectExpression([
              t.objectProperty(t.identifier('tag'), t.stringLiteral(tagCallee.name)),
              t.objectProperty(t.identifier('props'), props),
              t.objectProperty(t.identifier('children'), t.arrayExpression(children))
            ])
          );
        }
      },
      JSXFragment(path) {
        // Transform <>...</> into a VNode fragment object
        const children = path.node.children
          .map(child => {
            if (t.isJSXText(child)) {
              if (typeof child.value === 'string' && child.value.trim()) {
                return t.stringLiteral(child.value.trim());
              }
              return null;
            } else if (t.isJSXExpressionContainer(child)) {
              // Skip JSX comments (expression == null or JSXEmptyExpression)
              if (
                child.expression == null ||
                t.isJSXEmptyExpression(child.expression)
              ) return null;
              return child.expression;
            } else if (t.isJSXElement(child) || t.isJSXFragment(child)) {
              return child;
            }
            return null;
          })
          .filter(Boolean);
        path.replaceWith(
          t.objectExpression([
            t.objectProperty(t.identifier('tag'), t.stringLiteral('$')),
            t.objectProperty(t.identifier('props'), t.objectExpression([])),
            t.objectProperty(t.identifier('children'), t.arrayExpression(children))
          ])
        );
      },
    },
  };
}
