/*
 * This module handles displaying the UI. The most important one is the main
 * area which contains the text to be typed in. Progress is displayed on the
 * kana part of the area, while errors are shown via the romaji section. The
 * kanji is simply just for reading.
 */

/// <reference path="kana.ts" />
/// <reference path="state.ts" />

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
      this.kanjiHTMLElement = document.createElement('p');

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

  export class LevelController implements Component {
    element: HTMLElement;
    level: level.Level;
    currentLine: number;
    inputState: InputState | null;
    mainAreaController: MainAreaController;
    listener: (event: KeyboardEvent) => void;

    constructor(level: level.Level) {
      this.element = document.createElement('div');
      this.level = level;
      this.currentLine = -1;
      this.inputState = null;
      this.mainAreaController = new MainAreaController();
      this.listener = event => this.handleInput(event.key);

      this.nextLine();

      document.addEventListener('keydown', this.listener);
      this.element.appendChild(this.mainAreaController.element);
    }

    handleInput(key: string): void {
      if (this.inputState !== null) {
        if (this.inputState.handleInput(key)) {
          this.nextLine();
        }
      } else {
        this.nextLine();
      }
    }

    nextLine(): void {
      if (this.currentLine + 1 < this.level.lines.length) {
        this.currentLine += 1;
        this.setLine(this.level.lines[this.currentLine]);
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
      document.removeEventListener('keydown', this.listener);
    }
  }
}
