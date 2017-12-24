/// <reference path="display.ts" />
/// <reference path="level.ts" />

let container = document.querySelector('#container');

level.loadFromJson('levels.json').then(levelsets => {
  let controller = new display.LevelController(levelsets[0].levels[0]);
  container.appendChild(controller.element);
});
