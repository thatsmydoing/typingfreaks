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
        child.destroy();
        this.element.removeChild(child.element);
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

  export class MainAreaController implements Component{
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

      document.addEventListener('keydown', event => {
        if (this.inputState !== null) {
          this.inputState.handleInput(event.key);
        }
      });
    }

    setData(kanji: string, kana: string) {
      if (kanji === '@') {
        this.kanjiHTMLElement.textContent = '';
      } else {
        this.kanjiHTMLElement.textContent = kanji;
      }

      if (kana === '@') {
        this.inputState = null;
      } else {
        this.inputState = new InputState(kana);
      }
      this.kanaController.setInputState(this.inputState);
      this.romajiController.setInputState(this.inputState);
    }

    destroy(): void {
      this.kanaController.destroy();
      this.romajiController.destroy();
      this.element.removeChild(this.kanaController.element);
      this.element.removeChild(this.kanjiHTMLElement);
      this.element.removeChild(this.romajiController.element);
    }
  }
}
