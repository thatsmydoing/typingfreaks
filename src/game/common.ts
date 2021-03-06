import * as audio from '../audio';
import * as background from '../background';
import * as level from '../level';

export interface Screen {
  readonly name: string;
  handleInput(key: string): void;
  enter(): void;
  exit(): void;
  transitionExit(): void;
}

export class ScreenManager {
  activeScreen: Screen | null = null;
  lastScreen: Screen | null = null;
  pendingExit: boolean = false;

  constructor(readonly container: HTMLElement) {
    this.container.addEventListener(
      'transitionend',
      (event: TransitionEvent) => {
        if (this.pendingExit && event.propertyName === 'opacity') {
          this.finishExit();
        }
      }
    );
  }

  switchScreen(nextScreen: Screen | null): void {
    if (this.pendingExit) {
      this.finishExit();
    }
    if (this.activeScreen != null) {
      this.container.classList.remove(this.activeScreen.name);
      this.pendingExit = true;
      this.lastScreen = this.activeScreen;
      this.activeScreen.exit();
    }
    this.activeScreen = nextScreen;
    if (nextScreen != null) {
      nextScreen.enter();
      this.container.classList.add(nextScreen.name);
    }
  }

  finishExit() {
    this.pendingExit = false;
    if (this.lastScreen !== null) {
      this.lastScreen.transitionExit();
      this.lastScreen = null;
    }
  }
}

interface GameSounds {
  selectSound: audio.FileTrack | null;
  decideSound: audio.FileTrack | null;
}

export interface GameContext {
  container: HTMLElement;
  audioManager: audio.AudioManager;
  bgManager: background.BackgroundManager;
  loadTemplate: (id: string) => DocumentFragment;
  assets: GameSounds | null;
  config: level.Config | null;

  switchScreen(screen: Screen): void;
}
