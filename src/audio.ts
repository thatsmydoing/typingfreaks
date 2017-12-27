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
    hasStarted: boolean;
    isFinished: boolean;

    constructor(manager: AudioManager, buffer: AudioBuffer) {
      this.manager = manager;
      this.buffer = buffer;
      this.playStartTime = 0;
      this.hasStarted = false;
      this.isFinished = false;
    }

    play(): void {
      this.source = this.manager.context.createBufferSource();
      this.source.buffer = this.buffer;
      this.source.connect(this.manager.output);
      this.source.onended = () => {
        this.isFinished = true;
      }
      this.isFinished = false;
      this.hasStarted = true;
      this.playStartTime = this.manager.getTime();
      this.source.start();
    }

    stop(): void {
      this.isFinished = true;
      if (this.source) {
        this.source.stop();
      }
    }

    getTime(): number {
      if (this.isFinished) {
        return this.getDuration();
      } else if (!this.hasStarted) {
        return 0;
      } else {
        return this.manager.getTime() - this.playStartTime;
      }
    }

    getDuration(): number {
      return this.buffer.duration;
    }
  }
}
