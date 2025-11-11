import { signal, element, elements } from '../deps';
import { ACCORDION, ACCORDION_CONTENT, ACCORDION_ITEM, ACCORDION_TRIGGER, ALWAYS_OPEN, MULTIPLE, OPEN } from './const';
import type { AccordionState } from './types';
import { accordionToggleItem } from './methods';
import { getState } from './utils';
import "./css";

// Factory function
export const accordion = (selector: string): AccordionState => {
  const fullSelector = `[${ACCORDION}="${selector}"]`;
  const accordionState: AccordionState = {
    selector: fullSelector,
    initialized: false,
    multiple: false,
    alwaysOpen: false,
    state: signal(new Map<string, boolean>()),
    itemIds: [],
    pendingOperations: [],
    loadCallbacks: []
  };

  element(fullSelector).onLoad(() => {
    const rootNode = element(fullSelector).node;
    if (!rootNode) return;

    accordionState.multiple = rootNode.hasAttribute(MULTIPLE);
    accordionState.alwaysOpen = rootNode.hasAttribute(ALWAYS_OPEN);

    rootNode?.setAttribute('data-no-animate', '');

    const items = elements(`${fullSelector} [${ACCORDION_ITEM}]`);
    const initialStates = new Map<string, boolean>();
    let i = 0, len = items.length;

    while (i < len) {
      const item = items[i];
      const itemNode = item.node;
      if (itemNode) {
        const id = itemNode.getAttribute(ACCORDION_ITEM) || crypto.randomUUID();
        itemNode.setAttribute(ACCORDION_ITEM, id);
        accordionState.itemIds.push(id);
        initialStates.set(id, itemNode.hasAttribute(OPEN));

        const trigger = element(`${fullSelector} [${ACCORDION_ITEM}="${id}"] [${ACCORDION_TRIGGER}]`);
        const content = element<HTMLElement>(`${fullSelector} [${ACCORDION_ITEM}="${id}"] [${ACCORDION_CONTENT}]`);

        trigger.on('click', () => accordionToggleItem(accordionState, id));

        content.attr({
          'aria-hidden': () => getState(accordionState, id) ? 'false' : 'true',
          style: () => `height: ${getState(accordionState, id) ? content.node?.scrollHeight + 'px' : '0'}`
        });

        trigger.attr({
          'aria-expanded': () => accordionState.state().get(id) ? 'true' : 'false'
        });
      }
      i++;
    }

    accordionState.state(initialStates);

    requestAnimationFrame(() =>
      rootNode?.removeAttribute('data-no-animate')
    );

    accordionState.initialized = true;

    while (accordionState.pendingOperations.length > 0) {
      const operation = accordionState.pendingOperations.shift();
      operation?.();
    }

    let j = 0, loadLen = accordionState.loadCallbacks.length;
    while (j < loadLen) {
      accordionState.loadCallbacks[j++]();
    }
  });

  return accordionState;
};