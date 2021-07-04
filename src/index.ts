import { MainController } from './game';

const query = new URLSearchParams(location.search);
const fromEditor = query.get('from') === 'editor';

new MainController(
  document.querySelector('#container')!,
  document.querySelector('#levels')?.textContent!,
  fromEditor
).start();
