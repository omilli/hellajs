import { signal, effect, computed } from '@hellajs/core';
import { onElementAdded } from '@hellajs/dom';
import "./accordion.css"

const ACCORDION_ITEM = '[data-accordion-item]';
const ACCORDION_TRIGGER = '[data-accordion-trigger]';
const ACCORDION_CONTENT = '[data-accordion-content]';
const MULTIPLE = 'data-multiple';
const ALWAYS_OPEN = 'data-always-open';
const ITEM_ATTR = 'data-accordion-item';
const OPEN = 'data-open';
const STATE = 'data-state';
const ARIA_HIDDEN = 'aria-hidden';
const ARIA_EXPANDED = 'aria-expanded';
const FALSE = 'false';
const TRUE = 'true';
const CLOSED = 'closed';
const HEIGHT = 'height';

const initAccordion = (node: Element) => {
  const states = signal(new Map<string, boolean>());

  const multiple = node.hasAttribute(MULTIPLE);
  const alwaysOpen = node.hasAttribute(ALWAYS_OPEN);
  const items = node.querySelectorAll(ACCORDION_ITEM);
  const itemIds: string[] = [];

  const initialStates = new Map<string, boolean>();
  let i = 0;
  while (i < items.length) {
    const item = items[i];
    const id = item.getAttribute(ITEM_ATTR) || crypto.randomUUID();
    item.setAttribute(ITEM_ATTR, id);
    itemIds.push(id);
    initialStates.set(id, item.hasAttribute(OPEN));
    i++;
  }
  states(initialStates);

  const setState = (id: string, value: boolean) => {
    const current = states();
    const isOpen = current.get(id) ?? false;

    if (isOpen === value) return;

    const newStates = new Map(current);

    if (multiple) {
      if (!value && alwaysOpen) {
        const openCount = Array.from(current.values()).filter(Boolean).length;
        if (openCount <= 1) return;
      }
      newStates.set(id, value);
    } else {
      if (value) {
        itemIds.forEach(itemId => newStates.set(itemId, false));
        newStates.set(id, true);
      } else {
        if (!alwaysOpen) newStates.set(id, false);
      }
    }

    states(newStates);
  };

  const ctrl = {
    state: states,

    open: (id: string) => setState(id, true),
    close: (id: string) => setState(id, false),
    toggle: (id: string) => {
      const current = states().get(id) ?? false;
      setState(id, !current);
    },
    openAll: () => {
      if (!multiple) return;
      const newStates = new Map(states());
      itemIds.forEach(id => newStates.set(id, true));
      states(newStates);
    },
    closeAll: () => {
      if (!multiple || alwaysOpen) return;
      const newStates = new Map(states());
      itemIds.forEach(id => newStates.set(id, false));
      states(newStates);
    },

    isOpen: (id: string) => states().get(id) ?? false,
    getOpenItems: () => {
      const open: string[] = [];
      states().forEach((isOpen, id) => isOpen && open.push(id));
      return open;
    },
    getItems: () => [...itemIds],

    openCount: computed(() => {
      let count = 0;
      states().forEach(isOpen => isOpen && count++);
      return count;
    }),

    destroy: () => {}
  };

  i = 0;
  while (i < items.length) {
    const item = items[i];
    const id = itemIds[i];
    const btnNode = item.querySelector(ACCORDION_TRIGGER);
    const contentNode = item.querySelector(ACCORDION_CONTENT) as HTMLElement;

    if (btnNode && contentNode) {
      btnNode.addEventListener('click', () => ctrl.toggle(id));

      effect(() => {
        const open = states().get(id) ?? false;

        contentNode.setAttribute(STATE, open ? OPEN : CLOSED);
        contentNode.setAttribute(ARIA_HIDDEN, open ? FALSE : TRUE);
        btnNode.setAttribute(ARIA_EXPANDED, open ? TRUE : FALSE);

        contentNode.style[HEIGHT] = open ? `${contentNode.scrollHeight}px` : '0';
      });
    }
    i++;
  }

  return ctrl;
};

/**
 * Initialize accordion functionality
 *
 * @param selector - CSS selector for the accordion container
 * @returns Controller object that automatically waits for DOM
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
  let cleanup: (() => void) | undefined;
  let initialized = false;
  let actualCtrl: any = null;
  const pendingCalls: (() => void)[] = [];

  const executeOrQueue = (fn: () => void) => {
    if (initialized && actualCtrl) {
      fn();
    } else {
      pendingCalls.push(fn);
    }
  };

  const ctrl = {
    state: signal(new Map<string, boolean>()),
    open: (id: string) => executeOrQueue(() => actualCtrl.open(id)),
    close: (id: string) => executeOrQueue(() => actualCtrl.close(id)),
    toggle: (id: string) => executeOrQueue(() => actualCtrl.toggle(id)),
    openAll: () => executeOrQueue(() => actualCtrl.openAll()),
    closeAll: () => executeOrQueue(() => actualCtrl.closeAll()),
    isOpen: (id: string) => actualCtrl ? actualCtrl.isOpen(id) : false,
    getOpenItems: () => actualCtrl ? actualCtrl.getOpenItems() : [],
    getItems: () => actualCtrl ? actualCtrl.getItems() : [],
    openCount: computed(() => actualCtrl ? actualCtrl.openCount() : 0),
    destroy: () => {
      cleanup && cleanup();
    }
  };

  cleanup = onElementAdded(selector, (node: Element) => {
    actualCtrl = initAccordion(node);
    Object.assign(ctrl, actualCtrl);
    initialized = true;

    while (pendingCalls.length) {
      const fn = pendingCalls.shift();
      fn && fn();
    }
  });

  return ctrl;
};
