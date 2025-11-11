import { signal, computed, batch } from '@hellajs/core';
import { css } from '@hellajs/css';
import { element, elements } from '@hellajs/dom';

const ACCORDION = 'data-accordion';
const ACCORDION_ITEM = `${ACCORDION}-item`;
const ACCORDION_TRIGGER = `${ACCORDION}-trigger`;
const ACCORDION_CONTENT = `${ACCORDION}-content`;
const OPEN = 'data-open';
const MULTIPLE = 'data-multiple';
const ALWAYS_OPEN = 'data-always-open';

css({
  [`[${ACCORDION_CONTENT}]`]: {
    overflow: 'hidden',
    height: '0',
    transition: 'height 0.3s ease'
  },
}, { global: true });

/**
 * Initialize accordion functionality
 *
 * @param selector - CSS selector for the accordion container
 * @returns Controller object with state management methods
 *
 * Data attributes:
 * - `data-accordion` - Accordion group container
 * - `data-accordion-item` - Individual accordion item (optional ID value)
 * - `data-accordion-trigger` - Button that toggles the item
 * - `data-accordion-content` - Content that expands/collapses
 * - `data-multiple` - Allow multiple items to be open (add to data-accordion)
 * - `data-always-open` - Ensure at least one item is always open (add to data-accordion)
 * - `data-open` - Item starts in open state (add to data-accordion-item)
 * - `data-no-animate` - Disable animations (add to data-accordion or data-accordion-item)
 *
 * Animations automatically disabled for users with `prefers-reduced-motion: reduce`
 */
export const accordion = (selector: string) => {
  selector = `[${ACCORDION}="${selector}"]`;
  let initialized = false;
  let multiple = false;
  let alwaysOpen = false;
  const state = signal(new Map<string, boolean>());
  const itemIds: string[] = [];
  const pendingOperations: Array<() => void> = [];
  const loadCallbacks: Array<() => void> = [];

  element(selector).onLoad(() => {
    const rootNode = element(selector).node;
    if (!rootNode) return;

    multiple = rootNode.hasAttribute(MULTIPLE);
    alwaysOpen = rootNode.hasAttribute(ALWAYS_OPEN);

    // Prevent initial animation
    rootNode?.setAttribute('data-no-animate', '');

    const items = elements(`${selector} [${ACCORDION_ITEM}]`);
    const initialStates = new Map<string, boolean>();
    let i = 0, len = items.length;

    while (i < len) {
      const item = items[i];
      const itemNode = item.node;
      if (itemNode) {
        const id = itemNode.getAttribute(ACCORDION_ITEM) || crypto.randomUUID();
        itemNode.setAttribute(ACCORDION_ITEM, id);
        itemIds.push(id);
        initialStates.set(id, itemNode.hasAttribute(OPEN));

        const trigger = element(`${selector} [${ACCORDION_ITEM}="${id}"] [${ACCORDION_TRIGGER}]`);
        const content = element<HTMLElement>(`${selector} [${ACCORDION_ITEM}="${id}"] [${ACCORDION_CONTENT}]`);

        trigger.on('click', () => toggle(id));

        content.attr({
          'aria-hidden': () => getState(id) ? 'false' : 'true',
          style: () => `height: ${getState(id) ? content.node?.scrollHeight + 'px' : '0'}`
        });

        trigger.attr({
          'aria-expanded': () => state().get(id) ? 'true' : 'false'
        });
      }
      i++;
    }

    state(initialStates);

    // Enable transitions after initial render
    requestAnimationFrame(() =>
      rootNode?.removeAttribute('data-no-animate')
    );

    initialized = true;

    // Execute any pending operations
    while (pendingOperations.length > 0) {
      const operation = pendingOperations.shift();
      operation?.();
    }

    // Execute load callbacks
    let j = 0, loadLen = loadCallbacks.length;
    while (j < loadLen) {
      loadCallbacks[j++]();
    }
  });

  const setState = (id: string, value: boolean) => {
    batch(() => {
      const current = state();
      const isOpen = current.get(id) ?? false;

      if (isOpen === value) return;

      if (multiple) {
        if (!value && alwaysOpen) {
          let openCount = 0;
          for (const isOpen of current.values()) isOpen && openCount++;
          if (openCount <= 1) return;
        }
        const newStates = new Map(current);
        newStates.set(id, value);
        state(newStates);
      } else {
        if (value) {
          const newStates = new Map(current);
          let i = 0, len = itemIds.length;
          while (i < len) {
            newStates.set(itemIds[i], itemIds[i] === id);
            i++;
          }
          state(newStates);
        } else if (!alwaysOpen) {
          const newStates = new Map(current);
          newStates.set(id, false);
          state(newStates);
        }
      }
    });
  };

  const queueOrExecute = (operation: () => void) => {
    initialized ? operation() : pendingOperations.push(operation);
  };


  const getState = (id: string) => state().get(id) ?? false;

  const open = (id: string) => queueOrExecute(() => setState(id, true));
  const close = (id: string) => queueOrExecute(() => setState(id, false));
  const toggle = (id: string) => queueOrExecute(() => setState(id, !getState(id)));

  const openAll = () => queueOrExecute(() => {
    if (!multiple) return;
    batch(() => {
      const newStates = new Map(state());
      let i = 0, len = itemIds.length;
      while (i < len) newStates.set(itemIds[i++], true);
      state(newStates);
    });
  });

  const closeAll = () => queueOrExecute(() => {
    if (!multiple || alwaysOpen) return;
    batch(() => {
      const newStates = new Map(state());
      let i = 0, len = itemIds.length;
      while (i < len) newStates.set(itemIds[i++], false);
      state(newStates);
    });
  });

  const openItems = computed(() => {
    const open: string[] = [];
    for (const [id, isOpen] of state()) isOpen && open.push(id);
    return open;
  });

  const isOpen = () => openItems().length > 0;

  const getItems = () => [...itemIds];

  const onLoad = (callback: () => void) =>
    initialized ? callback() : loadCallbacks.push(callback)

  return {
    open,
    close,
    toggle,
    openAll,
    closeAll,
    openItems,
    isOpen,
    getItems,
    onLoad
  };
};
