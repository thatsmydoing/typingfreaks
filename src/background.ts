namespace background {
  export class BackgroundManager {
    element: HTMLElement;
    video: HTMLElement;
    last: HTMLElement | null;
    next: HTMLElement;
    fnContext: util.FnContext = new util.FnContext();

    constructor(element: HTMLElement) {
      this.element = element;
      this.last = null;
      this.video = util.getElement(element, '#video');
      this.video.addEventListener('transitionend', () => {
        this.video.classList.add('settled');
      });
      this.next = document.createElement('div');
      this.element.appendChild(this.next);
    }

    setBackground(background: string) {
      this.fnContext.invalidate();
      util.loadBackground(background).then(this.fnContext.wrap(() => {
        this.setBackgroundActual(background);
      }));
    }

    showVideo() {
      this.video.classList.add('show');
      this.last?.classList.remove('show');
    }

    hideVideo() {
      this.last?.classList.add('show');
    }

    setVideo(element: HTMLElement) {
      this.video.innerHTML = '';
      this.video.classList.remove('settled');
      this.video.appendChild(element);
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
        const toRemove = this.last;
        this.last.classList.remove('show');
        this.next.addEventListener('transitionend', () => {
          this.element.removeChild(toRemove);
          this.video.classList.remove('show');
          this.video.innerHTML = '';
        }, { once: true });
      }
      this.last = this.next;
      this.next = document.createElement('div');
      this.element.appendChild(this.next);
    }
  }
}
