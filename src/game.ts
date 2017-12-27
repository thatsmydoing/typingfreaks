/// <reference path="level.ts" />
/// <reference path="audio.ts" />
/// <reference path="background.ts" />
/// <reference path="util.ts" />
/// <reference path="game/loading.ts" />

namespace game {
  interface GameSounds {
    selectSound: audio.Track,
    decideSound: audio.Track
  }

  export interface Screen {
    readonly name: string;
    handleInput(key: string): void;
    enter(): void;
    exit(): void;
  }

  export class MainController {
    config: level.Config | null;
    audioManager: audio.AudioManager;
    bgManager: background.BackgroundManager;
    assets: GameSounds | null;
    activeScreen: Screen | null = null;

    constructor(readonly container: HTMLElement, readonly configUrl: string) {
      this.audioManager = new audio.AudioManager();
      this.bgManager = new background.BackgroundManager(container.querySelector('#background'));

      document.addEventListener('keydown', (event) => {
        if (!event.ctrlKey && !event.metaKey) {
          this.activeScreen.handleInput(event.key);
        }
      });
    }

    switchScreen(nextScreen: Screen): void {
      if (this.activeScreen != null) {
        this.container.classList.remove(this.activeScreen.name);
        this.activeScreen.exit();
      }
      this.activeScreen = nextScreen;
      this.activeScreen.enter();
      this.container.classList.add(this.activeScreen.name);
    }

    start(): void {
      this.switchScreen(new LoadingScreen(this));
    }
  }
}
