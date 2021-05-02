import * as level from '../level';
import * as util from '../util';
import { makePropertyEditor } from './util';

export class LevelSetEditor {
  constructor(
    containerElement: HTMLElement,
    index: number,
    readonly levelSet: level.LevelSet,
    readonly save: () => void,
    editLevel: (level: level.Level) => void,
    moveLevelSet: (index: number, direction: number) => void,
    removeLevelSet: (index: number) => void
  ) {
    const fragment = util.loadTemplate(document, 'level-set');
    util.getElement(fragment, '.level-set').id = `level-set-${index}`;
    makePropertyEditor(
      util.getElement(fragment, '.name'),
      levelSet.name,
      (value) => {
        levelSet.name = value;
        this.save();
      },
      (value) => util.createElement('h2', value)
    );
    util
      .getElement(fragment, '.header .add-level')
      .addEventListener('click', () => {
        this.addLevel();
      });
    util
      .getElement(fragment, '.header .move-up')
      .addEventListener('click', () => {
        moveLevelSet(index, -1);
      });
    util
      .getElement(fragment, '.header .move-down')
      .addEventListener('click', () => {
        moveLevelSet(index, 1);
      });
    util
      .getElement(fragment, '.header .remove')
      .addEventListener('click', () => {
        removeLevelSet(index);
      });

    const levelList = util.getElement(fragment, '.level-list tbody');

    levelSet.levels.forEach((level, index) => {
      const fragment = util.loadTemplate(document, 'level-list-item');
      this.makeLevelPropertyEditor(
        util.getElement(fragment, '.name'),
        level,
        'name'
      );
      this.makeLevelPropertyEditor(
        util.getElement(fragment, '.creator'),
        level,
        'creator'
      );
      this.makeLevelPropertyEditor(
        util.getElement(fragment, '.genre'),
        level,
        'genre'
      );
      this.makeLevelPropertyEditor(
        util.getElement(fragment, '.difficulty'),
        level,
        'difficulty'
      );
      this.makeLevelPropertyEditor(
        util.getElement(fragment, '.audio'),
        level,
        'audio',
        (value) => {
          if (value === null) {
            const elem = document.createElement('i');
            elem.textContent = 'None';
            return elem;
          } else {
            const a = document.createElement('a');
            a.href = value ?? '';
            a.textContent = value;
            a.target = '_blank';
            return a;
          }
        }
      );
      this.makeLevelPropertyEditor(
        util.getElement(fragment, '.link'),
        level,
        'songLink',
        (value) => {
          const a = document.createElement('a');
          a.href = value ?? '';
          a.textContent = value;
          a.target = '_blank';
          return a;
        }
      );
      util.getElement(fragment, '.move-up').addEventListener('click', () => {
        this.moveLevel(index, -1);
      });
      util.getElement(fragment, '.move-down').addEventListener('click', () => {
        this.moveLevel(index, 1);
      });
      util
        .getElement(fragment, '.remove-level')
        .addEventListener('click', () => {
          this.removeLevel(index);
        });
      util
        .getElement(fragment, '.edit-lyrics')
        .addEventListener('click', () => {
          editLevel(level);
        });
      levelList.appendChild(fragment);
    });
    containerElement.appendChild(fragment);
  }

  makeLevelPropertyEditor(
    container: HTMLElement,
    level: level.Level,
    property:
      | 'name'
      | 'creator'
      | 'genre'
      | 'difficulty'
      | 'audio'
      | 'songLink',
    render?: (value: string | null) => HTMLElement
  ) {
    makePropertyEditor(
      container,
      level[property] ?? null,
      (value) => {
        if (property === 'audio' && value === '') {
          level[property] = null;
        } else {
          level[property] = value;
        }
        this.save();
      },
      render
    );
  }

  addLevel(): void {
    this.levelSet.levels.push({
      name: 'New Level',
      creator: null,
      genre: null,
      difficulty: null,
      audio: null,
      background: null,
      lines: [],
    });
    this.save();
  }

  moveLevel(index: number, direction: number): void {
    const target = index + direction;
    if (target < 0) {
      return;
    }
    if (target >= this.levelSet.levels.length) {
      return;
    }

    const level = this.levelSet.levels[index];
    this.levelSet.levels.splice(index, 1);
    this.levelSet.levels.splice(target, 0, level);
    this.save();
  }

  removeLevel(index: number): void {
    const level = this.levelSet.levels[index];
    if (confirm(`Are you sure you want to remove ${level.name}?`)) {
      this.levelSet.levels.splice(index, 1);
      this.save();
    }
  }
}
