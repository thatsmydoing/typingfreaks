namespace util {
  export function loadTemplate(element: ParentNode, id: string): DocumentFragment {
    let template = element.querySelector(`#${id}-template`);
    if (template !== null && template instanceof HTMLTemplateElement) {
      const fragment = document.importNode(template.content, true);
      fragment.querySelectorAll('template').forEach(t => {
        let parent = t.parentNode!;
        const templateName = t.getAttribute('name');
        if (templateName === null) {
          return;
        }
        let template = loadTemplate(fragment, templateName);
        let firstElement = template.querySelector('*');
        if (firstElement !== null) {
          for (let i = 0; i < t.classList.length; ++i) {
            firstElement.classList.add(t.classList[i]);
          }
        }
        parent.insertBefore(template, t);
        parent.removeChild(t);
      });
      return fragment;
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

  export function loadBackground(url: string): Promise<void> {
    if (url.includes('.')) {
      return new Promise((resolve, reject) => {
        let image = new Image();
        image.onload = (event) => resolve();
        image.src = url;
      });
    } else {
      return Promise.resolve();
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

  export class FnContext {
    current: Symbol = Symbol();

    invalidate() {
      this.current = Symbol();
    }

    wrap<T extends Function>(fn: T): T {
      const id = this.current;
      const wrappedFn = (...args: any[]) => {
        if (this.current === id) {
          return fn(...args);
        }
      };
      return wrappedFn as any as T;
    }
  }
}
