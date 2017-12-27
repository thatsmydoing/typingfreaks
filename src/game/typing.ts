/// <reference path="../audio.ts" />
/// <reference path="../level.ts" />
/// <reference path="../display.ts" />
/// <reference path="common.ts" />

namespace game {
  import Level = level.Level;

  class TypingScreenContext {
    track: audio.Track | null;

    constructor(
      readonly context: GameContext,
      readonly level: Level,
      readonly switchClosure: (screen: Screen) => void
    ) {}

    get container() {
      return this.context.container;
    }

    get audioManager() {
      return this.context.audioManager;
    }

    get bgManager() {
      return this.context.bgManager;
    }

    switchScreen(screen: Screen): void {
      this.switchClosure(screen);
    }
  }

  export class TypingScreen extends ScreenManager implements Screen {
    readonly name: string = 'game';

    constructor(
      readonly context: GameContext,
      readonly level: Level,
      readonly prevScreen: Screen
    ) {
      super(context.container);
    }

    enter(): void {
      let context = new TypingScreenContext(this.context, this.level, (screen) => this.switchScreen(screen));
      let loadingScreen = new TypingLoadingScreen(context);
      this.switchScreen(loadingScreen);
    }

    handleInput(key: string): void {
      if (key === 'Escape') {
        this.returnToSelect();
      } else {
        this.activeScreen.handleInput(key);
      }
    }

    returnToSelect(): void {
      this.context.switchScreen(this.prevScreen);
    }

    exit(): void {
      this.switchScreen(null);
    }
  }

  class TypingLoadingScreen implements Screen {
    readonly name: string = 'game-loading';
    barElement: HTMLElement;
    textElement: HTMLElement;
    isReady: boolean = false;

    constructor(readonly context: TypingScreenContext) {}

    enter(): void {
      if (this.context.level.audio != null) {
        let loader = this.context.container.querySelector('#loader');

        if (loader.firstChild == null) {
          let progressBar = util.loadTemplate('progress-bar');
          this.barElement = progressBar.querySelector('.shade');
          this.textElement = document.createElement('span');
          loader.appendChild(progressBar);
          loader.appendChild(this.textElement);
        } else {
          this.barElement = loader.querySelector('.shade');
          this.textElement = loader.querySelector('span');
        }
        this.barElement.style.width = '0%';
        this.textElement.textContent = 'music loading';

        this.context.audioManager.loadTrackWithProgress(
          this.context.level.audio,
          (event: ProgressEvent) => {
            if (event.lengthComputable) {
              // only up to 80 to factor in decoding time
              let percentage = event.loaded / event.total * 80;
              this.barElement.style.width = `${percentage}%`;
            }
          }
        ).then(track => {
          this.context.track = track;
          this.barElement.style.width = '100%';
          this.textElement.textContent = 'music loaded';
          this.isReady = true;
        });

      } else {
        this.isReady = true;
      }
    }

    handleInput(key: string): void {
      if (this.isReady && key === ' ') {
        this.context.switchScreen(new TypingPlayingScreen(this.context));
      }
    }

    exit(): void {}
  }

  class TypingPlayingScreen implements Screen {
    readonly name: string = 'game-playing';
    gameController: display.LevelController;

    constructor(readonly context: TypingScreenContext) {}

    enter(): void {
      let gameContainer = this.context.container.querySelector('#game');
      util.clearChildren(gameContainer);
      this.gameController = new display.LevelController(this.context.level, this.context.track);
      gameContainer.appendChild(this.gameController.element);
      this.gameController.onStart();
    }

    handleInput(key: string): void {
      this.gameController.handleInput(key);
    }

    exit(): void {
      this.gameController.destroy();
    }
  }
}
