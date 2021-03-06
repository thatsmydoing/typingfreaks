/*
 * This module handles displaying the UI. The most important one is the main
 * area which contains the text to be typed in. Progress is displayed on the
 * kana part of the area, while errors are shown via the romaji section. The
 * kanji is simply just for reading.
 */

import { KanaInputState as InputState } from './kana';
import * as state from './state';
import { TransitionResult } from './state';
import * as level from './level';
import * as util from './util';

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
    return this.children.map((kanaComponent) => kanaComponent.element);
  }

  constructor(kana: string, state: state.StateMachine) {
    this.state = state;
    this.current = 0;
    this.state.addObserver(this.observer);
    this.children = kana
      .split('')
      .map((c) => new SingleKanaDisplayComponent(c));
  }

  observer: state.Observer<number> = (result, meta) => {
    if (meta > this.current) {
      while (this.current < meta) {
        this.children[this.current].setFull();
        this.current += 1;
      }
    } else if (result != TransitionResult.FAILED) {
      this.children[this.current].setPartial();
    }
  };

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
      this.children.forEach((child) => {
        child.elements.forEach((kanaElement) => {
          this.element.appendChild(kanaElement);
        });
      });
    }
  }

  private clearChildren(): void {
    this.children.forEach((child) => {
      child.elements.forEach((kanaElement) => {
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
      this.observer(TransitionResult.SUCCESS, 0, false);
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

  observer: state.Observer<number> = (result) => {
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
  };

  destroy(): void {
    this.clearObservers();
  }
}

export class TrackProgressController {
  totalBar: HTMLElement;
  intervalBar: HTMLElement;
  listener: ((event: AnimationPlaybackEvent) => void) | null;

  constructor(private element: HTMLElement, private lines: level.Line[]) {
    this.totalBar = util.getElement(element, '.total .shade');
    this.intervalBar = util.getElement(element, '.interval .shade');
    this.listener = null;
  }

  start(start: number = 0): void {
    this.clearAnimations();
    const end = this.lines[this.lines.length - 1].end!;
    const progress = start / end;
    this.totalBar.animate(
      { width: [`${progress * 100}%`, '100%'] },
      {
        duration: (end - start) * 1000,
      }
    );

    for (const line of this.lines) {
      if (line.end! <= start) {
        continue;
      }
      const segmentStart = Math.max(line.start!, start);
      const segmentLength = line.end! - segmentStart;
      const fullSegmentLength = line.end! - line.start!;
      const progress = 1 - segmentLength / fullSegmentLength;
      const animation = this.intervalBar.animate(
        { width: [`${progress * 100}%`, '100%'] },
        {
          delay: (segmentStart - start) * 1000,
          duration: segmentLength * 1000,
        }
      );
      if (this.listener) {
        animation.addEventListener('finish', this.listener);
      }
    }
  }

  pause(): void {
    this.totalBar.getAnimations().forEach((anim) => anim.pause());
    this.intervalBar.getAnimations().forEach((anim) => anim.pause());
  }

  setListener(func: (event: AnimationPlaybackEvent) => void): void {
    this.listener = func;
  }

  destroy(): void {
    this.clearAnimations();
  }

  private clearAnimations() {
    this.totalBar.getAnimations().forEach((anim) => anim.cancel());
    this.intervalBar.getAnimations().forEach((anim) => anim.cancel());
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

  update(result: TransitionResult, points: number): void {
    if (result === TransitionResult.FAILED) {
      this.missed += 1;
      this.lastMissed = true;
      this.combo = 0;
    } else if (result === TransitionResult.SKIPPED) {
      this.skipped += 1;
      this.lastSkipped = true;
      this.combo = 0;
    }

    for (let i = 0; i < points; ++i) {
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
  lastMeta: number;
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
    this.lastMeta = 0;
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

  observer: state.Observer<number> = (result, meta, finished) => {
    const points = Math.max(0, meta - this.lastMeta);
    this.lastMeta = finished ? 0 : meta;
    this.score.update(result, points);
    this.setValues();
  };

  setValues(): void {
    this.comboElement.textContent =
      this.score.combo == 0 ? '' : this.score.combo + ' combo';
    this.scoreElement.textContent = this.score.score + '';
    this.maxComboElement.textContent = this.score.maxCombo + '';
    this.finishedElement.textContent = this.score.finished + '';
    this.hitElement.textContent = this.score.hit + '';
    this.missedElement.textContent = this.score.missed + '';
    this.skippedElement.textContent = this.score.skipped + '';
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
