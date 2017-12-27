/// <reference path="audio.ts" />
/// <reference path="background.ts" />
/// <reference path="game/common.ts" />
/// <reference path="game/loading.ts" />

namespace game {
  export class MainController extends ScreenManager {
    loadingScreen: Screen;

    constructor(container: HTMLElement, configUrl: string) {
      super(container);

      let self = this;
      let bgLayer: HTMLElement = container.querySelector('#background');
      let gameContext: GameContext = {
        container: container,
        audioManager: new audio.AudioManager(),
        bgManager: new background.BackgroundManager(bgLayer),
        assets: null,
        config: null,
        switchScreen(screen: Screen): void {
          self.switchScreen(screen);
        }
      }

      this.loadingScreen = new LoadingScreen(gameContext, configUrl);

      document.addEventListener('keydown', (event) => {
        if (!event.ctrlKey && !event.metaKey) {
          this.activeScreen.handleInput(event.key);
        }
      });
    }

    start(): void {
      this.switchScreen(this.loadingScreen);
    }
  }
}
