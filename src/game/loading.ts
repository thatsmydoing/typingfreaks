import * as audio from '../audio';
import * as level from '../level';
import * as util from '../util';
import { GameContext, Screen } from './common';
import { SelectScreen } from './select';

export class LoadingScreen implements Screen {
  readonly name: string = 'loading';

  constructor(
    private context: GameContext,
    private configUrl: string,
    private fromEditor: boolean
  ) {}

  enter(): void {
    console.log('Loading assets...');
    let configPromise: Promise<level.Config>;
    if (this.configUrl.endsWith('.json')) {
      configPromise = level.loadFromJson(this.configUrl);
    } else {
      configPromise = level.loadFromTM(this.configUrl);
    }
    let editorConfigPromise: Promise<level.Config | null>;
    if (this.fromEditor) {
      editorConfigPromise = level.loadFromLocalStorage();
    } else {
      editorConfigPromise = Promise.resolve(null);
    }

    Promise.all([configPromise, editorConfigPromise]).then(
      ([config, editorConfig]) => {
        if (editorConfig !== null) {
          console.log('Using editor levels');
          const [result, context] = util.deepEqual(config, editorConfig);
          if (!result) {
            console.log(`Editor levels differ: ${context}`);
          }
          this.context.config = editorConfig;
        } else {
          this.context.config = config;
        }
        this.loadAssets();
      }
    );
  }

  loadAssets(): void {
    let config = this.context.config!;

    Promise.all([
      util.loadBackground(config.background),
      this.loadTrack(config.selectSound),
      this.loadTrack(config.decideSound),
    ]).then((v) => {
      console.log('Loaded assets.');
      let [background, selectSound, decideSound] = v;
      this.context.assets = {
        selectSound,
        decideSound,
      };
      this.finishLoading();
    });
  }

  finishLoading(): void {
    let loadingElement: HTMLElement = util.getElement(
      this.context.container,
      '#loading'
    );
    loadingElement.addEventListener('transitionend', (event) => {
      loadingElement.style.display = 'none';
      this.switchToSelect();
    });
    loadingElement.classList.add('finished');
  }

  loadTrack(url: string): Promise<audio.FileTrack | null> {
    if (url == null) {
      return Promise.resolve(null);
    } else {
      return this.context.audioManager.loadTrack(url);
    }
  }

  switchToSelect(): void {
    let selectScreen = new SelectScreen(this.context);
    this.context.switchScreen(selectScreen);
  }

  handleInput(key: string): void {}

  exit(): void {
    let config = this.context.config!;
    let containerStyle = this.context.container.style;
    containerStyle.setProperty('--base-color', config.baseColor);
    containerStyle.setProperty('--highlight-color', config.highlightColor);
    containerStyle.setProperty('--contrast-color', config.contrastColor);
  }

  transitionExit(): void {}
}
