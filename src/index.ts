import { MainController } from './game';

new MainController(
  document.querySelector('#container')!,
  document.querySelector('#levels')?.textContent!
).start();
