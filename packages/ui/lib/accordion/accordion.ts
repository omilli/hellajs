import { signal, element, elements, batch, computed } from '../deps';
import { ACCORDION, ACCORDION_CONTENT, ACCORDION_ITEM, ACCORDION_TRIGGER, ALWAYS_OPEN, MULTIPLE, OPEN } from './const';
import "./css";

export const accordion = (id: string) => {
  const selector = `[${ACCORDION}="${id}"]`;
  const state = signal(new Map<string, boolean>());
  const itemIds = signal<string[]>([]);
  const multiple = signal(false);
  const alwaysOpen = signal(false);
  const initialized = signal(false);
  const pendingOps: Array<() => void> = [];

  const exec = (op: () => void) => initialized() ? op() : pendingOps.push(op);

  const getState = (id: string) => state().get(id) ?? false;

  const setState = (id: string, value: boolean) => {
    batch(() => {
      const current = state();
      const isOpen = current.get(id) ?? false;

      if (isOpen === value) return;

      if (!value && alwaysOpen()) {
        let openCount = 0;
        for (const open of current.values()) open && openCount++;
        if (openCount <= 1) return;
      }

      if (multiple()) {
        const newStates = new Map(current);
        newStates.set(id, value);
        state(newStates);
      } else {
        if (value) {
          const newStates = new Map(current);
          const ids = itemIds();
          let i = 0, len = ids.length;
          while (i < len) {
            newStates.set(ids[i], ids[i] === id);
            i++;
          }
          state(newStates);
        } else {
          const newStates = new Map(current);
          newStates.set(id, false);
          state(newStates);
        }
      }
    });
  };

  element(selector).onLoad(() => {
    const rootNode = element(selector).node;
    if (!rootNode) return;

    multiple(rootNode.hasAttribute(MULTIPLE));
    alwaysOpen(rootNode.hasAttribute(ALWAYS_OPEN));

    rootNode.setAttribute('data-no-animate', '');

    const items = elements(`${selector} [${ACCORDION_ITEM}]`);
    const initialStates = new Map<string, boolean>();
    const ids: string[] = [];
    let i = 0, len = items.length;

    while (i < len) {
      const itemNode = items[i].node;
      if (itemNode) {
        const id = itemNode.getAttribute(ACCORDION_ITEM) || crypto.randomUUID();
        itemNode.setAttribute(ACCORDION_ITEM, id);
        ids.push(id);
        initialStates.set(id, itemNode.hasAttribute(OPEN));

        const trigger = element(`${selector} [${ACCORDION_ITEM}="${id}"] [${ACCORDION_TRIGGER}]`);
        const content = element<HTMLElement>(`${selector} [${ACCORDION_ITEM}="${id}"] [${ACCORDION_CONTENT}]`);

        trigger
          .on('click', () => setState(id, !getState(id)))
          .attr({
            'aria-expanded': () => state().get(id) ? 'true' : 'false'
          });

        content.attr({
          'aria-hidden': () => getState(id) ? 'false' : 'true',
          style: () => `height: ${getState(id) ? content.node?.scrollHeight + 'px' : '0'}`
        });
      }
      i++;
    }

    itemIds(ids);
    state(initialStates);
    initialized(true);

    requestAnimationFrame(() => rootNode.removeAttribute('data-no-animate'));

    while (pendingOps.length > 0) pendingOps.shift()?.();
  });

  const toggleAll = (show: boolean) =>
    batch(() => {
      const newStates = new Map(state());
      const ids = itemIds();
      let i = 0, len = ids.length;
      while (i < len) newStates.set(ids[i++], show);
      state(newStates);
    });

  return {
    open: (id: string) => exec(() => setState(id, true)),
    close: (id: string) => exec(() => setState(id, false)),
    toggle: (id: string) => exec(() => setState(id, !getState(id))),
    isOpen: computed(() => Array.from(state().values()).filter(v => v).length > 0),
    onLoad: (callback: () => void) => exec(callback),
    openAll: () => exec(() => toggleAll(true)),
    closeAll: () => exec(() => toggleAll(false)),
  };
};