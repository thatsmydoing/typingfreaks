namespace util {
  export function loadBase(): void {
    let container = document.querySelector('#container');
    if (container === null) {
      throw new Error('Container not found');
    }

    let baseTemplate = loadTemplate('base');
    baseTemplate.querySelectorAll('template').forEach(t => {
      let parent = t.parentNode as Node;
      const templateName = t.getAttribute('name');
      if (templateName === null) {
        return;
      }
      let template = loadTemplate(templateName);
      let firstElement = template.querySelector('*');
      if (firstElement !== null) {
        for (let i = 0; i < t.classList.length; ++i) {
          firstElement.classList.add(t.classList[i]);
        }
      }
      parent.insertBefore(template, t);
      parent.removeChild(t);
    });

    container.appendChild(baseTemplate);
  }

  export function loadTemplate(id: string): DocumentFragment {
    let template = document.querySelector(`#${id}-template`);
    if (template !== null && template instanceof HTMLTemplateElement) {
      return document.importNode(template.content, true);
    } else {
      throw new Error(`#${id}-template is not a template`);
    }
  }

  export function clearChildren(node: Node): void {
    while (node.lastChild !== null) {
      node.removeChild(node.lastChild);
    }
  }

  export function getElement<E extends HTMLElement>(element: ParentNode, selector: string): E {
    const e = element.querySelector(selector);
    if (e === null) {
      throw new Error(`Could not find required element ${selector}`);
    }
    return e as E;
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
