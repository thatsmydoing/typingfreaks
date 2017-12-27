/// <reference path="game.ts" />

let container: HTMLElement = document.querySelector('#container');
let controller = new game.MainController(container, 'tm');
controller.start();
