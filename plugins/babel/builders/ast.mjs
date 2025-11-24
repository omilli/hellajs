// Convert intermediate template AST to Babel AST
import { processTemplateAttributes, setTemplateNodeToBabel } from '../processors/attributes.mjs';
import { buildVNode } from './vnode.mjs';
import { buildComponentCall } from './component.mjs';

// Convert template node to Babel AST
export function templateNodeToBabel(t, node, expressions) {
  // Inject this function into processors/attributes.mjs to avoid circular dependency
  setTemplateNodeToBabel(templateNodeToBabel);

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
      return templateNodeToBabel(t, node[0], expressions);
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
    const { props, on, bind, lifecycle } = processTemplateAttributes(t, node.props || {}, expressions, true);
    // For components, merge on/bind/lifecycle back into props
    const allProps = [...props];
    if (on.length > 0) allProps.push(...on);
    if (bind.length > 0) allProps.push(...bind);
    if (lifecycle.length > 0) allProps.push(...lifecycle);

    // For dynamic components, extract the actual component from expressions
    let tagCallee;
    if (isSlotTag) {
      const match = node.tag.match(/__SLOT_(\d+)__/);
      const index = match ? parseInt(match[1]) : 0;
      tagCallee = expressions[index];
    } else {
      tagCallee = t.identifier(node.tag);
    }

    // Process children recursively
    const processedChildren = [];
    for (const child of node.children || []) {
      processedChildren.push(templateNodeToBabel(t, child, expressions));
    }

    return buildComponentCall(t, tagCallee, allProps, processedChildren);
  } else {
    const { props, on, bind, lifecycle } = processTemplateAttributes(t, node.props || {}, expressions, false);

    // Process children recursively
    const processedChildren = [];
    for (const child of node.children || []) {
      processedChildren.push(templateNodeToBabel(t, child, expressions));
    }

    return buildVNode(
      t,
      node.tag,
      props,
      on,
      bind,
      lifecycle,
      processedChildren
    );
  }
}
