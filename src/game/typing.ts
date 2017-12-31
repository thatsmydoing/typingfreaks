/// <reference path="../audio.ts" />
/// <reference path="../kana.ts" />
/// <reference path="../level.ts" />
/// <reference path="../display.ts" />
/// <reference path="common.ts" />

namespace game {
  import Level = level.Level;

  class TypingScreenContext {
    track: audio.Track | null = null;

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

    transitionExit(): void {}
  }

  class TypingLoadingScreen implements Screen {
    readonly name: string = 'game-loading';
    barElement: HTMLElement;
    textElement: HTMLElement;
    readyElement: HTMLElement;
    isReady: boolean = false;

    constructor(readonly context: TypingScreenContext) {}

    enter(): void {
      let loader: HTMLElement = this.context.container.querySelector('#loader');
      this.readyElement = this.context.container.querySelector('#ready');
      if (this.context.level.audio != null) {
        loader.style.visibility = 'visible';
        this.barElement = loader.querySelector('.progress-bar .shade');
        this.textElement = loader.querySelector('.label');

        this.barElement.style.width = '0%';
        this.textElement.textContent = 'music loading';
        this.readyElement.querySelector('.status').textContent = 'Loading';
        this.readyElement.querySelector('.message').textContent = 'please wait';

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
          this.setReady();
        });

      } else {
        loader.style.visibility = 'hidden';
        this.setReady();
      }
    }

    setReady(): void {
      this.readyElement.querySelector('.status').textContent = 'Ready';
      this.readyElement.querySelector('.message').textContent = 'press space to start';
      this.isReady = true;
    }

    handleInput(key: string): void {
      if (this.isReady && key === ' ') {
        this.context.switchScreen(new TypingPlayingScreen(this.context));
      }
    }

    exit(): void {}

    transitionExit(): void {
      this.barElement.style.width = '0%';
    }
  }

  class TypingPlayingScreen implements Screen {
    readonly name: string = 'game-playing';
    gameContainer: HTMLElement;
    currentIndex: number;
    inputState: kana.KanaInputState | null;
    isWaiting: boolean;
    kanjiElement: HTMLElement;
    kanaController: display.KanaDisplayController;
    romajiController: display.RomajiDisplayController;
    progressController: display.TrackProgressController | null;
    scoreController: display.ScoreController;
    lines: level.Line[];

    constructor(readonly context: TypingScreenContext) {
      this.gameContainer = this.context.container.querySelector('#game');
      this.currentIndex = -1;
      this.inputState = null;
      this.kanjiElement = this.gameContainer.querySelector('.kanji-line');
      this.romajiController = new display.RomajiDisplayController(
        this.gameContainer.querySelector('.romaji-first'),
        this.gameContainer.querySelector('.romaji-line')
      );
      this.kanaController = new display.KanaDisplayController(
        this.gameContainer.querySelector('.kana-line')
      );
      this.progressController = null;
      this.scoreController = new display.ScoreController(
        this.gameContainer.querySelector('.score-line'),
        this.gameContainer.querySelector('.stats-line')
      );
      this.lines = this.context.level.lines;
    }

    enter(): void {
      let progressElement: HTMLElement = this.gameContainer.querySelector('.track-progress');
      if (this.context.level.audio == null) {
        progressElement.style.visibility = 'hidden';
        this.lines = this.context.level.lines.filter(line => line.kana != "@");
      } else {
        progressElement.style.visibility = 'visible';
        this.progressController = new display.TrackProgressController(
          progressElement,
          this.lines
        );
        this.progressController.setListener(event => this.onIntervalEnd());
      }
      this.onStart();
    }

    setWaiting(waiting: boolean): void {
      this.gameContainer.classList.toggle('waiting', waiting);
      this.isWaiting = waiting;
    }

    onStart(): void {
      this.nextLine();
      if (this.context.track !== null) {
        this.progressController.start();
        this.context.track.play();
      }

      this.setWaiting(false);
      this.checkComplete();
    }

    checkComplete(): void {
      let currentLine = this.lines[this.currentIndex];
      if (currentLine.kana == '@' && currentLine.kanji == '@') {
        this.onComplete(true);
      }
    }

    onIntervalEnd(): void {
      if (this.isWaiting) {
        this.setWaiting(false);
      } else {
        this.nextLine();
        this.scoreController.intervalEnd(false);
      }
      this.checkComplete();
    }

    onComplete(autoComplete: boolean = false): void {
      this.nextLine();
      if (!autoComplete) {
        this.scoreController.intervalEnd(true);
      }
      if (this.context.track !== null) {
        this.setWaiting(true);
      }
    }

    handleInput(key: string): void {
      if (!this.isWaiting) {
        if (this.inputState !== null && /^[-_ a-z]$/.test(key)) {
          if (this.inputState.handleInput(key)) {
            this.onComplete();
          }
        }
      }
    }

    nextLine(): void {
      if (this.currentIndex + 1 < this.lines.length) {
        this.currentIndex += 1;
        this.setLine(this.lines[this.currentIndex]);
      } else {
        this.setLine({ kanji: '@', kana: '@' });
      }
    }

    setLine(line: level.Line): void {
      let kanji, inputState;
      if (line.kanji === '@') {
        kanji = '';
      } else {
        kanji = line.kanji;
      }

      if (line.kana === '@') {
        inputState = null;
      } else {
        inputState = new kana.KanaInputState(line.kana);
      }

      this.inputState = inputState;
      this.kanjiElement.textContent = kanji;
      this.kanaController.setInputState(this.inputState);
      this.romajiController.setInputState(this.inputState);
      this.scoreController.setInputState(this.inputState);
    }

    exit(): void {
      if (this.context.track !== null) {
        this.context.track.stop();
      }
    }

    transitionExit(): void {
      if (this.context.track !== null) {
        this.kanaController.destroy();
        this.romajiController.destroy();
        this.progressController.destroy();
      }
      this.scoreController.destroy();
    }
  }
}
