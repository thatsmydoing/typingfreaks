/*
 * This module handles displaying the UI. The most important one is the main
 * area which contains the text to be typed in. Progress is displayed on the
 * kana part of the area, while errors are shown via the romaji section. The
 * kanji is simply just for reading.
 */

/// <reference path="kana.ts" />
/// <reference path="state.ts" />
/// <reference path="util.ts" />

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

  export class KanaDisplayController implements Component {
    children: KanaDisplayComponent[];

    constructor(readonly element: HTMLElement) {
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

  export class RomajiDisplayController implements Component {
    children: KanaDisplayComponent[];

    constructor(readonly element: HTMLElement) {
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

  export class TrackProgressController {
    totalBar: HTMLElement;
    intervalBar: HTMLElement;

    constructor(private element: HTMLElement, lines: level.Line[]) {
      if (element.firstChild === null) {
        this.totalBar = this.createBar();
        this.intervalBar = this.createBar();
      } else {
        this.totalBar = element.children[0].querySelector('.shade');
        this.intervalBar = element.children[1].querySelector('.shade');
      }

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
      let element = util.loadTemplate('progress-bar');
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

    destroy(): void {
      this.intervalBar.style.animationName = '';
      this.totalBar.style.animationName = '';
    }
  }
}
