namespace audio {
  export class AudioManager {
    context: AudioContext;
    volume: GainNode;
    output: AudioNode;

    constructor() {
      this.context = new AudioContext();
      this.volume = this.context.createGain();
      this.volume.connect(this.context.destination);
      this.output = this.volume;
    }

    getTime(): number {
      return this.context.currentTime;
    }

    loadTrack(url: string): Promise<Track> {
      return window.fetch(url)
        .then(response => response.arrayBuffer())
        .then(buffer => this.context.decodeAudioData(buffer))
        .then(audioBuffer => new Track(this, audioBuffer))
    }

    loadTrackFromFile(file: File): Promise<Track> {
      let promise = new Promise<ArrayBuffer>((resolve, reject) => {
        let reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.readAsArrayBuffer(file);
      });
      return promise
        .then(buffer => this.context.decodeAudioData(buffer))
        .then(audioBuffer => new Track(this, audioBuffer))
    }

    loadTrackWithProgress(url: string, listener: EventListener): Promise<Track> {
      let promise = new Promise<ArrayBuffer>((resolve, reject) => {
        let xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.responseType = 'arraybuffer';
        xhr.onprogress = listener;
        xhr.onload = () => resolve(xhr.response);
        xhr.onerror = () => reject();
        xhr.send();
      });
      return promise
        .then(buffer => this.context.decodeAudioData(buffer))
        .then(audioBuffer => new Track(this, audioBuffer))
    }
  }

  export class Track {
    manager: AudioManager;
    buffer: AudioBuffer;
    source: AudioBufferSourceNode | null;
    playStartTime: number;
    resumeTime: number;
    hasStarted: boolean;
    isFinished: boolean;

    constructor(manager: AudioManager, buffer: AudioBuffer) {
      this.manager = manager;
      this.buffer = buffer;
      this.playStartTime = 0;
      this.resumeTime = 0;
      this.hasStarted = false;
      this.isFinished = true;
    }

    play(): void {
      this.source = this.manager.context.createBufferSource();
      this.source.buffer = this.buffer;
      this.source.connect(this.manager.output);
      this.playStartTime = this.manager.getTime();
      this.isFinished = false;
      this.hasStarted = true;
      this.source.start();
    }

    start(duration: number = undefined): void {
      this.source = this.manager.context.createBufferSource();
      this.source.buffer = this.buffer;
      this.source.connect(this.manager.output);
      this.source.onended = (event) => {
        if (this.source == event.target) {
          this.isFinished = true;
          this.resumeTime = this.manager.getTime() - this.playStartTime;
          if (this.resumeTime > this.getDuration()) {
            this.resumeTime = 0;
          }
        }
      }
      this.isFinished = false;
      this.hasStarted = true;
      this.playStartTime = this.manager.getTime() - this.resumeTime;
      this.source.start(0, this.resumeTime, duration);
    }

    pause(): void {
      if (this.isFinished) return;
      this.resumeTime = this.manager.getTime() - this.playStartTime;
      this.isFinished = true;
      if (this.source) {
        this.source.stop();
      }
    }

    stop(): void {
      this.resumeTime = 0;
      this.isFinished = true;
      if (this.source) {
        this.source.stop();
      }
    }

    isPlaying(): boolean {
      return this.hasStarted && !this.isFinished;
    }

    getTime(): number {
      if (!this.hasStarted) {
        return 0;
      }
      else if (this.isFinished) {
        if (this.resumeTime > 0) {
          return this.resumeTime;
        } else {
          return this.getDuration();
        }
      } else {
        return this.manager.getTime() - this.playStartTime;
      }
    }

    getDuration(): number {
      return this.buffer.duration;
    }
  }
}
