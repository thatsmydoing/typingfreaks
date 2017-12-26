/// <reference path="level.ts" />
/// <reference path="audio.ts" />
/// <reference path="display.ts" />

namespace game {
  enum GameState {
    LOADING,
    SELECT,
    PLAYING
  }

  export class GameController {
    container: HTMLElement;
    configUrl: string;
    config: level.Config | null;
    audioManager: audio.AudioManager;

    constructor(container: HTMLElement, configUrl: string) {
      this.container = container;
      this.configUrl = configUrl;
      this.audioManager = new audio.AudioManager();
    }

    stateLoading(): void {
      let configPromise;
      if (this.configUrl.endsWith('.json')) {
        configPromise = level.loadFromJson(this.configUrl);
      } else {
        configPromise = level.loadFromTM(this.configUrl);
      }
      configPromise.then(config => {
        this.onConfigLoad(config);
      })
    }

    onConfigLoad(config: level.Config): void {
      this.config = config;
      let background = config.background;
      if (background.indexOf('.') >= 0) {
        background = `url(${background}), black`;
      }
      this.container.style.background = background;
      this.container.style.setProperty('--base-color', config.baseColor);
      this.container.style.setProperty('--highlight-color', config.highlightColor);
      this.container.querySelector('#loading').style.opacity = 0;

      let controller = new display.LevelController(this.audioManager, this.config.levelSets[0].levels[0]);
      container.appendChild(controller.element);
    }
  }
}
