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
    remove: () => void;

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
      if (result != TransitionResult.FAILED) {
        if (this.state.isFinished()) {
          this.element.classList.remove('half');
          this.element.classList.add('full');
        } else {
          this.element.classList.add('half');
        }
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

  export class RomajiDisplayController {
    observer: state.Observer;
    inputState: InputState | null;

    constructor(
      readonly firstElement: HTMLElement,
      readonly restElement: HTMLElement
    ) {
      this.observer = (result) => this.rerender(result);
    }

    setInputState(inputState: InputState) {
      this.clearObservers();
      this.inputState = inputState;
      if (this.inputState != null) {
        this.inputState.map((_, machine) => {
          machine.addObserver(this.observer);
        });
        this.rerender(TransitionResult.SUCCESS);
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

    rerender(result: TransitionResult): void {
      if (result === TransitionResult.FAILED) {
        this.firstElement.classList.remove('error');
        this.firstElement.offsetHeight; // trigger reflow
        this.firstElement.classList.add('error');
      } else {
        let remaining = this.inputState.getRemainingInput();
        this.firstElement.textContent = remaining.charAt(0);
        this.restElement.textContent = remaining.substring(1);
      }
    }

    destroy(): void {
      this.clearObservers();
    }
  }

  export class TrackProgressController {
    totalBar: HTMLElement;
    intervalBar: HTMLElement;
    listener: (event: AnimationEvent) => void;

    constructor(private element: HTMLElement, lines: level.Line[]) {
      this.totalBar = element.querySelector('.total .shade');
      this.intervalBar = element.querySelector('.interval .shade');

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

    intervalEnd(finished: boolean): void {
      if (finished) {
        this.finished += 1;
      } else {
        this.combo = 0;
      }
    }

    update(result: TransitionResult): void {
      switch (result) {
        case TransitionResult.SUCCESS:
          this.hit += 1;
          this.score += 100 + this.combo;
          this.combo += 1;
          break;
        case TransitionResult.FAILED:
          this.missed += 1;
          this.combo = 0;
          break;
        case TransitionResult.SKIPPED:
          this.skipped += 1;
          this.combo = 0;
          break;
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

    inputState: InputState | null;
    observer: state.Observer;
    score: Score;


    constructor(
      private scoreContainer: HTMLElement,
      private statsContainer: HTMLElement
    ) {
      this.comboElement = scoreContainer.querySelector('.combo');
      this.scoreElement = scoreContainer.querySelector('.score');
      this.maxComboElement = scoreContainer.querySelector('.max-combo');
      this.finishedElement = scoreContainer.querySelector('.finished');
      this.hitElement = statsContainer.querySelector('.hit');
      this.missedElement = statsContainer.querySelector('.missed');
      this.skippedElement = statsContainer.querySelector('.skipped');
      this.observer = result => this.update(result);
      this.score = new Score();
      this.setValues();
    }

    setInputState(inputState: InputState): void {
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

    update(result: TransitionResult): void {
      this.score.update(result);
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
