namespace util {
  export function loadBase(): void {
    let container = document.querySelector('#container');

    let baseTemplate = loadTemplate('base');
    baseTemplate.querySelectorAll('template').forEach(t => {
      let parent = t.parentNode;
      let template = loadTemplate(t.getAttribute('name'));
      let firstElement = template.querySelector('*');
      for (let i = 0; i < t.classList.length; ++i) {
        firstElement.classList.add(t.classList[i]);
      }
      parent.insertBefore(template, t);
      parent.removeChild(t);
    });

    container.appendChild(baseTemplate);
  }

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
