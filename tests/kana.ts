import { test } from 'uvu';
import * as assert from 'uvu/assert';

import { normalizeInput, KanaInputState } from '../src/kana';
import { TransitionResult } from '../src/state';

function testInput(input: string, line: string) {
  const inputState = new KanaInputState(line);
  inputState.map((_, m) => {
    m.addObserver((result, _boundary) => {
      assert.is(
        result,
        TransitionResult.SUCCESS,
        `Expected ${input} to match ${line}`
      );
    });
  });
  for (const c of input.split('')) {
    inputState.handleInput(c);
  }
}

test('normalizeInput', () => {
  assert.is(normalizeInput('ABCdef'), 'abcdef');
  assert.is(normalizeInput('フェスティバル'), 'ふぇすてぃばる');
  assert.is(normalizeInput('　 '), '  ');
});

test('multiple romanization single kana', () => {
  testInput('si', 'し');
  testInput('shi', 'し');
  testInput('ji', 'じ');
  testInput('zi', 'じ');
  testInput('ti', 'ち');
  testInput('chi', 'ち');
  testInput('tu', 'つ');
  testInput('tsu', 'つ');
  testInput('fu', 'ふ');
  testInput('hu', 'ふ');
});

test('multiple romanization double kana', () => {
  testInput('sha', 'しゃ');
  testInput('sya', 'しゃ');
  // testInput('shilya', 'しゃ');
  // testInput('silya', 'しゃ');
  testInput('cha', 'ちゃ');
  testInput('tya', 'ちゃ');
  // testInput('chilya', 'ちゃ');
  // testInput('tilya', 'ちゃ');
  testInput('ja', 'じゃ');
  testInput('jya', 'じゃ');
  testInput('zya', 'じゃ');
  // testInput('jilya', 'じゃ');
  // testInput('zilya', 'じゃ');

  testInput('fe', 'ふぇ');
  // testInput('fule', 'ふぇ');
});

test('small tsu', () => {
  testInput('katto', 'カット');
  // testInput('kaltsuto', 'かっと');
  // testInput('kaltuto', 'かっと');
  testInput('ejji', 'エッジ');
  testInput('ezzi', 'エッジ');
  // testInput('extuji', 'エッジ');
  // testInput('extsuzi', 'エッジ');
  testInput('hassha', 'はっしゃ');
  testInput('hassya', 'はっしゃ');
  // testInput('haltusha', 'はっしゃ');
  // testInput('haltusya', 'はっしゃ');
});

test.run();
