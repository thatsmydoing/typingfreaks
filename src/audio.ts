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

  export enum PlayState {
    UNSTARTED ='unstarted',
    PLAYING = 'playing',
    PAUSED = 'paused',
    STOPPED = 'stopped'
  }

  export type TrackListener = (track: Track, state: PlayState) => void;

  export abstract class Track {
    private listeners: TrackListener[] = [];

    addListener(listener: TrackListener) {
      this.listeners.push(listener);
    }

    clearListeners() {
      this.listeners = [];
    }

    emit(state: PlayState) {
      this.listeners.forEach(l => l(this, state));
    }

    exit(): void {
      this.clearListeners();
    }

    abstract play(): void;
    abstract start(fromTime?: number, duration?: number): void;
    abstract pause(): void;
    abstract stop(): void;
    abstract getState(): PlayState;
    abstract getTime(): number;
    abstract getDuration(): number;
  }

  export class FileTrack extends Track {
    manager: AudioManager;
    buffer: AudioBuffer;
    source: AudioBufferSourceNode | null;
    playStartTime: number;
    resumeTime: number;
    state: PlayState;

    constructor(manager: AudioManager, buffer: AudioBuffer) {
      super();
      this.manager = manager;
      this.buffer = buffer;
      this.source = null;
      this.playStartTime = 0;
      this.resumeTime = 0;
      this.state = PlayState.UNSTARTED;
    }

    play(): void {
      this.source = this.manager.context.createBufferSource();
      this.source.buffer = this.buffer;
      this.source.connect(this.manager.output);
      this.playStartTime = this.manager.getTime();
      this.setState(PlayState.PLAYING);
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
          this.resumeTime = this.manager.getTime() - this.playStartTime;
          if (this.resumeTime > this.getDuration()) {
            this.resumeTime = 0;
            this.setState(PlayState.STOPPED);
          } else {
            this.setState(PlayState.PAUSED);
          }
        }
      }
      this.playStartTime = this.manager.getTime() - this.resumeTime;
      this.setState(PlayState.PLAYING);
      this.source.start(0, this.resumeTime, duration);
    }

    pause(): void {
      if (this.state === PlayState.PAUSED || this.state === PlayState.STOPPED) return;
      this.resumeTime = this.manager.getTime() - this.playStartTime;
      if (this.source) {
        this.source.stop();
      }
      this.setState(PlayState.PAUSED);
    }

    stop(): void {
      this.resumeTime = 0;
      if (this.source) {
        this.source.stop();
      }
      this.setState(PlayState.STOPPED);
    }

    exit(): void {
      super.exit();
      this.stop();
    }

    getState(): PlayState {
      return this.state;
    }

    getTime(): number {
      if (this.state === PlayState.UNSTARTED) {
        return 0;
      }
      else if (this.state === PlayState.PAUSED || this.state === PlayState.STOPPED) {
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

    private setState(state: PlayState): void {
      this.state = state;
      this.emit(state);
    }
  }

  export class YoutubeTrack extends Track {
    private timeoutHandle?: number;

    constructor(readonly player: YT.Player, readonly id: string) {
      super();
    }

    preload(): Promise<void> {
      return new Promise((resolve) => {
        let loaded = false;
        const onStateChange: YT.PlayerStateChangeListener = ({ data }) => {
          if (data === YT.PlayerState.PLAYING) {
            if (!loaded) {
              loaded = true;
              this.player.pauseVideo();
              this.player.seekTo(0);
              this.player.unMute();
              resolve();
            }
          }
          this.emit(this.mapState(data));
        };
        this.player.addEventListener('onStateChange', onStateChange);
        this.player.mute();
        this.player.loadVideoById(this.id);
      });
    }

    play(): void {
      this.clearTimeout();
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

    getState(): PlayState {
      return this.mapState(this.player.getPlayerState());
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

    private mapState(ytState: YT.PlayerState): PlayState {
      switch (ytState) {
        case YT.PlayerState.PLAYING:
          return PlayState.PLAYING;
        case YT.PlayerState.ENDED:
          return PlayState.STOPPED;
        case YT.PlayerState.UNSTARTED:
        case YT.PlayerState.CUED:
          return PlayState.UNSTARTED;
        case YT.PlayerState.BUFFERING:
        case YT.PlayerState.PAUSED:
          return PlayState.PAUSED;
      }
    }
  }
}
