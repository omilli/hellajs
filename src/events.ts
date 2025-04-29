export interface EventHandler {
  event: string;
  handler: (event: Event) => void;
  element: HTMLElement;
}

export class EventDelegator {
  private handlers: Map<HTMLElement, Map<string, (event: Event) => void>> = new Map();
  private root: HTMLElement;
  private activeEvents: Set<string> = new Set();

  constructor(root: HTMLElement) {
    this.root = root;
  }

  addHandler(element: HTMLElement, event: string, handler: (event: Event) => void) {
    let eventHandlers = this.handlers.get(element);
    if (!eventHandlers) {
      eventHandlers = new Map();
      this.handlers.set(element, eventHandlers);
    }
    eventHandlers.set(event, handler);
    this.setupEventListener(event);
  }

  removeHandlersForElement(element: HTMLElement) {
    const eventHandlers = this.handlers.get(element);
    if (eventHandlers) {
      eventHandlers.forEach((_, event) => {
        if (!Array.from(this.handlers.values()).some(h => h.has(event))) {
          this.root.removeEventListener(event, () => { });
          this.activeEvents.delete(event);
        }
      });
      this.handlers.delete(element);
    }
  }

  private setupEventListener(event: string) {
    if (!this.activeEvents.has(event)) {
      this.root.addEventListener(event, (e: Event) => {
        let target = e.target as HTMLElement;
        // Limit traversal depth to 3 levels (row -> td -> a)
        let depth = 0;
        while (target && target !== this.root && depth < 3) {
          const eventHandlers = this.handlers.get(target);
          if (eventHandlers) {
            const handler = eventHandlers.get(event);
            if (handler) {
              handler(e);
              return; // Stop after first match
            }
          }
          target = target.parentElement as HTMLElement;
          depth++;
        }
      });
      this.activeEvents.add(event);
    }
  }

  cleanup() {

    this.handlers.clear();
    this.activeEvents.forEach(event => {
      this.root.removeEventListener(event, () => { });
    });
    this.activeEvents.clear();
  }
}