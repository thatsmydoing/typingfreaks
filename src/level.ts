/**
 * This module represents the levels for the game. Each level consists of lines
 * that you have to complete. Each line has the kanji of the line, which is used
 * solely for display and the kana of the line which the input is based.
 */
namespace level {
  export interface Line {
    kanji: string,
    kana: string
  }

  export interface Level {
    lines: Line[]
  }

  export function loadFromJson(url: string): Promise<Level> {
    return window.fetch(url)
      .then(response => response.json())
  }
}
