import { maybeReactive } from "../utils/reactive.mjs";

/**
 * Categorize JSX attributes into five typed arrays.
 * @param {typeof import("@babel/core").types} t
 * @param {import("@babel/core").JSXAttribute[]} attributes
 * @param {boolean} isComponent
 * @returns {{ props: import("@babel/core").ObjectProperty[], on: import("@babel/core").ObjectProperty[], hooks: import("@babel/core").ObjectProperty[], e: import("@babel/core").ObjectProperty[], error: import("@babel/core").ObjectProperty[] }}
 */
export function processAttributes(t, attributes, isComponent) {
  if (!attributes.length) return { props: [], on: [], hooks: [], e: [], error: [] };

  const props = [],
    on = [],
    hooks = [],
    e = [],
    error = [];

  attributes.forEach((attr) => {
    if (t.isJSXAttribute(attr)) {
      let key;
      if (t.isJSXIdentifier(attr.name)) {
        key = attr.name.name;
      } else {
        // JSXNamespacedName (e.g., xml:lang, xlink:href)
        key = `${attr.name.namespace.name}:${attr.name.name.name}`;
      }

      let value =
        attr.value && attr.value.expression !== undefined ? attr.value.expression : attr.value;

      if (value === null) {
        value = t.booleanLiteral(true);
      }

      // Component calls keep prefixed keys verbatim in props — the component
      // re-emits them onto elements, where dom routes them into live buckets
      // at render time (routePrefixedProps). Bucket arrays stay element-only.
      if (isComponent && /^(error|hook|e|on):/.test(key)) {
        props.push(t.objectProperty(t.stringLiteral(key), value));
      } else if (key.startsWith("error:")) {
        const errorKey = key.slice(6);
        error.push(t.objectProperty(t.identifier(errorKey), value));
      } else if (key.startsWith("hook:")) {
        const hookName = key.slice(5);
        hooks.push(t.objectProperty(t.identifier(hookName), value));
      }
      // e: prefix for direct (non-delegated) event handlers
      else if (key.startsWith("e:")) {
        const eventName = key.slice(2);
        e.push(t.objectProperty(t.identifier(eventName), value));
      } else if (key.startsWith("on:")) {
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
        props.push(
          t.objectProperty(
            needsQuoting || (typeof key === "string" && /^data-|^aria-/.test(key))
              ? t.stringLiteral(key)
              : t.identifier(key),
            value,
          ),
        );
      }
    } else if (t.isJSXSpreadAttribute(attr)) {
      props.push(t.spreadElement(attr.argument));
    }
  });

  return { props, on, hooks, e, error };
}
