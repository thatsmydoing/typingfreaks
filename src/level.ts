/**
 * This module represents the levels for the game. Each level consists of lines
 * that you have to complete. Each line has the kanji of the line, which is used
 * solely for display and the kana of the line which the input is based.
 */
namespace level {
  export interface Line {
    kanji: string,
    kana: string,
    start?: number,
    end?: number
  }

  export interface Level {
    name: string,
    creator?: string,
    genre?: string,
    difficulty?: string,
    audio?: string,
    background?: string,
    lines: Line[]
  }

  export interface LevelSet {
    name: string,
    levels: Level[]
  }

  export interface Config {
    background: string,
    selectMusic?: string,
    selectSound: string,
    decideSound: string,
    baseColor: string,
    highlightColor: string,
    levelSets: LevelSet[]
  }

  export function loadFromJson(url: string): Promise<Config> {
    return window.fetch(url)
      .then(response => response.json())
  }

  let parser = new DOMParser();

  function parseXML(response: Response): Promise<Document> {
    return response.text().then(text => {
      let normalized = text.replace(/[“”]/g, '"');
      return parser.parseFromString(normalized, "text/xml");
    });
  }

  export function loadFromTM(base: string): Promise<Config> {
    let settingsXML = window.fetch(base+'/settings.xml').then(parseXML);
    let levelSets = window.fetch(base+'/folderlist.xml')
      .then(parseXML)
      .then(dom => parseTMFolderList(base, dom));

    return Promise.all([settingsXML, levelSets]).then(pair => {
      return parseTMSettings(base, pair[1], pair[0]);
    })
  }

  function parseTMSettings(base: string, levelSets: LevelSet[], dom: Document): Config {
    function getData(tag: string): string | null {
      let elem = dom.querySelector(tag);
      if (elem === null) {
        return null;
      } else {
        return base+'/'+elem.getAttribute('src');
      }
    }

    let background = getData('background');
    let selectMusic = getData('selectmusic');
    let selectSound = getData('selectsound');
    let decideSound = getData('decidesound');

    return {
      background,
      baseColor: 'white',
      highlightColor: 'blue',
      selectMusic,
      selectSound,
      decideSound,
      levelSets
    }
  }

  function parseTMFolderList(base: string, dom: Document): Promise<LevelSet[]> {
    let folderList = dom.querySelectorAll('folder');
    let promises = [];
    for (let i = 0; i < folderList.length; ++i) {
      let folder = folderList[i];
      let name = folder.getAttribute('name');
      let path = folder.getAttribute('path');

      let promise = window.fetch(base+'/'+path)
        .then(parseXML)
        .then(dom => parseTMFolder(base, name, dom))

      promises.push(promise);
    }
    return Promise.all(promises);
  }

  function parseTMFolder(base: string, name: string, dom: Document): Promise<LevelSet> {
    let musicList = dom.querySelectorAll('musicinfo');
    let promises = [];
    for (let i = 0; i < musicList.length; ++i) {
      let musicInfo = musicList[i];
      let xmlPath = base+'/'+musicInfo.getAttribute('xmlpath');
      let audioPath = base+'/'+musicInfo.getAttribute('musicpath');

      function getData(tag: string): string | null {
        let elem = musicInfo.querySelector(tag);
        if (elem === null) {
          return null;
        } else {
          return elem.textContent;
        }
      }

      let name = getData('musicname');
      let creator = getData('artist');
      let genre = getData('genre');
      let difficulty = getData('level');

      let promise = window.fetch(xmlPath)
        .then(parseXML)
        .then(parseTMSong)
        .then(lines => {
          return {
            name,
            creator,
            genre,
            difficulty,
            audio: audioPath,
            lines
          }
        })

      promises.push(promise);
    }
    return Promise.all(promises)
      .then(levels => {
        return { name, levels }
      })
  }

  function parseTMSong(dom: Document): Line[] {
    let kanjiList = dom.querySelectorAll('nihongoword');
    let kanaList = dom.querySelectorAll('word');
    let intervalList = dom.querySelectorAll('interval');

    let lines: Line[] = [];
    let time = 0;
    for (let i = 0; i < intervalList.length; ++i) {
      let start = time;
      time += parseInt(intervalList[i].textContent) / 1000

      lines.push({
        kanji: kanjiList[i].textContent,
        kana: kanaList[i].textContent,
        start: start,
        end: time
      })
    }
    return lines;
  }
}
