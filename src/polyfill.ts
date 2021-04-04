interface API {
  request: string;
  changeEvent: string;
}

const VARIANTS = [
  {
    request: 'requestFullscreen',
    changeEvent: 'fullscreenchange',
  },
  {
    request: 'mozRequestFullScreen',
    changeEvent: 'mozfullscreenchange',
  },
  {
    request: 'webkitRequestFullscreen',
    changeEvent: 'webkitfullscreenchange',
  },
  {
    request: 'msRequestFullscreen',
    changeEvent: 'MSFullscreenChange',
  },
];

class FullscreenPolyfill {
  private api: API | undefined;

  constructor() {
    this.api = VARIANTS.find(
      (variant) =>
        // @ts-ignore
        document.firstChild[variant.request] !== undefined
    );
  }

  request(element: HTMLElement) {
    if (this.api !== undefined) {
      // @ts-ignore
      element[this.api.request]();
    }
  }

  addEventListener(listener: () => void) {
    if (this.api !== undefined) {
      document.addEventListener(this.api.changeEvent, listener);
    }
  }
}

export const fullscreen = new FullscreenPolyfill();
