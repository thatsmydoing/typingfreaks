import * as audio from '../audio';
import * as level from '../level';
import * as util from '../util';
import { LyricsEditor } from './lyrics';
import { WaveForm } from './waveForm';

export class LevelEditor {
  containerElement: HTMLElement;
  levelTitleElement: HTMLElement;
  levelScreenElement: HTMLElement;
  barElement: HTMLElement;
  markersListElement: HTMLElement;
  displayElement: HTMLElement;
  lyricsEditor: LyricsEditor;

  track: audio.Track | null;
  waveForm: WaveForm | null;

  constructor(close: () => void, save: (lines: level.Line[]) => void) {
    this.containerElement = util.getElement(document, '#container');
    this.levelTitleElement = util.getElement(document, '#level-title');
    this.levelScreenElement = util.getElement(document, '#level-screen');
    this.barElement = util.getElement(document, '.bar-overlay');
    this.markersListElement = util.getElement(document, '.markers');
    this.displayElement = util.getElement(document, '#display');
    this.lyricsEditor = new LyricsEditor((time, duration) => {
      this.play(time, duration);
    });

    this.track = null;
    this.waveForm = null;

    util
      .getElement(this.levelScreenElement, '#level-close')
      .addEventListener('click', () => {
        if (confirm('Are you sure you want to close?')) {
          this.stop();
          close();
        }
      });
    util
      .getElement(this.levelScreenElement, '#level-save')
      .addEventListener('click', () => {
        save(this.lyricsEditor.toLines());
      });
    util
      .getElement(this.levelScreenElement, '#play')
      .addEventListener('click', () => this.play());
    util
      .getElement(this.levelScreenElement, '#pause')
      .addEventListener('click', () => this.pause());
    util
      .getElement(this.levelScreenElement, '#insert-marker')
      .addEventListener('click', () => this.insertMarker());
    util
      .getElement(this.levelScreenElement, '.bar')
      .addEventListener('click', (event: MouseEvent) =>
        this.scrubberClick(event)
      );
  }

  load(title: string, lines: level.Line[], track: audio.Track | null) {
    this.levelTitleElement.textContent = title;
    this.levelScreenElement.classList.toggle('no-audio', track === null);
    this.levelScreenElement.classList.toggle(
      'no-waveform',
      track === null || !(track instanceof audio.FileTrack)
    );
    this.markersListElement.textContent = '';
    this.lyricsEditor.loadLines(lines);
    this.track = track;
    if (track !== null && track instanceof audio.FileTrack) {
      this.waveForm = new WaveForm(
        util.getElement(document, '#waveform'),
        util.getElement(document, '#waveform-overlay'),
        (time: number) => this.play(time)
      );
      this.waveForm.setTrack(track);
    } else {
      this.waveForm = null;
    }
    this.update();
  }

  update(): void {
    if (this.track !== null) {
      const trackTime = this.track.getTime();
      const duration = this.track.getDuration();
      let percentage = (trackTime / duration) * 100;
      this.barElement.style.width = `${percentage}%`;

      const markers = this.markersListElement.children;
      const times = [];
      let currentDisplay: string | null = null;
      let i = 0;

      for (const line of this.lyricsEditor) {
        const time = line.time;
        if (Number.isNaN(time)) {
          continue;
        }
        times.push(time);
        line.timeInput.style.background = '';

        let marker: HTMLElement | undefined = markers[i++] as HTMLElement;
        if (marker === undefined) {
          marker = document.createElement('div');
          marker.className = 'marker';
          this.markersListElement.appendChild(marker);
        }
        const percentage = (time * 100) / duration;
        marker.style.left = `${percentage}%`;

        if (currentDisplay === null && trackTime < time) {
          const currentLine = line.previousLine;
          if (currentLine) {
            currentLine.timeInput.style.background = 'yellow';
            currentDisplay = line.previousLine!.kanjiInput.value;
          } else {
            currentDisplay = '';
          }
        }
      }

      for (; i < markers.length; ++i) {
        markers[i].remove();
      }

      if (this.waveForm !== null) {
        this.waveForm.update(times);
      }

      this.displayElement.textContent = currentDisplay;
      requestAnimationFrame(() => this.update());
    }
  }

  play(start?: number, duration?: number): void {
    this.track?.pause();
    this.track?.start(start, duration);
  }

  pause(): void {
    this.track?.pause();
  }

  insertMarker(time?: number): void {
    const insertTime = time ?? this.track!.getTime();
    this.lyricsEditor.addInterval(insertTime);
  }

  scrubberClick(event: MouseEvent): void {
    let pos = event.clientX - this.barElement.getBoundingClientRect().left;
    let percentage = pos / this.markersListElement.clientWidth;
    let targetTime = percentage * this.track!.getDuration();
    this.play(targetTime);
  }

  markersClick(event: MouseEvent): void {
    let pos = event.clientX - this.barElement.getBoundingClientRect().left;
    let percentage = pos / this.markersListElement.clientWidth;
    let targetTime = percentage * this.track!.getDuration();
    this.insertMarker(targetTime);
  }

  stop() {
    if (this.track !== null) {
      this.track.stop();
    }
    this.track = null;
    this.lyricsEditor.clear();
  }
}
