/// <reference path="../display.ts" />
/// <reference path="../game.ts" />

namespace game {
  import Level = level.Level;

  export class TypingScreen implements Screen {
    readonly name: string = 'game';
    gameController: display.LevelController;

    constructor(
      readonly controller: MainController,
      readonly level: Level,
      readonly prevScreen: Screen
    ) {}

    enter(): void {
      let gameContainer = this.controller.container.querySelector('#game');
      util.clearChildren(gameContainer);
      this.gameController = new display.LevelController(this.controller.audioManager, this.level);
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
      this.controller.switchScreen(this.prevScreen);
    }

    exit(): void {
      this.gameController.destroy();
    }
  }
}
