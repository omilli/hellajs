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
 * @returns {{ props: import("@babel/core").ObjectProperty[], on: import("@babel/core").ObjectProperty[], bind: import("@babel/core").ObjectProperty[], hooks: import("@babel/core").ObjectProperty[], e: import("@babel/core").ObjectProperty[], error: import("@babel/core").ObjectProperty[] }}
 */
export function processAttributes(t, attributes, isComponent) {
  if (!attributes.length) return { props: [], on: [], bind: [], hooks: [], e: [], error: [] };

  const props = [], on = [], bind = [], hooks = [], e = [], error = [];

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
      else if (key.startsWith("bind:")) {
        const propName = key.slice(5);
        bind.push(t.objectProperty(t.identifier(propName), maybeReactive(t, value)));
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

        const needsQuoting = typeof key === "string" && /[-]/.test(key);
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

  return { props, on, bind, hooks, e, error };
}


/**
 * Categorize html`` component attributes into six typed arrays.
 * @param {object} t
 * @param {Record<string, any>} props
 * @param {any[]} expressions
 */
export function processComponentAttributes(t, props, expressions) {
  const propsArray = [], onArray = [], bindArray = [], hooksArray = [], eArray = [], errorArray = [];

  for (const key in props) {
    const value = props[key];
    const isBind = key.startsWith("bind:");
    let processedValue;

    if (value === true) {
      processedValue = t.booleanLiteral(true);
    } else if (value.__slot !== undefined) {
      processedValue = isBind ? maybeReactive(t, expressions[value.__slot]) : expressions[value.__slot];
    } else if (Array.isArray(value)) {
      processedValue = componentNodeToBabel(t, value, expressions);
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
    else if (key.startsWith("bind:")) {
      const propName = key.slice(5);
      bindArray.push(t.objectProperty(t.identifier(propName), processedValue));
    } else {
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

  return { props: propsArray, on: onArray, bind: bindArray, hooks: hooksArray, e: eArray, error: errorArray };
}
