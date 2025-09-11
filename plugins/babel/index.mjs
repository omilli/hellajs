import { types as t } from '@babel/core';
import jsxSyntax from '@babel/plugin-syntax-jsx';

export default function babelHellaJS() {

  // Constants
  const FRAGMENT_TAG = '$';
  
  // Helper function to get tag name from JSX name node
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

  // Helper function to ensure CSS import exists
  function ensureCssImport(program) {
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

  // Helper function to check if a node contains function calls (excluding forEach)
  function checkForFunctionCall(node) {
    if (!node) return false;

    if (t.isCallExpression(node)) {
      // Ignore forEach calls (both method calls and direct calls)
      if ((t.isMemberExpression(node.callee) &&
        t.isIdentifier(node.callee.property) &&
        node.callee.property.name === 'forEach') ||
        (t.isIdentifier(node.callee) &&
          node.callee.name === 'forEach')) {
        return false;
      }
      return true;
    }

    // Recursively check all child nodes
    return Object.values(node).some(val => {
      if (val && typeof val === 'object' && val.type) {
        return checkForFunctionCall(val);
      }
      return false;
    });
  }

  // Helper function to filter empty children
  function filterEmptyChildren(children, isComponent = false) {
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
            if (checkForFunctionCall(expression)) {
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

  // Helper function to process attribute value
  function processAttributeValue(value, isComponent) {
    if (!value) return value;
    
    // Extract the actual value from JSXExpressionContainer if needed
    let actualValue = value.expression !== undefined ? value.expression : value;
    
    if (!actualValue || t.isArrowFunctionExpression(actualValue) || t.isStringLiteral(actualValue) || 
        t.isNumericLiteral(actualValue) || t.isBooleanLiteral(actualValue)) {
      return actualValue;
    }

    // Transform function calls to arrow functions (only for HTML elements)
    if (!isComponent && checkForFunctionCall(actualValue)) {
      return t.arrowFunctionExpression([], actualValue);
    }

    return actualValue;
  }

  // Helper function to process JSX attributes
  function processAttributes(attributes, isComponent) {
    if (!attributes.length) return [];

    return attributes.map(attr => {
      if (t.isJSXAttribute(attr)) {
        let key;
        if (t.isJSXIdentifier(attr.name)) {
          key = attr.name.name;
        } else {
          // JSXNamespacedName (e.g., xml:lang, xmlns:custom)
          key = `${attr.name.namespace.name}:${attr.name.name.name}`;
        }
        
        // Convert camelCase data/aria to kebab-case
        if (typeof key === 'string' && /^(data|aria)[A-Z]/.test(key)) {
          key = key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
        }
        
        const needsQuoting = typeof key === 'string' && /[-]/.test(key);
        let value = attr.value && attr.value.expression !== undefined 
          ? attr.value.expression 
          : attr.value;

        value = processAttributeValue(value, isComponent);

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
    }).filter(Boolean);
  }

  // Helper function to handle style tag transformation
  function handleStyleTag(path, opening) {
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
    ensureCssImport(program);
    
    path.replaceWith(
      t.callExpression(
        t.identifier('css'),
        cssArgs
      )
    );
  }

  // Helper function to build VNode object
  function buildVNode(tag, props, children) {
    const vNodeProperties = [
      t.objectProperty(t.identifier('tag'), t.stringLiteral(tag))
    ];
    
    if (props && props.length > 0) {
      vNodeProperties.push(
        t.objectProperty(t.identifier('props'), t.objectExpression(props))
      );
    }
    
    if (children && children.length > 0) {
      vNodeProperties.push(
        t.objectProperty(t.identifier('children'), t.arrayExpression(children))
      );
    }
    
    return t.objectExpression(vNodeProperties);
  }

  // Helper function to build component call
  function buildComponentCall(tagCallee, props, children) {
    let finalProps;
    if (children && children.length > 0) {
      finalProps = t.objectExpression([
        ...props,
        t.objectProperty(
          t.identifier("children"),
          children.length === 1 ? children[0] : t.arrayExpression(children)
        )
      ]);
    } else if (props.length > 0) {
      finalProps = t.objectExpression(props);
    } else {
      finalProps = t.objectExpression([]);
    }
    
    return t.callExpression(tagCallee, [finalProps]);
  }

  return {
    inherits: jsxSyntax.default || jsxSyntax,
    visitor: {

      JSXElement(path) {
        const opening = path.node.openingElement;

        // Auto-transform <style>...</style> to css(...)
        if (t.isJSXIdentifier(opening.name, { name: 'style' })) {
          handleStyleTag(path, opening);
          return;
        }

        const tagCallee = getTagCallee(opening.name);
        const isComponent = (
          t.isJSXIdentifier(opening.name) && opening.name.name[0] === opening.name.name[0].toUpperCase()
        ) || t.isJSXMemberExpression(opening.name);
        
        const attributeProperties = processAttributes(opening.attributes, isComponent);
        const children = filterEmptyChildren(path.node.children, isComponent);
        
        if (isComponent) {
          path.replaceWith(buildComponentCall(tagCallee, attributeProperties, children));
        } else {
          path.replaceWith(buildVNode(tagCallee.name, attributeProperties, children));
        }
      },

      JSXFragment(path) {
        const children = filterEmptyChildren(path.node.children, false);
        path.replaceWith(buildVNode(FRAGMENT_TAG, null, children));
      },
    },
  };
}
