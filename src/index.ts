/// <reference path="display.ts" />
/// <reference path="level.ts" />
/// <reference path="audio.ts" />

let audioManager = new audio.AudioManager();
let container = document.querySelector('#container');

level.loadFromJson('levels.json').then(levelsets => {
  let controller = new display.LevelController(audioManager, levelsets[0].levels[0]);
  container.appendChild(controller.element);
});
