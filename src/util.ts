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
}
