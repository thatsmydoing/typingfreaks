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

    async loadTrack(url: string): Promise<FileTrack> {
      const response = await window.fetch(url);
      const buffer = await response.arrayBuffer();
      const audioBuffer = await this.context.decodeAudioData(buffer);
      return new FileTrack(this, audioBuffer);
    }

    async loadTrackFromFile(file: File): Promise<FileTrack> {
      const promise = new Promise<ArrayBuffer>((resolve, _) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.readAsArrayBuffer(file);
      });
      const buffer = await promise;
      const audioBuffer = await this.context.decodeAudioData(buffer);
      return new FileTrack(this, audioBuffer);
    }

    async loadTrackWithProgress(url: string, listener: (percentage: number) => void): Promise<FileTrack> {
      const promise = new Promise<ArrayBuffer>((resolve, reject) => {
        let xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.responseType = 'arraybuffer';
        xhr.onprogress = (event) => {
          if (event.lengthComputable) {
            // only up to 80 to factor in decoding time
            let percentage = event.loaded / event.total * 80;
            listener(percentage);
          }
        };
        xhr.onload = () => resolve(xhr.response);
        xhr.onerror = () => reject();
        xhr.send();
      });
      const buffer = await promise;
      const audioBuffer = await this.context.decodeAudioData(buffer);
      return new FileTrack(this, audioBuffer);
    }

    async loadTrackFromYoutube(id: string, element: HTMLElement, listener: (percentage: number) => void): Promise<YoutubeTrack> {
      await youtube.loadYoutubeApi();
      listener(30);
      const player = await youtube.createPlayer(element);
      listener(60);
      const track = new YoutubeTrack(player, id);
      await track.preload();
      listener(90);
      return track;
    }
  }

  export interface Track {
    play(): void;
    start(fromTime?: number, duration?: number): void;
    pause(): void;
    stop(): void;
    exit(): void;
    isPlaying(): boolean;
    getTime(): number;
    getDuration(): number;
  }

  export class FileTrack implements Track {
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
      this.source = null;
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

    start(fromTime?: number, duration?: number): void {
      if (fromTime !== undefined) {
        this.resumeTime = fromTime;
      }
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

    exit(): void {
      this.stop();
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

  export class YoutubeTrack implements Track {
    private timeoutHandle?: number;
    private playDeferred: util.Deferred;
    private finishDeferred: util.Deferred;
    readonly fnContext: util.FnContext = new util.FnContext();

    constructor(readonly player: YT.Player, readonly id: string) {
      this.playDeferred = util.makeDeferred();
      this.finishDeferred = util.makeDeferred();
    }

    get playPromise(): Promise<void> {
      return this.playDeferred.promise;
    }

    get finishPromise(): Promise<void> {
      return this.finishDeferred.promise;
    }

    preload(): Promise<void> {
      return new Promise((resolve) => {
        let loaded = false;
        const onStateChange: YT.PlayerStateChangeListener = ({ data }) => {
          if (data === YT.PlayerState.PLAYING) {
            if (!loaded) {
              loaded = true;
              this.player.pauseVideo();
              resolve();
            }
          } else if (data === YT.PlayerState.ENDED) {
            this.finishDeferred.resolve();
          }
        };
        this.player.addEventListener('onStateChange', onStateChange);
        this.player.loadVideoById(this.id);
      });
    }

    play(): void {
      this.clearTimeout();
      this.playDeferred.resolve();
      this.player.playVideo();
    }

    start(fromTime?: number, duration?: number): void {
      this.clearTimeout();
      if (duration) {
        this.timeoutHandle = setTimeout(() => {
          this.player.pauseVideo();
        }, duration * 1000);
      }
      if (fromTime !== undefined) {
        this.player.seekTo(fromTime, true);
      }
      this.player.playVideo();
    }

    pause(): void {
      this.clearTimeout();
      this.player.pauseVideo();
    }

    stop(): void {
      this.clearTimeout();
      this.player.stopVideo();
    }

    exit(): void {
      // the video will be removed from the background and stop immediately
      this.fnContext.invalidate();
    }

    isPlaying(): boolean {
      return this.player.getPlayerState() === YT.PlayerState.PLAYING;
    }

    getTime(): number {
      return this.player.getCurrentTime();
    }

    getDuration(): number {
      return this.player.getDuration();
    }

    private clearTimeout(): void {
      if (this.timeoutHandle) {
        clearTimeout(this.timeoutHandle);
      }
    }
  }
}
