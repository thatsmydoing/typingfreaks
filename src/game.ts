import * as audio from './audio';
import * as background from './background';
import * as util from './util';
import * as polyfill from './polyfill';

import { GameContext, Screen, ScreenManager } from './game/common';
import { LoadingScreen } from './game/loading';

export class MainController extends ScreenManager {
  loadingScreen: Screen;

  constructor(container: HTMLElement, configUrl: string) {
    super(container);
    container.appendChild(util.loadTemplate(container, 'base'));

    let self = this;
    let bgLayer: HTMLElement = util.getElement(container, '#background');
    let gameContext: GameContext = {
      container: container,
      audioManager: new audio.AudioManager(),
      bgManager: new background.BackgroundManager(bgLayer),
      loadTemplate: (id: string) => util.loadTemplate(container, id),
      assets: null,
      config: null,
      switchScreen(screen: Screen): void {
        self.switchScreen(screen);
      },
    };

    this.loadingScreen = new LoadingScreen(gameContext, configUrl);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Tab') {
        // prevent losing focus
        event.preventDefault();
      }
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
  }
}
