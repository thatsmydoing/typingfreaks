// types for https://developers.google.com/youtube/iframe_api_reference
// not everything is listed here

declare var onYouTubeIframeAPIReady: () => void;

declare namespace YT {
  interface PlayerOptions {
    height: number;
    width: number;
    videoId?: string;
    events?: Partial<PlayerEvents>;
    playerVars?: Partial<PlayerVars>;
  }

  type PlayerReadyListener = (event: unknown) => void;
  type PlayerStateChangeListener = (event: { data: PlayerState }) => void;
  type PlayerErrorListener = (event: { data: PlayerError }) => void;

  interface PlayerEvents {
    onReady: PlayerReadyListener;
    onStateChange: PlayerStateChangeListener;
    onError: PlayerErrorListener;
  }

  interface PlayerVars {
    controls: number;
    disablekb: number;
    modestbranding: number;
    rel: number;
    iv_load_policy: number;
    fs: number;
  }

  enum PlayerState {
    UNSTARTED = -1,
    ENDED     = 0,
    PLAYING   = 1,
    PAUSED    = 2,
    BUFFERING = 3,
    CUED      = 5,
  }

  enum PlayerError {
    INVALID_PARAM    = 2,
    PLAYBACK_ERROR   = 5,
    NOT_FOUND        = 100,
    CANNOT_EMBED     = 101,
    CANNOT_EMBED_ALT = 150,
  }

  class Player {
    constructor(element: string | HTMLElement, options: PlayerOptions);

    loadVideoById(id: string, startSeconds?: number): void;
    cueVideoById(id: string, startSeconds?: number): void;
    playVideo(): void;
    pauseVideo(): void;
    stopVideo(): void;
    seekTo(seconds: number, allowSeekAhead?: boolean): void;

    getVideoLoadedFraction(): number;
    getPlayerState(): PlayerState;
    getCurrentTime(): number;
    getDuration(): number;

    addEventListener(event: 'onReady', listener: PlayerReadyListener): void;
    addEventListener(event: 'onStateChange', listener: PlayerStateChangeListener): void;
    addEventListener(event: 'onError', listener: PlayerErrorListener): void;
  }
}
