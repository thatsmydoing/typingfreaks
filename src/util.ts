namespace util {
  export function loadTemplate(id: string): DocumentFragment {
    let template: HTMLTemplateElement = document.querySelector(`#${id}-template`);
    return document.importNode(template.content, true);
  }

  export function clearChildren(node: Node): void {
    while (node.lastChild !== null) {
      node.removeChild(node.lastChild);
    }
  }

  class ListenerManager {
    constructor(
      private target: EventTarget,
      private event: string,
      private handler: EventListener
    ) {}

    attach(): void {
      this.target.addEventListener(this.event, this.handler);
    }

    detach(): void {
      this.target.removeEventListener(this.event, this.handler);
    }
  }

  export class ListenersManager {
    private listeners: ListenerManager[] = [];

    add(target: EventTarget, event: string, handler: EventListener, attach: boolean = true): void {
      let listener = new ListenerManager(target, event, handler);
      this.listeners.push(listener);
      if (attach) {
        listener.attach();
      }
    }

    attach(): void {
      this.listeners.forEach(l => l.attach());
    }

    detach(): void {
      this.listeners.forEach(l => l.detach());
    }
  }
}
