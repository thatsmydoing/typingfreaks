import { Level, LevelSet, calculateSpeed, calculateLines } from '../level';
import * as util from '../util';
import { GameContext, Screen } from './common';
import { TypingScreen } from './typing';

export class SelectScreen implements Screen {
  readonly name: string = 'select';
  folderInfo: HTMLElement;
  songInfo: HTMLElement;
  songList: HTMLElement;
  currentFolderIndex: number;
  folderController: FolderSelectController;
  listControllers: SongListController[];
  init: boolean;

  get levelSets() {
    return this.context.config!.levelSets;
  }

  get currentLevelSet() {
    return this.levelSets[this.currentFolderIndex];
  }

  get activeListController() {
    return this.listControllers[this.currentFolderIndex];
  }

  constructor(private context: GameContext) {
    let container = context.container;
    this.folderInfo = util.getElement(container, '#folder-info');
    this.currentFolderIndex = 0;
    this.songInfo = util.getElement(container, '#song-info');
    this.songList = util.getElement(container, '#song-list');

    this.songList.addEventListener('wheel', (event) => {
      event.preventDefault();
      this.activeListController.handleScroll(event.deltaY);
    });

    this.listControllers = [];
    this.levelSets.forEach((levelSet) => {
      let controller = new SongListController(
        this.context,
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

  enter(): void {
    this.context.bgManager.setBackground(this.context.config!.background);
    this.folderController.listeners.attach();
  }

  handleInput(key: string): void {
    this.activeListController.handleInput(key);
    this.folderController.handleInput(key);
  }

  selectSong(index: number): void {
    const { selectSound } = this.context.assets!;
    if (!this.init && selectSound !== null) {
      selectSound.play();
    }
    let level = this.currentLevelSet.levels[index];
    this.songInfo.querySelector('.genre')!.textContent = level.genre;
    this.songInfo.querySelector('.creator')!.textContent = level.creator;
    this.songInfo.querySelector('.title')!.textContent = level.name;
    const linkContainer = this.songInfo.querySelector('.link')!;
    linkContainer.innerHTML = '';
    if (level.songLink) {
      const link = document.createElement('a');
      link.href = level.songLink;
      link.target = '_blank';
      link.textContent = 'More info';
      linkContainer.appendChild(link);
    }

    const { lines, average } =
      level.audio == null ? calculateLines(level) : calculateSpeed(level);

    let lengthText = `${lines} lines`;
    if (average > 0) {
      lengthText += ` / ${Math.floor(average * 60)} KPM`;
    }
    this.songInfo.querySelector('.length')!.textContent = lengthText;
  }

  chooseSong(index: number): void {
    const { decideSound } = this.context.assets!;
    if (decideSound !== null) {
      decideSound.play();
    }
    let level = this.currentLevelSet.levels[index];
    let gameScreen = new TypingScreen(this.context, level, this);
    this.context.switchScreen(gameScreen);
  }

  selectLevelSet(index: number): void {
    this.currentFolderIndex = index;
    util.clearChildren(this.songList);
    this.songList.appendChild(this.activeListController.element);
    this.selectSong(this.activeListController.currentIndex);
  }

  exit(): void {
    this.folderController.listeners.detach();
  }

  transitionExit(): void {}
}

class FolderSelectController {
  labelElement: HTMLElement;
  levelSets: LevelSet[];
  currentIndex: number;
  onFolderChange: (index: number) => void;
  listeners: util.ListenersManager;

  constructor(
    element: HTMLElement,
    levelSets: LevelSet[],
    onFolderChange: (index: number) => void
  ) {
    this.labelElement = util.getElement(element, '.label');
    this.levelSets = levelSets;
    this.currentIndex = 0;
    this.onFolderChange = onFolderChange;
    this.listeners = new util.ListenersManager();
    this.listeners.add(element.querySelector('.left')!, 'click', () =>
      this.scroll(-1)
    );
    this.listeners.add(element.querySelector('.right')!, 'click', () =>
      this.scroll(1)
    );

    this.scroll(0);
  }

  handleInput(key: string): void {
    if (key === 'ArrowLeft' || key === 'h') {
      this.scroll(-1);
    } else if (key === 'ArrowRight' || key === 'l') {
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

class SongListController {
  element: HTMLElement;
  levels: Level[];
  currentIndex: number;
  onSongChange: (index: number) => void;
  onSongChoose: (index: number) => void;

  constructor(
    context: GameContext,
    levels: Level[],
    onSongChange: (index: number) => void,
    onSongChoose: (index: number) => void
  ) {
    this.element = document.createElement('div');
    this.levels = levels;
    this.currentIndex = 0;
    this.onSongChange = onSongChange;
    this.onSongChoose = onSongChoose;

    this.element.className = 'song-list';
    this.element.style.marginTop = '12.5em';

    this.levels.forEach((level, index) => {
      let element = context.loadTemplate('song-item');
      element.querySelector('.creator')!.textContent = level.creator;
      element.querySelector('.title')!.textContent = level.name;
      element.querySelector('.difficulty')!.textContent = level.difficulty;
      element
        .querySelector('.song-item')!
        .addEventListener('click', (event) => this.click(index));
      this.element.appendChild(element);
    });
    this.element.children[0].classList.add('selected');
  }

  handleInput(key: string): void {
    if (key === 'ArrowUp' || key === 'k') {
      this.scroll(-1);
    } else if (key === 'ArrowDown' || key === 'j') {
      this.scroll(1);
    } else if (key === 'PageUp') {
      this.scroll(-5);
    } else if (key === 'PageDown') {
      this.scroll(5);
    } else if (key === ' ' || key === 'Enter') {
      this.choose();
    }
  }

  handleScroll(deltaY: number): void {
    if (deltaY > 0) {
      this.scroll(1);
    } else if (deltaY < 0) {
      this.scroll(-1);
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

    let offset = 12.5 - index * 2.5;
    this.element.style.marginTop = offset + 'em';

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
