/**
 * This module represents the levels for the game. Each level consists of lines
 * that you have to complete. Each line has the kanji of the line, which is used
 * solely for display and the kana of the line which the input is based.
 */

import { KANA_REGEX } from './kana';

export interface Line {
  kanji: string;
  kana: string;
  start?: number;
  end?: number;
}

export interface Level {
  name: string;
  creator: string | null;
  genre: string | null;
  difficulty: string | null;
  audio: string | null;
  background?: string | null;
  songLink?: string;
  lines: Line[];
}

export interface LevelSet {
  name: string;
  levels: Level[];
}

export interface Config {
  background: string;
  selectMusic: string | null;
  selectSound: string;
  decideSound: string;
  baseColor: string;
  highlightColor: string;
  contrastColor: string;
  levelSets: LevelSet[];
}

export async function loadFromLocalStorage(): Promise<Config> {
  const text = localStorage.getItem('LEVELS_JSON');
  if (text === null) {
    throw new Error('No LEVELS_JSON in local storage');
  } else {
    return JSON.parse(text);
  }
}

export async function loadFromJson(url: string): Promise<Config> {
  const response = await window.fetch(url);
  return await response.json();
}

let parser = new DOMParser();

async function parseXML(response: Response): Promise<Document> {
  const text = await response.text();
  let normalized = text.replace(/[“”]/g, '"');
  return parser.parseFromString(normalized, 'text/xml');
}

export async function loadFromTM(base: string): Promise<Config> {
  let settingsXML = window.fetch(base + '/settings.xml').then(parseXML);
  let levelSets = window
    .fetch(base + '/folderlist.xml')
    .then(parseXML)
    .then((dom) => parseTMFolderList(base, dom));

  const [settings, levels] = await Promise.all([settingsXML, levelSets]);
  return parseTMSettings(base, levels, settings);
}

function parseTMSettings(
  base: string,
  levelSets: LevelSet[],
  dom: Document
): Config {
  function getData(tag: string): string | null {
    let elem = dom.querySelector(tag);
    if (elem === null) {
      return null;
    } else {
      return base + '/' + elem.getAttribute('src');
    }
  }

  let background = getData('background');
  let selectMusic = getData('selectmusic');
  let selectSound = getData('selectsound');
  let decideSound = getData('decidesound');

  if (background === null) {
    throw new Error('background is not set');
  }
  if (decideSound === null) {
    throw new Error('decidesound is not set');
  }
  if (selectSound === null) {
    throw new Error('selectsound is not set');
  }

  return {
    background,
    baseColor: 'white',
    highlightColor: 'blue',
    contrastColor: 'black',
    selectMusic,
    selectSound,
    decideSound,
    levelSets,
  };
}

function parseTMFolderList(base: string, dom: Document): Promise<LevelSet[]> {
  let folderList = dom.querySelectorAll('folder');
  let promises = [];
  for (let i = 0; i < folderList.length; ++i) {
    let folder = folderList[i];
    let name = folder.getAttribute('name');
    let path = folder.getAttribute('path');

    if (name === null || path === null) {
      console.warn(`Invalid folder entry ${name} with path ${path}`);
      continue;
    }

    let promise = window
      .fetch(base + '/' + path)
      .then(parseXML)
      .then((dom) => parseTMFolder(base, name!, dom));

    promises.push(promise);
  }
  return Promise.all(promises);
}

async function parseTMFolder(
  base: string,
  name: string,
  dom: Document
): Promise<LevelSet> {
  let musicList = dom.querySelectorAll('musicinfo');
  let promises = [];
  for (let i = 0; i < musicList.length; ++i) {
    let musicInfo = musicList[i];
    let xmlPath = base + '/' + musicInfo.getAttribute('xmlpath');
    let audioPath = base + '/' + musicInfo.getAttribute('musicpath');

    function getData(tag: string): string | null {
      let elem = musicInfo.querySelector(tag);
      if (elem === null) {
        return null;
      } else {
        return elem.textContent;
      }
    }

    let name = getData('musicname') || '[Unknown]';
    let creator = getData('artist');
    let genre = getData('genre');
    let difficulty = getData('level');

    let promise = window
      .fetch(xmlPath)
      .then(parseXML)
      .then(parseTMSong)
      .then((lines) => {
        return {
          name,
          creator,
          genre,
          difficulty,
          audio: audioPath,
          lines,
        };
      });

    promises.push(promise);
  }
  const levels = await Promise.all(promises);
  return { name, levels };
}

function parseTMSong(dom: Document): Line[] {
  let kanjiList = dom.querySelectorAll('nihongoword');
  let kanaList = dom.querySelectorAll('word');
  let intervalList = dom.querySelectorAll('interval');

  let lines: Line[] = [];
  let time = 0;
  for (let i = 0; i < intervalList.length; ++i) {
    let start = time;
    const interval = intervalList[i].textContent;
    if (interval === null) {
      throw new Error(`Invalid interval: ${interval}`);
    }
    time += parseInt(interval) / 1000;

    lines.push({
      kanji: kanjiList[i].textContent || '',
      kana: kanaList[i].textContent || '',
      start: start,
      end: time,
    });
  }
  return lines;
}

interface LevelSpeed {
  lines: number;
  kana: number;
  average: number;
  maximum: number;
}

export function calculateLines(level: Level): LevelSpeed {
  const lines = level.lines.length;
  const kana = level.lines.reduce((acc, line) => acc + countKana(line.kana), 0);
  return {
    lines,
    kana,
    average: -1,
    maximum: -1,
  };
}

export function calculateSpeed(level: Level): LevelSpeed {
  let count = 0;
  let maximum = 0;
  let total = 0;
  let kanaTotal = 0;

  for (const line of level.lines) {
    if (line.kana === '' || line.kana === '@') {
      continue;
    }
    if (line.start === undefined || line.end === undefined) {
      continue;
    }

    const kanaCount = countKana(line.kana);
    const duration = line.end - line.start;
    const lineSpeed = kanaCount / duration;

    count += 1;
    maximum = Math.max(maximum, lineSpeed);
    total += lineSpeed;
    kanaTotal += kanaCount;
  }
  const average = total / count;
  return {
    lines: count,
    kana: kanaTotal,
    average,
    maximum,
  };
}

function countKana(input: string): number {
  return input.split('').reduce((acc, c) => {
    // non-kana is counted as half
    return (KANA_REGEX.test(c) ? 1 : 0.5) + acc;
  }, 0);
}
