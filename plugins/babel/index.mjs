import { types as t } from '@babel/core';
import jsxSyntax from '@babel/plugin-syntax-jsx';

export default function babelHellaJS() {
  // Template cache to store forEach templates for reuse
  const templateCache = new Map();
  let templateCounter = 0;
  
  return {
    inherits: jsxSyntax.default || jsxSyntax,
    visitor: {
      CallExpression(path) {
        // Detect forEach(..., (item, index) => <JSX>) patterns
        if (
          t.isIdentifier(path.node.callee, { name: 'forEach' }) &&
          path.node.arguments.length === 2 &&
          t.isArrowFunctionExpression(path.node.arguments[1])
        ) {
          const arrowFunction = path.node.arguments[1];
          const jsxBody = arrowFunction.body;
          
          // Only proceed if the arrow function body contains JSX
          if (t.isJSXElement(jsxBody) || t.isJSXFragment(jsxBody)) {
            // Generate template from JSX structure
            const template = createTemplate(jsxBody, arrowFunction.params);
            const templateId = `__hellaTemplate_${++templateCounter}`;
            
            templateCache.set(templateId, template);
            
            // Replace the arrow function with optimized template reference
            const optimizedArrowFn = t.arrowFunctionExpression(
              arrowFunction.params,
              t.callExpression(
                t.identifier('__useTemplate'),
                [
                  t.stringLiteral(templateId),
                  t.objectExpression([
                    t.objectProperty(
                      t.identifier('item'),
                      arrowFunction.params[0] || t.identifier('item')
                    ),
                    t.objectProperty(
                      t.identifier('index'),
                      arrowFunction.params[1] || t.identifier('index')
                    )
                  ])
                ]
              )
            );
            
            path.node.arguments[1] = optimizedArrowFn;
            
            // Ensure template utilities are available
            ensureTemplateUtilities(path);
          }
        }
      },
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
    
    pre() {
      // Initialize template cache for each file
      templateCache.clear();
      templateCounter = 0;
    },
    
    post(state) {
      // Inject template definitions and utilities at the end of the file
      if (templateCache.size > 0) {
        const templateDefinitions = [];
        
        // Create template registry object
        const registryProperties = [];
        for (const [templateId, template] of templateCache.entries()) {
          registryProperties.push(
            t.objectProperty(
              t.stringLiteral(templateId),
              template
            )
          );
        }
        
        const templateRegistry = t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier('__templateRegistry'),
            t.objectExpression(registryProperties)
          )
        ]);
        
        // Create template usage utility
        const useTemplateFunction = t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier('__useTemplate'),
            t.arrowFunctionExpression(
              [t.identifier('templateId'), t.identifier('context')],
              t.blockStatement([
                t.variableDeclaration('const', [
                  t.variableDeclarator(
                    t.identifier('template'),
                    t.memberExpression(
                      t.identifier('__templateRegistry'),
                      t.identifier('templateId'),
                      true
                    )
                  )
                ]),
                t.returnStatement(
                  t.callExpression(
                    t.identifier('__cloneTemplate'),
                    [t.identifier('template'), t.identifier('context')]
                  )
                )
              ])
            )
          )
        ]);
        
        // Create template cloning utility
        const cloneTemplateFunction = t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier('__cloneTemplate'),
            t.arrowFunctionExpression(
              [t.identifier('template'), t.identifier('context')],
              t.blockStatement([
                t.returnStatement(
                  t.objectExpression([
                    t.spreadElement(t.identifier('template')),
                    t.objectProperty(
                      t.identifier('props'),
                      t.callExpression(
                        t.identifier('__bindProps'),
                        [
                          t.memberExpression(t.identifier('template'), t.identifier('props')),
                          t.identifier('context')
                        ]
                      )
                    ),
                    t.objectProperty(
                      t.identifier('children'),
                      t.callExpression(
                        t.identifier('__bindChildren'),
                        [
                          t.memberExpression(t.identifier('template'), t.identifier('children')),
                          t.identifier('context')
                        ]
                      )
                    )
                  ])
                )
              ])
            )
          )
        ]);
        
        // Create prop binding utility
        const bindPropsFunction = t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier('__bindProps'),
            t.arrowFunctionExpression(
              [t.identifier('props'), t.identifier('context')],
              t.blockStatement([
                t.variableDeclaration('const', [
                  t.variableDeclarator(
                    t.identifier('boundProps'),
                    t.objectExpression([])
                  )
                ]),
                t.forInStatement(
                  t.variableDeclaration('const', [t.variableDeclarator(t.identifier('key'))]),
                  t.identifier('props'),
                  t.blockStatement([
                    t.variableDeclaration('const', [
                      t.variableDeclarator(
                        t.identifier('value'),
                        t.memberExpression(
                          t.identifier('props'),
                          t.identifier('key'),
                          true
                        )
                      )
                    ]),
                    t.expressionStatement(
                      t.assignmentExpression(
                        '=',
                        t.memberExpression(
                          t.identifier('boundProps'),
                          t.identifier('key'),
                          true
                        ),
                        t.conditionalExpression(
                          t.binaryExpression(
                            '===',
                            t.unaryExpression('typeof', t.identifier('value')),
                            t.stringLiteral('function')
                          ),
                          t.callExpression(t.identifier('value'), [t.identifier('context')]),
                          t.identifier('value')
                        )
                      )
                    )
                  ])
                ),
                t.returnStatement(t.identifier('boundProps'))
              ])
            )
          )
        ]);
        
        // Create children binding utility
        const bindChildrenFunction = t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier('__bindChildren'),
            t.arrowFunctionExpression(
              [t.identifier('children'), t.identifier('context')],
              t.blockStatement([
                t.returnStatement(
                  t.callExpression(
                    t.memberExpression(t.identifier('children'), t.identifier('map')),
                    [
                      t.arrowFunctionExpression(
                        [t.identifier('child')],
                        t.conditionalExpression(
                          t.binaryExpression(
                            '===',
                            t.unaryExpression('typeof', t.identifier('child')),
                            t.stringLiteral('function')
                          ),
                          t.callExpression(t.identifier('child'), [t.identifier('context')]),
                          t.identifier('child')
                        )
                      )
                    ]
                  )
                )
              ])
            )
          )
        ]);
        
        // Add all utility functions to the program
        state.file.ast.program.body.unshift(
          templateRegistry,
          useTemplateFunction,
          cloneTemplateFunction,
          bindPropsFunction,
          bindChildrenFunction
        );
      }
    }
  };
  
  // Helper function to create a template from JSX
  function createTemplate(jsxNode, params) {
    if (t.isJSXElement(jsxNode)) {
      return createElementTemplate(jsxNode, params);
    } else if (t.isJSXFragment(jsxNode)) {
      return createFragmentTemplate(jsxNode, params);
    }
    throw new Error("Unsupported JSX node type");
  }
  
  // Helper function to create template for JSX elements
  function createElementTemplate(jsxElement, params) {
    const opening = jsxElement.openingElement;
    const tagName = t.isJSXIdentifier(opening.name) ? opening.name.name : 'unknown';
    
    // Extract static and dynamic props
    const staticProps = [];
    const dynamicProps = [];
    
    opening.attributes.forEach(attr => {
      if (t.isJSXAttribute(attr)) {
        let key = attr.name.name;
        // Convert camelCase data/aria to kebab-case
        if (/^(data|aria)[A-Z]/.test(key)) {
          key = key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
        }
        
        const needsQuoting = /[-]/.test(key);
        const keyNode = needsQuoting || /^data-|^aria-/.test(key)
          ? t.stringLiteral(key)
          : t.identifier(key);
        
        if (attr.value && t.isJSXExpressionContainer(attr.value)) {
          // Dynamic prop - wrap in function for later binding
          dynamicProps.push(t.objectProperty(
            keyNode,
            t.arrowFunctionExpression([t.identifier('context')], attr.value.expression)
          ));
        } else {
          // Static prop
          staticProps.push(t.objectProperty(
            keyNode,
            attr.value || t.booleanLiteral(true)
          ));
        }
      } else if (t.isJSXSpreadAttribute(attr)) {
        // Handle spread attributes as dynamic
        dynamicProps.push(t.spreadElement(
          t.arrowFunctionExpression([t.identifier('context')], attr.argument)
        ));
      }
    });
    
    // Merge static and dynamic props
    const allProps = [...staticProps, ...dynamicProps];
    
    // Process children
    const processedChildren = jsxElement.children
      .map(child => {
        if (t.isJSXText(child)) {
          if (typeof child.value === 'string' && child.value.trim()) {
            return t.stringLiteral(child.value.trim());
          }
          return null;
        } else if (t.isJSXExpressionContainer(child)) {
          if (child.expression == null || t.isJSXEmptyExpression(child.expression)) {
            return null;
          }
          // Dynamic child - wrap in function for later binding
          return t.arrowFunctionExpression([t.identifier('context')], child.expression);
        } else if (t.isJSXElement(child) || t.isJSXFragment(child)) {
          // Recursively process nested JSX
          return createTemplate(child, params);
        }
        return null;
      })
      .filter(Boolean);
    
    return t.objectExpression([
      t.objectProperty(t.identifier('tag'), t.stringLiteral(tagName)),
      t.objectProperty(t.identifier('props'), t.objectExpression(allProps)),
      t.objectProperty(t.identifier('children'), t.arrayExpression(processedChildren))
    ]);
  }
  
  // Helper function to create template for JSX fragments
  function createFragmentTemplate(jsxFragment, params) {
    const processedChildren = jsxFragment.children
      .map(child => {
        if (t.isJSXText(child)) {
          if (typeof child.value === 'string' && child.value.trim()) {
            return t.stringLiteral(child.value.trim());
          }
          return null;
        } else if (t.isJSXExpressionContainer(child)) {
          if (child.expression == null || t.isJSXEmptyExpression(child.expression)) {
            return null;
          }
          return t.arrowFunctionExpression([t.identifier('context')], child.expression);
        } else if (t.isJSXElement(child) || t.isJSXFragment(child)) {
          return createTemplate(child, params);
        }
        return null;
      })
      .filter(Boolean);
    
    return t.objectExpression([
      t.objectProperty(t.identifier('tag'), t.stringLiteral('$')),
      t.objectProperty(t.identifier('props'), t.objectExpression([])),
      t.objectProperty(t.identifier('children'), t.arrayExpression(processedChildren))
    ]);
  }
  
  // Helper function to ensure template utilities are imported/available
  function ensureTemplateUtilities(path) {
    // Template utilities will be injected at file level, so nothing needed here
    // This function exists for future extensibility
  }
}
