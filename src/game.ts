/// <reference path="audio.ts" />
/// <reference path="background.ts" />
/// <reference path="polyfill.ts" />
/// <reference path="game/common.ts" />
/// <reference path="game/loading.ts" />

namespace game {
  export class MainController extends ScreenManager {
    bgManager: background.BackgroundManager;
    loadingScreen: Screen;

    constructor(container: HTMLElement, configUrl: string) {
      super(container);
      container.appendChild(util.loadTemplate(container, 'base'));

      let self = this;
      let bgLayer: HTMLElement = util.getElement(container, '#background');
      this.bgManager = new background.BackgroundManager(bgLayer);
      let gameContext: GameContext = {
        container: container,
        audioManager: new audio.AudioManager(),
        bgManager: this.bgManager,
        loadTemplate: (id: string) => util.loadTemplate(container, id),
        assets: null,
        config: null,
        switchScreen(screen: Screen): void {
          self.switchScreen(screen);
        }
      }

      this.loadingScreen = new LoadingScreen(gameContext, configUrl);

      document.addEventListener('keydown', (event) => {
        if (event.altKey && event.key === 'Enter') {
          polyfill.fullscreen.request(this.container);
        }
        if (this.activeScreen !== null && !event.ctrlKey && !event.metaKey) {
          this.activeScreen.handleInput(event.key);
        }
      });

      polyfill.fullscreen.addEventListener(() => {
        this.onResize();
      });
    }

    start(): void {
      this.switchScreen(this.loadingScreen);
    }

    onResize(): void {
      const fontSize = this.container.offsetHeight / 28.125;
      this.container.style.setProperty('--base-font-size', `${fontSize}px`);
      this.bgManager.onResize();
    }
  }
}
