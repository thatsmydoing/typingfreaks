/// <reference path="../display.ts" />
/// <reference path="common.ts" />

namespace game {
  import Level = level.Level;

  export class TypingScreen extends ScreenManager implements Screen {
    readonly name: string = 'game';
    gameController: display.LevelController;

    constructor(
      readonly context: GameContext,
      readonly level: Level,
      readonly prevScreen: Screen
    ) {
      super(context.container);
    }

    enter(): void {
      let gameContainer = this.context.container.querySelector('#game');
      util.clearChildren(gameContainer);
      this.gameController = new display.LevelController(this.context.audioManager, this.level);
      gameContainer.appendChild(this.gameController.element);
    }

    handleInput(key: string): void {
      if (key === 'Escape') {
        this.returnToSelect();
      } else {
        this.gameController.handleInput(key);
      }
    }

    returnToSelect(): void {
      this.context.switchScreen(this.prevScreen);
    }

    exit(): void {
      this.gameController.destroy();
    }
  }
}
