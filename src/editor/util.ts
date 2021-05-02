import * as util from '../util';

export function makePropertyEditor(
  container: HTMLElement,
  value: string | null,
  save: (value: string) => void,
  render: (value: string | null) => HTMLElement = (value) =>
    util.createElement('span', value)
) {
  const display = render(value);
  container.addEventListener(
    'click',
    () => {
      const form = document.createElement('form');
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        save(input.value);
        form.remove();
        makePropertyEditor(container, input.value, save, render);
      });

      const input = document.createElement('input');
      input.value = value ?? '';
      const button = util.createElement('button', 'Save');

      form.appendChild(input);
      form.appendChild(button);

      display.remove();
      container.appendChild(form);
      input.focus();
    },
    { once: true }
  );

  container.appendChild(display);
}
