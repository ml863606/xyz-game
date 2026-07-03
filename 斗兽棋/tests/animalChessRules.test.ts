import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AnimalChessGame,
  cloneState,
  createInitialState,
  getBasePieceAt,
  getCoveringPiece,
  getHiddenPiece,
} from '../assets/scripts/core/AnimalChessGame';
import { PIECE_ORDER, type GameState, type PieceKind, type PlayerSide, type Position } from '../assets/scripts/core/AnimalChessTypes';

test('initializes a 4x4 board with 16 face-down pieces', () => {
  const state = createInitialState('playing');
  assert.equal(state.board.width, 4);
  assert.equal(state.board.height, 4);
  assert.equal(Object.keys(state.pieces).length, 16);
  assert.equal(Object.values(state.pieces).every((piece) => !piece.revealed), true);
  assert.deepEqual(
    PIECE_ORDER.map((kind) => state.pieces[`red-${kind}`]?.kind),
    PIECE_ORDER,
  );
  assert.deepEqual(
    PIECE_ORDER.map((kind) => state.pieces[`blue-${kind}`]?.kind),
    PIECE_ORDER,
  );
});

test('initial positions are randomly shuffled instead of fixed alternating colors', () => {
  const sawNonAlternating = Array.from({ length: 20 }).some(() => {
    const state = createInitialState('playing');
    for (let y = 0; y < state.board.height; y += 1) {
      for (let x = 0; x < state.board.width; x += 1) {
        const piece = getBasePieceAt(state, { x, y });
        if (piece?.side !== ((x + y) % 2 === 0 ? 'blue' : 'red')) {
          return true;
        }
      }
    }
    return false;
  });

  assert.equal(sawNonAlternating, true);
});

test('flips an uncovered card and assigns first flipped side', () => {
  const state = emptyState();
  place(state, 'blue-cat', 'blue', 'cat', { x: 0, y: 0 }, false);
  const game = new AnimalChessGame(state);

  const result = game.flip({ x: 0, y: 0 }, 'red', 'player-a');

  assert.equal(result.ok, true);
  assert.equal(result.assignedSide, 'blue');
  assert.equal(result.state.pieces['blue-cat'].revealed, true);
  assert.equal(result.state.sideOwners.blue, 'player-a');
  assert.equal(result.state.turn, 'red');
});

test('covered cards cannot be flipped', () => {
  const state = emptyState();
  place(state, 'blue-cat', 'blue', 'cat', { x: 0, y: 0 }, false);
  place(state, 'red-dog', 'red', 'dog', { x: 0, y: 0 }, true, { coveringId: 'blue-cat' });
  const result = new AnimalChessGame(state).flip({ x: 0, y: 0 }, 'red');

  assert.equal(result.ok, false);
});

test('moves only revealed own pieces orthogonally', () => {
  const state = emptyState();
  place(state, 'red-cat', 'red', 'cat', { x: 0, y: 0 }, true);
  place(state, 'red-dog', 'red', 'dog', { x: 1, y: 0 }, false);
  const game = new AnimalChessGame(state);

  assert.equal(game.movePiece({ x: 1, y: 0 }, { x: 1, y: 1 }, 'red').ok, false);
  assert.equal(game.movePiece({ x: 0, y: 0 }, { x: 1, y: 1 }, 'red').ok, false);
  assert.equal(game.movePiece({ x: 0, y: 0 }, { x: 0, y: 1 }, 'blue').ok, false);
  assert.equal(game.movePiece({ x: 0, y: 0 }, { x: 0, y: 1 }, 'red').ok, true);
});

test('lion tiger leopard wolf dog and cat stand on face-down cards and block flipping', () => {
  const state = emptyState();
  place(state, 'red-cat', 'red', 'cat', { x: 0, y: 0 }, true);
  place(state, 'blue-dog', 'blue', 'dog', { x: 0, y: 1 }, false);
  const game = new AnimalChessGame(state);

  const moved = game.movePiece({ x: 0, y: 0 }, { x: 0, y: 1 }, 'red');

  assert.equal(moved.ok, true);
  const base = getBasePieceAt(moved.state, { x: 0, y: 1 });
  assert.equal(base?.id, 'blue-dog');
  assert.equal(getCoveringPiece(moved.state, 'blue-dog')?.id, 'red-cat');
  const flip = new AnimalChessGame(moved.state).flip({ x: 0, y: 1 }, 'blue');
  assert.equal(flip.ok, false);
});

test('elephant cannot stand on face-down cards', () => {
  const state = emptyState();
  place(state, 'red-elephant', 'red', 'elephant', { x: 0, y: 0 }, true);
  place(state, 'blue-dog', 'blue', 'dog', { x: 0, y: 1 }, false);
  const result = new AnimalChessGame(state).movePiece({ x: 0, y: 0 }, { x: 0, y: 1 }, 'red');

  assert.equal(result.ok, false);
});

test('rat tunnels under face-down cards and can come out', () => {
  const state = emptyState();
  place(state, 'red-rat', 'red', 'rat', { x: 0, y: 0 }, true);
  place(state, 'blue-dog', 'blue', 'dog', { x: 0, y: 1 }, false);
  const game = new AnimalChessGame(state);

  const tunneled = game.movePiece({ x: 0, y: 0 }, { x: 0, y: 1 }, 'red');
  assert.equal(tunneled.ok, true);
  assert.equal(getHiddenPiece(tunneled.state, 'blue-dog')?.id, 'red-rat');

  const next = cloneState(tunneled.state);
  next.turn = 'red';
  const out = new AnimalChessGame(next).movePiece({ x: 0, y: 1 }, { x: 1, y: 1 }, 'red');
  assert.equal(out.ok, true);
  assert.equal(out.state.pieces['red-rat'].hiddenUnderId, undefined);
  assert.deepEqual(out.state.pieces['red-rat'].position, { x: 1, y: 1 });
});

test('capture ranks, same rank, and rat-elephant mutual exception', () => {
  const same = emptyState();
  place(same, 'red-cat', 'red', 'cat', { x: 0, y: 1 }, true);
  place(same, 'blue-cat', 'blue', 'cat', { x: 0, y: 0 }, true);
  assert.equal(new AnimalChessGame(same).movePiece({ x: 0, y: 1 }, { x: 0, y: 0 }, 'red').ok, true);

  const weaker = emptyState();
  place(weaker, 'red-cat', 'red', 'cat', { x: 0, y: 1 }, true);
  place(weaker, 'blue-dog', 'blue', 'dog', { x: 0, y: 0 }, true);
  place(weaker, 'blue-rat', 'blue', 'rat', { x: 3, y: 3 }, true);
  assert.equal(new AnimalChessGame(weaker).movePiece({ x: 0, y: 1 }, { x: 0, y: 0 }, 'red').ok, false);

  const rat = emptyState();
  place(rat, 'red-rat', 'red', 'rat', { x: 0, y: 1 }, true);
  place(rat, 'blue-elephant', 'blue', 'elephant', { x: 0, y: 0 }, true);
  assert.equal(new AnimalChessGame(rat).movePiece({ x: 0, y: 1 }, { x: 0, y: 0 }, 'red').ok, true);

  const elephant = emptyState();
  place(elephant, 'red-elephant', 'red', 'elephant', { x: 0, y: 1 }, true);
  place(elephant, 'blue-rat', 'blue', 'rat', { x: 0, y: 0 }, true);
  place(elephant, 'blue-cat', 'blue', 'cat', { x: 3, y: 3 }, true);
  assert.equal(new AnimalChessGame(elephant).movePiece({ x: 0, y: 1 }, { x: 0, y: 0 }, 'red').ok, true);
});

test('wins when all opponent pieces are captured', () => {
  const state = emptyState();
  place(state, 'red-dog', 'red', 'dog', { x: 0, y: 1 }, true);
  place(state, 'blue-cat', 'blue', 'cat', { x: 0, y: 0 }, true);
  place(state, 'red-rat', 'red', 'rat', { x: 3, y: 3 }, true);

  const result = new AnimalChessGame(state).movePiece({ x: 0, y: 1 }, { x: 0, y: 0 }, 'red');

  assert.equal(result.ok, true);
  assert.equal(result.state.winner, 'red');
  assert.equal(result.state.reason, 'capture');
});

function emptyState(): GameState {
  const state = createInitialState('playing');
  const clone = cloneState(state);
  clone.pieces = {};
  clone.turn = 'red';
  clone.sideOwners = {};
  clone.winner = undefined;
  clone.reason = undefined;
  clone.message = 'test';
  return clone;
}

function place(
  state: GameState,
  id: string,
  side: PlayerSide,
  kind: PieceKind,
  position: Position,
  revealed: boolean,
  stack: Pick<Partial<NonNullable<GameState['pieces'][string]>>, 'coveringId' | 'hiddenUnderId'> = {},
): void {
  state.pieces[id] = {
    id,
    side,
    kind,
    position,
    alive: true,
    revealed,
    ...stack,
  };
}
