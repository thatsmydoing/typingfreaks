/// <reference path="util.ts" />
/// <reference path="level.ts" />
/// <reference path="audio.ts" />

namespace editor {
  export class Editor {
    audioManager: audio.AudioManager;
    audioElement: HTMLInputElement;
    barElement: HTMLElement;
    markerListElement: HTMLElement;
    intervalListElement: HTMLElement;
    kanaElement: HTMLElement;
    kanjiElement: HTMLElement;
    jsonElement: HTMLInputElement;
    track: audio.Track | null = null;
    markers: Marker[] = [];
    rafId: number;

    constructor() {
      this.audioManager = new audio.AudioManager();
      this.audioElement = document.querySelector('#audio');
      this.audioElement.addEventListener('change', event => {
        this.loadAudio();
      });
      this.barElement = document.querySelector('.bar-overlay');
      this.markerListElement = document.querySelector('.markers');
      this.intervalListElement = document.querySelector('#intervals');
      this.kanaElement = document.querySelector('#kana');
      this.kanjiElement = document.querySelector('#kanji');
      this.jsonElement = document.querySelector('#json');

      this.markerListElement.addEventListener('click', (event: MouseEvent) => this.markersClick(event));
      document.querySelector('#play').addEventListener('click', () => this.play());
      document.querySelector('#pause').addEventListener('click', () => this.pause());
      document.querySelector('#insert-marker').addEventListener('click', () => this.insertMarker());
      document.querySelector('.bar').addEventListener('click', (event: MouseEvent) => this.scrubberClick(event));
      document.querySelector('#import').addEventListener('click', () => this.import());
      document.querySelector('#export').addEventListener('click', () => this.export());
    }

    loadAudio(): void {
      let file = this.audioElement.files[0];
      if (file != null) {
        if (this.track != null) {
          this.track.stop();
        }
        this.clearMarkers();
        this.audioManager.loadTrackFromFile(file).then(t => this.track = t);
      }
    }

    update(): void {
      let percentage = this.track.getTime() / this.track.getDuration() * 100;
      this.barElement.style.width = `${percentage}%`;
      if (this.track.isPlaying()) {
        this.rafId = requestAnimationFrame(() => this.update());
      }
    }

    scrubberClick(event: MouseEvent): void {
      let pos = event.clientX - this.markerListElement.offsetLeft;
      let percentage = pos / this.markerListElement.clientWidth;
      let targetTime = percentage * this.track.getDuration();
      this.track.stop();
      this.track.resumeTime = targetTime;
      this.play();
    }

    markersClick(event: MouseEvent): void {
      let pos = event.clientX - this.markerListElement.offsetLeft;
      let percentage = pos / this.markerListElement.clientWidth;
      let targetTime = percentage * this.track.getDuration();
      this.insertMarker(targetTime);
    }

    insertMarker(time: number = undefined): void {
      let marker = new Marker(
        this.track.getDuration(),
        (marker: Marker) => this.removeMarker(marker),
        (marker: Marker) => this.playMarker(marker)
      );
      if (time !== undefined) {
        marker.time = time;
      } else {
        marker.time = this.track.getTime();
      }
      let insertIndex = this.markers.findIndex(m => m.time > marker.time);
      if (insertIndex >= 0) {
        this.markers.splice(insertIndex, 0, marker);
      } else {
        this.markers.push(marker);
      }
      this.markerListElement.appendChild(marker.markerElement);
      if (insertIndex >= 0) {
        this.intervalListElement.insertBefore(marker.liElement, this.markers[insertIndex+1].liElement);
      } else {
        this.intervalListElement.appendChild(marker.liElement);
      }
    }

    play(duration: number = undefined): void {
      window.cancelAnimationFrame(this.rafId);
      this.track.start(duration);
      this.update();
    }

    pause(): void {
      this.track.pause();
    }

    playMarker(marker: Marker): void {
      let start = 0;
      let index = this.markers.findIndex(m => m == marker);
      if (index > 0) {
        start = this.markers[index - 1].time;
      }
      let duration = marker.time - start;
      this.track.stop();
      this.track.resumeTime = start;
      this.play(duration);
    }

    removeMarker(marker: Marker): void {
      let index = this.markers.findIndex(m => m == marker);
      this.markers.splice(index, 1);
      this.markerListElement.removeChild(marker.markerElement);
      this.intervalListElement.removeChild(marker.liElement);
    }

    clearMarkers(): void {
      this.markers.forEach(m => {
        this.markerListElement.removeChild(m.markerElement);
        this.intervalListElement.removeChild(m.liElement);
      });
      this.markers = [];
    }

    import(): void {
      this.clearMarkers();
      let lines: level.Line[] = JSON.parse(this.jsonElement.value);
      let kanji = '';
      let kana = '';

      lines.forEach(line => {
        kanji += line.kanji + '\n';
        kana += line.kana + '\n';
        if (line.end != undefined) {
          this.insertMarker(line.end);
        }
      });

      this.kanjiElement.value = kanji;
      this.kanaElement.value = kana;
    }

    export(): void {
      let kanji = this.kanjiElement.value.split('\n');
      let kana = this.kanaElement.value.split('\n');
      kanji.pop();
      kana.pop();
      let length = Math.max(kanji.length, kana.length, this.markers.length);

      let lines = [];
      let lastStart = 0;
      for (let i = 0; i < length; ++i) {
        let data: level.Line = {
          kanji: kanji[i] || '@',
          kana: kana[i] || '@',
        }
        if (this.markers[i]) {
          data.start = lastStart;
          data.end = this.markers[i].time;
          lastStart = data.end;
        }
        lines.push(data);
      }

      this.jsonElement.value = JSON.stringify(lines);
    }

    start(): void {
      this.loadAudio();
    }
  }

  class Marker {
    markerElement: HTMLElement;
    liElement: HTMLElement;
    inputElement: HTMLInputElement;

    constructor(
      readonly duration: number,
      readonly remove: (marker: Marker) => void,
      readonly play: (marker: Marker) => void
    ) {
      this.markerElement = document.createElement('div');
      this.markerElement.className = 'marker';

      let fragment = util.loadTemplate('interval');
      this.liElement = fragment.querySelector('*');
      this.inputElement = fragment.querySelector('.interval');
      this.inputElement.addEventListener('change', () => {
        this.time = parseFloat(this.inputElement.value);
      });

      fragment.querySelector('.play-section').addEventListener('click', () => play(this));
      fragment.querySelector('.remove-section').addEventListener('click', () => remove(this));
    }

    get time(): number {
      return parseFloat(this.inputElement.value);
    }

    set time(t: number) {
      this.inputElement.value = t.toFixed(1);
      let percentage = t * 100 / this.duration;
      this.markerElement.style.left = `${percentage}%`;
    }
  }
}
