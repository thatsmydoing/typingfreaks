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

/// <reference path="state.ts" />

namespace kana {
  import State = state.State;
  import StateMachine = state.StateMachine;
  import TransitionResult = state.TransitionResult;
  import t = state.makeTransition;

  function literal(source: string): StateMachine {
    let transitions = [];
    for (let i = 0; i < source.length; ++i) {
      let from = source.substring(i);
      let input = source.charAt(i);
      let to = source.substring(i+1);
      transitions.push(t(from, input, to));
    }
    return state.buildFromTransitions(source, transitions);
  }

  function shi(): StateMachine {
    return state.buildFromTransitions('shi', [
      t('shi', 's', 'hi'),
      t('hi', 'h', 'i'),
      t('hi', 'i', ''),
      t('i', 'i', '')
    ]);
  }

  function chi(): StateMachine {
    return state.buildFromTransitions('chi', [
      t('chi', 'c', 'hi'),
      t('chi', 't', 'i'),
      t('hi', 'h', 'i'),
      t('i', 'i', '')
    ]);
  }

  function tsu(): StateMachine {
    return state.buildFromTransitions('tsu', [
      t('tsu', 't', 'su'),
      t('su', 's', 'u'),
      t('su', 'u', ''),
      t('u', 'u', '')
    ]);
  }

  function fu(): StateMachine {
    return state.buildFromTransitions('fu', [
      t('fu', 'f', 'u'),
      t('fu', 'h', 'u'),
      t('u', 'u', '')
    ]);
  }

  function ji(): StateMachine {
    return state.buildFromTransitions('ji', [
      t('ji', 'j', 'i'),
      t('ji', 'z', 'i'),
      t('i', 'i', '')
    ]);
  }

  function sh(end: string): StateMachine {
    let source = 'sh' + end;
    let middle = 'h' + end;
    return state.buildFromTransitions(source, [
      t(source, 's', middle),
      t(middle, 'h', end),
      t(middle, 'y', end),
      t(end, end, '')
    ]);
  }

  function ch(end: string): StateMachine {
    let source = 'ch' + end;
    let middle = 'h' + end;
    let altMiddle = 'y' + end;

    return state.buildFromTransitions(source, [
      t(source, 'c', middle),
      t(middle, 'h', end),
      t(source, 't', altMiddle),
      t(altMiddle, 'y', end),
      t(end, end, '')
    ]);
  }

  function j(end: string): StateMachine {
    let source = 'j' + end;
    let altMiddle = 'y' + end;

    return state.buildFromTransitions(source, [
      t(source, 'j', end),
      t(source, 'z', altMiddle),
      t(end, 'y', end),
      t(altMiddle, 'y', end),
      t(end, end, '')
    ]);
  }

  function smallTsu(base: StateMachine): StateMachine {
    let { display, transitions } = base.initialState;

    let newState = new State(display.charAt(0) + display);
    Object.keys(transitions).forEach(k => {
      let nextState = transitions[k];
      let intermediateDisplay = k + nextState.display;
      let intermediateState = new State(intermediateDisplay);
      intermediateState.addTransition(k, nextState);
      newState.addTransition(k, intermediateState);
    })

    return new StateMachine(newState, base.finalState);
  }

  function smallKana(base: StateMachine): StateMachine {
    let newState = base.initialState.clone();
    newState.addTransition('l', base.initialState);
    newState.addTransition('x', base.initialState);
    return new StateMachine(newState, base.finalState);
  }

  interface KanaMapping {
    [index: string]: StateMachine
  }

  const WHITESPACE = state.buildFromTransitions('_', [
    t('_', '_', ''),
    t('_', ' ', '')
  ]);


  const SINGLE_KANA_MAPPING: KanaMapping = {
    "あ": literal('a'),
    "い": literal('i'),
    "う": literal('u'),
    "え": literal('e'),
    "お": literal('o'),
    "か": literal('ka'),
    "き": literal('ki'),
    "く": literal('ku'),
    "け": literal('ke'),
    "こ": literal('ko'),
    "さ": literal('sa'),
    "し": shi(),
    "す": literal('su'),
    "せ": literal('se'),
    "そ": literal('so'),
    "た": literal('ta'),
    "ち": chi(),
    "つ": tsu(),
    "て": literal('te'),
    "と": literal('to'),
    "な": literal('na'),
    "に": literal('ni'),
    "ぬ": literal('nu'),
    "ね": literal('ne'),
    "の": literal('no'),
    "は": literal('ha'),
    "ひ": literal('hi'),
    "ふ": fu(),
    "へ": literal('he'),
    "ほ": literal('ho'),
    "ま": literal('ma'),
    "み": literal('mi'),
    "む": literal('mu'),
    "め": literal('me'),
    "も": literal('mo'),
    "や": literal('ya'),
    "ゆ": literal('yu'),
    "よ": literal('yo'),
    "ら": literal('ra'),
    "り": literal('ri'),
    "る": literal('ru'),
    "れ": literal('re'),
    "ろ": literal('ro'),
    "わ": literal('wa'),
    "を": literal('wo'),
    "ん": literal('n'),
    "が": literal('ga'),
    "ぎ": literal('gi'),
    "ぐ": literal('gu'),
    "げ": literal('ge'),
    "ご": literal('go'),
    "ざ": literal('za'),
    "じ": ji(),
    "ず": literal('zu'),
    "ぜ": literal('ze'),
    "ぞ": literal('zo'),
    "だ": literal('da'),
    "ぢ": literal('di'),
    "づ": literal('du'),
    "で": literal('de'),
    "ど": literal('do'),
    "ば": literal('ba'),
    "び": literal('bi'),
    "ぶ": literal('bu'),
    "べ": literal('be'),
    "ぼ": literal('bo'),
    "ぱ": literal('pa'),
    "ぴ": literal('pi'),
    "ぷ": literal('pu'),
    "ぺ": literal('pe'),
    "ぽ": literal('po'),
    "ー": literal('-')
  };

  'abcdefghijklmnopqrstuvwxyz'.split('').forEach(letter => {
    SINGLE_KANA_MAPPING[letter] = literal(letter);
  });

  [
    ['ぁ', 'あ'],
    ['ぃ', 'い'],
    ['ぅ', 'う'],
    ['ぇ', 'え'],
    ['ぉ', 'お'],
    ['ヵ', 'か']
  ].forEach(pair => {
    let [ small, big ] = pair;
    SINGLE_KANA_MAPPING[small] = smallKana(SINGLE_KANA_MAPPING[big]);
  });

  const DOUBLE_KANA_MAPPING: KanaMapping = {
    "きゃ": literal('kya'),
    "きゅ": literal('kyu'),
    "きょ": literal('kyo'),
    "しゃ": sh('a'),
    "しゅ": sh('u'),
    "しょ": sh('o'),
    "ちゃ": ch('a'),
    "ちゅ": ch('u'),
    "ちょ": ch('o'),
    "にゃ": literal('nya'),
    "にゅ": literal('nyu'),
    "にょ": literal('nyo'),
    "ひゃ": literal('hya'),
    "ひゅ": literal('hyu'),
    "ひょ": literal('hyo'),
    "みゃ": literal('mya'),
    "みゅ": literal('myu'),
    "みょ": literal('myo'),
    "りゃ": literal('rya'),
    "りゅ": literal('ryu'),
    "りょ": literal('ryo'),
    "ぎゃ": literal('gya'),
    "ぎゅ": literal('gyu'),
    "ぎょ": literal('gyo'),
    "じゃ": j('a'),
    "じゅ": j('u'),
    "じょ": j('o'),
    "ぢゃ": literal('dya'),
    "ぢゅ": literal('dyu'),
    "ぢょ": literal('dyo'),
    "びゃ": literal('bya'),
    "びゅ": literal('byu'),
    "びょ": literal('byo'),
    "ぴゃ": literal('pya'),
    "ぴゅ": literal('pyu'),
    "ぴょ": literal('pyo')
  }

  const TRIPLE_KANA_MAPPING: KanaMapping = {};

  [
    "か", "き", "く", "け", "こ",
    "さ", "し", "す", "せ", "そ",
    "た", "ち", "つ", "て", "と",
    "は", "ひ", "ふ", "へ", "ほ",
    "が", "ぎ", "ぐ", "げ", "ご",
    "ざ", "じ", "ず", "ぜ", "ぞ",
    "だ", "ぢ", "づ", "で", "ど",
    "ば", "び", "ぶ", "べ", "ぼ",
    "ぱ", "ぴ", "ぷ", "ぺ", "ぽ"
  ].forEach(kana => {
    DOUBLE_KANA_MAPPING['っ' + kana] = smallTsu(SINGLE_KANA_MAPPING[kana]);
  });
  [
    "きゃ", "きゅ", "きょ",
    "しゃ", "しゅ", "しょ",
    "ちゃ", "ちゅ", "ちょ",
    "ぎゃ", "ぎゅ", "ぎょ",
    "じゃ", "じゅ", "じょ",
    "ぢゃ", "ぢゅ", "ぢょ",
    "びゃ", "びゅ", "びょ",
    "ぴゃ", "ぴゅ", "ぴょ"
  ].forEach(kana => {
    TRIPLE_KANA_MAPPING['っ' + kana] = smallTsu(DOUBLE_KANA_MAPPING[kana]);
  });

  export class KanaInputState {
    kana: string[];
    stateMachines: StateMachine[];
    currentIndex: number;

    constructor(input: string) {
      let kana: string[] = [];
      let machines: StateMachine[] = [];

      // we pad the input so checking 3 at a time is simpler
      let remaining = input.toLowerCase() + '  ';
      while (remaining.length > 2) {

        let nextThree = remaining.substring(0, 3);
        let tripleKana = TRIPLE_KANA_MAPPING[nextThree];
        if (tripleKana != undefined) {
          kana.push(nextThree);
          machines.push(tripleKana.clone());
          remaining = remaining.substring(3);
          continue;
        }

        let nextTwo = remaining.substring(0, 2);
        let doubleKana = DOUBLE_KANA_MAPPING[nextTwo];
        if (doubleKana != undefined) {
          kana.push(nextTwo);
          machines.push(doubleKana.clone());
          remaining = remaining.substring(2);
          continue;
        }

        let nextOne = remaining.substring(0, 1);
        let singleKana = SINGLE_KANA_MAPPING[nextOne];
        if (singleKana != undefined) {
          kana.push(nextOne);
          machines.push(singleKana.clone());
        } else if (/\s/.test(nextOne)) {
          kana.push(nextOne);
          machines.push(WHITESPACE.clone());
        }
        remaining = remaining.substring(1);
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
      let result = currentMachine.transition(input);
      if (result === TransitionResult.FINISHED) {
        this.currentIndex += 1;
      }
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

}
