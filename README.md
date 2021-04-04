# Typingfreaks

This is a clone of an old flash game called TypingMania. It's a speed typing
game where you type lyrics (typically in Japanese) in time with the song.

There are many differences from the original and full compatibility is not a
goal.

 * scoring is different (still in flux)
 * you're allowed to skip a single character, this is to make finishing the
   songs more feasible but counts as a miss
 * the displayed text is in Hepburn romanization but still supports other
   romanizations for input
 * YouTube support for songs (still experimental)

You might also be interested in [innocenat's clone][1].

## Gameplay Instructions

The initial screen shows available songs. You can navigate left/right through
folders and up/down through songs. Space or enter will select a song. Escape or
backspace can be used to go back out.

## Install

Get the [latest release][2] and unzip it. Edit the `levels.json` with your own
songs. Then simply serve it as a static site.

### Config

The [config](assets/levels.json) is a simple JSON file with the following
properties:

The following accept any CSS color

 * `background` - the default background
 * `baseColor` - base color of all text and UI elements
 * `highlightColor` - accent color mainly for selections

The following let you customize the sound effects by specifying files relative
to the `index.html`. Defaults are provided so there's no need to modify them
unless you want to.

 * `selectSound` - sound effect when navigating
 * `decideSound` - sound effect when entering a song

The `levelSets` property describes the "folder" structure. It expects an array
of the following:

 * `name` - name of the folder
 * `levels` - an array of level data

Level data has the following properties (a lot of the weird naming is inherited
from TypingMania).

 * `name` - name of the song
 * `creator` - artist of the song
 * `genre` - "genre" of the song, but can be used for anything
 * `difficulty` - a number to show beside the song
 * `audio` - path to the audio file or a youtube video
 * `background` - path to an image to serve as the background, if not specified,
                  it shows the video otherwise just uses the default background
 * `songLink` - a link back to the source of the song
 * `lines` - array containing lyrics and timing data

Lines contain the following properties:

 * `kanji` - display lyrics of the song, has no effect on the game
 * `kana` - the kana for the lyrics, this is what's used for the game
 * `start` - start time of the segment in seconds
 * `end` - end time of the segment in seconds

If `audio` is not specified, `lines` does not need to specify timing
information. It will just act like a normal untimed typing game.

### TypingMania

If the `levels.json` property in `index.html` is changed to a folder instead, we
try to load the folder assuming it contains TypingMania data (`settings.xml`,
`folderlist.xml`, etc.). I haven't tested this extensively so there could be
incompatibilities.

## Editor

There is a provided editor that's quite rough. It's main purpose is to help with
creating the `lines` property of the levels. You can load a youtube or an audio
file and place marks to split the sections. Lyrics can be input in the text
areas. You can then export it to a JSON string which you can just paste into
`levels.json`. You can also import from an existing JSON string to edit a level.

## Build Instructions

The project is a vanilla typescript project. Simply run:

```
npm install
npm run build
```

[1]: https://github.com/innocenat/typingmania
[2]: https://github.com/thatsmydoing/typingfreaks/releases/latest
