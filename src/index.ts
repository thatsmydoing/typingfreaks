/// <reference path="display.ts" />
/// <reference path="level.ts" />

let container = document.querySelector('#container');

level.loadFromJson('jugemu.json').then(level => {
  let controller = new display.LevelController(level);
  container.appendChild(controller.element);
});
