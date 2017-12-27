/// <reference path="game.ts" />
/// <reference path="util.ts" />

namespace game {
  export class SelectScreen {
    controller: MainController;
    folderInfo: HTMLElement;
    songInfo: HTMLElement;
    songList: HTMLElement;
    currentFolderIndex: number;
    folderController: FolderSelectController;
    listControllers: SongListController[];
    init: boolean;

    get levelSets() {
      return this.controller.config.levelSets;
    }

    get currentLevelSet() {
      return this.levelSets[this.currentFolderIndex];
    }

    get activeListController() {
      return this.listControllers[this.currentFolderIndex];
    }

    constructor(controller: MainController) {
      this.controller = controller;
      let container = controller.container;
      this.folderInfo = container.querySelector('#folder-info');
      this.songInfo = container.querySelector('#song-info');
      this.songList = container.querySelector('#song-list');

      this.listControllers = [];
      this.levelSets.forEach(levelSet => {
        let controller = new SongListController(
          levelSet.levels,
          (index) => this.selectSong(index),
          (index) => this.chooseSong(index)
        );
        this.listControllers.push(controller);
      });

      this.init = true;

      this.folderController = new FolderSelectController(
        this.folderInfo,
        this.levelSets,
        (index) => this.selectLevelSet(index)
      );

      this.init = false;
    }

    handleInput(key: string): void {
      this.activeListController.handleInput(key);
      this.folderController.handleInput(key);
    }

    selectSong(index: number): void {
      if (!this.init) {
        this.controller.assets.selectSound.play();
      }
      let songInfoComponent = new SongInfoComponent(this.currentLevelSet.levels[index]);
      util.clearChildren(this.songInfo);
      this.songInfo.appendChild(songInfoComponent.element);
    }

    chooseSong(index: number): void {
      this.controller.assets.decideSound.play();
      this.controller.onSongSelect(this.currentLevelSet.levels[index]);
    }

    selectLevelSet(index: number): void {
      this.currentFolderIndex = index;
      util.clearChildren(this.songList);
      this.songList.appendChild(this.activeListController.element);
      this.selectSong(this.activeListController.currentIndex);
    }
  }

  class FolderSelectController {
    labelElement: HTMLElement;
    levelSets: level.LevelSet[];
    currentIndex: number;
    onFolderChange: (index: number) => void;

    constructor(element: HTMLElement, levelSets: level.LevelSet[], onFolderChange: (index: number) => void) {
      this.labelElement = element.querySelector('.label');
      this.levelSets = levelSets;
      this.currentIndex = 0;
      this.onFolderChange = onFolderChange;

      element.querySelector('.left').addEventListener('click', () => this.scroll(-1));
      element.querySelector('.right').addEventListener('click', () => this.scroll(1));
      this.scroll(0);
    }

    handleInput(key: string): void {
      if (key === 'ArrowLeft') {
        this.scroll(-1);
      } else if (key === 'ArrowRight') {
        this.scroll(1);
      }
    }

    scroll(offset: number): void {
      this.currentIndex += offset;
      while (this.currentIndex < 0) {
        this.currentIndex += this.levelSets.length;
      }
      this.currentIndex %= this.levelSets.length;
      this.labelElement.textContent = this.levelSets[this.currentIndex].name;
      this.onFolderChange(this.currentIndex);
    }
  }

  class SongInfoComponent {
    element: DocumentFragment;

    constructor(level: level.Level) {
      this.element = util.loadTemplate('song-info');
      this.element.querySelector('.genre').textContent = level.genre;
      this.element.querySelector('.creator').textContent = level.creator;
      this.element.querySelector('.title').textContent = level.name;
    }
  }

  class SongListController {
    element: HTMLElement;
    levels: level.Level[];
    currentIndex: number;
    onSongChange: (index: number) => void;
    onSongChoose: (index: number) => void;

    constructor(
      levels: level.Level[],
      onSongChange: (index: number) => void,
      onSongChoose: (index: number) => void
    ) {
      this.element = document.createElement('div');
      this.levels = levels;
      this.currentIndex = 0;
      this.onSongChange = onSongChange;
      this.onSongChoose = onSongChoose;

      this.element.className = 'song-list';
      this.element.style.marginTop = '200px';

      this.levels.forEach((level, index) => {
        let element = util.loadTemplate('song-item');
        element.querySelector('.creator').textContent = level.creator;
        element.querySelector('.title').textContent = level.name;
        element.querySelector('.difficulty').textContent = level.difficulty;
        element.querySelector('.song-item').addEventListener('click', (event) => this.click(index));
        this.element.appendChild(element);
      });
      this.element.children[0].classList.add('selected');
    }

    handleInput(key: string): void {
      if (key === 'ArrowUp') {
        this.scroll(-1);
      } else if (key === 'ArrowDown') {
        this.scroll(1);
      } else if (key === 'PageUp') {
        this.scroll(-5);
      } else if (key === 'PageDown') {
        this.scroll(5);
      } else if (key === ' ') {
        this.choose();
      }
    }

    scroll(offset: number) {
      let target = this.currentIndex + offset;
      target = Math.max(0, Math.min(this.levels.length - 1, target));
      this.select(target);
    }

    click(index: number) {
      if (this.currentIndex === index) {
        this.choose();
      } else {
        this.select(index);
      }
    }

    select(index: number) {
      if (this.currentIndex === index) return;

      let offset = 200 - index * 40;
      this.element.style.marginTop = offset+'px';

      let nextElement = this.element.children[index] as HTMLElement;
      let currElement = this.element.children[this.currentIndex] as HTMLElement;
      currElement.classList.remove('selected');
      nextElement.classList.add('selected');
      this.currentIndex = index;
      this.onSongChange(index);
    }

    choose() {
      this.onSongChoose(this.currentIndex);
    }
  }
}
