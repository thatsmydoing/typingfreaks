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

  class SingleKanaDisplayComponent {
    element: HTMLElement;
    finished: boolean;

    constructor(kana: string) {
      this.element = document.createElement('span');
      this.element.classList.add('kana');
      this.element.textContent = kana;
      this.element.setAttribute('data-text', kana);
      this.finished = false;
    }

    setPartial() {
      if (!this.finished) {
        this.element.classList.add('half');
      }
    }

    setFull() {
      this.finished = true;
      this.element.classList.remove('half');
      this.element.classList.add('full');
    }
  }

  class KanaMachineController {
    state: state.StateMachine;
    children: SingleKanaDisplayComponent[];
    current: number;

    get elements() {
      return this.children.map(kanaComponent => kanaComponent.element);
    }

    constructor(kana: string, state: state.StateMachine) {
      this.state = state;
      this.current = 0;
      this.state.addObserver(this.observer);
      this.children = kana.split('').map(c => new SingleKanaDisplayComponent(c));
    }

    observer: state.Observer = (result, boundary) => {
      if (boundary) {
        this.children[this.current].setFull();
        this.current += 1;
      } else if (result != TransitionResult.FAILED) {
        this.children[this.current].setPartial();
      }
    }

    destroy(): void {
      this.state.removeObserver(this.observer);
    }
  }

  export class KanaDisplayController {
    children: KanaMachineController[];

    constructor(readonly element: HTMLElement) {
      this.children = [];
    }

    setInputState(inputState: InputState | null) {
      this.clearChildren();
      if (inputState == null) {
        this.children = [];
      } else {
        this.children = inputState.map((kana, machine) => {
          return new KanaMachineController(kana, machine);
        });
        this.children.forEach(child => {
          child.elements.forEach(kanaElement => {
            this.element.appendChild(kanaElement);
          });
        });
      }
    }

    private clearChildren(): void {
      this.children.forEach(child => {
        child.elements.forEach(kanaElement => {
          this.element.removeChild(kanaElement);
        });
        child.destroy();
      });
    }

    destroy(): void {
      this.clearChildren();
    }
  }

  export class RomajiDisplayController {
    inputState: InputState | null;

    constructor(
      readonly firstElement: HTMLElement,
      readonly restElement: HTMLElement
    ) {
      this.inputState = null;
    }

    setInputState(inputState: InputState | null) {
      this.clearObservers();
      this.inputState = inputState;
      if (this.inputState != null) {
        this.inputState.map((_, machine) => {
          machine.addObserver(this.observer);
        });
        this.observer(TransitionResult.SUCCESS, false);
      } else {
        this.firstElement.textContent = '';
        this.restElement.textContent = '';
      }
    }

    private clearObservers(): void {
      if (this.inputState != null) {
        this.inputState.map((_, machine) => {
          machine.removeObserver(this.observer);
        });
      }
    }

    observer: state.Observer = (result) => {
      if (result === TransitionResult.FAILED) {
        this.firstElement.classList.remove('error');
        this.firstElement.offsetHeight; // trigger reflow
        this.firstElement.classList.add('error');
      } else if (this.inputState !== null) {
        let remaining = this.inputState.getRemainingInput();
        this.firstElement.textContent = remaining.charAt(0);
        this.restElement.textContent = remaining.substring(1);
      } else {
        this.firstElement.textContent = '';
        this.restElement.textContent = '';
      }
    }

    destroy(): void {
      this.clearObservers();
    }
  }

  export class TrackProgressController {
    totalBar: HTMLElement;
    intervalBar: HTMLElement;
    listener: ((event: AnimationEvent) => void) | null;

    constructor(private element: HTMLElement, lines: level.Line[]) {
      this.totalBar = util.getElement(element, '.total .shade');
      this.intervalBar = util.getElement(element, '.interval .shade');
      this.listener = null;

      let totalDuration = lines[lines.length - 1].end;
      this.totalBar.style.animationName = 'progress';
      this.totalBar.style.animationDuration = totalDuration + 's';

      let names = lines.map(line => 'progress').join(',');
      let delays = lines.map(line => line.start + 's').join(',');
      let durations = lines.map(line => (line.end! - line.start!) + 's').join(',');
      this.intervalBar.style.animationName = names;
      this.intervalBar.style.animationDelay = delays;
      this.intervalBar.style.animationDuration = durations;
    }

    start(): void {
      this.intervalBar.style.width = '100%';
      this.totalBar.style.width = '100%';

      this.intervalBar.style.animationPlayState = 'running';
      this.totalBar.style.animationPlayState = 'running';
    }

    setListener(func: (event: AnimationEvent) => void): void {
      if (this.listener) {
        this.intervalBar.removeEventListener('animationend', func);
      }
      this.intervalBar.addEventListener('animationend', func);
      this.listener = func;
    }

    destroy(): void {
      if (this.listener) {
        this.intervalBar.removeEventListener('animationend', this.listener);
      }
      this.intervalBar.style.animationName = '';
      this.totalBar.style.animationName = '';
    }
  }

  export class Score {
    combo: number = 0;
    score: number = 0;
    maxCombo: number = 0;
    finished: number = 0;
    hit: number = 0;
    missed: number = 0;
    skipped: number = 0;
    lastMissed: boolean = false;
    lastSkipped: boolean = false;

    intervalEnd(finished: boolean): void {
      if (finished) {
        this.finished += 1;
      } else {
        this.combo = 0;
      }
    }

    update(result: TransitionResult, boundary: boolean): void {
      if (result === TransitionResult.FAILED) {
        this.missed += 1;
        this.lastMissed = true;
        this.combo = 0;
      } else if (result === TransitionResult.SKIPPED) {
        this.skipped += 1;
        this.lastSkipped = true;
        this.combo = 0;
      }

      if (boundary) {
        if (this.lastSkipped) {
          // no points if we've skipped
          this.lastSkipped = false;
          return;
        } else if (this.lastMissed) {
          this.hit += 1;
          this.score += 50;
          this.lastMissed = false;
        } else {
          this.hit += 1;
          this.score += 100 + this.combo;
        }
        this.combo += 1;
      }

      if (this.combo > this.maxCombo) {
        this.maxCombo = this.combo;
      }
    }
  }

  export class ScoreController {
    comboElement: HTMLElement;
    scoreElement: HTMLElement;
    maxComboElement: HTMLElement;
    finishedElement: HTMLElement;
    hitElement: HTMLElement;
    missedElement: HTMLElement;
    skippedElement: HTMLElement;

    inputState: InputState | null = null;
    score: Score;

    constructor(
      private scoreContainer: HTMLElement,
      private statsContainer: HTMLElement
    ) {
      this.comboElement = util.getElement(scoreContainer, '.combo');
      this.scoreElement = util.getElement(scoreContainer, '.score');
      this.maxComboElement = util.getElement(scoreContainer, '.max-combo');
      this.finishedElement = util.getElement(scoreContainer, '.finished');
      this.hitElement = util.getElement(statsContainer, '.hit');
      this.missedElement = util.getElement(statsContainer, '.missed');
      this.skippedElement = util.getElement(statsContainer, '.skipped');
      this.score = new Score();
      this.setValues();
    }

    setInputState(inputState: InputState | null): void {
      this.clearObservers();
      this.inputState = inputState;
      if (this.inputState != null) {
        this.inputState.map((_, m) => {
          m.addObserver(this.observer);
        });
      }
    }

    intervalEnd(finished: boolean): void {
      this.score.intervalEnd(finished);
      this.setValues();
    }

    observer: state.Observer = (result, boundary) => {
      this.score.update(result, boundary);
      this.setValues();
    }

    setValues(): void {
      this.comboElement.textContent = this.score.combo == 0 ? '' : this.score.combo+' combo';
      this.scoreElement.textContent = this.score.score+'';
      this.maxComboElement.textContent = this.score.maxCombo+'';
      this.finishedElement.textContent = this.score.finished+'';
      this.hitElement.textContent = this.score.hit+'';
      this.missedElement.textContent = this.score.missed+'';
      this.skippedElement.textContent = this.score.skipped+'';
    }

    private clearObservers(): void {
      if (this.inputState != null) {
        this.inputState.map((_, machine) => {
          machine.removeObserver(this.observer);
        });
      }
    }

    destroy(): void {
      this.clearObservers();
    }
  }
}
