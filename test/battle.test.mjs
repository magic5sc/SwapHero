import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createGame, start, resolveLane, endTurn, playAI, move } from '../src/battle.mjs';
test('damage uses current lane occupant even after a change',()=>{const g=createGame();start(g);const attacker=g.sides.player.slots[0], replacement=g.sides.ai.slots[3];[g.sides.ai.slots[0],g.sides.ai.slots[3]]=[replacement,g.sides.ai.slots[0]];const hp=g.units[replacement].hp;resolveLane(g,'player',1,attacker);assert.equal(g.units[replacement].hp,hp-g.units[attacker].attack);});
test('damage scores when current opposing lane is empty',()=>{const g=createGame();start(g);const id=g.sides.player.slots[0];g.sides.ai.slots[0]=null;resolveLane(g,'player',1,id);assert.equal(g.sides.player.score,1);});
test('AI and player proceed with the same turn actions',()=>{const g=createGame();start(g);move(g,'player',4,1);assert.equal(g.actionPoints,1);endTurn(g,'player');assert.equal(g.turn,'ai');playAI(g);assert.equal(g.turn,'player');});
test('five points ends combat immediately',()=>{const g=createGame();start(g);g.sides.player.score=4;g.sides.ai.slots[2]=null;endTurn(g,'player');assert.equal(g.winner,'player');assert.equal(g.phase,'finished');});
