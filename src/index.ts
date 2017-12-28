/// <reference path="util.ts" />
/// <reference path="game.ts" />

util.loadBase();
let container: HTMLElement = document.querySelector('#container');
let controller = new game.MainController(container, 'levels.json');
controller.start();
