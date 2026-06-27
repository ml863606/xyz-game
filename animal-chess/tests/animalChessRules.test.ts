import assert from 'node:assert/strict';
import test from 'node:test';
import { AnimalChessGame, cloneState, createInitialState, terrainAt } from '../assets/scripts/core/AnimalChessGame';
import type { GameState, PieceKind, PlayerSide, Position } from '../assets/scripts/core/AnimalChessTypes';

test('rat can capture elephant, but elephant cannot capture rat', () => {
  const state = emptyState();
  place(state, 'red-rat', 'red', 'rat', { x: 2, y: 2 });
  place(state, 'blue-elephant', 'blue', 'elephant', { x: 2, y: 1 });
  let game = new AnimalChessGame(state);

  assert.equal(game.movePiece({ x: 2, y: 2 }, { x: 2, y: 1 }, 'red').ok, true);
  assert.equal(game.snapshot().pieces['blue-elephant'].alive, false);

  const next = emptyState();
  place(next, 'red-elephant', 'red', 'elephant', { x: 2, y: 2 });
  place(next, 'blue-rat', 'blue', 'rat', { x: 2, y: 1 });
  game = new AnimalChessGame(next);

  const result = game.movePiece({ x: 2, y: 2 }, { x: 2, y: 1 }, 'red');
  assert.equal(result.ok, false);
});

test('same rank and stronger rank captures, weaker ordinary piece cannot', () => {
  const same = emptyState();
  place(same, 'red-cat', 'red', 'cat', { x: 0, y: 1 });
  place(same, 'blue-cat', 'blue', 'cat', { x: 0, y: 0 });
  assert.equal(new AnimalChessGame(same).movePiece({ x: 0, y: 1 }, { x: 0, y: 0 }, 'red').ok, true);

  const stronger = emptyState();
  place(stronger, 'red-dog', 'red', 'dog', { x: 0, y: 1 });
  place(stronger, 'blue-cat', 'blue', 'cat', { x: 0, y: 0 });
  assert.equal(new AnimalChessGame(stronger).movePiece({ x: 0, y: 1 }, { x: 0, y: 0 }, 'red').ok, true);

  const weaker = emptyState();
  place(weaker, 'red-cat', 'red', 'cat', { x: 0, y: 1 });
  place(weaker, 'blue-dog', 'blue', 'dog', { x: 0, y: 0 });
  assert.equal(new AnimalChessGame(weaker).movePiece({ x: 0, y: 1 }, { x: 0, y: 0 }, 'red').ok, false);
});

test('trap reduces defender rank for opponent captures', () => {
  const state = emptyState();
  place(state, 'red-rat', 'red', 'rat', { x: 3, y: 2 });
  place(state, 'blue-elephant', 'blue', 'elephant', { x: 3, y: 1 });
  const game = new AnimalChessGame(state);

  assert.equal(terrainAt({ x: 3, y: 1 }), 'blue-trap');
  assert.equal(game.movePiece({ x: 3, y: 2 }, { x: 3, y: 1 }, 'red').ok, true);
});

test('only rat can enter water and water rat cannot capture land elephant', () => {
  const tigerState = emptyState();
  place(tigerState, 'red-tiger', 'red', 'tiger', { x: 1, y: 2 });
  assert.equal(new AnimalChessGame(tigerState).movePiece({ x: 1, y: 2 }, { x: 1, y: 3 }, 'red').ok, false);

  const ratState = emptyState();
  place(ratState, 'red-rat', 'red', 'rat', { x: 1, y: 2 });
  const game = new AnimalChessGame(ratState);
  assert.equal(game.movePiece({ x: 1, y: 2 }, { x: 1, y: 3 }, 'red').ok, true);

  const attackState = game.snapshot();
  attackState.turn = 'red';
  place(attackState, 'blue-elephant', 'blue', 'elephant', { x: 1, y: 2 });
  const attack = new AnimalChessGame(attackState);
  assert.equal(attack.movePiece({ x: 1, y: 3 }, { x: 1, y: 2 }, 'red').ok, false);
});

test('lion and tiger jump river unless blocked by rat', () => {
  const clear = emptyState();
  place(clear, 'red-lion', 'red', 'lion', { x: 0, y: 3 });
  const game = new AnimalChessGame(clear);
  assert.equal(game.movePiece({ x: 0, y: 3 }, { x: 3, y: 3 }, 'red').ok, true);

  const vertical = emptyState();
  place(vertical, 'red-tiger', 'red', 'tiger', { x: 1, y: 2 });
  assert.equal(new AnimalChessGame(vertical).movePiece({ x: 1, y: 2 }, { x: 1, y: 6 }, 'red').ok, true);

  const blocked = emptyState();
  place(blocked, 'red-tiger', 'red', 'tiger', { x: 1, y: 2 });
  place(blocked, 'blue-rat', 'blue', 'rat', { x: 1, y: 4 });
  assert.equal(new AnimalChessGame(blocked).movePiece({ x: 1, y: 2 }, { x: 1, y: 6 }, 'red').ok, false);
});

test('own den is forbidden and opponent den wins', () => {
  const own = emptyState();
  place(own, 'red-cat', 'red', 'cat', { x: 3, y: 7 });
  assert.equal(new AnimalChessGame(own).movePiece({ x: 3, y: 7 }, { x: 3, y: 8 }, 'red').ok, false);

  const enemy = emptyState();
  place(enemy, 'red-cat', 'red', 'cat', { x: 3, y: 1 });
  const result = new AnimalChessGame(enemy).movePiece({ x: 3, y: 1 }, { x: 3, y: 0 }, 'red');
  assert.equal(result.ok, true);
  assert.equal(result.state.winner, 'red');
  assert.equal(result.state.reason, 'den');
});

test('turn, bounds, own piece blocking and non-current player are rejected', () => {
  const state = emptyState();
  place(state, 'red-cat', 'red', 'cat', { x: 0, y: 0 });
  place(state, 'red-dog', 'red', 'dog', { x: 0, y: 1 });
  const game = new AnimalChessGame(state);

  assert.equal(game.movePiece({ x: 0, y: 0 }, { x: -1, y: 0 }, 'red').ok, false);
  assert.equal(game.movePiece({ x: 0, y: 0 }, { x: 0, y: 1 }, 'red').ok, false);
  assert.equal(game.movePiece({ x: 0, y: 0 }, { x: 1, y: 0 }, 'blue').ok, false);
});

function emptyState(): GameState {
  const state = createInitialState('playing');
  const clone = cloneState(state);
  clone.pieces = {};
  clone.turn = 'red';
  clone.winner = undefined;
  clone.reason = undefined;
  clone.message = 'test';
  return clone;
}

function place(state: GameState, id: string, side: PlayerSide, kind: PieceKind, position: Position): void {
  state.pieces[id] = {
    id,
    side,
    kind,
    position,
    alive: true,
  };
}
