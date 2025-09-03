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
        
        const attributeProperties = opening.attributes.length
          ? opening.attributes.map(attr => {
              if (t.isJSXAttribute(attr)) {
                let key;
                let isRawAttribute = false;
                if (t.isJSXIdentifier(attr.name)) {
                  key = attr.name.name;
                  // Check for resolve: prefix
                  if (key.startsWith('resolve:')) {
                    isRawAttribute = true;
                    key = key.substring(8); // Remove 'resolve:' prefix
                  }
                } else if (t.isJSXNamespacedName(attr.name)) {
                  // Handle resolve:propName syntax
                  if (attr.name.namespace.name === 'resolve') {
                    isRawAttribute = true;
                    key = attr.name.name.name;
                  } else {
                    key = `${attr.name.namespace.name}:${attr.name.name.name}`;
                  }
                } else {
                  key = 'unknown';
                }
                // Convert camelCase data/aria to kebab-case
                if (typeof key === 'string' && /^(data|aria)[A-Z]/.test(key)) {
                  key = key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
                }
                const needsQuoting = typeof key === 'string' && /[-]/.test(key);
                let value = attr.value && attr.value.expression !== undefined ? attr.value.expression : attr.value;

                // Transform function calls in attribute values to arrow functions (only for HTML elements)
                if (!isComponent && !isRawAttribute && value && !t.isArrowFunctionExpression(value) && !t.isStringLiteral(value) && !t.isNumericLiteral(value) && !t.isBooleanLiteral(value)) {
                  let hasFunctionCall = false;

                  function checkForFunctionCall(node) {
                    if (!node) return;

                    if (t.isCallExpression(node)) {
                      // Ignore forEach calls (both method calls and direct calls)
                      if ((t.isMemberExpression(node.callee) &&
                        t.isIdentifier(node.callee.property) &&
                        node.callee.property.name === 'forEach') ||
                        (t.isIdentifier(node.callee) &&
                          node.callee.name === 'forEach')) {
                        return;
                      }
                      hasFunctionCall = true;
                      return;
                    }

                    // Recursively check all child nodes
                    Object.values(node).forEach(val => {
                      if (Array.isArray(val)) {
                        val.forEach(checkForFunctionCall);
                      } else if (val && typeof val === 'object' && val.type) {
                        checkForFunctionCall(val);
                      }
                    });
                  }

                  checkForFunctionCall(value);

                  if (hasFunctionCall) {
                    value = t.arrowFunctionExpression([], value);
                  }
                }

                return t.objectProperty(
                  needsQuoting || (typeof key === 'string' && /^data-|^aria-/.test(key))
                    ? t.stringLiteral(key)
                    : t.identifier(key),
                  value
                );
              } else if (t.isJSXSpreadAttribute(attr)) {
                return t.spreadElement(attr.argument);
              }
              return null;
            }).filter(Boolean)
          : [];
        
        function filterEmptyChildren(children) {
          return children
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

                // Transform function calls to arrow functions (only for HTML elements)
                const expression = child.expression;
                if (!isComponent && !t.isArrowFunctionExpression(expression)) {
                  let hasFunctionCall = false;

                  function checkForFunctionCall(node) {
                    if (!node) return;

                    if (t.isCallExpression(node)) {
                      // Ignore forEach calls (both method calls and direct calls)
                      if ((t.isMemberExpression(node.callee) &&
                        t.isIdentifier(node.callee.property) &&
                        node.callee.property.name === 'forEach') ||
                        (t.isIdentifier(node.callee) &&
                          node.callee.name === 'forEach')) {
                        return;
                      }
                      hasFunctionCall = true;
                      return;
                    }

                    // Recursively check all child nodes
                    Object.values(node).forEach(value => {
                      if (Array.isArray(value)) {
                        value.forEach(checkForFunctionCall);
                      } else if (value && typeof value === 'object' && value.type) {
                        checkForFunctionCall(value);
                      }
                    });
                  }

                  checkForFunctionCall(expression);

                  if (hasFunctionCall) {
                    return t.arrowFunctionExpression([], expression);
                  }
                }

                return child.expression;
              } else if (t.isJSXElement(child) || t.isJSXFragment(child)) {
                return child;
              }
              return null;
            })
            .filter(Boolean);
        }

        const children = filterEmptyChildren(path.node.children);
        
        if (isComponent) {
          // If there are children, add them to props
          let finalProps;
          if (children.length > 0) {
            finalProps = t.objectExpression([
              ...attributeProperties,
              t.objectProperty(
                t.identifier("children"),
                children.length === 1 ? children[0] : t.arrayExpression(children)
              )
            ]);
          } else if (attributeProperties.length > 0) {
            finalProps = t.objectExpression(attributeProperties);
          } else {
            finalProps = t.objectExpression([]);
          }
          path.replaceWith(
            t.callExpression(
              tagCallee,
              [finalProps]
            )
          );
        } else {
          // For HTML tags, create a plain VNode object
          const vNodeProperties = [
            t.objectProperty(t.identifier('tag'), t.stringLiteral(tagCallee.name))
          ];
          
          // Only add props if there are attributes
          if (attributeProperties.length > 0) {
            vNodeProperties.push(
              t.objectProperty(t.identifier('props'), t.objectExpression(attributeProperties))
            );
          }
          
          // Only add children if there are any
          if (children.length > 0) {
            vNodeProperties.push(
              t.objectProperty(t.identifier('children'), t.arrayExpression(children))
            );
          }
          
          path.replaceWith(t.objectExpression(vNodeProperties));
        }
      },
      JSXFragment(path) {
        // Transform <>...</> into a VNode fragment object
        function filterEmptyChildren(children) {
          return children
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
        }

        const children = filterEmptyChildren(path.node.children);
        const fragmentProperties = [t.objectProperty(t.identifier('tag'), t.stringLiteral('$'))];
        
        // Only add children if there are any
        if (children.length > 0) {
          fragmentProperties.push(
            t.objectProperty(t.identifier('children'), t.arrayExpression(children))
          );
        }
        
        path.replaceWith(t.objectExpression(fragmentProperties));
      },
    },
  };
}
