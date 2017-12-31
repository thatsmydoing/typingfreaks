namespace background {
  export class BackgroundManager {
    element: HTMLElement;
    filter: HTMLElement;
    last: HTMLElement | null;
    next: HTMLElement;

    constructor(element: HTMLElement) {
      this.element = element;
      this.last = null;
      this.filter = document.createElement('div');
      this.filter.className = 'filter';
      this.next = document.createElement('div');
      this.element.appendChild(this.filter);
      this.element.appendChild(this.next);
    }

    setBackground(background: string) {
      if (background.indexOf('.') >= 0) {
        this.next.style.background = `url(${background}), black`;
        this.next.style.filter = 'contrast(70%) brightness(70%)';
      } else {
        this.next.style.background = background;
      }
      this.next.classList.add('show');
      if (this.last != null) {
        this.last.classList.remove('show');
        this.last.addEventListener('transitionend', (event) => {
          this.element.removeChild(event.target as Node);
        });
      }
      this.last = this.next;
      this.next = document.createElement('div');
      this.element.appendChild(this.next);
    }
  }
}
