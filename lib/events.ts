/**
 * Represents an event handler with its associated element and event type.
 */
export interface EventHandler {
  event: string;
  handler: (event: Event) => void;
  element: HTMLElement;
}

/**
 * EventDelegator implements the event delegation pattern to efficiently manage DOM events.
 */
export class EventDelegator {
  private handlers: Map<Element, Map<string, (event: Event) => void>> = new Map();
  private rootSelector: string;
  private root: HTMLElement;
  private activeEvents: Set<string> = new Set();

  constructor(rootSelector: string) {
    this.rootSelector = rootSelector;
    this.root = document.querySelector(this.rootSelector) as HTMLElement;
  }

  addHandler(element: Element, event: string, handler: (event: Event) => void) {
    let eventHandlers = this.handlers.get(element);
    if (!eventHandlers) {
      eventHandlers = new Map();
      this.handlers.set(element, eventHandlers);
    }

    eventHandlers.set(event, handler);
    this.setupEventListener(event);
  }

  removeHandlersForElement(element: Element) {
    const eventHandlers = this.handlers.get(element);
    if (eventHandlers) {
      for (const [event] of eventHandlers) {
        if (!Array.from(this.handlers.values()).some(h => h.has(event))) {
          this.root?.removeEventListener(event, () => { });
          this.activeEvents.delete(event);
        }
      }

      this.handlers.delete(element);
    }
  }

  private setupEventListener(event: string) {
    if (!this.activeEvents.has(event)) {
      this.root?.addEventListener(event, (e: Event) => {
        let target = e.target as Element;
        let depth = 0;

        while (target && target !== this.root && depth < 3) {
          const eventHandlers = this.handlers.get(target);
          if (eventHandlers) {
            const handler = eventHandlers.get(event);
            if (handler) {
              handler(e);
              return;
            }
          }

          target = target.parentElement as Element;
          depth++;
        }
      });

      this.activeEvents.add(event);
    }
  }

  cleanup() {
    this.handlers.clear();

    for (const event of this.activeEvents) {
      this.root?.removeEventListener(event, () => { });
    }

    this.activeEvents.clear();
  }
}