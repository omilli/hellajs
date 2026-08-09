import { processAttributeValue } from "./values.mjs";
import { maybeReactive } from "../utils/reactive.mjs";

// Forward declaration - will be injected by builder/ast.mjs to avoid circular dependency
let componentNodeToBabel = null;

/** @param {(t: any, node: any, expressions: any[]) => any} fn */
export function setComponentNodeToBabel(fn) {
  componentNodeToBabel = fn;
}

/**
 * Categorize JSX attributes into six typed arrays.
 * @param {typeof import("@babel/core").types} t
 * @param {import("@babel/core").JSXAttribute[]} attributes
 * @param {boolean} isComponent
 * @returns {{ props: import("@babel/core").ObjectProperty[], on: import("@babel/core").ObjectProperty[], hooks: import("@babel/core").ObjectProperty[], e: import("@babel/core").ObjectProperty[], error: import("@babel/core").ObjectProperty[] }}
 */
export function processAttributes(t, attributes, isComponent) {
  if (!attributes.length) return { props: [], on: [], hooks: [], e: [], error: [] };

  const props = [], on = [], hooks = [], e = [], error = [];

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

      if (value === null) {
        value = t.booleanLiteral(true);
      } else {
        value = processAttributeValue(value, isComponent, key);
      }

      if (key.startsWith("error:")) {
        const errorKey = key.slice(6);
        error.push(t.objectProperty(t.identifier(errorKey), value));
      }
      else if (key.startsWith("hook:")) {
        const hookName = key.slice(5);
        hooks.push(t.objectProperty(t.identifier(hookName), value));
      }
      // e: prefix for direct (non-delegated) event handlers
      else if (key.startsWith("e:")) {
        const eventName = key.slice(2);
        e.push(t.objectProperty(t.identifier(eventName), value));
      }
      else if (key.startsWith("on:")) {
        const eventName = key.slice(3);
        on.push(t.objectProperty(t.identifier(eventName), value));
      } else {
        // Convert camelCase data/aria to kebab-case
        if (typeof key === "string" && /^(data|aria)[A-Z]/.test(key)) {
          key = key.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
        }

        // Auto-wrap call-containing element props (signals, method calls,
        // derived arrays/ternaries) into a thunk so dom's per-binding effect
        // tracks them — mirrors the children heuristic. Component props are
        // excluded (a component may treat the value as plain, not a function).
        // Prefixed keys (on:/e:/hook:/error:) are handled above and never reach here.
        if (!isComponent) value = maybeReactive(t, value);

        const needsQuoting = typeof key === "string" && /[-:]/.test(key);
        props.push(t.objectProperty(
          needsQuoting || (typeof key === "string" && /^data-|^aria-/.test(key))
            ? t.stringLiteral(key)
            : t.identifier(key),
          value
        ));
      }
    } else if (t.isJSXSpreadAttribute(attr)) {
      props.push(t.spreadElement(attr.argument));
    }
  });

  return { props, on, hooks, e, error };
}


/**
 * Categorize html`` component attributes into six typed arrays.
 * @param {object} t
 * @param {Record<string, any>} props
 * @param {any[]} expressions
 */
export function processComponentAttributes(t, props, expressions, isComponent) {
  const propsArray = [], onArray = [], hooksArray = [], eArray = [], errorArray = [];

  for (const key in props) {
    const value = props[key];
    let processedValue;

    if (value === true) {
      processedValue = t.booleanLiteral(true);
    } else if (value.__slot !== undefined) {
      const slotExpr = expressions[value.__slot];
      processedValue = isComponent ? slotExpr : maybeReactive(t, slotExpr);
    } else if (Array.isArray(value)) {
      const concat = componentNodeToBabel(t, value, expressions);
      processedValue = isComponent ? concat : maybeReactive(t, concat);
    } else {
      processedValue = t.stringLiteral(String(value));
    }

    if (key.startsWith("error:")) {
      const errorKey = key.slice(6);
      errorArray.push(t.objectProperty(t.identifier(errorKey), processedValue));
    }
    else if (key.startsWith("hook:")) {
      const hookName = key.slice(5);
      hooksArray.push(t.objectProperty(t.identifier(hookName), processedValue));
    }
    // e: prefix for direct (non-delegated) event handlers
    else if (key.startsWith("e:")) {
      const eventName = key.slice(2);
      eArray.push(t.objectProperty(t.identifier(eventName), processedValue));
    }
    else if (key.startsWith("on:")) {
      const eventName = key.slice(3);
      onArray.push(t.objectProperty(t.identifier(eventName), processedValue));
    }
    else {
      // Handle kebab-case for data/aria
      let propKey = key;
      if (/^(data|aria)[A-Z]/.test(key)) {
        propKey = key.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
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

  return { props: propsArray, on: onArray, hooks: hooksArray, e: eArray, error: errorArray };
}
