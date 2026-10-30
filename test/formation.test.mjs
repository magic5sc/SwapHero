import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { deploySwap, swapBench, mustReinforce, reinforce, exchange } from '../dist/src/formation.mjs';
const s = ['a', 'b', 'c', 'd', 'e', 'f'];
test('deployment is immutable and validates duplicate IDs', () => {
  assert.deepEqual(deploySwap(s, 1, 4), ['d', 'b', 'c', 'a', 'e', 'f']);
  assert.equal(s[0], 'a');
  assert.throws(() => deploySwap(['a','a',null,null,null,null], 1, 2));
});
test('bench swap requires two units', () => {
  assert.deepEqual(swapBench(s, 4, 5).slice(3, 6), ['e','d','f']);
  assert.throws(() => swapBench(s, 4, 7));
});
test('reinforcement consumes points and stops when points exhausted', () => {
  let slots = [null,null,null,'a','b','c'], ap = 2;
  let result = reinforce(slots, ap, 4, 1); slots = result.slots; ap = result.actionPoints;
  assert.deepEqual(result.events, [{type:'enter',unit:'a',position:1}]);
  result = reinforce(slots, ap, 5, 2);
  assert.equal(result.actionPoints, 0);
  assert.equal(mustReinforce(result.slots, 0), false);
  assert.throws(() => reinforce(result.slots, 0, 6, 3));
});
test('exchange is atomic and forbidden during mandatory reinforcement', () => {
  const result = exchange(s, 2, 4, 1);
  assert.deepEqual(result.events, [{type:'exit',unit:'a',position:1},{type:'enter',unit:'d',position:1}]);
  assert.equal(result.actionPoints, 1);
  assert.equal(exchange([null,'b','c','d','e','f'], 2, 4, 2).actionPoints,1);
});
