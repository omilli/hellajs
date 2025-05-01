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
 * 
 * Instead of attaching event handlers directly to each element, this class:
 * 1. Attaches a single event listener to a root element
 * 2. Intercepts events as they bubble up
 * 3. Determines the intended target and executes the appropriate handler
 * 
 * This approach significantly improves performance and memory usage for UIs with many
 * interactive elements, particularly in dynamic content.
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
    // Get or create the map of handlers for this element
    let eventHandlers = this.handlers.get(element);
    if (!eventHandlers) {
      eventHandlers = new Map();
      this.handlers.set(element, eventHandlers);
    }

    // Register the handler for this event type
    eventHandlers.set(event, handler);

    // Ensure we have a listener on the root for this event type
    this.setupEventListener(event);
  }

  removeHandlersForElement(element: Element) {
    const eventHandlers = this.handlers.get(element);
    if (eventHandlers) {
      // Check each event type this element was using
      for (const [event] of eventHandlers) {
        // Check if this event type is used by any other elements
        if (!Array.from(this.handlers.values()).some(h => h.has(event))) {
          this.root?.removeEventListener(event, () => { });
          this.activeEvents.delete(event);
        }
      }

      // Remove this element from our handler map
      this.handlers.delete(element);
    }
  }

  private setupEventListener(event: string) {
    // Only set up the listener once per event type
    if (!this.activeEvents.has(event)) {
      this.root?.addEventListener(event, (e: Event) => {
        let target = e.target as Element;
        // Limit traversal depth to 3 levels for performance
        // This covers common nesting like: row -> cell -> interactive element
        let depth = 0;

        // Walk up the DOM tree looking for elements with handlers
        while (target && target !== this.root && depth < 3) {
          const eventHandlers = this.handlers.get(target);
          if (eventHandlers) {
            const handler = eventHandlers.get(event);
            if (handler) {
              // Execute the handler and stop propagation
              handler(e);
              return;
            }
          }

          // Move up to the parent element
          target = target.parentElement as Element;
          depth++;
        }
      });

      // Mark this event type as having an active listener
      this.activeEvents.add(event);
    }
  }

  cleanup() {
    // Clear all registered handlers
    this.handlers.clear();

    // Remove all event listeners from the root element
    for (const event of this.activeEvents) {
      this.root?.removeEventListener(event, () => { });
    }

    // Clear the set of active events
    this.activeEvents.clear();
  }
}