/// <reference path="game.ts" />

let container = document.querySelector('#container');
let controller = new game.GameController(container, 'levels.json');
controller.stateLoading();
