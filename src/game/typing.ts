import * as audio from '../audio';
import * as display from '../display';
import * as level from '../level';
import * as kana from '../kana';
import * as util from '../util';
import * as youtube from '../youtube';

import { GameContext, Screen, ScreenManager } from './common';

import Level = level.Level;

class TypingScreenContext {
  track: audio.Track | null = null;

  constructor(
    readonly context: GameContext,
    readonly level: Level,
    readonly switchClosure: (screen: Screen | null) => void
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

  switchScreen(screen: Screen | null): void {
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
    if (this.level.background) {
      this.context.bgManager.setBackground(this.level.background);
    }
    let context = new TypingScreenContext(this.context, this.level, (screen) =>
      this.switchScreen(screen)
    );
    let loadingScreen = new TypingLoadingScreen(context);
    this.switchScreen(loadingScreen);
  }

  handleInput(key: string): void {
    if (this.activeScreen !== null) {
      this.activeScreen.handleInput(key);
    }
  }

  switchScreen(screen: Screen | null): void {
    super.switchScreen(screen);
    if (screen == null) {
      this.context.switchScreen(this.prevScreen);
    }
  }

  exit(): void {}

  transitionExit(): void {}
}

class TypingLoadingScreen implements Screen {
  readonly name: string = 'game-loading';
  barElement: HTMLElement | null = null;
  textElement: HTMLElement | null = null;
  readyElement: HTMLElement | null = null;
  isReady: boolean = false;
  fnContext: util.FnContext = new util.FnContext();

  constructor(readonly context: TypingScreenContext) {}

  enter(): void {
    let loader: HTMLElement = util.getElement(
      this.context.container,
      '#loader'
    );
    this.readyElement = util.getElement(this.context.container, '#ready');
    if (this.context.level.audio != null) {
      loader.style.visibility = 'visible';
      this.barElement = util.getElement(loader, '.progress-bar .shade');
      this.textElement = util.getElement(loader, '.label');

      this.barElement.style.width = '0%';
      this.textElement.textContent = 'music loading';
      this.readyElement.querySelector('.status')!.textContent = 'Loading';
      this.readyElement.querySelector('.message')!.textContent = 'please wait';

      this.fnContext.invalidate();

      const videoId = youtube.getVideoId(this.context.level.audio);
      const progressListener = this.fnContext.wrap((percentage: number) => {
        this.barElement!.style.width = `${percentage}%`;
      });
      let trackPromise: Promise<audio.Track>;
      if (videoId !== null) {
        const ytElement = document.createElement('div');
        trackPromise = this.context.audioManager.loadTrackFromYoutube(
          videoId,
          ytElement,
          progressListener
        );
        this.context.bgManager.setVideo(ytElement);
        if (this.context.level.background == undefined) {
          trackPromise.then((track) => {
            track.addListener((_, state) => {
              if (state === audio.PlayState.PLAYING) {
                this.context.bgManager.showVideo();
              }
            });
          });
        }
      } else {
        trackPromise = this.context.audioManager.loadTrackWithProgress(
          this.context.level.audio,
          progressListener
        );
      }
      trackPromise.then(
        this.fnContext.wrap((track: audio.Track) => {
          this.context.track = track;
          this.barElement!.style.width = '100%';
          this.textElement!.textContent = 'music loaded';
          this.setReady();
        })
      );
    } else {
      loader.style.visibility = 'hidden';
      this.setReady();
    }
  }

  setReady(): void {
    this.readyElement!.querySelector('.status')!.textContent = 'Ready';
    this.readyElement!.querySelector('.message')!.textContent =
      'press space to start';
    this.isReady = true;
  }

  handleInput(key: string): void {
    if (key === 'Escape' || key === 'Backspace') {
      this.context.switchScreen(null);
    } else if (this.isReady && (key === ' ' || key === 'Enter')) {
      this.context.switchScreen(new TypingPlayingScreen(this.context));
    }
  }

  exit(): void {
    this.fnContext.invalidate();
  }

  transitionExit(): void {
    if (this.barElement) {
      this.barElement.style.width = '0%';
    }
  }
}

class TypingPlayingScreen implements Screen {
  readonly name: string = 'game-playing';
  gameContainer: HTMLElement;
  currentIndex: number;
  inputState: kana.KanaInputState | null;
  isWaiting: boolean;
  skippable: boolean;
  kanjiElement: HTMLElement;
  kanaController: display.KanaDisplayController;
  romajiController: display.RomajiDisplayController;
  progressController: display.TrackProgressController | null;
  scoreController: display.ScoreController;
  lines: level.Line[];

  constructor(readonly context: TypingScreenContext) {
    this.gameContainer = util.getElement(this.context.container, '#game');
    this.currentIndex = -1;
    this.inputState = null;
    this.isWaiting = false;
    this.skippable = false;
    this.kanjiElement = util.getElement(this.gameContainer, '.kanji-line');
    this.romajiController = new display.RomajiDisplayController(
      util.getElement(this.gameContainer, '.romaji-first'),
      util.getElement(this.gameContainer, '.romaji-line')
    );
    this.kanaController = new display.KanaDisplayController(
      util.getElement(this.gameContainer, '.kana-line')
    );
    this.progressController = null;
    this.scoreController = new display.ScoreController(
      util.getElement(this.gameContainer, '.score-line'),
      util.getElement(this.gameContainer, '.stats-line')
    );
    this.lines = this.context.level.lines;
  }

  enter(): void {
    let progressElement: HTMLElement = this.gameContainer.querySelector<HTMLElement>(
      '.track-progress'
    )!;
    if (this.context.track == null) {
      progressElement.style.visibility = 'hidden';
      this.lines = this.context.level.lines.filter((line) => line.kana != '@');
    } else {
      progressElement.style.visibility = 'visible';
      const progressController = new display.TrackProgressController(
        progressElement,
        this.lines
      );
      progressController.setListener((_) => this.onIntervalEnd());
      this.context.track.addListener((track, state) => {
        if (state === audio.PlayState.PLAYING) {
          progressController.start(track.getTime());
        } else {
          progressController.pause();
        }
      });
      this.progressController = progressController;
    }
    this.onStart();
  }

  get currentLine() {
    return this.lines[this.currentIndex];
  }

  setWaiting(waiting: boolean, skippable: boolean = false): void {
    this.isWaiting = waiting;
    this.skippable = waiting && skippable;
    this.gameContainer.classList.toggle('waiting', this.isWaiting);
    this.gameContainer.classList.toggle('skippable', this.skippable);
  }

  onStart(): void {
    this.nextLine();
    if (this.context.track !== null) {
      this.context.track.start(0);
    }

    this.setWaiting(false);
    this.checkComplete();
  }

  checkComplete(): void {
    let currentLine = this.currentLine;
    if (
      currentLine != null &&
      currentLine.kana == '@' &&
      currentLine.kanji == '@'
    ) {
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
    if (this.currentIndex >= this.lines.length) {
      this.finish();
    }
    this.checkComplete();
  }

  onComplete(autoComplete: boolean = false): void {
    this.nextLine();
    if (!autoComplete) {
      this.scoreController.intervalEnd(true);
    }
    if (this.context.track !== null) {
      // skippable if the last line was empty and the current line is longer
      // than 3 seconds
      const lastLine = this.lines[this.currentIndex - 1];
      const skippable =
        autoComplete &&
        lastLine !== undefined &&
        lastLine.end! - lastLine.start! > 3 &&
        this.currentIndex < this.lines.length - 1;
      this.setWaiting(true, skippable);
    } else {
      if (this.currentIndex >= this.lines.length) {
        this.finish();
      }
    }
  }

  handleInput(key: string): void {
    if (key === 'Escape' || key === 'Backspace') {
      this.finish();
      return;
    } else if (!this.isWaiting) {
      if (this.inputState !== null && /^[-_ a-z]$/.test(key)) {
        if (this.inputState.handleInput(key)) {
          this.onComplete();
        }
      }
    } else if (this.skippable && key === 'Tab' && this.context.track !== null) {
      const start = this.currentLine.start!;
      if (start - this.context.track.getTime() > 3) {
        this.context.track.start(start - 1.5);
      }
    }
  }

  nextLine(): void {
    if (this.currentIndex < this.lines.length) {
      this.currentIndex += 1;
    }
    if (this.currentIndex < this.lines.length) {
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

  finish(): void {
    this.context.switchScreen(
      new TypingFinishScreen(this.context, this.scoreController.score)
    );
  }

  exit(): void {}

  transitionExit(): void {
    this.gameContainer.classList.remove('skippable');
    this.kanaController.destroy();
    this.romajiController.destroy();
    if (this.context.track !== null) {
      this.progressController!.destroy();
      this.context.track.clearListeners();
    }
    this.scoreController.destroy();
  }
}

class TypingFinishScreen implements Screen {
  name: string = 'game-finished';

  constructor(
    readonly context: TypingScreenContext,
    readonly score: display.Score
  ) {
    let container = this.context.container.querySelector('#score')!;
    container.querySelector('.score')!.textContent = this.score.score + '';
    container.querySelector('.max-combo')!.textContent =
      this.score.maxCombo + '';
    container.querySelector('.finished')!.textContent =
      this.score.finished + '';
    container.querySelector('.hit')!.textContent = this.score.hit + '';
    container.querySelector('.missed')!.textContent = this.score.missed + '';
    container.querySelector('.skipped')!.textContent = this.score.skipped + '';
  }

  enter(): void {}

  handleInput(key: string): void {
    if (
      key === ' ' ||
      key === 'Enter' ||
      key === 'Escape' ||
      key === 'Backspace'
    ) {
      this.context.switchScreen(null);
    }
  }

  exit(): void {}

  transitionExit(): void {
    if (this.context.track !== null) {
      this.context.track.exit();
    }
  }
}
