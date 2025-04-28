export interface EventHandler {
  event: string;
  handler: (event: Event) => void;
  element: HTMLElement;
}

export class EventDelegator {
  private handlers: EventHandler[] = [];
  private root: HTMLElement;
  private activeEvents: Set<string> = new Set();

  constructor(root: HTMLElement) {
    this.root = root;
  }

  addHandler(element: HTMLElement, event: string, handler: (event: Event) => void) {
    this.handlers.push({ event, handler, element });
    this.setupEventListener(event);
  }

  removeHandlersForElement(element: HTMLElement) {
    this.handlers = this.handlers.filter(h => h.element !== element);
    // Remove listeners if no handlers remain for an event
    this.activeEvents.forEach(event => {
      if (!this.handlers.some(h => h.event === event)) {
        this.root.removeEventListener(event, () => { });
        this.activeEvents.delete(event);
      }
    });
  }

  private setupEventListener(event: string) {
    if (!this.activeEvents.has(event)) {
      console.debug(`Adding event listener for ${event} on root`, this.root);
      this.root.addEventListener(event, (e: Event) => {
        let target = e.target as HTMLElement;
        while (target && target !== this.root) {
          const matchingHandlers = this.handlers.filter(
            h => h.event === event && h.element === target
          );
          if (matchingHandlers.length > 0) {
            matchingHandlers.forEach(h => h.handler(e));
            break;
          }
          target = target.parentElement as HTMLElement;
        }
      });
      this.activeEvents.add(event);
    }
  }

  cleanup() {
    console.debug('Cleaning up EventDelegator for root', this.root);
    this.handlers = [];
    this.activeEvents.forEach(event => {
      this.root.removeEventListener(event, () => { });
    });
    this.activeEvents.clear();
  }
}