/// <reference path="../audio.ts" />
/// <reference path="../background.ts" />
/// <reference path="../level.ts" />

namespace game {
  export interface Screen {
    readonly name: string;
    handleInput(key: string): void;
    enter(): void;
    exit(): void;
  }

  export class ScreenManager {
    activeScreen: Screen | null = null;

    constructor(readonly container: HTMLElement) {}

    switchScreen(nextScreen: Screen): void {
      if (this.activeScreen != null) {
        this.container.classList.remove(this.activeScreen.name);
        this.activeScreen.exit();
      }
      this.activeScreen = nextScreen;
      if (nextScreen != null) {
        this.activeScreen.enter();
        this.container.classList.add(this.activeScreen.name);
      }
    }
  }

  interface GameSounds {
    selectSound: audio.Track,
    decideSound: audio.Track
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
