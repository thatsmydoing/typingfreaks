/// <reference path="kana.ts" />

let input = 'ちっじゃう';
let inputState = new kana.KanaInputState(input);

let container = document.querySelector('#container');
let kanaElement = document.createElement('p');
kanaElement.textContent = input;
container.appendChild(kanaElement);
let romajiElement = document.createElement('p');
romajiElement.textContent = input;
container.appendChild(romajiElement);

romajiElement.textContent = inputState.getRemainingInput();
document.addEventListener('keydown', event => {
  inputState.handleInput(event.key);
  romajiElement.textContent = inputState.getRemainingInput();
});
