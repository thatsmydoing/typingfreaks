/// <reference path="../audio.ts" />
/// <reference path="../background.ts" />
/// <reference path="../level.ts" />

namespace game {
  export interface Screen {
    readonly name: string;
    handleInput(key: string): void;
    enter(): void;
    exit(): void;
    transitionExit(): void;
  }

  export class ScreenManager {
    activeScreen: Screen | null = null;
    lastScreen: Screen | null = null;
    pendingExit: boolean = false;

    constructor(readonly container: HTMLElement) {
      this.container.addEventListener('transitionend', (event: TransitionEvent) => {
        if (this.pendingExit && event.propertyName === 'opacity') {
          if (this.lastScreen !== null) {
            this.lastScreen.transitionExit();
            this.lastScreen = null;
          }
        }
      });
    }

    switchScreen(nextScreen: Screen | null): void {
      if (this.activeScreen != null) {
        this.container.classList.remove(this.activeScreen.name);
        this.pendingExit = true;
        this.lastScreen = this.activeScreen;
        this.activeScreen.exit();
      }
      this.activeScreen = nextScreen;
      if (nextScreen != null) {
        nextScreen.enter();
        this.container.classList.add(nextScreen.name);
      }
    }
  }

  interface GameSounds {
    selectSound: audio.Track | null,
    decideSound: audio.Track | null
  }

  export interface GameContext {
    container: HTMLElement;
    audioManager: audio.AudioManager;
    bgManager: background.BackgroundManager;
    assets: GameSounds | null;
    config: level.Config | null;

    switchScreen(screen: Screen): void;
  }
}
