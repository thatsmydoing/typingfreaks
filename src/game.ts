/// <reference path="level.ts" />
/// <reference path="audio.ts" />
/// <reference path="display.ts" />
/// <reference path="background.ts" />
/// <reference path="select.ts" />

namespace game {
  enum GameState {
    LOADING,
    SELECT,
    PLAYING
  }

  interface GameSounds {
    selectSound: audio.Track,
    decideSound: audio.Track
  }

  class LoadingScreen {
    controller: MainController;

    constructor(controller: MainController) {
      this.controller = controller;
    }

    load(): void {
      console.log('Loading assets...');
      let configUrl = this.controller.configUrl;
      let configPromise;
      if (configUrl.endsWith('.json')) {
        configPromise = level.loadFromJson(configUrl);
      } else {
        configPromise = level.loadFromTM(configUrl);
      }
      configPromise.then(config => {
        this.controller.config = config;
        this.loadAssets();
      })
    }

    loadAssets(): void {
      let config = this.controller.config;

      Promise.all([
        this.loadImage(config.background),
        this.loadTrack(config.selectSound),
        this.loadTrack(config.decideSound)
      ]).then(v => {
        console.log('Loaded assets.');
        let [background, selectSound, decideSound] = v;
        this.controller.assets = {
          selectSound,
          decideSound
        }
        this.finishLoading();
      })
    }

    finishLoading(): void {
      this.controller.bgManager.setBackground(this.controller.config.background);
      let loadingElement = this.controller.container.querySelector('#loading');
      loadingElement.addEventListener('transitionend', (event) => this.controller.onConfigLoad());
      loadingElement.classList.add('finished');
    }

    loadTrack(url: string): Promise<audio.Track> {
      if (url == null) {
        return Promise.resolve(null);
      } else {
        return this.controller.audioManager.loadTrack(url);
      }
    }

    loadImage(url: string): Promise<void> {
      if (url.includes('.')) {
        return new Promise((resolve, reject) => {
          let image = new Image();
          image.onload = (event) => resolve();
          image.src = url;
        });
      } else {
        return Promise.resolve();
      }
    }
  }

  export class MainController {
    container: HTMLElement;
    configUrl: string;
    config: level.Config | null;
    audioManager: audio.AudioManager;
    bgManager: background.BackgroundManager;
    assets: GameSounds | null;
    state: GameState;
    selectScreen: SelectScreen | null;
    gameController: display.LevelController | null;

    constructor(container: HTMLElement, configUrl: string) {
      this.container = container;
      this.configUrl = configUrl;
      this.audioManager = new audio.AudioManager();
      this.bgManager = new background.BackgroundManager(container.querySelector('#background'));
      this.state = GameState.LOADING;

      document.addEventListener('keydown', (event) => {
        if (!event.ctrlKey && !event.metaKey) {
          if (this.state === GameState.SELECT) {
            this.selectScreen.handleInput(event.key);
          } else if (this.state === GameState.PLAYING) {
            if (event.key === 'Escape') {
              this.onBackToSelect();
            } else {
              this.gameController.handleInput(event.key);
            }
          }
        }
      });
    }

    start(): void {
      this.container.classList.add('loading');
      let loadingScreen = new LoadingScreen(this);
      loadingScreen.load();
    }

    onConfigLoad(): void {
      let config = this.config;
      this.container.style.setProperty('--base-color', config.baseColor);
      this.container.style.setProperty('--highlight-color', config.highlightColor);

      this.selectScreen = new SelectScreen(this);
      this.container.classList.remove('loading');
      this.container.classList.add('select');
      this.state = GameState.SELECT;
    }

    onSongSelect(level: level.Level): void {
      this.container.classList.remove('select');
      this.container.classList.add('game');
      this.gameController = new display.LevelController(this.audioManager, level);
      let gameContainer = this.container.querySelector('#game');
      while (gameContainer.lastChild != null) {
        gameContainer.removeChild(gameContainer.lastChild);
      }
      gameContainer.appendChild(this.gameController.element);
      this.state = GameState.PLAYING;
    }

    onBackToSelect(): void {
      this.container.classList.remove('game');
      this.container.classList.add('select');
      this.gameController.destroy();
      this.state = GameState.SELECT;
    }
  }
}
