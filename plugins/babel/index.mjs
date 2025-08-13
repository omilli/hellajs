import { types as t } from '@babel/core';
import jsxSyntax from '@babel/plugin-syntax-jsx';

export default function babelHellaJS() {
  // Template metadata storage for registration with templateManager
  const templateMetadata = new Map();
  let templateCounter = 0;
  
  return {
    inherits: jsxSyntax.default || jsxSyntax,
    visitor: {
      CallExpression(path) {
        // Detect forEach(..., (param1, param2) => <JSX>) patterns
        if (
          t.isIdentifier(path.node.callee, { name: 'forEach' }) &&
          path.node.arguments.length === 2 &&
          t.isArrowFunctionExpression(path.node.arguments[1])
        ) {
          const arrowFunction = path.node.arguments[1];
          const jsxBody = arrowFunction.body;
          
          // Only proceed if the arrow function body contains JSX
          if (t.isJSXElement(jsxBody) || t.isJSXFragment(jsxBody)) {
            // Extract actual parameter names from the arrow function
            const { itemName, indexName, paramNames } = getParamNames(arrowFunction.params);
            
            // Generate template from JSX structure with correct parameter names
            const template = createTemplate(jsxBody, arrowFunction.params, paramNames);
            const templateId = `__hellaTemplate_${++templateCounter}`;
            
            // Store template metadata for registration
            const metadata = {
              id: templateId,
              template,
              paramNames,
              staticStructure: isStaticTemplate(jsxBody, paramNames)
            };
            templateMetadata.set(templateId, metadata);
            
            // Transform to forEachOptimized call
            path.replaceWith(
              t.callExpression(
                t.identifier('forEachOptimized'),
                [
                  path.node.arguments[0], // items array
                  t.stringLiteral(templateId), // template ID
                  t.arrayExpression(paramNames.map(name => t.stringLiteral(name))), // parameter names
                  arrowFunction // fallback function
                ]
              )
            );
            
            // Ensure required imports are available
            ensureRequiredImports(path);
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
      // Initialize template metadata for each file
      templateMetadata.clear();
      templateCounter = 0;
    },
    
    post(state) {
      // Register templates with templateManager and add initialization code
      if (templateMetadata.size > 0) {
        const templateRegistrations = [];
        
        // Generate template registration calls
        for (const [templateId, metadata] of templateMetadata.entries()) {
          templateRegistrations.push(
            t.expressionStatement(
              t.callExpression(
                t.memberExpression(
                  t.identifier('templateManager'),
                  t.identifier('registerTemplate')
                ),
                [
                  t.objectExpression([
                    t.objectProperty(
                      t.identifier('id'),
                      t.stringLiteral(metadata.id)
                    ),
                    t.objectProperty(
                      t.identifier('template'),
                      t.arrowFunctionExpression(
                        [t.identifier('context')],
                        metadata.template
                      )
                    ),
                    t.objectProperty(
                      t.identifier('paramNames'),
                      t.arrayExpression(metadata.paramNames.map(name => t.stringLiteral(name)))
                    ),
                    t.objectProperty(
                      t.identifier('staticStructure'),
                      t.booleanLiteral(metadata.staticStructure)
                    )
                  ])
                ]
              )
            )
          );
        }
        
        // Add all template registrations to the program
        state.file.ast.program.body.push(...templateRegistrations);
      }
    }
  };
  
  // Helper function to create a template from JSX with proper parameter handling
  function createTemplate(jsxNode, params, paramNames) {
    if (t.isJSXElement(jsxNode)) {
      return createElementTemplate(jsxNode, params, paramNames);
    } else if (t.isJSXFragment(jsxNode)) {
      return createFragmentTemplate(jsxNode, params, paramNames);
    }
    throw new Error("Unsupported JSX node type");
  }
  
  // Helper function to get parameter names for context binding
  function getParamNames(params) {
    const itemParam = params[0];
    const indexParam = params[1];
    const itemName = itemParam && t.isIdentifier(itemParam) ? itemParam.name : 'item';
    const indexName = indexParam && t.isIdentifier(indexParam) ? indexParam.name : 'index';
    const paramNames = [itemName, indexName];
    return { itemName, indexName, paramNames };
  }
  
  // Helper function to check if expression references loop parameters
  function referencesLoopParams(expression, paramNames) {
    let referencesParams = false;
    
    function traverse(node) {
      if (!node || referencesParams) return;
      
      if (t.isIdentifier(node) && paramNames.includes(node.name)) {
        referencesParams = true;
        return;
      }
      
      // Recursively check all child nodes
      for (const key in node) {
        if (node[key] && typeof node[key] === 'object') {
          if (Array.isArray(node[key])) {
            node[key].forEach(traverse);
          } else if (node[key].type) {
            traverse(node[key]);
          }
        }
      }
    }
    
    traverse(expression);
    return referencesParams;
  }
  
  // Helper function to check if template has static structure
  function isStaticTemplate(jsxNode, paramNames) {
    // For now, consider templates with parameter references as dynamic
    return !referencesLoopParams(jsxNode, paramNames);
  }
  
  // Helper function to create template for JSX elements
  function createElementTemplate(jsxElement, params, paramNames) {
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
          // Dynamic prop - replace parameter references with context access
          const transformedExpression = transformParameterReferences(attr.value.expression, paramNames);
          dynamicProps.push(t.objectProperty(
            keyNode,
            transformedExpression
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
        const transformedExpression = transformParameterReferences(attr.argument, paramNames);
        dynamicProps.push(t.spreadElement(transformedExpression));
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
          // Dynamic child - replace parameter references with context access
          return transformParameterReferences(child.expression, paramNames);
        } else if (t.isJSXElement(child) || t.isJSXFragment(child)) {
          // Recursively process nested JSX
          return createTemplate(child, params, paramNames);
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
  function createFragmentTemplate(jsxFragment, params, paramNames) {
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
          return transformParameterReferences(child.expression, paramNames);
        } else if (t.isJSXElement(child) || t.isJSXFragment(child)) {
          return createTemplate(child, params, paramNames);
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
  
  // Helper function to transform parameter references to context access
  function transformParameterReferences(expression, paramNames) {
    function transform(node) {
      if (!node) return node;
      
      if (t.isIdentifier(node)) {
        const paramIndex = paramNames.indexOf(node.name);
        if (paramIndex !== -1) {
          // Replace parameter reference with context access
          return t.memberExpression(
            t.identifier('context'),
            t.stringLiteral(node.name),
            true
          );
        }
      }
      
      // Recursively transform child nodes
      const cloned = t.cloneNode(node);
      for (const key in cloned) {
        if (cloned[key] && typeof cloned[key] === 'object') {
          if (Array.isArray(cloned[key])) {
            cloned[key] = cloned[key].map(transform);
          } else if (cloned[key].type) {
            cloned[key] = transform(cloned[key]);
          }
        }
      }
      
      return cloned;
    }
    
    return transform(expression);
  }
  
  // Helper function to ensure required imports are available
  function ensureRequiredImports(path) {
    const program = path.findParent(p => p.isProgram());
    let hasForEachOptimizedImport = false;
    let hasTemplateManagerImport = false;
    
    // Check existing imports
    program.node.body.forEach(node => {
      if (
        t.isImportDeclaration(node) &&
        node.source.value === '@hellajs/dom'
      ) {
        node.specifiers.forEach(spec => {
          if (t.isImportSpecifier(spec)) {
            if (spec.imported.name === 'forEachOptimized') {
              hasForEachOptimizedImport = true;
            }
            if (spec.imported.name === 'templateManager') {
              hasTemplateManagerImport = true;
            }
          }
        });
      }
    });
    
    // Add missing imports
    if (!hasForEachOptimizedImport || !hasTemplateManagerImport) {
      const importSpecifiers = [];
      
      if (!hasForEachOptimizedImport) {
        importSpecifiers.push(
          t.importSpecifier(t.identifier('forEachOptimized'), t.identifier('forEachOptimized'))
        );
      }
      
      if (!hasTemplateManagerImport) {
        importSpecifiers.push(
          t.importSpecifier(t.identifier('templateManager'), t.identifier('templateManager'))
        );
      }
      
      program.node.body.unshift(
        t.importDeclaration(
          importSpecifiers,
          t.stringLiteral('@hellajs/dom')
        )
      );
    }
  }
}
