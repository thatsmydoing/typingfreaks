import { test } from 'uvu';
import * as assert from 'uvu/assert';

import { KANA_MAPPING, normalizeInput, KanaInputState } from '../src/kana';
import { TransitionResult } from '../src/state';

function testInput(input: string, line: string) {
  const inputState = new KanaInputState(line);
  let kanaCount = 0;
  inputState.map((_, m) => {
    m.addObserver((result, meta) => {
      if (m.isFinished()) {
        kanaCount += meta;
      }
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
  assert.ok(inputState.isFinished(), `Expected inputState to be finished`);
  assert.is(
    kanaCount,
    line.length,
    `${line}: Expected ${line.length} boundaries, got ${kanaCount}`
  );
}

function testFail(input: string, line: string) {
  const inputState = new KanaInputState(line);
  let fail = false;
  inputState.map((_, m) => {
    m.addObserver((result, _boundary) => {
      fail =
        fail ||
        result === TransitionResult.FAILED ||
        result === TransitionResult.SKIPPED;
    });
  });
  for (const c of input.split('')) {
    inputState.handleInput(c);
  }
  fail = fail || !inputState.isFinished();
  assert.ok(fail, `Expected ${input} to fail on ${line}`);
}

function testSkip(input: string, line: string, expectedSkips: number) {
  const inputState = new KanaInputState(line);
  let kanaCount = 0;
  let skipCount = 0;
  inputState.map((_, m) => {
    m.addObserver((result, meta) => {
      if (result === TransitionResult.SKIPPED) {
        kanaCount += meta;
        skipCount += 1;
      } else if (result === TransitionResult.SUCCESS) {
        kanaCount += meta;
      } else {
        assert.unreachable(`Expected ${input} to match ${line}`);
      }
    });
  });
  for (const c of input.split('')) {
    inputState.handleInput(c);
  }
  assert.ok(inputState.isFinished(), `Expected inputState to be finished`);
  assert.is(
    kanaCount,
    line.length,
    `Expected ${line.length} boundaries, got ${kanaCount}`
  );
  assert.is(skipCount, expectedSkips, `Expected skip count to match`);
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
  testInput('kya', 'きゃ');
  testInput('kiya', 'きゃ');
  testInput('kilya', 'きゃ');
  testInput('sha', 'しゃ');
  testInput('sya', 'しゃ');
  testInput('shilya', 'しゃ');
  testInput('silya', 'しゃ');
  testInput('cha', 'ちゃ');
  testInput('tya', 'ちゃ');
  testInput('chilya', 'ちゃ');
  testInput('tilya', 'ちゃ');
  testInput('ja', 'じゃ');
  testInput('jya', 'じゃ');
  testInput('zya', 'じゃ');
  testInput('jilya', 'じゃ');
  testInput('zilya', 'じゃ');

  testInput('fe', 'ふぇ');
  testInput('fue', 'ふぇ');
  testInput('fule', 'ふぇ');
});

test('small kana', () => {
  testInput('ka', 'ヵ');
  testInput('lka', 'ヵ');
  testInput('xka', 'ヵ');
  testFail('llka', 'ヵ');
});

test('small tsu', () => {
  testInput('katto', 'カット');
  testInput('kaltsuto', 'かっと');
  testInput('kaltuto', 'かっと');
  testInput('ejji', 'エッジ');
  testInput('ezzi', 'エッジ');
  testInput('extuji', 'エッジ');
  testInput('extsuzi', 'エッジ');
  testInput('hassha', 'はっしゃ');
  testInput('hassya', 'はっしゃ');
  testInput('haltusha', 'はっしゃ');
  testInput('haltusya', 'はっしゃ');
});

test('nn', () => {
  testInput('nn', 'ん');
  testInput('nna', 'んあ');
  testFail('na', 'んあ');
  testInput('nda', 'んだ');
  testInput('nnda', 'んだ');
  testFail('nnnda', 'んだ');
  testInput('nnnda', 'んんだ');
  testInput('nnnnda', 'んんだ');
  testFail('nya', 'んにゃ');
  testFail('nnya', 'んにゃ');
  testInput('nnnya', 'んにゃ');
});

test('skipping', () => {
  testSkip('a', 'は', 1);
  testSkip('hao', 'はろ', 1);
  testSkip('hro', 'はろ', 1);
});

test('display matches', () => {
  for (const line in KANA_MAPPING) {
    if (line === ' ') {
      continue;
    }
    testInput(KANA_MAPPING[line].getDisplay(), line);
  }
});

test.run();
