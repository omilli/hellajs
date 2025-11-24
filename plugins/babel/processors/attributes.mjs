// Process JSX and template attributes
import { processAttributeValue } from './values.mjs';

// Forward declaration - will be injected by builder/ast.mjs to avoid circular dependency
let templateNodeToBabel = null;

export function setTemplateNodeToBabel(fn) {
  templateNodeToBabel = fn;
}

// Process JSX attributes into categorized arrays
export function processAttributes(t, attributes, isComponent) {
  if (!attributes.length) return { props: [], on: [], bind: [], lifecycle: [] };

  const props = [], on = [], bind = [], lifecycle = [];

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

      // Check for # prefix for lifecycle hooks
      if (key.startsWith('#')) {
        const hookName = key.slice(1); // Remove '#' prefix
        lifecycle.push(t.objectProperty(t.identifier(hookName), value));
      }
      // Check for on: prefix for event handlers
      else if (key.startsWith('on:')) {
        const eventName = key.slice(3); // Remove 'on:' prefix
        on.push(t.objectProperty(t.identifier(eventName), value));
      }
      // Check for @ prefix for dynamic bindings
      else if (key.startsWith('@') && !key.includes('xmlns')) {
        const propName = key.slice(1); // Remove '@' prefix
        bind.push(t.objectProperty(t.identifier(propName), value));
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

  return { props, on, bind, lifecycle };
}

// Process template attributes into categorized arrays
export function processTemplateAttributes(t, props, expressions, isComponent) {
  const propsArray = [], onArray = [], bindArray = [], lifecycleArray = [];

  for (const key in props) {
    const value = props[key];
    let processedValue;

    if (value === true) {
      processedValue = t.booleanLiteral(true);
    } else if (value.__slot !== undefined) {
      processedValue = expressions[value.__slot];
    } else if (Array.isArray(value)) {
      // Mixed content - convert to concatenation expression
      if (templateNodeToBabel) {
        processedValue = templateNodeToBabel(t, value, expressions);
      } else {
        processedValue = value;
      }
    } else {
      processedValue = t.stringLiteral(String(value));
    }

    // Check for # prefix for lifecycle hooks
    if (key.startsWith('#')) {
      const hookName = key.slice(1);
      lifecycleArray.push(t.objectProperty(t.identifier(hookName), processedValue));
    }
    // Check for on: prefix for event handlers
    else if (key.startsWith('on:')) {
      const eventName = key.slice(3);
      onArray.push(t.objectProperty(t.identifier(eventName), processedValue));
    }
    // Check for @ prefix for dynamic bindings
    else if (key.startsWith('@') && !key.includes('xmlns')) {
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

  return { props: propsArray, on: onArray, bind: bindArray, lifecycle: lifecycleArray };
}
