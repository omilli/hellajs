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
  private eventListeners: Map<string, (e: Event) => void> = new Map();

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
          // Use the stored listener reference for removal
          const listener = this.eventListeners.get(event);
          if (listener) {
            this.root?.removeEventListener(event, listener);
            this.eventListeners.delete(event);
          }
          this.activeEvents.delete(event);
        }
      }

      this.handlers.delete(element);
    }
  }

  cleanup() {
    this.handlers.clear();

    // Use the stored listeners for proper cleanup
    for (const [event, listener] of this.eventListeners.entries()) {
      this.root?.removeEventListener(event, listener);
    }

    this.eventListeners.clear();
    this.activeEvents.clear();
  }

  private setupEventListener(event: string) {
    if (!this.activeEvents.has(event)) {
      const listener = (e: Event) => {
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
      };

      this.eventListeners.set(event, listener); // Store the listener
      this.root?.addEventListener(event, listener);
      this.activeEvents.add(event);
    }
  }
}