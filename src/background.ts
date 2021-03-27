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
      this.video = document.createElement('div');
      this.video.classList.add('show');
      this.element.appendChild(this.video);
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
      this.last?.classList.remove('show');
    }

    hideVideo() {
      if (this.last != null) {
        this.last.classList.add('show');
        this.last.addEventListener('transitionend', () => {
          this.video.innerHTML = '';
        });
      }
    }

    setVideo(element: HTMLElement) {
      this.video.innerHTML = '';
      this.video.appendChild(element);
    }

    onResize() {
      const height = this.element.offsetHeight;
      const width = this.element.offsetWidth;
      const iframes = this.element.querySelectorAll('iframe');
      iframes.forEach((iframe) => {
        iframe.height = ""+height;
        iframe.width  = ""+width;
      });
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
          this.video.innerHTML = '';
        }, { once: true });
      }
      this.last = this.next;
      this.next = document.createElement('div');
      this.element.appendChild(this.next);
    }
  }
}
