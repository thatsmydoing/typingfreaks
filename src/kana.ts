/**
 * This module is mainly for handling romaji input to match the provided kana
 * input. While most kana map one-to-one with romaji, some kana have multiple
 * ways to be inputted. In addition, we also have to handle っ which causes the
 * next consonant to be repeated.
 *
 * The state management is done by having a state machine for each kana and it
 * should handle all possible variations of the romaji to be inputted.
 * Additionally, it also keeps track of what is left to be input, and adjusts
 * itself accordingly if an alternative romaji was used.
 *
 * One of the key considerations is handling っ. It doesn't have a spelling in
 * and of itself, but just modifies the state machine that will come after it.
 * Intermediate states need to be created and care should be given in what shows
 * up in the display.
 */

import * as state from './state';
import {
  State,
  StateMachine,
  makeTransition as t,
  mergeMachines,
  appendMachines,
  appendStates,
} from './state';

export const KANA_REGEX = /[ぁ-んァ-ン]/;

function literal(source: string, ...extraBoundaries: number[]): StateMachine {
  let transitions: state.Transition[] = [];
  let meta = 0;
  for (let i = 0; i < source.length; ++i) {
    let from = source.substring(i);
    let input = source.charAt(i);
    let to = source.substring(i + 1);
    if (i === source.length - 1 || extraBoundaries.indexOf(i) >= 0) {
      meta += 1;
    }
    transitions.push(t(from, input, to, meta));
  }
  return state.buildFromTransitions(source, transitions);
}

function shi(): StateMachine {
  return state.buildFromTransitions('shi', [
    t('shi', 's', 'hi'),
    t('hi', 'h', 'i'),
    t('hi', 'i', '', 1),
    t('i', 'i', '', 1),
  ]);
}

function chi(): StateMachine {
  return state.buildFromTransitions('chi', [
    t('chi', 'c', 'hi'),
    t('chi', 't', 'i'),
    t('hi', 'h', 'i'),
    t('i', 'i', '', 1),
  ]);
}

function tsu(): StateMachine {
  return state.buildFromTransitions('tsu', [
    t('tsu', 't', 'su'),
    t('su', 's', 'u'),
    t('su', 'u', '', 1),
    t('u', 'u', '', 1),
  ]);
}

function fu(): StateMachine {
  return state.buildFromTransitions('fu', [
    t('fu', 'f', 'u'),
    t('fu', 'h', 'u'),
    t('u', 'u', '', 1),
  ]);
}

function f(vowel: StateMachine): StateMachine {
  const end = vowel.initialState.display;
  return mergeMachines(literal(`f${end}`, 0), appendMachines(fu(), vowel));
}

function v(vowel: StateMachine): StateMachine {
  const end = vowel.initialState.display;
  return mergeMachines(
    literal(`v${end}`, 0),
    appendMachines(literal('vu'), vowel)
  );
}

function y(base: StateMachine, vowel: StateMachine): StateMachine {
  const newState = base.initialState.transform((state) => {
    return [
      state.display.replace(/i$/, vowel.initialState.display),
      state.meta,
    ];
  });
  const newVowelState = vowel.initialState.transform((state) => {
    return [state.display, state.meta + 1];
  });
  for (const state of newState.closure()) {
    for (const key in state.transitions) {
      const nextState = state.transitions[key];
      if (nextState.display === vowel.initialState.display) {
        state.transitions[key] = newVowelState;
      }
    }
  }
  return mergeMachines(
    new StateMachine(newState),
    appendMachines(base, SMALL_KANA_MAPPING.get(vowel)!)
  );
}

function ji(): StateMachine {
  return state.buildFromTransitions('ji', [
    t('ji', 'j', 'i'),
    t('ji', 'z', 'i'),
    t('i', 'i', '', 1),
  ]);
}

function sh(vowel: StateMachine): StateMachine {
  const end = vowel.initialState.display.replace(/^y/, '');
  let source = 'sh' + end;
  let middle = 'h' + end;

  return mergeMachines(
    state.buildFromTransitions(source, [
      t(source, 's', middle, 1),
      t(middle, 'h', end),
      t(middle, 'y', end),
      t(end, end, '', 2),
    ]),
    appendMachines(shi(), SMALL_KANA_MAPPING.get(vowel)!)
  );
}

function ch(vowel: StateMachine): StateMachine {
  const end = vowel.initialState.display.replace(/^y/, '');
  let source = 'ch' + end;
  let middle = 'h' + end;
  let altMiddle = 'y' + end;

  return mergeMachines(
    state.buildFromTransitions(source, [
      t(source, 'c', middle),
      t(middle, 'h', end, 1),
      t(source, 't', altMiddle, 1),
      t(altMiddle, 'y', end),
      t(end, end, '', 2),
    ]),
    appendMachines(chi(), SMALL_KANA_MAPPING.get(vowel)!)
  );
}

function j(vowel: StateMachine): StateMachine {
  const end = vowel.initialState.display.replace(/^y/, '');
  return mergeMachines(literal(`j${end}`, 0), y(ji(), vowel));
}

function smallTsu(base: StateMachine): StateMachine {
  let { display, transitions } = base.initialState;

  const newState = new State(display.charAt(0) + display, 0);
  Object.keys(transitions).forEach((k) => {
    const nextState = transitions[k];
    const intermediateState = new State(k, 0);
    intermediateState.addTransition(k, new State('', 1));
    newState.addTransition(k, appendStates(intermediateState, nextState));
  });

  return mergeMachines(
    new StateMachine(newState),
    appendMachines(SMALL_KANA_MAPPING.get(KANA_MAPPING['つ'])!, base)
  );
}

function smallKana(base: StateMachine): StateMachine {
  let newState = base.initialState.clone();
  newState.addTransition('l', base.initialState);
  newState.addTransition('x', base.initialState);
  return new StateMachine(newState);
}

function n(base: StateMachine): StateMachine {
  const allowSingleN = ['n', 'a', 'i', 'u', 'e', 'o', 'y'].every((k) => {
    return base.initialState.transition(k) === undefined;
  });

  if (allowSingleN) {
    return mergeMachines(
      appendMachines(literal('n'), base),
      appendMachines(literal('nn'), base)
    );
  } else {
    throw new Error(
      `Invalid base ${base.initialState.display}, just defer to literal`
    );
  }
}

interface KanaMapping {
  [index: string]: StateMachine;
}

interface StringMapping {
  [index: string]: string;
}

const WHITESPACE = state.buildFromTransitions('_', [
  t('_', '_', ''),
  t('_', ' ', ''),
]);

const KATAKANA_MAPPING: StringMapping = {
  ア: 'あ',
  イ: 'い',
  ウ: 'う',
  エ: 'え',
  オ: 'お',
  カ: 'か',
  キ: 'き',
  ク: 'く',
  ケ: 'け',
  コ: 'こ',
  サ: 'さ',
  シ: 'し',
  ス: 'す',
  セ: 'せ',
  ソ: 'そ',
  タ: 'た',
  チ: 'ち',
  ツ: 'つ',
  テ: 'て',
  ト: 'と',
  ナ: 'な',
  ニ: 'に',
  ヌ: 'ぬ',
  ネ: 'ね',
  ノ: 'の',
  ハ: 'は',
  ヒ: 'ひ',
  フ: 'ふ',
  ヘ: 'へ',
  ホ: 'ほ',
  マ: 'ま',
  ミ: 'み',
  ム: 'む',
  メ: 'め',
  モ: 'も',
  ヤ: 'や',
  ユ: 'ゆ',
  ヨ: 'よ',
  ラ: 'ら',
  リ: 'り',
  ル: 'る',
  レ: 'れ',
  ロ: 'ろ',
  ワ: 'わ',
  ヰ: 'ゐ',
  ヱ: 'ゑ',
  ヲ: 'を',
  ン: 'ん',
  ガ: 'が',
  ギ: 'ぎ',
  グ: 'ぐ',
  ゲ: 'げ',
  ゴ: 'ご',
  ザ: 'ざ',
  ジ: 'じ',
  ズ: 'ず',
  ゼ: 'ぜ',
  ゾ: 'ぞ',
  ダ: 'だ',
  ヂ: 'ぢ',
  ヅ: 'づ',
  デ: 'で',
  ド: 'ど',
  バ: 'ば',
  ビ: 'び',
  ブ: 'ぶ',
  ベ: 'べ',
  ボ: 'ぼ',
  パ: 'ぱ',
  ピ: 'ぴ',
  プ: 'ぷ',
  ペ: 'ぺ',
  ポ: 'ぽ',
  ヴ: 'ゔ',
  ァ: 'ぁ',
  ィ: 'ぃ',
  ゥ: 'ぅ',
  ェ: 'ぇ',
  ォ: 'ぉ',
  ャ: 'ゃ',
  ュ: 'ゅ',
  ョ: 'ょ',
  ッ: 'っ',
};

export const KANA_MAPPING: KanaMapping = {
  あ: literal('a'),
  い: literal('i'),
  う: literal('u'),
  え: literal('e'),
  お: literal('o'),
  か: literal('ka'),
  き: literal('ki'),
  く: literal('ku'),
  け: literal('ke'),
  こ: literal('ko'),
  さ: literal('sa'),
  し: shi(),
  す: literal('su'),
  せ: literal('se'),
  そ: literal('so'),
  た: literal('ta'),
  ち: chi(),
  つ: tsu(),
  て: literal('te'),
  と: literal('to'),
  な: literal('na'),
  に: literal('ni'),
  ぬ: literal('nu'),
  ね: literal('ne'),
  の: literal('no'),
  は: literal('ha'),
  ひ: literal('hi'),
  ふ: fu(),
  へ: literal('he'),
  ほ: literal('ho'),
  ま: literal('ma'),
  み: literal('mi'),
  む: literal('mu'),
  め: literal('me'),
  も: literal('mo'),
  や: literal('ya'),
  ゆ: literal('yu'),
  よ: literal('yo'),
  ら: literal('ra'),
  り: literal('ri'),
  る: literal('ru'),
  れ: literal('re'),
  ろ: literal('ro'),
  わ: literal('wa'),
  ゐ: literal('i'),
  ゑ: literal('e'),
  を: literal('wo'),
  ん: literal('nn'),
  が: literal('ga'),
  ぎ: literal('gi'),
  ぐ: literal('gu'),
  げ: literal('ge'),
  ご: literal('go'),
  ざ: literal('za'),
  じ: ji(),
  ず: literal('zu'),
  ぜ: literal('ze'),
  ぞ: literal('zo'),
  だ: literal('da'),
  ぢ: literal('di'),
  づ: literal('du'),
  で: literal('de'),
  ど: literal('do'),
  ば: literal('ba'),
  び: literal('bi'),
  ぶ: literal('bu'),
  べ: literal('be'),
  ぼ: literal('bo'),
  ぱ: literal('pa'),
  ぴ: literal('pi'),
  ぷ: literal('pu'),
  ぺ: literal('pe'),
  ぽ: literal('po'),
  ゔ: literal('vu'),
  ー: literal('-'),
  ' ': WHITESPACE,
};

'abcdefghijklmnopqrstuvwxyz'.split('').forEach((letter) => {
  KANA_MAPPING[letter] = literal(letter);
});

const SMALL_KANA_MAPPING: Map<StateMachine, StateMachine> = new Map();

[
  ['ぁ', 'あ'],
  ['ぃ', 'い'],
  ['ぅ', 'う'],
  ['ぇ', 'え'],
  ['ぉ', 'お'],
  ['ヵ', 'か'],
  ['っ', 'つ'],
  ['ゃ', 'や'],
  ['ゅ', 'ゆ'],
  ['ょ', 'よ'],
].forEach((pair) => {
  let [small, big] = pair;
  KANA_MAPPING[small] = smallKana(KANA_MAPPING[big]);
  SMALL_KANA_MAPPING.set(KANA_MAPPING[big], KANA_MAPPING[small]);
});

Object.assign(KANA_MAPPING, {
  きゃ: y(KANA_MAPPING['き'], KANA_MAPPING['や']),
  きゅ: y(KANA_MAPPING['き'], KANA_MAPPING['ゆ']),
  きょ: y(KANA_MAPPING['き'], KANA_MAPPING['よ']),
  しゃ: sh(KANA_MAPPING['や']),
  しゅ: sh(KANA_MAPPING['ゆ']),
  しょ: sh(KANA_MAPPING['よ']),
  ちゃ: ch(KANA_MAPPING['や']),
  ちゅ: ch(KANA_MAPPING['ゆ']),
  ちょ: ch(KANA_MAPPING['よ']),
  にゃ: y(KANA_MAPPING['に'], KANA_MAPPING['や']),
  にゅ: y(KANA_MAPPING['に'], KANA_MAPPING['ゆ']),
  にょ: y(KANA_MAPPING['に'], KANA_MAPPING['よ']),
  ひゃ: y(KANA_MAPPING['ひ'], KANA_MAPPING['や']),
  ひゅ: y(KANA_MAPPING['ひ'], KANA_MAPPING['ゆ']),
  ひょ: y(KANA_MAPPING['ひ'], KANA_MAPPING['よ']),
  みゃ: y(KANA_MAPPING['み'], KANA_MAPPING['や']),
  みゅ: y(KANA_MAPPING['み'], KANA_MAPPING['ゆ']),
  みょ: y(KANA_MAPPING['み'], KANA_MAPPING['よ']),
  りゃ: y(KANA_MAPPING['り'], KANA_MAPPING['や']),
  りゅ: y(KANA_MAPPING['り'], KANA_MAPPING['ゆ']),
  りょ: y(KANA_MAPPING['り'], KANA_MAPPING['よ']),
  ぎゃ: y(KANA_MAPPING['ぎ'], KANA_MAPPING['や']),
  ぎゅ: y(KANA_MAPPING['ぎ'], KANA_MAPPING['ゆ']),
  ぎょ: y(KANA_MAPPING['ぎ'], KANA_MAPPING['よ']),
  じゃ: j(KANA_MAPPING['や']),
  じゅ: j(KANA_MAPPING['ゆ']),
  じょ: j(KANA_MAPPING['よ']),
  ぢゃ: y(KANA_MAPPING['ぢ'], KANA_MAPPING['や']),
  ぢゅ: y(KANA_MAPPING['ぢ'], KANA_MAPPING['ゆ']),
  ぢょ: y(KANA_MAPPING['ぢ'], KANA_MAPPING['よ']),
  びゃ: y(KANA_MAPPING['び'], KANA_MAPPING['や']),
  びゅ: y(KANA_MAPPING['び'], KANA_MAPPING['ゆ']),
  びょ: y(KANA_MAPPING['び'], KANA_MAPPING['よ']),
  ぴゃ: y(KANA_MAPPING['ぴ'], KANA_MAPPING['や']),
  ぴゅ: y(KANA_MAPPING['ぴ'], KANA_MAPPING['ゆ']),
  ぴょ: y(KANA_MAPPING['ぴ'], KANA_MAPPING['よ']),
  ふぁ: f(KANA_MAPPING['ぁ']),
  ふぃ: f(KANA_MAPPING['ぃ']),
  ふぇ: f(KANA_MAPPING['ぇ']),
  ふぉ: f(KANA_MAPPING['ぉ']),
  ゔぁ: v(KANA_MAPPING['ぁ']),
  ゔぃ: v(KANA_MAPPING['ぃ']),
  ゔぇ: v(KANA_MAPPING['ぇ']),
  ゔぉ: v(KANA_MAPPING['ぉ']),
});

[
  'か',
  'き',
  'く',
  'け',
  'こ',
  'さ',
  'し',
  'す',
  'せ',
  'そ',
  'た',
  'ち',
  'つ',
  'て',
  'と',
  'は',
  'ひ',
  'ふ',
  'へ',
  'ほ',
  'が',
  'ぎ',
  'ぐ',
  'げ',
  'ご',
  'ざ',
  'じ',
  'ず',
  'ぜ',
  'ぞ',
  'だ',
  'ぢ',
  'づ',
  'で',
  'ど',
  'ば',
  'び',
  'ぶ',
  'べ',
  'ぼ',
  'ぱ',
  'ぴ',
  'ぷ',
  'ぺ',
  'ぽ',
  'ゔ',
].forEach((kana) => {
  KANA_MAPPING['っ' + kana] = smallTsu(KANA_MAPPING[kana]);
  KANA_MAPPING['ん' + kana] = n(KANA_MAPPING[kana]);
});
[
  'きゃ',
  'きゅ',
  'きょ',
  'しゃ',
  'しゅ',
  'しょ',
  'ちゃ',
  'ちゅ',
  'ちょ',
  'ぎゃ',
  'ぎゅ',
  'ぎょ',
  'じゃ',
  'じゅ',
  'じょ',
  'ぢゃ',
  'ぢゅ',
  'ぢょ',
  'びゃ',
  'びゅ',
  'びょ',
  'ぴゃ',
  'ぴゅ',
  'ぴょ',
  'ふぁ',
  'ふぃ',
  'ふぇ',
  'ふぉ',
  'ゔぁ',
  'ゔぃ',
  'ゔぇ',
  'ゔぉ',
].forEach((kana) => {
  KANA_MAPPING['っ' + kana] = smallTsu(KANA_MAPPING[kana]);
  KANA_MAPPING['ん' + kana] = n(KANA_MAPPING[kana]);
});

/**
 * This normalizes input for matching. All alphabet is lower-cased, katakana
 * is transformed to hiragana. All whitespace is now just a space. We take
 * care to not change the length of the string as we have to match it
 * one-for-one so we can display the original source kana.
 */
export function normalizeInput(input: string): string {
  return input
    .toLowerCase()
    .split('')
    .map((letter) => {
      let transform = KATAKANA_MAPPING[letter];
      if (transform !== undefined) {
        return transform;
      } else if (/\s/.test(letter)) {
        return ' ';
      } else {
        return letter;
      }
    })
    .join('');
}

export class KanaInputState {
  kana: string[];
  stateMachines: StateMachine[];
  currentIndex: number;

  constructor(input: string) {
    let kana: string[] = [];
    let machines: StateMachine[] = [];
    let position = 0;

    // we pad the input so checking 3 at a time is simpler
    let normalized = normalizeInput(input) + '  ';
    while (position < input.length) {
      // we check substrings of length 3, 2, then 1
      for (let i = 3; i > 0; --i) {
        let original = input.substr(position, i);
        let segment = normalized.substr(position, i);
        let machine = KANA_MAPPING[segment];
        if (machine != undefined) {
          kana.push(original);
          let nextMachine = machine.clone();
          if (machines.length > 0) {
            let prevMachine = machines[machines.length - 1];
            prevMachine.nextMachine = nextMachine;
          }
          machines.push(nextMachine);
          position += i - 1;
          break;
        }
      }
      // even if we don't find a match, keep progressing
      // unmapped characters will be ignored
      position += 1;
    }

    this.kana = kana;
    this.stateMachines = machines;
    this.currentIndex = 0;
  }

  map<T>(func: (s: string, m: StateMachine) => T): T[] {
    let result: T[] = [];
    for (let i = 0; i < this.kana.length; ++i) {
      result.push(func(this.kana[i], this.stateMachines[i]));
    }
    return result;
  }

  handleInput(input: string): boolean {
    if (this.currentIndex >= this.stateMachines.length) return false;

    let currentMachine = this.stateMachines[this.currentIndex];
    currentMachine.transition(input);
    while (currentMachine.isFinished()) {
      this.currentIndex += 1;
      currentMachine = this.stateMachines[this.currentIndex];
      if (currentMachine == null) {
        return true;
      }
    }
    return this.currentIndex >= this.stateMachines.length;
  }

  isFinished(): boolean {
    return this.currentIndex >= this.stateMachines.length;
  }

  getRemainingInput(): string {
    let remaining = '';
    for (let i = this.currentIndex; i < this.stateMachines.length; ++i) {
      remaining += this.stateMachines[i].getDisplay();
    }
    return remaining;
  }
}
