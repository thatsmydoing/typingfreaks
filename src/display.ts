/*
 * This module handles displaying the UI. The most important one is the main
 * area which contains the text to be typed in. Progress is displayed on the
 * kana part of the area, while errors are shown via the romaji section. The
 * kanji is simply just for reading.
 */

/// <reference path="kana.ts" />
/// <reference path="state.ts" />
/// <reference path="audio.ts" />

namespace display {
  import InputState = kana.KanaInputState;
  import TransitionResult = state.TransitionResult;

  interface Component {
    element: HTMLElement;
    destroy(): void;
  }

  class KanaDisplayComponent implements Component {
    element: HTMLElement;
    state: state.StateMachine;
    observer: state.Observer;

    constructor(kana: string, state: state.StateMachine) {
      this.state = state;
      this.observer = result => this.rerender(result);
      this.state.addObserver(this.observer);
      this.element = document.createElement('span');
      this.element.classList.add('kana');
      this.element.textContent = kana;
      this.element.setAttribute('data-text', kana);
    }

    rerender(result: TransitionResult): void {
      switch (result) {
        case TransitionResult.SUCCESS:
          this.element.classList.add('half');
          break;
        case TransitionResult.FINISHED:
          this.element.classList.remove('half');
          this.element.classList.add('full');
          break;
      }
    }

    destroy(): void {
      this.state.removeObserver(this.observer);
    }
  }

  class KanaDisplayController implements Component {
    element: HTMLElement;
    children: KanaDisplayComponent[];

    constructor() {
      this.element = document.createElement('div');
      this.children = [];
    }

    setInputState(inputState: InputState) {
      this.clearChildren();
      if (inputState == null) {
        this.children = [];
      } else {
        this.children = inputState.map((kana, machine) => {
          return new KanaDisplayComponent(kana, machine);
        });
        this.children.forEach(child => this.element.appendChild(child.element));
      }
    }

    private clearChildren(): void {
      this.children.forEach(child => {
        this.element.removeChild(child.element);
        child.destroy();
      });
    }

    destroy(): void {
      this.clearChildren();
    }
  }

  class RomajiDisplayComponent implements Component {
    element: HTMLElement;
    state: state.StateMachine;
    observer: state.Observer;

    constructor(state: state.StateMachine) {
      this.state = state;
      this.observer = result => this.rerender(result);
      this.state.addObserver(this.observer);
      this.element = document.createElement('span');
      this.element.classList.add('romaji');
      this.element.textContent = this.state.getDisplay();
    }

    rerender(result: TransitionResult): void {
      switch (result) {
        case TransitionResult.FAILED:
          this.element.classList.remove('error');
          this.element.offsetHeight; // trigger reflow
          this.element.classList.add('error');
          break;
        case TransitionResult.SUCCESS:
        case TransitionResult.FINISHED:
          this.element.textContent = this.state.getDisplay();
          break;
      }
    }

    destroy(): void {
      this.state.removeObserver(this.observer);
    }
  }

  class RomajiDisplayController implements Component {
    element: HTMLElement;
    children: KanaDisplayComponent[];

    constructor() {
      this.element = document.createElement('div');
      this.children = [];
    }

    setInputState(inputState: InputState) {
      this.clearChildren();
      if (inputState == null) {
        this.children = [];
      } else {
        this.children = inputState.map((_, machine) => {
          return new RomajiDisplayComponent(machine);
        });
        this.children.forEach(child => this.element.appendChild(child.element));
      }
    }

    private clearChildren(): void {
      this.children.forEach(child => {
        child.destroy();
        this.element.removeChild(child.element);
      });
    }

    destroy(): void {
      this.clearChildren();
    }
  }

  class MainAreaController implements Component {
    element: HTMLElement;
    inputState: InputState | null;
    kanaController: KanaDisplayController;
    romajiController: RomajiDisplayController;
    kanjiHTMLElement: HTMLElement;

    constructor() {
      this.element = document.createElement('div');
      this.kanaController = new KanaDisplayController();
      this.romajiController = new RomajiDisplayController();
      this.kanjiHTMLElement = document.createElement('span');

      this.element.appendChild(this.kanaController.element);
      this.element.appendChild(this.kanjiHTMLElement);
      this.element.appendChild(this.romajiController.element);
    }

    setData(kanji: string, kana: InputState) {
      this.kanjiHTMLElement.textContent = kanji;
      this.kanaController.setInputState(kana);
      this.romajiController.setInputState(kana);
    }

    destroy(): void {
      this.kanaController.destroy();
      this.romajiController.destroy();
      this.element.removeChild(this.kanaController.element);
      this.element.removeChild(this.kanjiHTMLElement);
      this.element.removeChild(this.romajiController.element);
    }
  }

  enum LevelState {
    LOADING,
    READY,
    PLAYING,
    WAITING,
    FINISH
  }

  export class LevelController implements Component {
    element: HTMLElement;
    level: level.Level;
    currentIndex: number;
    inputState: InputState | null;
    mainAreaController: MainAreaController;
    progressController: TrackProgressController | null;
    state: LevelState;
    track: audio.Track | null;

    constructor(audioManager: audio.AudioManager, level: level.Level) {
      this.element = document.createElement('div');
      this.level = level;
      this.currentIndex = -1;
      this.inputState = null;
      this.mainAreaController = new MainAreaController();
      this.progressController = null;
      this.state = LevelState.LOADING;
      this.track = null;

      this.element.className = 'level-control';
      this.element.appendChild(this.mainAreaController.element);

      if (this.level.audio == null) {
        this.level.lines = this.level.lines.filter(line => line.kana != "@");
        this.onReady();
      } else {
        this.progressController = new TrackProgressController(this.level);
        this.element.insertBefore(
          this.progressController.element,
          this.mainAreaController.element
        );
        this.progressController.setListener(event => this.onIntervalEnd());
        audioManager.loadTrack(this.level.audio).then(track => {
          this.track = track;
          this.onReady();
        })
      }

    }

    onReady(): void {
      this.setState(LevelState.READY);
    }

    onStart(): void {
      this.nextLine();
      if (this.track !== null) {
        this.progressController.start();
        this.track.play();
      }

      this.setState(LevelState.PLAYING);
      this.checkComplete();
    }

    checkComplete(): void {
      let currentLine = this.level.lines[this.currentIndex];
      if (currentLine.kana == '@' && currentLine.kanji == '@') {
        this.onComplete();
      }
    }

    onIntervalEnd(): void {
      if (this.state === LevelState.WAITING) {
        this.setState(LevelState.PLAYING);
      } else if (this.state === LevelState.PLAYING) {
        this.nextLine();
      }
      this.checkComplete();
    }

    onComplete(): void {
      this.nextLine();
      if (this.track !== null) {
        this.setState(LevelState.WAITING);
      }
    }

    setState(state: LevelState): void {
      if (state === LevelState.WAITING) {
        this.element.classList.add('waiting');
      } else {
        this.element.classList.remove('waiting');
      }
      this.state = state;
    }

    handleInput(key: string): void {
      switch (this.state) {
        case LevelState.READY:
          if (key == ' ' || key == 'Enter') {
            this.onStart();
          }
          break;
        case LevelState.PLAYING:
          if (this.inputState !== null && /^[-_ a-z]$/.test(key)) {
            if (this.inputState.handleInput(key)) {
              this.onComplete();
            }
          }
          break;
      }
    }

    nextLine(): void {
      if (this.currentIndex + 1 < this.level.lines.length) {
        this.currentIndex += 1;
        this.setLine(this.level.lines[this.currentIndex]);
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
        inputState = new InputState(line.kana);
      }

      this.inputState = inputState;
      this.mainAreaController.setData(kanji, inputState);
    }

    destroy(): void {
      if (this.track != null) {
        this.track.stop();
      }
    }
  }

  class TrackProgressController implements Component {
    element: HTMLElement;
    totalBar: HTMLElement;
    intervalBar: HTMLElement;

    constructor(level: level.Level) {
      this.element = document.createElement('div');
      this.totalBar = this.createBar();
      this.intervalBar = this.createBar();

      let lines = level.lines;

      let totalDuration = lines[lines.length - 1].end;
      this.totalBar.style.animationName = 'progress';
      this.totalBar.style.animationDuration = totalDuration + 's';

      let names = lines.map(line => 'progress').join(',');
      let delays = lines.map(line => line.start + 's').join(',');
      let durations = lines.map(line => (line.end - line.start) + 's').join(',');
      this.intervalBar.style.animationName = names;
      this.intervalBar.style.animationDelay = delays;
      this.intervalBar.style.animationDuration = durations;
    }

    createBar(): HTMLElement {
      let template: HTMLTemplateElement = document.querySelector('#progress-bar-template');
      let element = document.importNode(template.content, true);
      let shade: HTMLElement = element.querySelector('.shade');
      this.element.appendChild(element);
      return shade;
    }

    start(): void {
      this.intervalBar.style.width = '100%';
      this.totalBar.style.width = '100%';

      this.intervalBar.style.animationPlayState = 'running';
      this.totalBar.style.animationPlayState = 'running';
    }

    setListener(func: (event: AnimationEvent) => void): void {
      this.intervalBar.addEventListener('animationend', func);
    }

    destroy(): void {}
  }
}
