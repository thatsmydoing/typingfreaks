import * as level from '../level';
import * as util from '../util';

export class LyricsEditor {
  containerElement: HTMLElement;
  firstLine: LineEditor;
  lastLine: LineEditor;

  constructor(readonly playAt: (time: number, duration?: number) => void) {
    this.containerElement = util.getElement(document, '.lyrics');
    this.firstLine = new LineEditor(this);
    this.lastLine = this.firstLine;
    this.appendLine();
  }

  *[Symbol.iterator]() {
    let line: LineEditor | undefined = this.firstLine;
    while (line !== undefined) {
      yield line;
      line = line.nextLine;
    }
  }

  addInterval(time: number): void {
    const fixedTime = time.toFixed(2);
    for (const line of this) {
      const input = line.timeInput;
      if (input.value === '') {
        input.value = fixedTime;
        line.adjustTimeInput();
        return;
      } else {
        const value = parseFloat(input.value);
        if (time < value) {
          line.pushText('time', fixedTime);
          return;
        }
      }
    }
    const newLine = this.appendLine();
    newLine.timeInput.value = fixedTime;
    newLine.adjustTimeInput();
  }

  appendLine(): LineEditor {
    const newLine = new LineEditor(this);
    this.lastLine.setNextLine(newLine);

    this.toggleLine(this.lastLine, false);
    this.toggleLine(newLine, true);

    this.lastLine = newLine;
    return newLine;
  }

  removeLine(line: LineEditor): boolean {
    if (line === this.firstLine) {
      if (line.nextLine === undefined) {
        // this should not happen
        return false;
      } else if (line.nextLine === this.lastLine) {
        // this is the only editable line, so we just clear it
        line.clear();
        return false;
      } else {
        this.firstLine = line.nextLine;
      }
    } else if (line === this.lastLine) {
      if (line.previousLine === this.firstLine) {
        line.clear();
        return false;
      } else {
        this.lastLine = line.previousLine!;
      }
    }

    this.toggleLine(this.lastLine, true);

    if (line.previousLine !== undefined) {
      line.previousLine.setNextLine(line.nextLine);
    }
    line.elements.forEach((element) => {
      element.remove();
    });
    return true;
  }

  toggleLine(line: LineEditor, disabled: boolean): void {
    line.elements.forEach((element) => {
      if (element instanceof HTMLInputElement && element.type === 'text') {
        element.disabled = disabled;
      }
    });
  }

  clear(): void {
    while (this.removeLine(this.lastLine)) {}
    // we always keep one extra line so we have to clear the first line manually
    this.removeLine(this.firstLine);
  }

  getDisplayForTime(time: number): string | null {
    for (const line of this) {
      if (time < parseFloat(line.timeInput.value)) {
        return line.previousLine?.kanjiInput.value ?? null;
      }
    }
    return null;
  }

  loadLines(lines: level.Line[]): void {
    this.clear();
    if (lines.length > 0) {
      const firstLine = lines[0];
      let start = 0;
      if (
        firstLine !== undefined &&
        firstLine.kana === '@' &&
        firstLine.kanji === '@'
      ) {
        start = 1;
      }
      for (let i = start; i < lines.length; ++i) {
        if (i > start) {
          this.appendLine();
        }
        this.lastLine.previousLine!.fromLine(lines[i]);
        if (i === lines.length - 1) {
          this.lastLine.timeInput.value = `${lines[i].end ?? ''}`;
          this.lastLine.adjustTimeInput();
        }
      }
    }
  }

  toLines(): level.Line[] {
    const lines: level.Line[] = [];
    for (const lineEditor of this) {
      const line = lineEditor.toLine();
      if (lineEditor === this.firstLine && line.start !== undefined) {
        lines.push({
          kana: '@',
          kanji: '@',
          start: 0,
          end: line.start,
        });
      }
      if (lineEditor !== this.lastLine) {
        lines.push(line);
      }
    }
    return lines;
  }
}

type Part = 'time' | 'kana' | 'kanji';

export class LineEditor {
  previousLine?: LineEditor;
  nextLine?: LineEditor;

  elements: Element[];
  timeInput: HTMLInputElement;
  kanaInput: HTMLInputElement;
  kanjiInput: HTMLInputElement;

  constructor(readonly container: LyricsEditor, before?: Element) {
    const fragment = util.loadTemplate(document, 'line');
    this.elements = Array.from(fragment.children);
    this.timeInput = util.getElement(fragment, '.time');
    this.kanaInput = util.getElement(fragment, '.kana');
    this.kanjiInput = util.getElement(fragment, '.kanji');

    this.timeInput.addEventListener('input', () => {
      this.adjustTimeInput();
    });
    this.kanaInput.addEventListener('keydown', (event) => {
      this.handleKeyDown('kana', event);
    });
    this.kanaInput.addEventListener('paste', (event) => {
      this.handlePaste('kana', event);
    });
    this.kanjiInput.addEventListener('keydown', (event) => {
      this.handleKeyDown('kanji', event);
    });
    this.kanjiInput.addEventListener('paste', (event) => {
      this.handlePaste('kanji', event);
    });
    util.getElement(fragment, '.play-section').addEventListener('click', () => {
      const line = this.toLine();
      if (line.start !== undefined) {
        const duration =
          line.end !== undefined ? line.end - line.start : undefined;
        this.container.playAt(line.start, duration);
      }
    });
    util
      .getElement(fragment, '.remove-section')
      .addEventListener('click', () => {
        this.popText('time');
      });

    if (before) {
      container.containerElement.insertBefore(fragment, before);
    } else {
      container.containerElement.appendChild(fragment);
    }
  }

  getInput(part: Part): HTMLInputElement {
    switch (part) {
      case 'time':
        return this.timeInput;
      case 'kana':
        return this.kanaInput;
      case 'kanji':
        return this.kanjiInput;
    }
  }

  // adjust min value such that we validate and step adds/subtracts based on
  // our input value
  adjustTimeInput(): void {
    if (this.timeInput.value !== '') {
      const value = parseFloat(this.timeInput.value);
      const step = parseFloat(this.timeInput.step);
      this.timeInput.min = (value % step).toFixed(3);
    }
  }

  handlePaste(part: Part, event: ClipboardEvent): void {
    if (event.clipboardData !== null) {
      event.preventDefault();
      const paste = event.clipboardData.getData('text');
      const lines = paste.split('\n');

      if (lines.length === 0) {
        return;
      }

      const input = this.getInput(part);
      const currentText = input.value;

      for (let i = lines.length - 1; i > 0; --i) {
        this.pushText(part, lines[i]);
      }

      this.pushText(part, currentText + lines[0]);
    }
  }

  handleKeyDown(part: Part, event: KeyboardEvent): void {
    if (event.key === 'ArrowUp' && this.previousLine !== undefined) {
      event.preventDefault();
      const input = this.getInput(part);
      const position = input.selectionStart ?? 0;

      const prevInput = this.previousLine.getInput(part);
      prevInput.focus();
      prevInput.setSelectionRange(position, position);
    } else if (event.key === 'ArrowDown' && this.nextLine !== undefined) {
      event.preventDefault();
      const input = this.getInput(part);
      const position = input.selectionStart ?? 0;

      const nextInput = this.nextLine.getInput(part);
      nextInput.focus();
      nextInput.setSelectionRange(position, position);
    } else if (event.key === 'Enter') {
      const input = this.getInput(part);
      const text = input.value;
      if (input.selectionStart !== null && input.selectionEnd !== null) {
        const remaining = text.substring(0, input.selectionStart);
        const afterNewline = text.substring(input.selectionEnd);
        input.value = remaining;

        const nextLine = this.ensureNextLine(part);
        nextLine.pushText(part, afterNewline);

        const nextInput = nextLine.getInput(part);
        nextInput.focus();
        nextInput.setSelectionRange(0, 0);
      }
    } else if (event.key === 'Backspace' && this.previousLine !== undefined) {
      const input = this.getInput(part);
      if (input.selectionStart === 0 && input.selectionEnd === 0) {
        event.preventDefault();
        const prevInput = this.previousLine.getInput(part);

        const prevText = prevInput.value;
        const prevLength = prevText.length;
        prevInput.value = prevText + input.value;
        this.popText(part);
        prevInput.focus();
        prevInput.setSelectionRange(prevLength, prevLength);
      }
    } else if (event.key === 'Delete' && this.nextLine !== undefined) {
      const input = this.getInput(part);
      const length = input.value.length;
      if (input.selectionStart === length && input.selectionEnd === length) {
        event.preventDefault();
        const nextInput = this.nextLine.getInput(part);

        input.value = input.value + nextInput.value;
        input.setSelectionRange(length, length);
        this.nextLine.popText(part);
      }
    }
  }

  pushText(part: Part, text: string): void {
    const input = this.getInput(part);
    const current = input.value;
    input.value = text;
    if (part === 'time') {
      this.adjustTimeInput();
    }

    if (current === '') {
      return;
    }

    const nextLine = this.ensureNextLine(part);
    nextLine.pushText(part, current);
  }

  popText(part: Part): void {
    const input = this.getInput(part);

    if (this.nextLine === undefined) {
      // we are the last line
      if (part === 'time' && this.previousLine !== undefined) {
        const { kanaInput, kanjiInput } = this.previousLine;
        if (kanaInput.value === '' && kanjiInput.value === '') {
          this.container.removeLine(this);
        } else {
          input.value = '';
        }
      } else {
        input.value = '';
      }
    } else {
      if (this.nextLine.nextLine === undefined) {
        // the next line is the last one
        input.value = '';
        if (
          this.kanaInput.value === '' &&
          this.kanjiInput.value === '' &&
          this.nextLine.timeInput.value === ''
        ) {
          this.container.removeLine(this.nextLine);
        } else {
          input.value = this.nextLine.getInput(part).value;
          this.nextLine.popText(part);
        }
      } else {
        input.value = this.nextLine.getInput(part).value;
        this.nextLine.popText(part);
      }
    }
    if (part === 'time') {
      this.adjustTimeInput();
    }
  }

  ensureNextLine(part: Part): LineEditor {
    if (part !== 'time' && this.nextLine === this.container.lastLine) {
      this.container.appendLine();
      return this.nextLine;
    } else if (this.nextLine === undefined) {
      return this.container.appendLine();
    } else {
      return this.nextLine;
    }
  }

  setNextLine(nextLine?: LineEditor): void {
    this.nextLine = nextLine;
    if (this.nextLine !== undefined) {
      this.nextLine.previousLine = this;
    }
  }

  clear() {
    this.timeInput.value = '';
    this.kanaInput.value = '';
    this.kanjiInput.value = '';
  }

  fromLine(line: level.Line) {
    this.kanaInput.value = line.kana === '@' ? '' : line.kana;
    this.kanjiInput.value = line.kanji === '@' ? '' : line.kanji;
    if (line.start !== undefined) {
      this.timeInput.value = `${line.start}`;
      this.adjustTimeInput();
    }
  }

  toLine(): level.Line {
    const line: level.Line = {
      kana: this.kanaInput.value || '@',
      kanji: this.kanjiInput.value || '@',
    };
    const time = this.timeInput.value;
    if (time !== '') {
      const nextValue = this.nextLine?.timeInput?.value;
      line.start = parseFloat(time);
      if (nextValue) {
        line.end = parseFloat(nextValue);
      }
    }
    return line;
  }

  get time(): number {
    return parseFloat(this.timeInput.value);
  }
}
