import * as audio from '../audio';
import * as level from '../level';
import * as util from '../util';
import * as youtube from '../youtube';
import { LevelEditor } from './level';
import { LevelSetEditor } from './levelSet';

class ConfigEditor {
  containerElement: HTMLDivElement;
  openScreen: HTMLDivElement;
  configScreen: HTMLDivElement;

  openFileElement: HTMLInputElement;

  navigationElement: HTMLElement;
  levelsElement: HTMLDivElement;

  levelEditor: LevelEditor;
  audioManager: audio.AudioManager;

  config: level.Config | null;
  currentLevel: level.Level | null;

  constructor() {
    this.containerElement = util.getElement(document, '#container');
    this.openScreen = util.getElement(document, '#open-screen');

    this.openFileElement = util.getElement(this.openScreen, '#open-file');
    this.openFileElement.addEventListener('change', () => {
      this.load();
    });
    util.getElement(document, '#open-new').addEventListener('click', () => {
      this.create();
    });

    this.configScreen = util.getElement(document, '#config-screen');
    this.navigationElement = util.getElement(document, '#config-navigation');
    this.levelsElement = util.getElement(document, '#config-levels');

    util.getElement(document, '#config-add').addEventListener('click', () => {
      this.addLevelSet();
    });
    util
      .getElement(document, '#config-download')
      .addEventListener('click', () => {
        this.download();
      });
    util.getElement(document, '#config-close').addEventListener('click', () => {
      this.close();
    });

    this.levelEditor = new LevelEditor(
      () => {
        this.containerElement.classList.remove('editing');
        this.currentLevel = null;
      },
      (lines) => {
        this.currentLevel!.lines = lines;
        this.persistConfig();
      }
    );
    this.audioManager = new audio.AudioManager();

    this.config = null;
    this.currentLevel = null;

    const storedConfig = localStorage.getItem('LEVELS_JSON');
    this.updateConfig(storedConfig === null ? null : JSON.parse(storedConfig));
  }

  updateConfig(config: level.Config | null) {
    this.config = config;
    this.containerElement.classList.toggle('loaded', config !== null);
    this.persistConfig();
    this.render();
  }

  persistConfig() {
    if (this.config !== null) {
      localStorage.setItem('LEVELS_JSON', JSON.stringify(this.config));
    } else {
      localStorage.removeItem('LEVELS_JSON');
    }
  }

  create() {
    this.updateConfig({
      background: 'royalblue',
      selectMusic: null,
      baseColor: 'white',
      highlightColor: 'cyan',
      contrastColor: 'black',
      selectSound: 'select.wav',
      decideSound: 'decide.wav',
      levelSets: [],
    });
  }

  load() {
    const file = this.openFileElement.files?.[0];
    if (file !== undefined) {
      file.arrayBuffer().then((buffer) => {
        const decoder = new TextDecoder();
        this.updateConfig(JSON.parse(decoder.decode(buffer)));
      });
    }
  }

  download() {
    const a = document.createElement('a');
    const url = URL.createObjectURL(new Blob([JSON.stringify(this.config)]));
    a.href = url;
    a.download = 'levels.json';
    a.click();

    URL.revokeObjectURL(url);
  }

  close() {
    if (confirm('Are you sure you want to close?')) {
      this.updateConfig(null);
    }
  }

  render() {
    if (this.config === null) {
      return;
    }
    this.levelsElement.textContent = '';
    this.navigationElement.textContent = '';

    this.config.levelSets.forEach((levelSet, index) => {
      const a = document.createElement('a');
      a.href = `#level-set-${index}`;
      a.textContent = levelSet.name;
      this.navigationElement.appendChild(a);

      new LevelSetEditor(
        this.levelsElement,
        index,
        levelSet,
        () => {
          this.persistConfig();
          this.render();
        },
        (level) => this.edit(level),
        (index, direction) => this.moveLevelSet(index, direction),
        (index) => this.removeLevelSet(index)
      );
    });
  }

  async edit(level: level.Level) {
    const track = level.audio ? await this.loadAudio(level.audio) : null;
    this.currentLevel = level;
    this.containerElement.classList.add('editing');
    this.levelEditor.load(level.name, level.lines, track);
  }

  async loadAudio(url: string): Promise<audio.Track> {
    const youtubeContainer = util.getElement(document, '#youtube');
    youtubeContainer.textContent = '';

    const videoId = youtube.getVideoId(url);
    if (videoId !== null) {
      const element = document.createElement('div');
      youtubeContainer.appendChild(element);
      return await this.audioManager.loadTrackFromYoutube(
        videoId,
        element,
        () => {}
      );
    }

    const fileLoader = document.createElement('input');
    fileLoader.type = 'file';
    fileLoader.accept = 'audio/*';
    return await new Promise((resolve, reject) => {
      fileLoader.addEventListener('change', () => {
        const file = fileLoader.files![0];
        if (file !== null) {
          resolve(this.audioManager.loadTrackFromFile(file));
        } else {
          reject('Cancelled');
        }
      });
      fileLoader.click();
    });
  }

  addLevelSet() {
    if (this.config !== null) {
      this.config.levelSets.push({
        name: 'New Level Set',
        levels: [],
      });
      this.persistConfig();
      this.render();
    }
  }

  moveLevelSet(index: number, direction: number): void {
    if (this.config === null) {
      return;
    }
    const target = index + direction;
    if (target < 0) {
      return;
    }
    if (target >= this.config.levelSets.length) {
      return;
    }

    const level = this.config.levelSets[index];
    this.config.levelSets.splice(index, 1);
    this.config.levelSets.splice(target, 0, level);
    this.persistConfig();
    this.render();
  }

  removeLevelSet(index: number): void {
    if (this.config === null) {
      return;
    }
    const level = this.config.levelSets[index];
    if (confirm(`Are you sure you want to remove ${level.name}?`)) {
      this.config.levelSets.splice(index, 1);
      this.persistConfig();
      this.render();
    }
  }
}

const editor = new ConfigEditor();

// @ts-ignore
window.editor = editor;
