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

  // Helper function to ensure forEach import exists
  function ensureForEachImport(program) {
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



  // Helper function to filter empty children
  function filterEmptyChildren(children, isComponent = false) {
    const result = [];

    for (const child of children) {
      if (t.isJSXText(child)) {
        if (typeof child.value === 'string' && child.value.trim()) {
          // Normalize whitespace but preserve meaningful spaces
          const normalized = child.value.replace(/\s+/g, ' ');
          result.push(t.stringLiteral(normalized));
        }
      } else if (t.isJSXExpressionContainer(child)) {
        // Skip JSX comments (expression == null or JSXEmptyExpression)
        if (
          child.expression == null ||
          t.isJSXEmptyExpression(child.expression)
        ) continue;

        const expression = child.expression;

        // Check if this is props.children - if so, spread it
        if (t.isMemberExpression(expression) &&
          t.isIdentifier(expression.object, { name: 'props' }) &&
          t.isIdentifier(expression.property, { name: 'children' })) {
          // Return a spread element for props.children
          result.push(t.spreadElement(expression));
          continue;
        }

        result.push(expression);
      } else if (t.isJSXElement(child) || t.isJSXFragment(child)) {
        result.push(child);
      }
    }

    return result;
  }

  // Helper function to process attribute value
  function processAttributeValue(value, isComponent, attributeName = '') {
    if (!value) return value;

    // Extract the actual value from JSXExpressionContainer if needed
    let actualValue = value.expression !== undefined ? value.expression : value;

    return actualValue;
  }

  // Helper function to process JSX attributes
  function processAttributes(attributes, isComponent) {
    if (!attributes.length) return { props: [], on: [], bind: [] };

    const props = [], on = [], bind = [];

    attributes.forEach(attr => {
      if (t.isJSXAttribute(attr)) {
        let key;
        if (t.isJSXIdentifier(attr.name)) {
          key = attr.name.name;
        } else {
          // JSXNamespacedName (e.g., xml:lang, xlink:href)
          key = `${attr.name.namespace.name}:${attr.name.name.name}`;
        }

        let value = attr.value && attr.value.expression !== undefined
          ? attr.value.expression
          : attr.value;

        // Handle boolean attributes (when value is null, set to true)
        if (value === null) {
          value = t.booleanLiteral(true);
        } else {
          value = processAttributeValue(value, isComponent, key);
        }

        // Check for @ prefix (Vue-style event handlers)
        if (key.startsWith('@')) {
          const eventName = key.slice(1); // Remove '@' prefix
          on.push(t.objectProperty(t.identifier(eventName), value));
        }
        // Check for : prefix (Vue-style dynamic bindings)
        else if (key.startsWith(':') && !key.includes('xmlns')) {
          const propName = key.slice(1); // Remove ':' prefix
          bind.push(t.objectProperty(t.identifier(propName), value));
        }
        // Backward compat: camelCase event handlers (onClick, onInput, etc)
        else if (key.startsWith('on') && key.length > 2 && key[2] === key[2].toUpperCase()) {
          const eventName = key.slice(2).toLowerCase();
          on.push(t.objectProperty(t.identifier(eventName), value));
        } else {
          // Regular prop
          // Convert camelCase data/aria to kebab-case
          if (typeof key === 'string' && /^(data|aria)[A-Z]/.test(key)) {
            key = key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
          }

          const needsQuoting = typeof key === 'string' && /[-]/.test(key);
          props.push(t.objectProperty(
            needsQuoting || (typeof key === 'string' && /^data-|^aria-/.test(key))
              ? t.stringLiteral(key)
              : t.identifier(key),
            value
          ));
        }
      } else if (t.isJSXSpreadAttribute(attr)) {
        // Spread goes into props
        props.push(t.spreadElement(attr.argument));
      }
    });

    return { props, on, bind };
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
  function buildVNode(tag, props, on, bind, children) {
    const vNodeProperties = [
      t.objectProperty(t.identifier('tag'), t.stringLiteral(tag))
    ];

    if (props && props.length > 0) {
      vNodeProperties.push(
        t.objectProperty(t.identifier('props'), t.objectExpression(props))
      );
    }

    if (on && on.length > 0) {
      vNodeProperties.push(
        t.objectProperty(t.identifier('on'), t.objectExpression(on))
      );
    }

    if (bind && bind.length > 0) {
      vNodeProperties.push(
        t.objectProperty(t.identifier('bind'), t.objectExpression(bind))
      );
    }

    if (children && children.length > 0) {
      // Check if any children are spread elements
      const hasSpread = children.some(child => t.isSpreadElement(child));

      if (hasSpread) {
        // If we have spread elements, build the children array dynamically
        vNodeProperties.push(
          t.objectProperty(t.identifier('children'), t.arrayExpression(children))
        );
      } else {
        // Normal array
        vNodeProperties.push(
          t.objectProperty(t.identifier('children'), t.arrayExpression(children))
        );
      }
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
          t.arrayExpression(children)
        )
      ]);
    } else if (props.length > 0) {
      finalProps = t.objectExpression(props);
    } else {
      finalProps = t.objectExpression([]);
    }

    return t.callExpression(tagCallee, [finalProps]);
  }

  // HTML template parser helpers
  function parseHTMLTemplate(quasis, expressions) {
    // Build HTML string with slot markers
    let htmlString = '';
    let i = 0, len = quasis.length;
    while (i < len) {
      htmlString += quasis[i].value.raw;
      if (i < expressions.length) {
        htmlString += `__SLOT_${i}__`;
      }
      i++;
    }

    // Parse HTML to intermediate structure
    const nodes = parseHTML(htmlString, expressions);
    return nodes.length === 1 ? nodes[0] : { tag: FRAGMENT_TAG, children: nodes };
  }

  function parseHTML(html, expressions) {
    const trimmed = html.trim();

    // Single slot marker - return expression directly
    if (trimmed.match(/^__SLOT_\d+__$/)) {
      const match = trimmed.match(/__SLOT_(\d+)__/);
      const index = match ? parseInt(match[1]) : 0;
      return [{ __slot: index }];
    }

    // Replace fragment syntax with special tag name
    const normalizedHTML = html.replace(/<>/g, `<__fragment__>`).replace(/<\/>/g, `</__fragment__>`);

    const result = [];
    const stack = [];
    let current = null;
    const tokenRegex = /<(\/)?(\w[\w-]*)([^>]*?)(\s*\/)?>|([^<]+)/g;
    let match;

    while ((match = tokenRegex.exec(normalizedHTML)) !== null) {
      const isClosing = match[1];
      let tagName = match[2];
      const attrsStr = match[3];
      const isSelfClosing = match[4];
      const textContent = match[5];

      // Convert __fragment__ back to FRAGMENT_TAG
      if (tagName === '__fragment__') {
        tagName = FRAGMENT_TAG;
      }

      if (textContent) {
        const children = parseTextContent(textContent.trim(), expressions);
        if (children.length > 0) {
          if (current) {
            current.children = current.children || [];
            children.forEach(child => current.children.push(child));
          } else {
            children.forEach(child => result.push(child));
          }
        }
      } else if (isClosing) {
        if (stack.length > 0) {
          const completed = stack.pop();
          if (stack.length === 0) {
            result.push(completed);
            current = null;
          } else {
            current = stack[stack.length - 1];
          }
        }
      } else {
        const node = {
          tag: tagName,
          props: tagName === FRAGMENT_TAG ? {} : parseAttributes(attrsStr, expressions),
          children: []
        };

        if (isSelfClosing) {
          if (current) {
            current.children = current.children || [];
            current.children.push(node);
          } else {
            result.push(node);
          }
        } else {
          if (current) {
            current.children = current.children || [];
            current.children.push(node);
          }
          stack.push(node);
          current = node;
        }
      }
    }

    return result;
  }

  function parseTextContent(text, expressions) {
    if (!text) return [];

    const parts = [];
    const slotRegex = /__SLOT_(\d+)__/g;
    let lastIndex = 0;
    let match;

    while ((match = slotRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        const textBefore = text.slice(lastIndex, match.index);
        if (textBefore) parts.push(textBefore);
      }
      parts.push({ __slot: parseInt(match[1]) });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      const remaining = text.slice(lastIndex);
      if (remaining) parts.push(remaining);
    }

    return parts.length === 0 ? [text] : parts;
  }

  function parseAttributes(attrsStr, expressions) {
    if (!attrsStr?.trim()) return {};

    const props = {};
    const attrRegex = /([@:\w-]+)(?:=(?:"([^"]*?)"|(__SLOT_\d+__)))?/g;
    let match;

    while ((match = attrRegex.exec(attrsStr)) !== null) {
      const name = match[1];
      const staticValue = match[2];
      const slotMarker = match[3];

      if (slotMarker) {
        const slotMatch = slotMarker.match(/__SLOT_(\d+)__/);
        const index = slotMatch ? parseInt(slotMatch[1]) : 0;
        props[name] = { __slot: index };
      } else if (staticValue !== undefined) {
        // Check if static value is a single slot marker
        const singleSlotMatch = staticValue.match(/^__SLOT_(\d+)__$/);
        if (singleSlotMatch) {
          props[name] = { __slot: parseInt(singleSlotMatch[1]) };
        } else {
          // Handle multiple slots or mixed content in attribute value
          const parts = parseTextContent(staticValue, expressions);
          if (parts.length === 1 && typeof parts[0] === 'string') {
            props[name] = parts[0];
          } else {
            props[name] = parts;
          }
        }
      } else {
        props[name] = true;
      }
    }

    return props;
  }

  // Convert intermediate AST to Babel AST
  function templateNodeToBabel(node, expressions) {
    // Handle slot markers
    if (node.__slot !== undefined) {
      return expressions[node.__slot];
    }

    // Handle primitives
    if (typeof node === 'string') {
      return t.stringLiteral(node);
    }
    if (typeof node === 'number') {
      return t.numericLiteral(node);
    }
    if (typeof node === 'boolean') {
      return t.booleanLiteral(node);
    }

    // Handle arrays (mixed content in attributes)
    if (Array.isArray(node)) {
      if (node.length === 1) {
        return templateNodeToBabel(node[0], expressions);
      }
      // Concatenate parts - build template literal
      const parts = node.map(part => {
        if (part.__slot !== undefined) {
          return expressions[part.__slot];
        }
        return t.stringLiteral(String(part));
      });

      // Build concatenation expression
      let result = parts[0];
      for (let i = 1; i < parts.length; i++) {
        result = t.binaryExpression('+', result, parts[i]);
      }
      return result;
    }

    // Handle ForEach special case
    if (node.tag === 'ForEach') {
      const props = node.props || {};
      const forProp = props.for;
      const eachProp = props.each;

      if (!forProp || !eachProp) {
        console.warn('<ForEach> requires both "for" and "each" props');
        return t.nullLiteral();
      }

      // Extract actual expressions from slot markers
      const forValue = forProp.__slot !== undefined ? expressions[forProp.__slot] : t.identifier('undefined');
      const eachValue = eachProp.__slot !== undefined ? expressions[eachProp.__slot] : t.identifier('undefined');

      // Generate: forEach(forValue, eachValue)
      return t.callExpression(
        t.identifier('forEach'),
        [forValue, eachValue]
      );
    }

    // Detect component: uppercase first letter OR __SLOT_X__ (dynamic component)
    const isSlotTag = /^__SLOT_\d+__$/.test(node.tag);
    const isComponent = isSlotTag || /^[A-Z]/.test(node.tag);

    if (isComponent) {
      const { props, on, bind } = processTemplateAttributes(node.props || {}, expressions, true);
      // For components, merge on/bind back into props
      const allProps = [...props];
      if (on.length > 0) allProps.push(...on);
      if (bind.length > 0) allProps.push(...bind);

      // For dynamic components, extract the actual component from expressions
      let tagCallee;
      if (isSlotTag) {
        const match = node.tag.match(/__SLOT_(\d+)__/);
        const index = match ? parseInt(match[1]) : 0;
        tagCallee = expressions[index];
      } else {
        tagCallee = t.identifier(node.tag);
      }

      return buildComponentCall(
        tagCallee,
        allProps,
        processTemplateChildren(node.children || [], expressions, true)
      );
    } else {
      const { props, on, bind } = processTemplateAttributes(node.props || {}, expressions, false);
      return buildVNode(
        node.tag,
        props,
        on,
        bind,
        processTemplateChildren(node.children || [], expressions, false)
      );
    }
  }

  function processTemplateAttributes(props, expressions, isComponent) {
    const propsArray = [], onArray = [], bindArray = [];

    for (const key in props) {
      const value = props[key];
      let processedValue;

      if (value === true) {
        processedValue = t.booleanLiteral(true);
      } else if (value.__slot !== undefined) {
        processedValue = expressions[value.__slot];
      } else if (Array.isArray(value)) {
        // Mixed content - concatenate
        processedValue = templateNodeToBabel(value, expressions);
      } else {
        processedValue = t.stringLiteral(String(value));
      }

      // Check for @ prefix (Vue-style event handlers)
      if (key.startsWith('@')) {
        const eventName = key.slice(1);
        onArray.push(t.objectProperty(t.identifier(eventName), processedValue));
      }
      // Check for : prefix (Vue-style dynamic bindings)
      else if (key.startsWith(':') && !key.includes('xmlns')) {
        const propName = key.slice(1);
        bindArray.push(t.objectProperty(t.identifier(propName), processedValue));
      } else {
        // Regular prop
        // Handle kebab-case for data/aria
        let propKey = key;
        if (/^(data|aria)[A-Z]/.test(key)) {
          propKey = key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
        }

        const needsQuoting = /[-:]/.test(propKey);
        propsArray.push(
          t.objectProperty(
            needsQuoting ? t.stringLiteral(propKey) : t.identifier(propKey),
            processedValue
          )
        );
      }
    }

    return { props: propsArray, on: onArray, bind: bindArray };
  }

  function processTemplateChildren(children, expressions, isComponent) {
    const processed = [];

    for (const child of children) {
      if (typeof child === 'string') {
        const trimmed = child.trim();
        if (trimmed) {
          // Normalize whitespace
          const normalized = child.replace(/\s+/g, ' ');
          processed.push(t.stringLiteral(normalized));
        }
      } else if (typeof child === 'object') {
        processed.push(templateNodeToBabel(child, expressions));
      }
    }

    return processed;
  }

  // Helper to normalize component name (kebab-case to PascalCase)
  function normalizeComponentName(name) {
    return name
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  }

  // Helper to check if intermediate AST contains ForEach tags
  function containsForEach(node) {
    if (!node || typeof node !== 'object') return false;

    // Check if this node is a ForEach tag
    if (node.tag === 'ForEach') return true;

    // Check children array
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        if (containsForEach(child)) return true;
      }
    }

    return false;
  }

  return {
    inherits: jsxSyntax.default || jsxSyntax,
    visitor: {

      // Transform template() calls to regular functions (no runtime helper needed)
      // Use exit phase to ensure child nodes (html``) are transformed first
      CallExpression: {
        exit(path) {
          const { callee, arguments: args } = path.node;

          // Check if this is a template() call
          if (!t.isIdentifier(callee, { name: 'template' })) return;
          if (!args || args.length === 0) return;

          // template(fn) -> fn
          if (args.length === 1 && (t.isArrowFunctionExpression(args[0]) || t.isFunctionExpression(args[0]))) {
            path.replaceWith(args[0]);
          }
          // template("name", fn) -> fn
          else if (args.length === 2 && t.isStringLiteral(args[0]) && (t.isArrowFunctionExpression(args[1]) || t.isFunctionExpression(args[1]))) {
            path.replaceWith(args[1]);
          }
        }
      }, TaggedTemplateExpression(path) {
        // Only transform html`` templates
        if (path.node.tag.name !== 'html') return;

        const { quasis, expressions } = path.node.quasi;

        // Parse template to intermediate AST
        const ast = parseHTMLTemplate(quasis, expressions);

        // Check if we need to import forEach
        if (containsForEach(ast)) {
          const program = path.findParent(p => t.isProgram(p));
          if (program) {
            ensureForEachImport(program);
          }
        }

        // Convert to clean Babel AST
        const babelAST = templateNodeToBabel(ast, expressions);

        path.replaceWith(babelAST);
      },

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

        const { props, on, bind } = processAttributes(opening.attributes, isComponent);
        const children = filterEmptyChildren(path.node.children, isComponent);

        if (isComponent) {
          // For components, merge on/bind back into props
          const allProps = [...props];
          if (on.length > 0) allProps.push(...on);
          if (bind.length > 0) allProps.push(...bind);
          path.replaceWith(buildComponentCall(tagCallee, allProps, children));
        } else {
          path.replaceWith(buildVNode(tagCallee.name, props, on, bind, children));
        }
      },

      JSXFragment(path) {
        const children = filterEmptyChildren(path.node.children, false);
        path.replaceWith(buildVNode(FRAGMENT_TAG, [], [], [], children));
      },
    },
  };
}
