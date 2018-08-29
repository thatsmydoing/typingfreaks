namespace background {
  export class BackgroundManager {
    element: HTMLElement;
    last: HTMLElement | null;
    next: HTMLElement;
    fnContext: util.FnContext = new util.FnContext();

    constructor(element: HTMLElement) {
      this.element = element;
      this.last = null;
      this.next = document.createElement('div');
      this.element.appendChild(this.next);
    }

    setBackground(background: string) {
      this.fnContext.invalidate();
      util.loadBackground(background).then(this.fnContext.wrap(
        () => this.setBackgroundActual(background)
      ));
    }

    private setBackgroundActual(background: string) {
      if (background.indexOf('.') >= 0) {
        this.next.style.backgroundImage = `url(${background})`;
        this.next.style.backgroundColor = 'black';
        this.next.classList.add('image');
      } else {
        this.next.style.backgroundColor = background;
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
