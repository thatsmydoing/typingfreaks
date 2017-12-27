/// <reference path="select.ts" />
/// <reference path="../game.ts" />

namespace game {
  export class LoadingScreen implements Screen {
    readonly name: string = 'loading';

    constructor(private controller: MainController) {}

    enter(): void {
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
      loadingElement.addEventListener('transitionend', (event) => this.switchToSelect());
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

    switchToSelect(): void {
      let selectScreen = new SelectScreen(this.controller);
      this.controller.switchScreen(selectScreen);
    }

    handleInput(key: string): void {}

    exit(): void {
      let config = this.controller.config;
      let containerStyle = this.controller.container.style;
      containerStyle.setProperty('--base-color', config.baseColor);
      containerStyle.setProperty('--highlight-color', config.highlightColor);
    }
  }
}
