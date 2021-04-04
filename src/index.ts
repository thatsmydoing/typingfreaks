import { MainController } from './game';

new MainController(
  document.querySelector('#container')!,
  'levels.json'
).start();
