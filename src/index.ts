/// <reference path="display.ts" />

let container = document.querySelector('#container');
let controller = new display.MainAreaController();
container.appendChild(controller.element);
controller.setData('大丈夫ですか', 'だいじょうぶですか');
