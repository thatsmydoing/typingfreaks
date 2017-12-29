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
    kanaElement: HTMLTextAreaElement;
    kanjiElement: HTMLTextAreaElement;
    displayElement: HTMLElement;
    jsonElement: HTMLInputElement;
    track: audio.Track | null = null;
    markers: Marker[] = [];
    rafId: number;
    waveForm: WaveForm;
    currentMarker: Marker;

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
      this.displayElement = document.querySelector('#display');
      this.jsonElement = document.querySelector('#json');
      this.waveForm = new WaveForm(
        document.querySelector('#waveform'),
        document.querySelector('#waveform-overlay'),
        (time: number) => this.play(time)
      );

      this.markerListElement.addEventListener('click', (event: MouseEvent) => this.markersClick(event));
      document.querySelector('#play').addEventListener('click', () => this.play());
      document.querySelector('#pause').addEventListener('click', () => this.pause());
      document.querySelector('#insert-marker').addEventListener('click', () => this.insertMarker());
      document.querySelector('.bar').addEventListener('click', (event: MouseEvent) => this.scrubberClick(event));
      document.querySelector('#import').addEventListener('click', () => this.import());
      document.querySelector('#export').addEventListener('click', () => this.export());

      this.update();
    }

    loadAudio(): void {
      let file = this.audioElement.files[0];
      if (file != null) {
        if (this.track != null) {
          this.track.stop();
        }
        this.clearMarkers();
        this.audioManager.loadTrackFromFile(file).then(t => {
          this.track = t;
          this.waveForm.setTrack(t);
        });
      }
    }

    update(): void {
      if (this.track != null) {
        let percentage = this.track.getTime() / this.track.getDuration() * 100;
        this.barElement.style.width = `${percentage}%`;
        this.waveForm.update(this.markers);
        if (this.currentMarker) {
          this.currentMarker.liElement.className = '';
        }
        let index = this.markers.findIndex(m => m.time > this.track.getTime());
        if (index < 0) index = 0;
        this.currentMarker = this.markers[index - 1];
        if (this.currentMarker) {
          this.currentMarker.liElement.className = 'highlight';
        }
        let text = this.kanjiElement.value.split('\n')[index] || '';
        this.displayElement.textContent = text;
      }
      requestAnimationFrame(() => this.update());
    }

    scrubberClick(event: MouseEvent): void {
      let pos = event.clientX - 10;
      console.log(pos);
      let percentage = pos / this.markerListElement.clientWidth;
      let targetTime = percentage * this.track.getDuration();
      this.play(targetTime);
    }

    markersClick(event: MouseEvent): void {
      let pos = event.clientX - 10;
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

    play(start: number = undefined, duration: number = undefined): void {
      this.track.pause();
      if (start != undefined) {
        this.track.resumeTime = start;
      }
      this.track.start(duration);
    }

    pause(): void {
      this.track.pause();
    }

    playMarker(marker: Marker): void {
      let start = marker.time;
      let end = this.track.getDuration();
      let index = this.markers.findIndex(m => m == marker);
      if (index < this.markers.length - 1) {
        end = this.markers[index + 1].time;
      }
      let duration = end - start;
      this.play(start, duration);

      this.highlightLine(this.kanjiElement, index + 1);
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

    highlightLine(element: HTMLTextAreaElement, line: number) {
      let text = element.value;
      let index = 0;
      for (let i = 0; i < line; ++i) {
        index = text.indexOf('\n', index + 1);
      }
      let endIndex = text.indexOf('\n', index + 1);
      element.focus();
      element.setSelectionRange(index, endIndex);
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
      let length = Math.max(kanji.length, kana.length, this.markers.length - 1);

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

  class WaveForm {
    ctx: CanvasRenderingContext2D;
    overlayCtx: CanvasRenderingContext2D;
    track: audio.Track | null;
    data: Float32Array | null;
    stride: number;
    currentSection: number;

    constructor(
      readonly canvas: HTMLCanvasElement,
      readonly overlay: HTMLCanvasElement,
      readonly setTime: (time: number) => void
    ) {
      canvas.height = canvas.clientHeight;
      canvas.width = canvas.clientWidth;
      overlay.height = overlay.clientHeight;
      overlay.width = overlay.clientWidth;
      this.ctx = canvas.getContext('2d');
      this.overlayCtx = overlay.getContext('2d');

      this.overlayCtx.fillStyle = 'rgba(255, 0, 0, 0.5)';

      this.overlay.addEventListener('click', (event: MouseEvent) => {
        let pos = event.clientX - this.overlay.offsetLeft;
        let percentage = pos / this.overlay.width;
        let time = this.currentSection * 5 + percentage * 5;
        this.setTime(time);
      });
    }

    setTrack(track: audio.Track): void {
      this.track = track;
      this.stride = Math.floor(this.track.buffer.sampleRate / this.canvas.width * 5);
      this.currentSection = -1;
    }

    timeToX(time: number): number {
      return (time - this.currentSection * 5) / 5 * this.canvas.width
    }

    update(markers: Marker[]): void {
      let section = Math.floor(this.track.getTime() / 5);

      let height = this.canvas.height;
      if (this.currentSection != section) {
        this.data = this.track.buffer.getChannelData(0);
        this.ctx.clearRect(0, 0, this.canvas.width, height);
        this.ctx.beginPath();
        this.ctx.moveTo(0, height / 2);
        let offset = section * this.canvas.width * this.stride;
        for (let i = 0; i < this.canvas.width; ++i) {
          let index = offset + i * this.stride;
          let value = height / 2 + height / 2 * this.data[index];
          this.ctx.lineTo(i, value);
        }
        this.ctx.stroke();
        this.currentSection = section;
      }

      let marker = this.timeToX(this.track.getTime());
      this.overlayCtx.clearRect(0, 0, this.canvas.width, height);
      this.overlayCtx.fillRect(0, 0, marker, height);
      markers.forEach(m => {
        if (m.time > section * 5 && m.time <= section * 5 + 5) {
          let x = this.timeToX(m.time);
          this.overlayCtx.beginPath();
          this.overlayCtx.moveTo(x, 0);
          this.overlayCtx.lineTo(x, height);
          this.overlayCtx.stroke();
        }
      })
    }
  }
}
